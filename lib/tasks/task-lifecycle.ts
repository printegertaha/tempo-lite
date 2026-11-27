"use client";

import { getDefaultTimezone, getLocalDateString } from "@/lib/dates";
import {
  localTaskRepo,
  localTaskSessionRepo,
  localRevisionRepo,
  localLifeAreaRepo,
  localEntryRepo,
  localOutboxRepo,
  type LocalTaskSession,
} from "@/lib/local-db";
import { activeTimerEngine } from "@/lib/timer/active-timer";
import { syncEngine } from "@/lib/sync/sync-engine";

export function resolveClientTimezone(userId: string): string {
  if (typeof window !== "undefined") {
    try {
      const raw =
        localStorage.getItem(`athar_user_settings:${userId}`) ||
        localStorage.getItem("athar_user_settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.timezone) return String(parsed.timezone);
      }
    } catch {}
  }
  return getDefaultTimezone();
}

/**
 * Records an untracked direct checkbox task completion without duplicating an
 * active timer session or fabricating start timestamps/durations.
 */
export async function recordCheckboxCompletionSession(params: {
  task: any;
  userId: string;
  completedAtIso: string;
  timezone?: string;
}): Promise<LocalTaskSession | null> {
  const { task, userId, completedAtIso, timezone } = params;
  if (!task?.id) return null;

  const owner = userId || "guest";
  // If timer engine currently holds an active/paused session for this task,
  // `athar_task_completed_externally` handles finalizing the tracked timer session.
  if (activeTimerEngine.hasActiveSessionForTask(task.id)) {
    return null;
  }

  const nowMs = Date.now();
  const tz = timezone || resolveClientTimezone(owner);
  const completedDateObj = new Date(completedAtIso || nowMs);
  const localDate = getLocalDateString(completedDateObj, tz);

  // Deduplicate rapid repeated clicks on the same task within 3 seconds
  const existing = await localTaskSessionRepo.getByTask(owner, task.id).catch(() => []);
  const recentCheckbox = existing.find((s) => {
    if (s.completionSource !== "checkbox") return false;
    const t = new Date(s.endedAt || s.createdAt).getTime();
    return Math.abs(nowMs - t) < 3000;
  });
  if (recentCheckbox) return recentCheckbox;

  let lifeAreaNameSnapshot: string | null = task.lifeArea?.name || null;
  if (task.lifeAreaId && !lifeAreaNameSnapshot) {
    const area = await localLifeAreaRepo.getById(task.lifeAreaId).catch(() => null);
    lifeAreaNameSnapshot = area?.name || null;
  }

  const session: LocalTaskSession = {
    id: `chk_${crypto.randomUUID()}`,
    userId: owner,
    taskId: task.id,
    trackerId: task.trackerId ?? null,
    localDate,
    startedAt: null, // Untracked checkbox completion must NOT fabricate a start time
    endedAt: completedDateObj.toISOString(),
    durationSeconds: null, // Untracked completion must NOT fabricate duration
    status: "completed",
    completionSource: "checkbox",
    isEstimated: false,
    completedCycles: 0,
    taskTitleSnapshot: task.title || "مهمة",
    taskDescriptionSnapshot: task.description ?? null,
    subtasksSnapshot: Array.isArray(task.subtasks) ? task.subtasks : [],
    lifeAreaIdSnapshot: task.lifeAreaId ?? null,
    lifeAreaNameSnapshot,
    notes: null,
    createdAt: completedDateObj.toISOString(),
    updatedAt: completedDateObj.toISOString(),
    clientUpdatedAt: nowMs,
    _syncStatus: owner === "guest" ? "synced" : "pending",
  };

  await localTaskSessionRepo.save(session);

  if (owner !== "guest") {
    await localOutboxRepo
      .add({
        mutationId: `tsess_${session.id}`,
        userId: owner,
        entityType: "task_session",
        entityId: session.id,
        action: "create",
        payload: session,
        clientTimestamp: nowMs,
        version: 1,
        status: "pending",
        retryCount: 0,
      })
      .catch(() => {});
    syncEngine.scheduleSync(2000);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("athar_task_sessions_updated", { detail: { userId: owner } })
    );
  }

  return session;
}

