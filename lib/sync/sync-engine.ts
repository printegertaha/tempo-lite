import { localOutboxRepo, LocalMutation } from "../local-db";
import { coalesceMutations } from "./coalesce";
import { SyncBatchResponse } from "./server-handler";

export type SyncState = "idle" | "syncing" | "offline" | "error";

type SyncListener = (state: {
  status: SyncState;
  pendingCount: number;
  lastSyncedAt: number | null;
  error?: string;
}) => void;

class SyncEngine {
  private userId: string | null = null;
  private debounceTimer: any = null;
  private maxIntervalTimer: any = null;
  private isSyncing = false;
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
    const pendingCount = this.userId
      ? await localOutboxRepo.countPending(this.userId)
      : 0;

    listener({
      status: !navigator.onLine ? "offline" : this.status,
      pendingCount,
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

    const now = Date.now();
    if (!this.lastMutationTime) {
      this.lastMutationTime = now;
    }

    // Clear existing debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Ensure max 15-second interval during continuous operations
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
   * Immediately flush pending outbox mutations to server.
   */
  public async flushNow(): Promise<boolean> {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.maxIntervalTimer) clearTimeout(this.maxIntervalTimer);
    this.debounceTimer = null;
    this.maxIntervalTimer = null;
    this.lastMutationTime = 0;

    if (!this.userId || this.isSyncing || !navigator.onLine) {
      return false;
    }

    try {
      this.isSyncing = true;
      this.status = "syncing";
      this.notify();

      const rawPending = await localOutboxRepo.getPending(this.userId);
      if (rawPending.length === 0) {
        this.status = "idle";
        this.notify();
        return true;
      }

      // Coalesce redundant mutations safely
      const coalesced = coalesceMutations(rawPending);

      // Process in batches of up to 50
      const batch = coalesced.slice(0, 50);

      const res = await fetch("/api/sync/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mutations: batch }),
      });

      if (!res.ok) {
        throw new Error(`HTTP_${res.status}_SYNC_FAILURE`);
      }

      const data: SyncBatchResponse = await res.json();
      if (!data.success) {
        throw new Error("Server rejected batch sync payload");
      }

      // Collect acknowledged mutation IDs
      const acknowledgedIds: string[] = [];
      for (const item of data.results) {
        if (item.status === "applied" || item.status === "duplicate") {
          acknowledgedIds.push(item.mutationId);
        } else if (item.status === "error") {
          console.error(`Mutation ${item.mutationId} error:`, item.error);
          await localOutboxRepo.updateStatus(item.mutationId, "failed", item.error);
        }
      }

      // Remove acknowledged mutations from local outbox
      if (acknowledgedIds.length > 0) {
        await localOutboxRepo.removeBatch(acknowledgedIds);
      }

      this.lastSyncedAt = Date.now();
      this.status = "idle";
      this.lastError = undefined;
      this.retryDelayMs = 2000; // Reset backoff

      // Broadcast to other tabs
      this.channel?.postMessage({
        type: "SYNC_COMPLETED",
        timestamp: this.lastSyncedAt,
      });

      this.notify();

      // Check if more remaining in outbox
      const remainingCount = await localOutboxRepo.countPending(this.userId);
      if (remainingCount > 0) {
        this.scheduleSync(1000);
      }

      return true;
    } catch (err: any) {
      console.warn("Background sync attempt failed:", err?.message || err);
      this.status = "error";
      this.lastError = err?.message || "Sync connection error";
      this.notify();

      // Exponential backoff with jitter
      const jitter = Math.floor(Math.random() * 1000);
      const nextDelay = Math.min(30000, this.retryDelayMs + jitter);
      this.retryDelayMs = Math.min(30000, this.retryDelayMs * 1.5);
      this.scheduleSync(nextDelay);

      return false;
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncEngine = new SyncEngine();

