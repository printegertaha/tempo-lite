import {
  localOutboxRepo,
  localTaskRepo,
  localTrackerRepo,
  localEntryRepo,
  localNoteRepo,
  localPrayerRepo,
  localAbstinenceRepo,
  localLifeAreaRepo,
  localDomainRepo,
  localSyncMetaRepo,
  LocalConflictRecord,
  LocalEntityType,
  MAX_OUTBOX_RETRIES,
} from "../local-db";
import { coalesceMutationsWithDropped } from "./coalesce";
import type { SyncBatchResponse } from "./server-handler";

export type SyncState = "idle" | "syncing" | "offline" | "error" | "conflict";

type SyncListener = (state: {
  status: SyncState;
  pendingCount: number;
  failedCount: number;
  conflictCount: number;
  conflicts: LocalConflictRecord[];
  lastSyncedAt: number | null;
  error?: string;
}) => void;

function toIsoStringSafe(v: any): string {
  if (!v) return new Date().toISOString();
  if (typeof v === "string") return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function toOptionalIso(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

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
          if (this.userId && event.data.fromPull !== true) {
            void this.pullNow();
          } else {
            this.notify();
          }
        } else if (event.data?.type === "TRIGGER_SYNC") {
          this.scheduleSync(300);
        }
      };

      window.addEventListener("online", () => {
        this.status = "idle";
        this.retryDelayMs = 2000;
        this.scheduleSync(300);
      });

      window.addEventListener("offline", () => {
        this.status = "offline";
        this.notify();
      });

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && this.userId && navigator.onLine) {
          this.scheduleSync(800);
        }
      });

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data?.type === "SW_BACKGROUND_SYNC") {
            this.scheduleSync(100);
          }
        });
      }
    }
  }

  public init(userId: string) {
    if (!userId || userId === "guest") {
      this.userId = null;
      this.notify();
      return;
    }
    if (this.userId !== userId) {
      this.userId = userId;
      void localOutboxRepo.recoverStaleSyncing(userId).catch(() => {});
      this.notify();
      if (typeof navigator === "undefined" || navigator.onLine) {
        this.scheduleSync(250);
      }
    }
  }

  public clearSessionUser() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.maxIntervalTimer) clearTimeout(this.maxIntervalTimer);
    this.debounceTimer = null;
    this.maxIntervalTimer = null;
    this.lastMutationTime = 0;
    this.pendingResync = false;
    this.userId = null;
    this.status = "idle";
    this.lastError = undefined;
    this.notify();
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    void this.notifySingle(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      void this.notifySingle(listener);
    }
  }

  private async notifySingle(listener: SyncListener) {
    const [pendingCount, failedCount, conflicts] = this.userId
      ? await Promise.all([
          localOutboxRepo.countPending(this.userId).catch(() => 0),
          localOutboxRepo.countFailed(this.userId).catch(() => 0),
          localSyncMetaRepo.getConflicts(this.userId).catch(() => [] as LocalConflictRecord[]),
        ])
      : [0, 0, [] as LocalConflictRecord[]];

    const conflictCount = conflicts.length;
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    const effectiveStatus: SyncState = isOffline
      ? "offline"
      : conflictCount > 0 && this.status !== "syncing"
      ? "conflict"
      : failedCount > 0 && this.status === "idle"
      ? "error"
      : this.status;

    listener({
      status: effectiveStatus,
      pendingCount,
      failedCount,
      conflictCount,
      conflicts,
      lastSyncedAt: this.lastSyncedAt,
      error: this.lastError,
    });
  }

  private requestBackgroundSyncTag() {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready
      .then((reg: any) => {
        if (reg?.sync?.register) {
          return reg.sync.register("athar-outbox-sync");
        }
      })
      .catch(() => {});
  }

  /**
   * Schedule debounced synchronization (push + incremental pull).
   */
  public scheduleSync(delayMs = 1500) {
    if (!this.userId) return;
    this.requestBackgroundSyncTag();
    this.notify();

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.status = "offline";
      this.notify();
      return;
    }

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
    if (timeSinceFirst >= 10000) {
      void this.flushNow();
      return;
    }

    if (!this.maxIntervalTimer) {
      this.maxIntervalTimer = setTimeout(() => {
        void this.flushNow();
      }, 10000);
    }

    this.debounceTimer = setTimeout(() => {
      void this.flushNow();
    }, delayMs);
  }

  public async retryFailed(): Promise<boolean> {
    if (!this.userId || (typeof navigator !== "undefined" && !navigator.onLine)) return false;
    await localOutboxRepo.resetFailedForRetry(this.userId);
    this.lastError = undefined;
    this.status = "idle";
    return this.flushNow({ ignoreBackoff: true });
  }

  private async getLocalEntitySnapshot(entityType: LocalEntityType, entityId: string) {
    switch (entityType) {
      case "task":
        return localTaskRepo.getById(entityId);
      case "tracker":
        return localTrackerRepo.getById(entityId);
      case "life_area":
        return localLifeAreaRepo.getById(entityId);
      case "prayer_record":
        return localPrayerRepo.getById(entityId);
      case "abstinence":
        return localAbstinenceRepo.getTracker(entityId);
      default:
        return null;
    }
  }

  private async markLocalSyncedMeta(
    entityType: LocalEntityType,
    entityId: string,
    serverVersion?: number,
    serverUpdatedAt?: string
  ) {
    if (entityType === "task") {
      const existing = await localTaskRepo.getById(entityId);
      if (existing) {
        await localTaskRepo.save({
          ...existing,
          ...(serverVersion !== undefined ? { version: serverVersion } : {}),
          ...(serverUpdatedAt ? { updatedAt: serverUpdatedAt } : {}),
          _syncStatus: "synced",
        });
      }
    } else if (entityType === "tracker") {
      const existing = await localTrackerRepo.getById(entityId);
      if (existing) {
        await localTrackerRepo.save({
          ...existing,
          ...(serverVersion !== undefined ? { version: serverVersion } : {}),
          ...(serverUpdatedAt ? { updatedAt: serverUpdatedAt } : {}),
          _syncStatus: "synced",
        });
      }
    }
  }

  /**
   * Push Outbox -> Pull Incremental Changes safely under a single-flight lock.
   */
  public async flushNow(options: { ignoreBackoff?: boolean; skipPull?: boolean } = {}): Promise<boolean> {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.maxIntervalTimer) clearTimeout(this.maxIntervalTimer);
    this.debounceTimer = null;
    this.maxIntervalTimer = null;
    this.lastMutationTime = 0;

    if (!this.userId || (typeof navigator !== "undefined" && !navigator.onLine)) {
      this.notify();
      return false;
    }

    if (this.isSyncing) {
      this.pendingResync = true;
      return false;
    }

    let pushSuccess = true;
    let attemptedIds: string[] = [];
    let scheduledNextDelay: number | null = null;
    try {
      this.isSyncing = true;
      this.pendingResync = false;
      this.status = "syncing";
      this.notify();

      const userId = this.userId;
      const respectBackoff = !options.ignoreBackoff;
      const rawPending = await localOutboxRepo.getPending(userId, respectBackoff);

      if (rawPending.length > 0) {
        const { coalesced, cancelledIds } = coalesceMutationsWithDropped(rawPending);

        if (cancelledIds.length > 0) {
          await localOutboxRepo.removeBatch(cancelledIds);
        }

        if (coalesced.length > 0) {
          const batchWithMeta = coalesced.slice(0, 50);
          attemptedIds = batchWithMeta.flatMap((b) => b.coalescedIds);
          const coalescedMap = new Map<string, (typeof batchWithMeta)[number]>();
          const batchPayload = batchWithMeta.map((item) => {
            coalescedMap.set(item.mutationId, item);
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

          const acknowledgedIds: string[] = [];
          let transientErrorCount = 0;
          let permanentErrorCount = 0;
          let latestErrorMsg: string | undefined;

          for (const item of data.results) {
            const origMut = coalescedMap.get(item.mutationId);
            const allIdsForItem = origMut?.coalescedIds || [item.mutationId];

            if (item.status === "applied" || item.status === "duplicate") {
              acknowledgedIds.push(...allIdsForItem);
              if (origMut && origMut.action !== "delete") {
                await this.markLocalSyncedMeta(
                  origMut.entityType,
                  origMut.entityId,
                  item.serverVersion,
                  item.serverUpdatedAt
                ).catch(() => {});
              }
            } else if (item.status === "conflict" && origMut) {
              // Conflict detected: preserve BOTH versions safely and remove from active retry loop
              const localSnapshot =
                (await this.getLocalEntitySnapshot(origMut.entityType, origMut.entityId)) ||
                origMut.payload;
              await localSyncMetaRepo.addConflict({
                id: crypto.randomUUID(),
                userId,
                entityType: origMut.entityType,
                entityId: origMut.entityId,
                localRecord: localSnapshot,
                serverRecord: item.serverRecord,
                detectedAt: Date.now(),
              });
              if (origMut.entityType === "task" && localSnapshot) {
                await localTaskRepo.save({
                  ...localSnapshot,
                  _syncStatus: "conflict",
                  _serverConflictCopy: item.serverRecord,
                });
              }
              acknowledgedIds.push(...allIdsForItem);
            } else if (item.status === "error") {
              latestErrorMsg = item.error || "SYNC_MUTATION_ERROR";
              if (item.permanent) {
                permanentErrorCount++;
                for (const id of allIdsForItem) {
                  await localOutboxRepo.updateStatus(id, "permanent_error", item.error);
                }
              } else {
                transientErrorCount++;
                const backoffMs = Math.min(60000, this.retryDelayMs);
                const nextRetryAt = Date.now() + backoffMs;
                for (const id of allIdsForItem) {
                  await localOutboxRepo.updateStatus(id, "failed", item.error, nextRetryAt);
                }
              }
            }
          }

          if (acknowledgedIds.length > 0) {
            await localOutboxRepo.removeBatch(acknowledgedIds);
            this.lastSyncedAt = Date.now();
            this.retryDelayMs = 2000;
            this.channel?.postMessage({
              type: "SYNC_COMPLETED",
              timestamp: this.lastSyncedAt,
              fromPull: false,
            });
          }

          if (transientErrorCount > 0 || permanentErrorCount > 0) {
            pushSuccess = false;
            this.status = "error";
            this.lastError = latestErrorMsg;
          }
        }
      }

      // Pull incremental remote updates after push
      if (!options.skipPull && pushSuccess) {
        await this.pullFromServerInternal(userId);
      }

      if (pushSuccess) {
        const remainingFailed = await localOutboxRepo.countFailed(userId);
        this.status = remainingFailed > 0 ? "error" : "idle";
        if (remainingFailed === 0) this.lastError = undefined;
      }

      this.notify();

      const remainingPending = await localOutboxRepo.countPending(userId);
      if (remainingPending > 0) {
        const jitter = Math.floor(Math.random() * 1000);
        scheduledNextDelay = pushSuccess ? 500 : Math.min(30000, this.retryDelayMs + jitter);
        if (!pushSuccess) {
          this.retryDelayMs = Math.min(30000, this.retryDelayMs * 1.5);
        }
      }

      return pushSuccess;
    } catch (err: any) {
      const errMsg = err?.message || "Sync connection error";
      console.warn("Background sync attempt failed:", errMsg);
      this.status = "error";
      this.lastError = errMsg;

      const jitter = Math.floor(Math.random() * 1000);
      const nextDelay = Math.min(30000, this.retryDelayMs + jitter);
      const nextRetryAt = Date.now() + nextDelay;

      if (attemptedIds.length > 0) {
        for (const id of attemptedIds) {
          await localOutboxRepo.updateStatus(id, "failed", errMsg, nextRetryAt).catch(() => {});
        }
      }

      this.notify();

      const remaining = this.userId ? await localOutboxRepo.countPending(this.userId) : 0;
      if (remaining > 0 && MAX_OUTBOX_RETRIES > 0) {
        scheduledNextDelay = nextDelay;
        this.retryDelayMs = Math.min(30000, this.retryDelayMs * 1.5);
      }

      return false;
    } finally {
      this.isSyncing = false;
      if (this.pendingResync) {
        this.pendingResync = false;
        this.scheduleSync(400);
      } else if (scheduledNextDelay !== null) {
        this.scheduleSync(scheduledNextDelay);
      }
    }
  }

  public async pullNow(forceFull = false): Promise<boolean> {
    if (!this.userId || (typeof navigator !== "undefined" && !navigator.onLine)) return false;
    if (forceFull) {
      await localSyncMetaRepo.setCursor(this.userId, 0);
    }
    return this.flushNow();
  }

  private async pullFromServerInternal(userId: string): Promise<void> {
    const cursor = await localSyncMetaRepo.getCursor(userId);
    const sinceParam = cursor && cursor > 0 ? cursor : 0;

    const res = await fetch(`/api/sync/pull?since=${sinceParam}`, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });

    if (!res.ok) {
      if (res.status === 401) return;
      throw new Error(`HTTP_${res.status}_PULL_FAILURE`);
    }

    const payload = await res.json();
    if (!payload?.success || !payload?.changes) return;

    const [pendingMutations, existingConflicts] = await Promise.all([
      localOutboxRepo.getPending(userId, false),
      localSyncMetaRepo.getConflicts(userId),
    ]);

    const protectedEntityKeys = new Set<string>();
    for (const m of pendingMutations) {
      protectedEntityKeys.add(`${m.entityType}:${m.entityId}`);
    }
    for (const c of existingConflicts) {
      protectedEntityKeys.add(`${c.entityType}:${c.entityId}`);
    }

    const changedTypes = new Set<string>();
    const { changes, deletions = [], serverTimestamp, isFullSync } = payload;

    // 1. Apply remote deletions safely (never deleting pending/conflicted local items)
    for (const del of deletions) {
      const key = `${del.entityType}:${del.entityId}`;
      if (protectedEntityKeys.has(key)) continue;
      changedTypes.add(del.entityType);
      if (del.entityType === "task") await localTaskRepo.delete(del.entityId);
      else if (del.entityType === "tracker") await localTrackerRepo.delete(del.entityId);
      else if (del.entityType === "tracker_entry") await localEntryRepo.delete(del.entityId);
      else if (del.entityType === "daily_note") await localNoteRepo.delete(del.entityId);
      else if (del.entityType === "life_area") await localLifeAreaRepo.delete(del.entityId);
      else if (del.entityType === "gym_workout") await localDomainRepo.deleteGymWorkout(del.entityId);
      else if (del.entityType === "meal_entry") await localDomainRepo.deleteMealEntry(del.entityId);
      else if (del.entityType === "expense_entry") await localDomainRepo.deleteExpenseEntry(del.entityId);
      else if (del.entityType === "prayer_record") await localPrayerRepo.delete(del.entityId);
      else if (del.entityType === "abstinence") await localAbstinenceRepo.deleteTracker(del.entityId);
    }

    // 2. Tasks merge
    if (Array.isArray(changes.tasks)) {
      const toSave: any[] = [];
      for (const t of changes.tasks) {
        if (!t?.id || protectedEntityKeys.has(`task:${t.id}`)) continue;
        toSave.push({
          ...t,
          userId,
          completedAt: toOptionalIso(t.completedAt),
          archivedAt: toOptionalIso(t.archivedAt),
          createdAt: toIsoStringSafe(t.createdAt),
          updatedAt: toIsoStringSafe(t.updatedAt),
          subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
          tags: Array.isArray(t.tags) ? t.tags : [],
          version: t.version || 1,
          clientUpdatedAt: Date.now(),
          _syncStatus: "synced",
        });
      }
      if (toSave.length > 0) {
        await localTaskRepo.saveBatch(toSave);
        changedTypes.add("task");
      }
      if (isFullSync) {
        const remoteIds = new Set(changes.tasks.map((t: any) => t.id));
        const localAll = await localTaskRepo.getAllForUser(userId, true);
        const staleIds = localAll
          .filter((l) => !remoteIds.has(l.id) && !protectedEntityKeys.has(`task:${l.id}`))
          .map((l) => l.id);
        if (staleIds.length > 0) {
          await localTaskRepo.deleteBatch(staleIds);
          changedTypes.add("task");
        }
      }
    }

    // 3. Life Areas merge
    if (Array.isArray(changes.lifeAreas)) {
      const toSave = changes.lifeAreas
        .filter((a: any) => a?.id && !protectedEntityKeys.has(`life_area:${a.id}`))
        .map((a: any) => ({ ...a, userId, _syncStatus: "synced" }));
      if (toSave.length > 0) {
        await localLifeAreaRepo.saveBatch(toSave);
        changedTypes.add("life_area");
      }
      if (isFullSync) {
        const remoteIds = new Set(changes.lifeAreas.map((a: any) => a.id));
        const localAll = await localLifeAreaRepo.getAllForUser(userId, true);
        const staleIds = localAll
          .filter((l) => !remoteIds.has(l.id) && !protectedEntityKeys.has(`life_area:${l.id}`))
          .map((l) => l.id);
        if (staleIds.length > 0) {
          await localLifeAreaRepo.deleteBatch(staleIds);
          changedTypes.add("life_area");
        }
      }
    }

    // 4. Trackers merge
    if (Array.isArray(changes.trackers)) {
      const toSave = changes.trackers
        .filter((t: any) => t?.id && !protectedEntityKeys.has(`tracker:${t.id}`))
        .map((t: any) => ({ ...t, userId, _syncStatus: "synced" }));
      if (toSave.length > 0) {
        await localTrackerRepo.saveBatch(toSave);
        changedTypes.add("tracker");
      }
      if (isFullSync) {
        const remoteIds = new Set(changes.trackers.map((t: any) => t.id));
        const localAll = await localTrackerRepo.getAllForUser(userId, true);
        const staleIds = localAll
          .filter((l) => !remoteIds.has(l.id) && !protectedEntityKeys.has(`tracker:${l.id}`))
          .map((l) => l.id);
        if (staleIds.length > 0) {
          await localTrackerRepo.deleteBatch(staleIds);
          changedTypes.add("tracker");
        }
      }
    }

    // 5. Tracker entries merge
    if (Array.isArray(changes.trackerEntries) && changes.trackerEntries.length > 0) {
      const toSave = changes.trackerEntries
        .filter((e: any) => e?.id && !protectedEntityKeys.has(`tracker_entry:${e.id}`))
        .map((e: any) => ({
          ...e,
          userId,
          occurredAt: toIsoStringSafe(e.occurredAt),
        }));
      if (toSave.length > 0) {
        await localEntryRepo.saveBatch(toSave);
        changedTypes.add("tracker_entry");
      }
    }

    // 6. Daily notes merge
    if (Array.isArray(changes.dailyNotes) && changes.dailyNotes.length > 0) {
      const toSave = changes.dailyNotes
        .filter((n: any) => n?.id && !protectedEntityKeys.has(`daily_note:${n.id}`))
        .map((n: any) => ({
          ...n,
          userId,
          updatedAt: toIsoStringSafe(n.updatedAt),
        }));
      if (toSave.length > 0) {
        await localNoteRepo.saveBatch(toSave);
        changedTypes.add("daily_note");
      }
    }

    // 7. Prayer records merge
    if (Array.isArray(changes.prayerRecords) && changes.prayerRecords.length > 0) {
      const toSave = changes.prayerRecords
        .filter((p: any) => p?.id && !protectedEntityKeys.has(`prayer_record:${p.id}`))
        .map((p: any) => ({
          ...p,
          userId,
          completedAt: toOptionalIso(p.completedAt),
          clientUpdatedAt: Date.now(),
        }));
      if (toSave.length > 0) {
        await localPrayerRepo.saveBatch(toSave);
        changedTypes.add("prayer_record");
      }
    }

    // 8. Abstinence trackers & sessions
    if (Array.isArray(changes.abstinenceTrackers) && changes.abstinenceTrackers.length > 0) {
      for (const a of changes.abstinenceTrackers) {
        if (a?.id && !protectedEntityKeys.has(`abstinence:${a.id}`)) {
          await localAbstinenceRepo.saveTracker({ ...a, userId });
          changedTypes.add("abstinence");
        }
      }
    }
    if (Array.isArray(changes.abstinenceSessions) && changes.abstinenceSessions.length > 0) {
      for (const s of changes.abstinenceSessions) {
        if (s?.id && !protectedEntityKeys.has(`abstinence_session:${s.id}`)) {
          await localAbstinenceRepo.saveSession({
            ...s,
            trackerId: s.abstinenceTrackerId,
            userId,
            startedAt: toIsoStringSafe(s.startedAt),
            endedAt: toOptionalIso(s.endedAt),
          });
          changedTypes.add("abstinence_session");
        }
      }
    }

    // 9. Gym, Meals, Expenses
    if (Array.isArray(changes.gymWorkouts)) {
      const toSave = changes.gymWorkouts
        .filter((g: any) => g?.id && !protectedEntityKeys.has(`gym_workout:${g.id}`))
        .map((g: any) => ({ ...g, userId }));
      if (toSave.length > 0) {
        await localDomainRepo.saveGymBatch(toSave);
        changedTypes.add("gym_workout");
      }
      if (isFullSync) {
        const remoteIds = new Set(changes.gymWorkouts.map((g: any) => g.id));
        const localAll = await localDomainRepo.getGymWorkouts(userId);
        for (const l of localAll) {
          if (!remoteIds.has(l.id) && !protectedEntityKeys.has(`gym_workout:${l.id}`)) {
            await localDomainRepo.deleteGymWorkout(l.id);
            changedTypes.add("gym_workout");
          }
        }
      }
    }

    if (Array.isArray(changes.mealEntries)) {
      const toSave = changes.mealEntries
        .filter((m: any) => m?.id && !protectedEntityKeys.has(`meal_entry:${m.id}`))
        .map((m: any) => ({ ...m, userId }));
      if (toSave.length > 0) {
        await localDomainRepo.saveMealBatch(toSave);
        changedTypes.add("meal_entry");
      }
      if (isFullSync) {
        const remoteIds = new Set(changes.mealEntries.map((m: any) => m.id));
        const localAll = await localDomainRepo.getMealEntries(userId);
        for (const l of localAll) {
          if (!remoteIds.has(l.id) && !protectedEntityKeys.has(`meal_entry:${l.id}`)) {
            await localDomainRepo.deleteMealEntry(l.id);
            changedTypes.add("meal_entry");
          }
        }
      }
    }

    if (Array.isArray(changes.expenseEntries)) {
      const toSave = changes.expenseEntries
        .filter((e: any) => e?.id && !protectedEntityKeys.has(`expense_entry:${e.id}`))
        .map((e: any) => ({ ...e, userId }));
      if (toSave.length > 0) {
        await localDomainRepo.saveExpenseBatch(toSave);
        changedTypes.add("expense_entry");
      }
      if (isFullSync) {
        const remoteIds = new Set(changes.expenseEntries.map((e: any) => e.id));
        const localAll = await localDomainRepo.getExpenseEntries(userId);
        for (const l of localAll) {
          if (!remoteIds.has(l.id) && !protectedEntityKeys.has(`expense_entry:${l.id}`)) {
            await localDomainRepo.deleteExpenseEntry(l.id);
            changedTypes.add("expense_entry");
          }
        }
      }
    }

    // 10. User Settings
    if (changes.userSettings && !protectedEntityKeys.has(`user_settings:${userId}`)) {
      await localSyncMetaRepo.saveUserSettings(userId, changes.userSettings);
      changedTypes.add("user_settings");
    }

    if (serverTimestamp) {
      await localSyncMetaRepo.setCursor(userId, serverTimestamp);
      this.lastSyncedAt = serverTimestamp;
    }

    if (changedTypes.size > 0 && typeof window !== "undefined") {
      const typesArray = Array.from(changedTypes);
      window.dispatchEvent(
        new CustomEvent("athar_data_synced", {
          detail: { userId, changedTypes: typesArray },
        })
      );
      if (changedTypes.has("task")) {
        window.dispatchEvent(
          new CustomEvent("athar_tasks_updated", { detail: { userId } })
        );
      }
    }
  }

  /**
   * Explicitly resolve a detected conflict without silently dropping user work.
   */
  public async resolveConflict(
    conflictId: string,
    strategy: "keep_local" | "keep_remote" | "keep_both"
  ): Promise<void> {
    if (!this.userId) return;
    const conflicts = await localSyncMetaRepo.getConflicts(this.userId);
    const target = conflicts.find((c) => c.id === conflictId);
    if (!target) return;

    const { entityType, entityId, localRecord, serverRecord } = target;
    const nowMs = Date.now();

    if (strategy === "keep_remote" && serverRecord) {
      if (entityType === "task") {
        await localTaskRepo.save({
          ...serverRecord,
          userId: this.userId,
          _syncStatus: "synced",
          clientUpdatedAt: nowMs,
        });
      } else if (entityType === "tracker") {
        await localTrackerRepo.save({
          ...serverRecord,
          userId: this.userId,
          _syncStatus: "synced",
        });
      } else if (entityType === "daily_note") {
        await localNoteRepo.save({ ...serverRecord, userId: this.userId });
      }
    } else if (strategy === "keep_local" && localRecord) {
      const cleanLocal = { ...localRecord };
      delete cleanLocal._serverConflictCopy;
      cleanLocal._syncStatus = "pending";

      if (entityType === "task") {
        await localTaskRepo.save(cleanLocal);
      } else if (entityType === "tracker") {
        await localTrackerRepo.save(cleanLocal);
      } else if (entityType === "daily_note") {
        await localNoteRepo.save(cleanLocal);
      }

      await localOutboxRepo.add({
        mutationId: crypto.randomUUID(),
        userId: this.userId,
        entityType,
        entityId,
        action: "update",
        payload: { ...cleanLocal, _forceOverwrite: true },
        clientTimestamp: nowMs,
        version: serverRecord?.version || cleanLocal.version || 1,
        status: "pending",
        retryCount: 0,
      });
    } else if (strategy === "keep_both" && localRecord && serverRecord) {
      // Keep remote under original ID, create duplicate copy for user's local version
      if (entityType === "task") {
        await localTaskRepo.save({
          ...serverRecord,
          userId: this.userId,
          _syncStatus: "synced",
          clientUpdatedAt: nowMs,
        });
        const copyId = crypto.randomUUID();
        const copyTask = {
          ...localRecord,
          id: copyId,
          title: `${localRecord.title || "مهمة"} (نسخة محلية)`,
          userId: this.userId,
          version: 1,
          _syncStatus: "pending",
          clientUpdatedAt: nowMs,
        };
        delete copyTask._serverConflictCopy;
        await localTaskRepo.save(copyTask);
        await localOutboxRepo.add({
          mutationId: crypto.randomUUID(),
          userId: this.userId,
          entityType: "task",
          entityId: copyId,
          action: "create",
          payload: copyTask,
          clientTimestamp: nowMs,
          version: 1,
          status: "pending",
          retryCount: 0,
        });
      } else {
        // Fallback: preserve local text appended alongside remote
        await this.resolveConflict(conflictId, "keep_local");
        return;
      }
    }

    await localSyncMetaRepo.removeConflict(this.userId, conflictId);
    this.status = "idle";
    this.notify();

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("athar_data_synced", {
          detail: { userId: this.userId, changedTypes: [entityType] },
        })
      );
      if (entityType === "task") {
        window.dispatchEvent(
          new CustomEvent("athar_tasks_updated", { detail: { userId: this.userId } })
        );
      }
    }

    this.scheduleSync(300);
  }
}

export const syncEngine = new SyncEngine();
