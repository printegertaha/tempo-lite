import { localOutboxRepo, MAX_OUTBOX_RETRIES } from "../local-db";
import { coalesceMutationsWithDropped } from "./coalesce";
import type { SyncBatchResponse } from "./server-handler";

export type SyncState = "idle" | "syncing" | "offline" | "error";

type SyncListener = (state: {
  status: SyncState;
  pendingCount: number;
  failedCount: number;
  lastSyncedAt: number | null;
  error?: string;
}) => void;

class SyncEngine {
  private userId: string | null = null;
  private debounceTimer: any = null;
  private maxIntervalTimer: any = null;
  private isSyncing = false;
  private pendingResync = false;
  private status: SyncState = "idle";
  private lastSyncedAt: number | null = null;
  private lastError: string | undefined;
  private listeners: Set<SyncListener> = new Set();
  private channel: BroadcastChannel | null = null;
  private retryDelayMs = 2000;
  private lastMutationTime = 0;

  constructor() {
    if (typeof window !== "undefined") {
      this.channel = new BroadcastChannel("athar_sync_channel");
      this.channel.onmessage = (event) => {
        if (event.data?.type === "SYNC_COMPLETED") {
          this.lastSyncedAt = event.data.timestamp;
          this.notify();
        } else if (event.data?.type === "TRIGGER_SYNC") {
          this.scheduleSync(500);
        }
      };

      window.addEventListener("online", () => {
        this.status = "idle";
        this.scheduleSync(500);
      });

      window.addEventListener("offline", () => {
        this.status = "offline";
        this.notify();
      });

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          this.scheduleSync(1000);
        }
      });
    }
  }

  public init(userId: string) {
    if (!userId || userId === "guest") return;
    if (this.userId !== userId) {
      this.userId = userId;
      this.scheduleSync(1000);
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.notifySingle(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      this.notifySingle(listener);
    }
  }

  private async notifySingle(listener: SyncListener) {
    const [pendingCount, failedCount] = this.userId
      ? await Promise.all([
          localOutboxRepo.countPending(this.userId),
          localOutboxRepo.countFailed(this.userId),
        ])
      : [0, 0];

    const effectiveStatus: SyncState = !navigator.onLine
      ? "offline"
      : failedCount > 0 && this.status === "idle"
      ? "error"
      : this.status;

    listener({
      status: effectiveStatus,
      pendingCount,
      failedCount,
      lastSyncedAt: this.lastSyncedAt,
      error: this.lastError,
    });
  }

  /**
   * Schedule debounced synchronization.
   * Default: 5000ms debounce; capped at 15000ms max interval.
   */
  public scheduleSync(delayMs = 5000) {
    if (!this.userId || !navigator.onLine) return;

    if (this.isSyncing) {
      this.pendingResync = true;
      return;
    }

    const now = Date.now();
    if (!this.lastMutationTime) {
      this.lastMutationTime = now;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    const timeSinceFirst = now - this.lastMutationTime;
    if (timeSinceFirst >= 15000) {
      this.flushNow();
      return;
    }

    if (!this.maxIntervalTimer) {
      this.maxIntervalTimer = setTimeout(() => {
        this.flushNow();
      }, 15000);
    }

    this.debounceTimer = setTimeout(() => {
      this.flushNow();
    }, delayMs);
  }

  /**
   * Reset permanently/max-retried failed items and try flushing again.
   */
  public async retryFailed(): Promise<boolean> {
    if (!this.userId || !navigator.onLine) return false;
    await localOutboxRepo.resetFailedForRetry(this.userId);
    this.lastError = undefined;
    this.status = "idle";
    return this.flushNow();
  }

  /**
   * Immediately flush pending outbox mutations to server.
   */
  public async flushNow(): Promise<boolean> {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.maxIntervalTimer) clearTimeout(this.maxIntervalTimer);
    this.debounceTimer = null;
    this.maxIntervalTimer = null;
    this.lastMutationTime = 0;

    if (!this.userId || !navigator.onLine) {
      return false;
    }

    if (this.isSyncing) {
      this.pendingResync = true;
      return false;
    }

    try {
      this.isSyncing = true;
      this.pendingResync = false;
      this.status = "syncing";
      this.notify();

      const rawPending = await localOutboxRepo.getPending(this.userId);
      if (rawPending.length === 0) {
        const failedCount = await localOutboxRepo.countFailed(this.userId);
        this.status = failedCount > 0 ? "error" : "idle";
        this.notify();
        return true;
      }

      // Coalesce redundant mutations safely and track cancelled/merged IDs
      const { coalesced, cancelledIds } = coalesceMutationsWithDropped(rawPending);

      // Remove cancel-pair mutations (local create followed by local delete) immediately
      if (cancelledIds.length > 0) {
        await localOutboxRepo.removeBatch(cancelledIds);
      }

      if (coalesced.length === 0) {
        this.status = "idle";
        this.lastError = undefined;
        this.notify();
        return true;
      }

      // Process in batches of up to 50
      const batchWithMeta = coalesced.slice(0, 50);
      const coalescedMap = new Map<string, string[]>();
      const batchPayload = batchWithMeta.map((item) => {
        coalescedMap.set(item.mutationId, item.coalescedIds);
        const { coalescedIds: _omit, ...wireMut } = item;
        return wireMut;
      });

      const res = await fetch("/api/sync/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mutations: batchPayload }),
      });

      if (!res.ok) {
        throw new Error(`HTTP_${res.status}_SYNC_FAILURE`);
      }

      const data: SyncBatchResponse = await res.json();
      if (!data.success) {
        throw new Error("Server rejected batch sync payload");
      }

      // Collect acknowledged mutation IDs (including all coalesced ancestor IDs)
      const acknowledgedIds: string[] = [];
      let transientErrorCount = 0;
      let permanentErrorCount = 0;
      let latestErrorMsg: string | undefined;

      for (const item of data.results) {
        const allIdsForItem = coalescedMap.get(item.mutationId) || [item.mutationId];

        if (item.status === "applied" || item.status === "duplicate") {
          acknowledgedIds.push(...allIdsForItem);
        } else if (item.status === "error") {
          latestErrorMsg = item.error || "SYNC_MUTATION_ERROR";
          console.error(`Mutation ${item.mutationId} error:`, item.error);
          if (item.permanent) {
            permanentErrorCount++;
            // Mark permanent failures so they do not trigger infinite retry loops
            for (const id of allIdsForItem) {
              await localOutboxRepo.updateStatus(id, "permanent_error", item.error);
            }
          } else {
            transientErrorCount++;
            for (const id of allIdsForItem) {
              await localOutboxRepo.updateStatus(id, "failed", item.error);
            }
          }
        }
      }

      if (acknowledgedIds.length > 0) {
        await localOutboxRepo.removeBatch(acknowledgedIds);
      }

      if (acknowledgedIds.length > 0) {
        this.lastSyncedAt = Date.now();
        this.retryDelayMs = 2000;
        this.channel?.postMessage({
          type: "SYNC_COMPLETED",
          timestamp: this.lastSyncedAt,
        });
      }

      if (transientErrorCount > 0 || permanentErrorCount > 0) {
        this.status = "error";
        this.lastError = latestErrorMsg;
      } else {
        this.status = "idle";
        this.lastError = undefined;
      }

      this.notify();

      // Only reschedule automatically if there are retryable pending mutations
      const remainingCount = await localOutboxRepo.countPending(this.userId);
      if (remainingCount > 0) {
        if (transientErrorCount > 0) {
          const jitter = Math.floor(Math.random() * 1000);
          const nextDelay = Math.min(30000, this.retryDelayMs + jitter);
          this.retryDelayMs = Math.min(30000, this.retryDelayMs * 1.5);
          this.scheduleSync(nextDelay);
        } else {
          this.scheduleSync(1000);
        }
      }

      return transientErrorCount === 0 && permanentErrorCount === 0;
    } catch (err: any) {
      console.warn("Background sync attempt failed:", err?.message || err);
      this.status = "error";
      this.lastError = err?.message || "Sync connection error";
      this.notify();

      const remaining = this.userId ? await localOutboxRepo.countPending(this.userId) : 0;
      if (remaining > 0 && MAX_OUTBOX_RETRIES > 0) {
        const jitter = Math.floor(Math.random() * 1000);
        const nextDelay = Math.min(30000, this.retryDelayMs + jitter);
        this.retryDelayMs = Math.min(30000, this.retryDelayMs * 1.5);
        this.scheduleSync(nextDelay);
      }

      return false;
    } finally {
      this.isSyncing = false;
      if (this.pendingResync) {
        this.pendingResync = false;
        this.scheduleSync(500);
      }
    }
  }
}

export const syncEngine = new SyncEngine();
