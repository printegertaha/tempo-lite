"use client";

import {
  localTaskRepo,
  localTrackerRepo,
  localEntryRepo,
  localOutboxRepo,
  localAbstinenceRepo,
  LocalMutation,
} from "./index";
import { syncEngine } from "@/lib/sync/sync-engine";
import { calculateAbstinenceDuration } from "@/lib/dates";
import { slugify } from "@/lib/validations/life-area";

async function queueMutation(
  userId: string,
  entityType: LocalMutation["entityType"],
  entityId: string,
  action: LocalMutation["action"],
  payload: any,
  version = 1,
  baseUpdatedAt?: string | number
) {
  if (!userId || userId === "guest") return;
  const mutation: LocalMutation = {
    mutationId: crypto.randomUUID(),
    userId,
    entityType,
    entityId,
    action,
    payload,
    clientTimestamp: Date.now(),
    version,
    ...(baseUpdatedAt !== undefined ? { baseUpdatedAt } : {}),
    status: "pending",
    retryCount: 0,
  };
  await localOutboxRepo.add(mutation);
  syncEngine.scheduleSync(600);
}

/**
 * Local-first Boolean Toggle: writes IDB + Outbox immediately (<16ms), syncs asynchronously.
 */
export async function toggleBooleanEntryLocalFirst(
  userId: string,
  tracker: any,
  localDate: string
) {
  const effectiveUserId = userId || "guest";
  const existingList = await localEntryRepo.getByTrackerAndDate(
    effectiveUserId,
    tracker.id,
    localDate
  );
  const existing = existingList[existingList.length - 1];

  if (existing) {
    const updated = {
      ...existing,
      valueBoolean: !existing.valueBoolean,
      occurredAt: new Date().toISOString(),
    };
    await localEntryRepo.save(updated);
    await queueMutation(effectiveUserId, "tracker_entry", updated.id, "update", {
      trackerId: tracker.id,
      localDate,
      valueBoolean: updated.valueBoolean,
      occurredAt: updated.occurredAt,
    });
    return { success: true, data: updated };
  }

  const created = {
    id: crypto.randomUUID(),
    trackerId: tracker.id,
    userId: effectiveUserId,
    localDate,
    occurredAt: new Date().toISOString(),
    valueBoolean: true,
    trackerVersion: tracker.version || 1,
  };
  await localEntryRepo.save(created);
  await queueMutation(effectiveUserId, "tracker_entry", created.id, "create", created);
  return { success: true, data: created };
}

/**
 * Local-first Counter Increment: updates IDB + Outbox immediately.
 */
export async function incrementCounterLocalFirst(
  userId: string,
  tracker: any,
  amount: number,
  localDate: string,
  notes?: string | null
) {
  const effectiveUserId = userId || "guest";
  const created = {
    id: crypto.randomUUID(),
    trackerId: tracker.id,
    userId: effectiveUserId,
    localDate,
    occurredAt: new Date().toISOString(),
    valueNumeric: amount,
    notes: notes || null,
    trackerVersion: tracker.version || 1,
  };
  await localEntryRepo.save(created);
  await queueMutation(effectiveUserId, "tracker_entry", created.id, "create", created);
  return { success: true, data: created };
}

/**
 * Local-first Duration Session Log
 */
export async function logDurationLocalFirst(
  userId: string,
  tracker: any,
  durationSeconds: number,
  localDate: string,
  subject?: string | null,
  notes?: string | null
) {
  const effectiveUserId = userId || "guest";
  const created = {
    id: crypto.randomUUID(),
    trackerId: tracker.id,
    userId: effectiveUserId,
    localDate,
    occurredAt: new Date().toISOString(),
    valueDuration: durationSeconds,
    entryPayload: subject ? { subject } : undefined,
    notes: notes || null,
    trackerVersion: tracker.version || 1,
  };
  await localEntryRepo.save(created);
  await queueMutation(effectiveUserId, "tracker_entry", created.id, "create", created);
  return { success: true, data: created };
}

/**
 * Local-first Checklist Item Toggle
 */
export async function toggleChecklistItemLocalFirst(
  userId: string,
  tracker: any,
  itemId: string,
  localDate: string
) {
  const effectiveUserId = userId || "guest";
  const existingList = await localEntryRepo.getByTrackerAndDate(
    effectiveUserId,
    tracker.id,
    localDate
  );
  const existing = existingList[existingList.length - 1];
  let completedIds: string[] = existing?.entryPayload?.completedItemIds || [];

  if (completedIds.includes(itemId)) {
    completedIds = completedIds.filter((id) => id !== itemId);
  } else {
    completedIds = [...completedIds, itemId];
  }

  const totalItems = tracker.trackerConfig?.items?.length || 1;
  const isAllCompleted = completedIds.length >= totalItems;

  if (existing) {
    const updated = {
      ...existing,
      valueNumeric: completedIds.length,
      valueBoolean: isAllCompleted,
      entryPayload: {
        ...(existing.entryPayload || {}),
        completedItemIds: completedIds,
      },
      occurredAt: new Date().toISOString(),
    };
    await localEntryRepo.save(updated);
    await queueMutation(effectiveUserId, "tracker_entry", updated.id, "update", {
      trackerId: tracker.id,
      localDate,
      valueNumeric: updated.valueNumeric,
      valueBoolean: updated.valueBoolean,
      entryPayload: updated.entryPayload,
      occurredAt: updated.occurredAt,
    });
    return { success: true, data: updated };
  }

  const created = {
    id: crypto.randomUUID(),
    trackerId: tracker.id,
    userId: effectiveUserId,
    localDate,
    occurredAt: new Date().toISOString(),
    valueNumeric: completedIds.length,
    valueBoolean: isAllCompleted,
    entryPayload: { completedItemIds: completedIds },
    trackerVersion: tracker.version || 1,
  };
  await localEntryRepo.save(created);
  await queueMutation(effectiveUserId, "tracker_entry", created.id, "create", created);
  return { success: true, data: created };
}