/**
 * When a task is un-completed back to TODO, remove untracked checkbox completion
 * sessions so the daily achievement journal stays accurate.
 */
export async function removeCheckboxCompletionSessions(
  taskId: string,
  userId: string
): Promise<void> {
  const owner = userId || "guest";
  const sessions = await localTaskSessionRepo.getByTask(owner, taskId).catch(() => []);
  const checkboxOnly = sessions.filter((s) => s.completionSource === "checkbox");
  if (checkboxOnly.length === 0) return;

  const ids = checkboxOnly.map((s) => s.id);
  await localTaskSessionRepo.deleteBatch(ids).catch(() => {});

  if (owner !== "guest") {
    const nowMs = Date.now();
    for (const id of ids) {
      await localOutboxRepo
        .add({
          mutationId: crypto.randomUUID(),
          userId: owner,
          entityType: "task_session",
          entityId: id,
          action: "delete",
          payload: {},
          clientTimestamp: nowMs,
          version: 1,
          status: "pending",
          retryCount: 0,
        })
        .catch(() => {});
    }
    syncEngine.scheduleSync(2000);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("athar_task_sessions_updated", { detail: { userId: owner } })
    );
  }
}

/**
 * Permanently delete a task and cascade cleanup across local IndexedDB,
 * active timer, legacy timer history, sessions, revisions, exclusive tracker entries,
 * and cloud sync outbox.
 */
export async function permanentlyDeleteTaskLocalCascade(
  taskId: string,
  userId: string
): Promise<void> {
  const owner = userId || "guest";
  const isGuest = owner === "guest";
  const nowMs = Date.now();

  // 1. Discard active/completed timer & legacy timer history entries for this task
  activeTimerEngine.discardForDeletedTask(taskId);

  // 2. Collect sessions belonging to this task before removing them
  const sessions = await localTaskSessionRepo.getByTask(owner, taskId).catch(() => []);
  const sessionIds = sessions.map((s) => s.id);

  // 3. Delete all TaskSession rows for this task
  await localTaskSessionRepo.deleteByTaskId(owner, taskId).catch(() => {});

  // 4. Delete exclusive timer-generated TrackerEntries (their ID matches session.id)
  if (sessionIds.length > 0) {
    for (const sid of sessionIds) {
      const existingEntry = await localEntryRepo.getById(sid).catch(() => undefined);
      if (existingEntry && (existingEntry.userId === owner || !existingEntry.userId)) {
        await localEntryRepo.delete(sid).catch(() => {});
        if (!isGuest) {
          await localOutboxRepo
            .add({
              mutationId: crypto.randomUUID(),
              userId: owner,
              entityType: "tracker_entry",
              entityId: sid,
              action: "delete",
              payload: {},
              clientTimestamp: nowMs,
              version: 1,
              status: "pending",
              retryCount: 0,
            })
            .catch(() => {});
        }
      }
      await localRevisionRepo.deleteByEntity(owner, "task_session", sid).catch(() => {});
    }
  }

  // 5. Delete EntityRevision records for this task
  await localRevisionRepo.deleteByEntity(owner, "task", taskId).catch(() => {});

  // 6. Delete the task itself
  await localTaskRepo.delete(taskId).catch(() => {});

  // 7. Enqueue authoritative delete mutation for cloud sync (takes precedence over historical preservation)
  if (!isGuest) {
    await localOutboxRepo
      .add({
        mutationId: crypto.randomUUID(),
        userId: owner,
        entityType: "task",
        entityId: taskId,
        action: "delete",
        payload: {},
        clientTimestamp: nowMs,
        version: 1,
        status: "pending",
        retryCount: 0,
      })
      .catch(() => {});
    syncEngine.scheduleSync(1500);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("athar_task_deleted_externally", { detail: { taskId, userId: owner } })
    );
    window.dispatchEvent(
      new CustomEvent("athar_task_sessions_updated", { detail: { userId: owner } })
    );
    window.dispatchEvent(
      new CustomEvent("athar_revisions_updated", { detail: { userId: owner, entityType: "task", entityId: taskId } })
    );
  }
}
