"use client";

import {
  localTaskRepo,
  localTrackerRepo,
  localEntryRepo,
  localOutboxRepo,
  localAbstinenceRepo,
  LocalMutation,
} from "./index";
import { toggleTaskStatus as serverToggleTaskStatus } from "@/actions/tasks";
import { syncEngine } from "@/lib/sync/sync-engine";
import {
  toggleBooleanDaily as serverToggleBooleanDaily,
  incrementCounterDaily as serverIncrementCounterDaily,
  logDurationSession as serverLogDurationSession,
  toggleChecklistItem as serverToggleChecklistItem,
  logAvoidanceDay as serverLogAvoidanceDay,
  logTrackerEntry as serverLogTrackerEntry,
  deleteTrackerEntry as serverDeleteTrackerEntry,
} from "@/actions/entries";
import { calculateAbstinenceDuration } from "@/lib/dates";
import { slugify } from "@/lib/validations/life-area";

async function queueMutation(
  userId: string,
  entityType: LocalMutation["entityType"],
  entityId: string,
  action: LocalMutation["action"],
  payload: any,
  version = 1
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
    status: "pending",
    retryCount: 0,
  };
  await localOutboxRepo.add(mutation);
  syncEngine.scheduleSync(5000);
}

/**
 * Local-first Boolean Toggle (works identically for guests and offline auth users)
 */
export async function toggleBooleanEntryLocalFirst(
  userId: string,
  tracker: any,
  localDate: string
) {
  const effectiveUserId = userId || "guest";
  const isGuest = effectiveUserId === "guest";

  if (!isGuest && typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const res = await serverToggleBooleanDaily(tracker.id, localDate);
      if (res.success && res.data) {
        await localEntryRepo.save({ ...res.data, userId: effectiveUserId });
        return res;
      }
    } catch {
      // Fall through to local IDB + outbox
    }
  }

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
 * Local-first Counter Increment
 */
export async function incrementCounterLocalFirst(
  userId: string,
  tracker: any,
  amount: number,
  localDate: string,
  notes?: string | null
) {
  const effectiveUserId = userId || "guest";
  const isGuest = effectiveUserId === "guest";

  if (!isGuest && typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const res = await serverIncrementCounterDaily({
        trackerId: tracker.id,
        amount,
        localDate,
        notes: notes || null,
      });
      if (res.success && res.data) {
        await localEntryRepo.save({ ...res.data, userId: effectiveUserId });
        return res;
      }
    } catch {
      // Fall through to local IDB + outbox
    }
  }

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
  const isGuest = effectiveUserId === "guest";

  if (!isGuest && typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const res = await serverLogDurationSession({
        trackerId: tracker.id,
        durationSeconds,
        localDate,
        subject: subject || null,
        notes: notes || null,
      });
      if (res.success && res.data) {
        await localEntryRepo.save({ ...res.data, userId: effectiveUserId });
        return res;
      }
    } catch {
      // Fall through to local IDB + outbox
    }
  }

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
  const isGuest = effectiveUserId === "guest";

  if (!isGuest && typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const res = await serverToggleChecklistItem({
        trackerId: tracker.id,
        itemId,
        localDate,
      });
      if (res.success && res.data) {
        await localEntryRepo.save({ ...res.data, userId: effectiveUserId });
        return res;
      }
    } catch {
      // Fall through to local IDB + outbox
    }
  }

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
  const isGuest = effectiveUserId === "guest";

  if (!isGuest && typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const res = await serverLogAvoidanceDay({
        trackerId: tracker.id,
        isClean,
        localDate,
        urgeRating: urgeRating ?? null,
        notes: notes || null,
      });
      if (res.success && res.data) {
        await localEntryRepo.save({ ...res.data, userId: effectiveUserId });
        return res;
      }
    } catch {
      // Fall through to local IDB + outbox
    }
  }

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
  const isGuest = effectiveUserId === "guest";

  if (!isGuest && typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const res = await serverLogTrackerEntry(payload);
      if (res.success && res.data) {
        await localEntryRepo.save({ ...res.data, userId: effectiveUserId });
        return res;
      }
    } catch {
      // Fall through to local IDB + outbox
    }
  }

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
  const isGuest = effectiveUserId === "guest";

  await localEntryRepo.delete(entryId);

  if (!isGuest) {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      try {
        const res = await serverDeleteTrackerEntry(entryId);
        if (res.success) return res;
      } catch {}
    }
    await queueMutation(effectiveUserId, "tracker_entry", entryId, "delete", {});
  }

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
      await queueMutation(effectiveUserId, "tracker", existingId, "update", trackerData);
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
    await queueMutation(effectiveUserId, "tracker", newId, "create", newTracker);
  } else if (newTracker.metricType === "AVOIDANCE") {
    // Keep abstinence_trackers in sync for guest AVOIDANCE trackers
    const absId = crypto.randomUUID();
    await localAbstinenceRepo.saveTracker({
      id: absId,
      userId: "guest",
      trackerId: newId,
      name: newTracker.name,
      description: newTracker.description || null,
      icon: newTracker.icon || "ShieldCheck",
      color: newTracker.color || "rose",
      targetDays: newTracker.targetValue ? Math.round(newTracker.targetValue) : 30,
      isArchived: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    await localAbstinenceRepo.saveSession({
      id: crypto.randomUUID(),
      abstinenceTrackerId: absId,
      trackerId: absId,
      userId: "guest",
      startedAt: nowIso,
      endedAt: null,
      durationSeconds: null,
    });
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
  const isGuest = effectiveUserId === "guest";
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

  if (!isGuest) {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      try {
        await serverToggleTaskStatus(taskId);
        return updated;
      } catch {}
    }
    await localOutboxRepo.add({
      mutationId: crypto.randomUUID(),
      userId: effectiveUserId,
      entityType: "task",
      entityId: taskId,
      action: "update",
      payload: { status: nextStatus, completedAt },
      clientTimestamp: nowMs,
      version: target.version || 1,
      status: "pending",
      retryCount: 0,
    });
    syncEngine.scheduleSync(5000);
  }

  return updated;
}