/**
 * Local-first Avoidance Day Logging
 */
export async function logAvoidanceLocalFirst(
  userId: string,
  tracker: any,
  isClean: boolean,
  localDate: string,
  urgeRating?: number | null,
  notes?: string | null
) {
  const effectiveUserId = userId || "guest";
  const existingList = await localEntryRepo.getByTrackerAndDate(
    effectiveUserId,
    tracker.id,
    localDate
  );
  const existing = existingList[existingList.length - 1];
  const entryPayload = { isClean, urgeRating: urgeRating ?? null };

  if (existing) {
    const updated = {
      ...existing,
      valueBoolean: isClean,
      entryPayload,
      notes: notes || existing.notes || null,
      occurredAt: new Date().toISOString(),
    };
    await localEntryRepo.save(updated);
    await queueMutation(effectiveUserId, "tracker_entry", updated.id, "update", {
      trackerId: tracker.id,
      localDate,
      valueBoolean: updated.valueBoolean,
      entryPayload,
      notes: updated.notes,
      occurredAt: updated.occurredAt,
    });
    return { success: true, data: updated };
  }

  const created = {
    id: crypto.randomUUID(),
    trackerId: tracker.id,
    userId: effectiveUserId,
    localDate,
    occurredAt: new Date().toISOString(),
    valueBoolean: isClean,
    entryPayload,
    notes: notes || null,
    trackerVersion: tracker.version || 1,
  };
  await localEntryRepo.save(created);
  await queueMutation(effectiveUserId, "tracker_entry", created.id, "create", created);
  return { success: true, data: created };
}

/**
 * Local-first Generic Tracker Entry Log (NUMBER, COUNTER, DURATION, TIME_RANGE)
 */
export async function logGenericEntryLocalFirst(
  userId: string,
  tracker: any,
  payload: any
) {
  const effectiveUserId = userId || "guest";

  let computedDuration = payload.valueDuration ?? null;
  if (payload.timeRangeStart && payload.timeRangeEnd && computedDuration === null) {
    const diff =
      new Date(payload.timeRangeEnd).getTime() - new Date(payload.timeRangeStart).getTime();
    computedDuration = Math.max(0, Math.round(diff / 1000));
  }

  const created = {
    id: crypto.randomUUID(),
    trackerId: tracker.id,
    userId: effectiveUserId,
    localDate: payload.localDate,
    occurredAt: new Date().toISOString(),
    valueBoolean: payload.valueBoolean ?? null,
    valueNumeric: payload.valueNumeric ?? null,
    valueDuration: computedDuration,
    timeRangeStart: payload.timeRangeStart ?? null,
    timeRangeEnd: payload.timeRangeEnd ?? null,
    entryPayload: payload.entryPayload ?? null,
    notes: payload.notes ?? null,
    trackerVersion: tracker.version || 1,
  };
  await localEntryRepo.save(created);
  await queueMutation(effectiveUserId, "tracker_entry", created.id, "create", created);
  return { success: true, data: created };
}

/**
 * Local-first Delete Tracker Entry
 */
export async function deleteTrackerEntryLocalFirst(userId: string, entryId: string) {
  const effectiveUserId = userId || "guest";
  await localEntryRepo.delete(entryId);
  await queueMutation(effectiveUserId, "tracker_entry", entryId, "delete", {});
  return { success: true, data: true };
}

/**
 * Local-first Save Tracker (Create or Update)
 */
