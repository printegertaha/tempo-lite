import {
  addDaysToDateString,
  getDefaultTimezone,
  getLocalDateString,
} from "@/lib/dates";
import {
  localRevisionRepo,
  localOutboxRepo,
  type LocalEntityRevision,
} from "@/lib/local-db";
import { syncEngine } from "@/lib/sync/sync-engine";

export function isRecordOlderThanSevenDays(
  recordDateOrIso?: string | null,
  timezone?: string,
  now: Date = new Date()
): boolean {
  if (!recordDateOrIso) return false;
  const tz = timezone || getDefaultTimezone();
  let dateKey = String(recordDateOrIso).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    const parsed = new Date(dateKey);
    if (Number.isNaN(parsed.getTime())) return false;
    dateKey = getLocalDateString(parsed, tz);
  }

  const todayStr = getLocalDateString(now, tz);
  const cutoffStr = addDaysToDateString(todayStr, -7);
  // 0..7 days ago (inclusive) are within 7 days; strictly before cutoffStr is > 7 days old.
  return dateKey < cutoffStr;
}

export function extractChangedFieldsDiff(
  previousRecord: Record<string, any>,
  nextRecord: Record<string, any>,
  candidateKeys?: string[]
): {
  previousValues: Record<string, any>;
  newValues: Record<string, any>;
  hasChanges: boolean;
} {
  const keys =
    candidateKeys ||
    Array.from(new Set([...Object.keys(nextRecord || {}), ...Object.keys(previousRecord || {})]));

  const previousValues: Record<string, any> = {};
  const newValues: Record<string, any> = {};
  let hasChanges = false;

  const IGNORED_KEYS = new Set([
    "updatedAt",
    "createdAt",
    "clientUpdatedAt",
    "_syncStatus",
    "version",
  ]);

  for (const key of keys) {
    if (IGNORED_KEYS.has(key)) continue;
    const prevVal = previousRecord?.[key];
    const nextVal = nextRecord?.[key];
    if (JSON.stringify(prevVal ?? null) !== JSON.stringify(nextVal ?? null)) {
      previousValues[key] = prevVal ?? null;
      newValues[key] = nextVal ?? null;
      hasChanges = true;
    }
  }

  return { previousValues, newValues, hasChanges };
}

export function resolveTaskEffectiveLocalDate(
  task: {
    dueDate?: string | null;
    completedAt?: string | null;
    createdAt?: string | null;
  },
  timezone?: string
): string | null {
  const tz = timezone || getDefaultTimezone();
  if (task.completedAt) {
    return getLocalDateString(new Date(task.completedAt), tz);
  }
  if (task.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) {
    return task.dueDate;
  }
  if (task.createdAt) {
    return getLocalDateString(new Date(task.createdAt), tz);
  }
  return null;
}

export async function recordRevisionIfOlderThanSevenDays(params: {
  userId: string;
  entityType: string;
  entityId: string;
  recordDate?: string | null;
  previousRecord: Record<string, any>;
  nextRecord: Record<string, any>;
  candidateKeys?: string[];
  editedBy?: string;
  timezone?: string;
  reason?: string | null;
}): Promise<LocalEntityRevision | null> {
  const {
    userId,
    entityType,
    entityId,
    recordDate,
    previousRecord,
    nextRecord,
    candidateKeys,
    editedBy,
    timezone,
    reason,
  } = params;

  const owner = userId || "guest";
  if (!isRecordOlderThanSevenDays(recordDate, timezone)) {
    return null;
  }

  const diff = extractChangedFieldsDiff(previousRecord, nextRecord, candidateKeys);
  if (!diff.hasChanges) return null;

  const existingRevs = await localRevisionRepo
    .getByEntity(owner, entityType, entityId)
    .catch(() => []);
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const revision: LocalEntityRevision = {
    id: crypto.randomUUID(),
    userId: owner,
    entityType,
    entityId,
    localDate: recordDate || null,
    revisionNumber: existingRevs.length + 1,
    previousValues: diff.previousValues,
    newValues: diff.newValues,
    editedBy: editedBy || owner,
    editedAt: nowIso,
    reason: reason ?? null,
    createdAt: nowIso,
    updatedAt: nowIso,
    clientUpdatedAt: nowMs,
    _syncStatus: owner === "guest" ? "synced" : "pending",
  };

  await localRevisionRepo.save(revision);

  if (owner !== "guest") {
    await localOutboxRepo
      .add({
        mutationId: `rev_${revision.id}`,
        userId: owner,
        entityType: "entity_revision",
        entityId: revision.id,
        action: "create",
        payload: revision,
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
      new CustomEvent("athar_revisions_updated", {
        detail: { userId: owner, entityType, entityId },
      })
    );
  }

  return revision;
}