export async function saveTrackerLocalFirst(
  userId: string,
  trackerData: any,
  isEditing: boolean,
  existingId?: string
) {
  const effectiveUserId = userId || "guest";
  const isGuest = effectiveUserId === "guest";
  const nowIso = new Date().toISOString();

  if (isEditing && existingId) {
    const existing = await localTrackerRepo.getById(existingId);
    const updated = {
      ...(existing || {}),
      ...trackerData,
      id: existingId,
      userId: effectiveUserId,
      updatedAt: nowIso,
    };
    await localTrackerRepo.save(updated);
    if (!isGuest) {
      await queueMutation(
        effectiveUserId,
        "tracker",
        existingId,
        "update",
        trackerData,
        existing?.version || 1
      );
    }
    return { success: true, data: updated };
  }

  const newId = crypto.randomUUID();
  const baseSlug = slugify(trackerData.name || "habit");
  const newTracker = {
    ...trackerData,
    id: newId,
    userId: effectiveUserId,
    slug: `${baseSlug}-${Date.now().toString(36)}`,
    isArchived: false,
    isPaused: false,
    displayPreferences: { isPinned: false },
    sortOrder: Date.now(),
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  await localTrackerRepo.save(newTracker);

  if (!isGuest) {
    await queueMutation(effectiveUserId, "tracker", newId, "create", newTracker, 1);
  }
  if (newTracker.metricType === "AVOIDANCE") {
    const absId = crypto.randomUUID();
    const absTracker = {
      id: absId,
      userId: effectiveUserId,
      trackerId: newId,
      name: newTracker.name,
      description: newTracker.description || null,
      icon: newTracker.icon || "ShieldCheck",
      color: newTracker.color || "rose",
      targetDays: newTracker.targetValue ? Math.round(newTracker.targetValue) : 30,
      isArchived: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await localAbstinenceRepo.saveTracker(absTracker);
    await localAbstinenceRepo.saveSession({
      id: crypto.randomUUID(),
      abstinenceTrackerId: absId,
      trackerId: absId,
      userId: effectiveUserId,
      startedAt: nowIso,
      endedAt: null,
      durationSeconds: null,
    });
    if (!isGuest) {
      await queueMutation(effectiveUserId, "abstinence", absId, "create", {
        ...absTracker,
        startedAt: nowIso,
      });
    }
  }

  return { success: true, data: newTracker };
}

/**
 * Enrich a local abstinence tracker + its sessions with computed duration/streak stats
 */
export function enrichLocalAbstinenceTracker(tracker: any, sessions: any[]) {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime()
  );
  const activeSession = sorted.find((s) => !s.endedAt) || tracker.activeSession || null;
  const pastSessions = sorted.filter((s) => Boolean(s.endedAt));

  const nowMs = Date.now();
  const currentDuration = activeSession
    ? calculateAbstinenceDuration(activeSession.startedAt, null, nowMs)
    : { totalSeconds: 0, days: 0, hours: 0, minutes: 0, seconds: 0, formattedArabic: "0 ثانية" };

  let longestStreakSeconds = currentDuration.totalSeconds;
  for (const s of pastSessions) {
    const dur =
      s.durationSeconds ??
      Math.max(0, Math.floor((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000));
    if (dur > longestStreakSeconds) longestStreakSeconds = dur;
  }

  let totalAbstinentSeconds = currentDuration.totalSeconds;
  for (const s of pastSessions) {
    const dur =
      s.durationSeconds ??
      Math.max(0, Math.floor((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000));
    totalAbstinentSeconds += dur;
  }

  let targetProgressPercent = 0;
  if (tracker.targetDays && tracker.targetDays > 0) {
    targetProgressPercent = Math.min(
      100,
      Math.round((currentDuration.totalSeconds / (tracker.targetDays * 86400)) * 100)
    );
  }

  return {
    ...tracker,
    sessions: sorted,
    activeSession,
    pastSessions,
    currentDuration,
    longestStreakSeconds,
    totalAbstinentSeconds,
    relapseCount: pastSessions.length,
    targetProgressPercent,
  };
}

/**
 * Local-first Task Toggle for Journal / Secondary views
 */
export async function toggleTaskCompletionLocalFirst(
  userId: string,
  taskId: string,
  fallbackTask?: any
) {
  const effectiveUserId = userId || "guest";
  const target = fallbackTask || (await localTaskRepo.getById(taskId));
  if (!target) return null;

  const nextStatus = target.status === "COMPLETED" ? "TODO" : "COMPLETED";
  const completedAt = nextStatus === "COMPLETED" ? new Date().toISOString() : null;
  const nowMs = Date.now();

  const updated = {
    ...target,
    userId: effectiveUserId,
    status: nextStatus,
    completedAt,
    updatedAt: new Date(nowMs).toISOString(),
    clientUpdatedAt: nowMs,
    _syncStatus: effectiveUserId === "guest" ? "synced" : "pending",
  };
  await localTaskRepo.save(updated);

  if (typeof window !== "undefined") {
    try {
      const ch = new BroadcastChannel("athar_tasks_channel");
      ch.postMessage({ type: "TASKS_CHANGED", userId: effectiveUserId });
      ch.close();
    } catch {}
    window.dispatchEvent(
      new CustomEvent("athar_tasks_updated", { detail: { userId: effectiveUserId } })
    );
    if (nextStatus === "COMPLETED") {
      window.dispatchEvent(
        new CustomEvent("athar_task_completed_externally", {
          detail: { taskId, userId: effectiveUserId },
        })
      );
    }
  }

  await queueMutation(
    effectiveUserId,
    "task",
    taskId,
    "update",
    { status: nextStatus, completedAt },
    target.version || 1
  );

  return updated;
}
