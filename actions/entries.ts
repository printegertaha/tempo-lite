"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-session";
import {
  getLocalDateString,
  parseDate,
  calculateDurationSeconds,
} from "@/lib/dates";
import {
  CreateEntrySchema,
  UpdateEntrySchema,
  QuickCounterLogSchema,
  QuickDurationLogSchema,
  QuickChecklistToggleSchema,
  QuickAvoidanceLogSchema,
  TimeRangeLogSchema,
  type CreateEntryInput,
  type UpdateEntryInput,
} from "@/lib/validations/entry";

export type ActionResponse<T> =
  | { success: true; data: T; error?: never; fieldErrors?: never }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Helper to fetch authenticated user's IANA timezone
 */
async function getUserTimezone(userId: string): Promise<string> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { timezone: true },
  });
  return settings?.timezone || "Asia/Riyadh";
}

/**
 * Generic Entry Logger: Logs an entry for any metric type,
 * validating ownership and snapshotting the active tracker version.
 */
export async function logTrackerEntry(
  rawInput: unknown
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();

    const validation = CreateEntrySchema.safeParse(rawInput);
    if (!validation.success) {
      const fieldErrors: Record<string, string[]> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        fieldErrors[path] = fieldErrors[path] || [];
        fieldErrors[path].push(issue.message);
      });
      return { success: false, error: "بيانات التسجيل غير صالحة", fieldErrors };
    }

    const {
      trackerId,
      localDate: inputLocalDate,
      occurredAt: inputOccurredAt,
      valueBoolean,
      valueNumeric,
      valueDuration,
      timeRangeStart,
      timeRangeEnd,
      entryPayload,
      notes,
    } = validation.data;

    // Verify tracker ownership
    const tracker = await prisma.tracker.findFirst({
      where: { id: trackerId, userId },
      select: { id: true, version: true, metricType: true, isPaused: true },
    });
    if (!tracker) {
      return { success: false, error: "المتعقب غير موجود أو لا تملك صلاحية الوصول إليه" };
    }

    const occurredAt = parseDate(inputOccurredAt);
    const timezone = await getUserTimezone(userId);
    const localDate = inputLocalDate || getLocalDateString(occurredAt, timezone);

    // Calculate duration for TIME_RANGE if range is provided
    let computedDuration = valueDuration;
    if (timeRangeStart && timeRangeEnd && computedDuration === undefined) {
      computedDuration = calculateDurationSeconds(
        parseDate(timeRangeStart),
        parseDate(timeRangeEnd)
      );
    }

    const entry = await prisma.trackerEntry.create({
      data: {
        trackerId,
        userId,
        localDate,
        occurredAt,
        valueBoolean: valueBoolean ?? null,
        valueNumeric: valueNumeric ?? null,
        valueDuration: computedDuration ?? null,
        timeRangeStart: timeRangeStart ? parseDate(timeRangeStart) : null,
        timeRangeEnd: timeRangeEnd ? parseDate(timeRangeEnd) : null,
        entryPayload: (entryPayload as any) || undefined,
        notes: notes || null,
        trackerVersion: tracker.version,
      },
    });

    revalidatePath("/habits");
    revalidatePath("/journal");
    revalidatePath("/");

    return { success: true, data: entry };
  } catch (err: any) {
    console.error("[logTrackerEntry Error]:", err);
    return { success: false, error: "تعذر تسجيل الإدخال اليومي" };
  }
}

/**
 * Fetch all entries for a specific calendar date (indexed query).
 */
export async function getDailyEntries(
  localDate?: string
): Promise<ActionResponse<any[]>> {
  try {
    const userId = await requireUserId();
    const timezone = await getUserTimezone(userId);
    const targetDate = localDate || getLocalDateString(new Date(), timezone);

    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        localDate: targetDate,
      },
      include: {
        tracker: {
          select: {
            id: true,
            name: true,
            metricType: true,
            icon: true,
            color: true,
            unit: true,
            targetValue: true,
            targetFrequency: true,
            lifeAreaId: true,
          },
        },
      },
      orderBy: { occurredAt: "asc" },
    });

    return { success: true, data: entries };
  } catch (err: any) {
    if (err?.message?.includes("UNAUTHORIZED") || err?.digest?.includes("NEXT_REDIRECT")) {
      return { success: false, error: "يجب تسجيل الدخول لعرض السجلات" };
    }
    console.error("[getDailyEntries Error]:", err);
    return { success: false, error: "تعذر استرجاع السجلات اليومية" };
  }
}

/**
 * Fetch paginated historical entries with optional trackerId filter.
 */
export async function getPaginatedEntries(params: {
  trackerId?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<ActionResponse<{ entries: any[]; pagination: { total: number; page: number; pageSize: number; totalPages: number } }>> {
  try {
    const userId = await requireUserId();
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = { userId };
    if (params.trackerId) {
      where.trackerId = params.trackerId;
    }

    const [total, entries] = await Promise.all([
      prisma.trackerEntry.count({ where }),
      prisma.trackerEntry.findMany({
        where,
        take: pageSize,
        skip,
        orderBy: { occurredAt: "desc" },
        include: {
          tracker: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
              metricType: true,
              unit: true,
            },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        entries,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    };
  } catch (err: any) {
    console.error("[getPaginatedEntries Error]:", err);
    return { success: false, error: "تعذر استرجاع السجلات التاريخية" };
  }
}

/**
 * Fetch and aggregate daily statistics for a single tracker.
 */
export async function getTrackerDailyAggregate(
  trackerId: string,
  localDate?: string
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();
    const timezone = await getUserTimezone(userId);
    const targetDate = localDate || getLocalDateString(new Date(), timezone);

    const tracker = await prisma.tracker.findFirst({
      where: { id: trackerId, userId },
      include: {
        lifeArea: true,
      },
    });
    if (!tracker) {
      return { success: false, error: "المتعقب غير موجود" };
    }

    const entries = await prisma.trackerEntry.findMany({
      where: {
        trackerId,
        userId,
        localDate: targetDate,
      },
      orderBy: { occurredAt: "asc" },
    });

    // Compute type-specific aggregates
    let isCompleted = false;
    let totalNumeric = 0;
    let totalDurationSeconds = 0;
    let checklistCompletedIds: string[] = [];
    let avoidanceState: { isClean?: boolean; urgeRating?: number } | null = null;

    if (tracker.metricType === "BOOLEAN") {
      const latest = entries[entries.length - 1];
      isCompleted = Boolean(latest?.valueBoolean);
    } else if (tracker.metricType === "COUNTER" || tracker.metricType === "NUMBER") {
      totalNumeric = entries.reduce((acc, e) => acc + (e.valueNumeric || 0), 0);
      if (tracker.targetValue) {
        isCompleted = totalNumeric >= tracker.targetValue;
      }
    } else if (tracker.metricType === "DURATION" || tracker.metricType === "TIME_RANGE") {
      totalDurationSeconds = entries.reduce(
        (acc, e) => acc + (e.valueDuration || 0),
        0
      );
      if (tracker.targetValue) {
        // targetValue is in target unit (e.g. minutes or hours)
        const targetSeconds = (tracker.targetValue || 0) * 60;
        isCompleted = totalDurationSeconds >= targetSeconds;
      }
    } else if (tracker.metricType === "CHECKLIST") {
      const latest = entries[entries.length - 1];
      const payload = (latest?.entryPayload as any) || {};
      checklistCompletedIds = payload.completedItemIds || [];
      const totalItems = (tracker.trackerConfig as any)?.items?.length || 1;
      isCompleted = checklistCompletedIds.length >= totalItems;
    } else if (tracker.metricType === "AVOIDANCE") {
      const latest = entries[entries.length - 1];
      if (latest) {
        const isClean = Boolean(latest.valueBoolean);
        isCompleted = isClean;
        avoidanceState = {
          isClean,
          urgeRating: (latest.entryPayload as any)?.urgeRating,
        };
      }
    }

    return {
      success: true,
      data: {
        tracker,
        localDate: targetDate,
        entriesCount: entries.length,
        entries,
        isCompleted,
        totalNumeric,
        totalDurationSeconds,
        checklistCompletedIds,
        avoidanceState,
      },
    };
  } catch (err: any) {
    console.error("[getTrackerDailyAggregate Error]:", err);
    return { success: false, error: "تعذر احتساب إحصائيات المتعقب" };
  }
}

// -----------------------------------------------------------------------------
// Quick 1-Click Operations
// -----------------------------------------------------------------------------

/**
 * 1-Click Boolean Completion Toggle for today
 */
export async function toggleBooleanDaily(
  trackerId: string,
  inputLocalDate?: string
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();
    const tracker = await prisma.tracker.findFirst({
      where: { id: trackerId, userId },
      select: { id: true, version: true },
    });
    if (!tracker) return { success: false, error: "المتعقب غير موجود" };

    const timezone = await getUserTimezone(userId);
    const localDate = inputLocalDate || getLocalDateString(new Date(), timezone);

    // Find today's latest entry
    const existing = await prisma.trackerEntry.findFirst({
      where: { trackerId, userId, localDate },
      orderBy: { occurredAt: "desc" },
    });

    if (existing) {
      // Toggle value
      const updated = await prisma.trackerEntry.update({
        where: { id: existing.id },
        data: {
          valueBoolean: !existing.valueBoolean,
          occurredAt: new Date(),
        },
      });
      revalidatePath("/habits");
      revalidatePath("/");
      return { success: true, data: updated };
    }

    // Create entry
    const created = await prisma.trackerEntry.create({
      data: {
        trackerId,
        userId,
        localDate,
        occurredAt: new Date(),
        valueBoolean: true,
        trackerVersion: tracker.version,
      },
    });

    revalidatePath("/habits");
    revalidatePath("/");
    return { success: true, data: created };
  } catch (err: any) {
    console.error("[toggleBooleanDaily Error]:", err);
    return { success: false, error: "تعذر تحديث حالة الإنجاز" };
  }
}

/**
 * 1-Click Counter Increment (+step or custom amount)
 */
export async function incrementCounterDaily(
  rawInput: unknown
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();
    const validation = QuickCounterLogSchema.safeParse(rawInput);
    if (!validation.success) {
      return { success: false, error: "بيانات العداد غير صالحة" };
    }

    const { trackerId, amount, localDate: inputLocalDate, notes } = validation.data;

    const tracker = await prisma.tracker.findFirst({
      where: { id: trackerId, userId },
      select: { id: true, version: true },
    });
    if (!tracker) return { success: false, error: "المتعقب غير موجود" };

    const timezone = await getUserTimezone(userId);
    const localDate = inputLocalDate || getLocalDateString(new Date(), timezone);

    const created = await prisma.trackerEntry.create({
      data: {
        trackerId,
        userId,
        localDate,
        occurredAt: new Date(),
        valueNumeric: amount,
        notes: notes || null,
        trackerVersion: tracker.version,
      },
    });

    revalidatePath("/habits");
    revalidatePath("/");

    return { success: true, data: created };
  } catch (err: any) {
    console.error("[incrementCounterDaily Error]:", err);
    return { success: false, error: "تعذر زيادة العداد" };
  }
}

/**
 * Log Focused Duration Session
 */
export async function logDurationSession(
  rawInput: unknown
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();
    const validation = QuickDurationLogSchema.safeParse(rawInput);
    if (!validation.success) {
      return { success: false, error: "بيانات جلسة التركيز غير صالحة" };
    }

    const { trackerId, durationSeconds, localDate: inputLocalDate, subject, notes } =
      validation.data;

    const tracker = await prisma.tracker.findFirst({
      where: { id: trackerId, userId },
      select: { id: true, version: true },
    });
    if (!tracker) return { success: false, error: "المتعقب غير موجود" };

    const timezone = await getUserTimezone(userId);
    const localDate = inputLocalDate || getLocalDateString(new Date(), timezone);

    const created = await prisma.trackerEntry.create({
      data: {
        trackerId,
        userId,
        localDate,
        occurredAt: new Date(),
        valueDuration: durationSeconds,
        entryPayload: (subject ? { subject } : undefined) as any,
        notes: notes || null,
        trackerVersion: tracker.version,
      },
    });

    revalidatePath("/habits");
    revalidatePath("/");

    return { success: true, data: created };
  } catch (err: any) {
    console.error("[logDurationSession Error]:", err);
    return { success: false, error: "تعذر تسجيل جلسة التركيز" };
  }
}

/**
 * 1-Click Toggle for Checklist Items (idempotent, prevents duplicates)
 */
export async function toggleChecklistItem(
  rawInput: unknown
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();
    const validation = QuickChecklistToggleSchema.safeParse(rawInput);
    if (!validation.success) {
      return { success: false, error: "بيانات بند قائمة التدقيق غير صالحة" };
    }

    const { trackerId, itemId, localDate: inputLocalDate } = validation.data;

    const tracker = await prisma.tracker.findFirst({
      where: { id: trackerId, userId },
      select: { id: true, version: true, trackerConfig: true },
    });
    if (!tracker) return { success: false, error: "المتعقب غير موجود" };

    const timezone = await getUserTimezone(userId);
    const localDate = inputLocalDate || getLocalDateString(new Date(), timezone);

    // Find daily checklist entry
    const existing = await prisma.trackerEntry.findFirst({
      where: { trackerId, userId, localDate },
      orderBy: { occurredAt: "desc" },
    });

    let completedIds: string[] = [];
    if (existing && existing.entryPayload) {
      completedIds = (existing.entryPayload as any)?.completedItemIds || [];
    }

    // Toggle item presence
    if (completedIds.includes(itemId)) {
      completedIds = completedIds.filter((id) => id !== itemId);
    } else {
      completedIds = [...completedIds, itemId];
    }

    const totalConfigItems = (tracker.trackerConfig as any)?.items?.length || 1;
    const isAllCompleted = completedIds.length >= totalConfigItems;

    if (existing) {
      const updated = await prisma.trackerEntry.update({
        where: { id: existing.id },
        data: {
          valueNumeric: completedIds.length,
          valueBoolean: isAllCompleted,
          entryPayload: {
            ...((existing.entryPayload as any) || {}),
            completedItemIds: completedIds,
          },
          occurredAt: new Date(),
        },
      });
      revalidatePath("/habits");
      revalidatePath("/");
      return { success: true, data: updated };
    }

    const created = await prisma.trackerEntry.create({
      data: {
        trackerId,
        userId,
        localDate,
        occurredAt: new Date(),
        valueNumeric: completedIds.length,
        valueBoolean: isAllCompleted,
        entryPayload: { completedItemIds: completedIds },
        trackerVersion: tracker.version,
      },
    });

    revalidatePath("/habits");
    revalidatePath("/");
    return { success: true, data: created };
  } catch (err: any) {
    console.error("[toggleChecklistItem Error]:", err);
    return { success: false, error: "تعذر تحديث بند القائمة" };
  }
}

/**
 * Record Daily Avoidance Status (Clean Day vs Relapse/Lapse)
 */
export async function logAvoidanceDay(
  rawInput: unknown
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();
    const validation = QuickAvoidanceLogSchema.safeParse(rawInput);
    if (!validation.success) {
      return { success: false, error: "بيانات الامتناع غير صالحة" };
    }

    const { trackerId, isClean, localDate: inputLocalDate, urgeRating, notes } =
      validation.data;

    const tracker = await prisma.tracker.findFirst({
      where: { id: trackerId, userId },
      select: { id: true, version: true },
    });
    if (!tracker) return { success: false, error: "المتعقب غير موجود" };

    const timezone = await getUserTimezone(userId);
    const localDate = inputLocalDate || getLocalDateString(new Date(), timezone);

    const existing = await prisma.trackerEntry.findFirst({
      where: { trackerId, userId, localDate },
    });

    const payload = {
      isClean,
      urgeRating: urgeRating ?? null,
    };

    if (existing) {
      const updated = await prisma.trackerEntry.update({
        where: { id: existing.id },
        data: {
          valueBoolean: isClean,
          entryPayload: payload,
          notes: notes || existing.notes,
          occurredAt: new Date(),
        },
      });
      revalidatePath("/habits");
      revalidatePath("/");
      return { success: true, data: updated };
    }

    const created = await prisma.trackerEntry.create({
      data: {
        trackerId,
        userId,
        localDate,
        occurredAt: new Date(),
        valueBoolean: isClean,
        entryPayload: payload,
        notes: notes || null,
        trackerVersion: tracker.version,
      },
    });

    revalidatePath("/habits");
    revalidatePath("/");
    return { success: true, data: created };
  } catch (err: any) {
    console.error("[logAvoidanceDay Error]:", err);
    return { success: false, error: "تعذر تسجيل حالة الامتناع" };
  }
}

// -----------------------------------------------------------------------------
// Entry Mutations (Edit / Delete)
// -----------------------------------------------------------------------------

/**
 * Update an existing entry (preserves original localDate and trackerVersion).
 */
export async function updateTrackerEntry(
  rawInput: unknown
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();
    const validation = UpdateEntrySchema.safeParse(rawInput);
    if (!validation.success) {
      return { success: false, error: "بيانات التعديل غير صالحة" };
    }

    const {
      id,
      valueBoolean,
      valueNumeric,
      valueDuration,
      timeRangeStart,
      timeRangeEnd,
      entryPayload,
      notes,
    } = validation.data;

    const existing = await prisma.trackerEntry.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return { success: false, error: "السجل غير موجود أو لا تملك صلاحية تعديله" };
    }

    const updated = await prisma.trackerEntry.update({
      where: { id },
      data: {
        ...(valueBoolean !== undefined ? { valueBoolean } : {}),
        ...(valueNumeric !== undefined ? { valueNumeric } : {}),
        ...(valueDuration !== undefined ? { valueDuration } : {}),
        ...(timeRangeStart !== undefined
          ? { timeRangeStart: timeRangeStart ? parseDate(timeRangeStart) : null }
          : {}),
        ...(timeRangeEnd !== undefined
          ? { timeRangeEnd: timeRangeEnd ? parseDate(timeRangeEnd) : null }
          : {}),
        ...(entryPayload !== undefined ? { entryPayload: entryPayload as any } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
      },
    });

    revalidatePath("/habits");
    revalidatePath("/journal");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (err: any) {
    console.error("[updateTrackerEntry Error]:", err);
    return { success: false, error: "تعذر تحديث السجل" };
  }
}

/**
 * Delete an individual entry.
 */
export async function deleteTrackerEntry(
  entryId: string
): Promise<ActionResponse<boolean>> {
  try {
    const userId = await requireUserId();

    const existing = await prisma.trackerEntry.findFirst({
      where: { id: entryId, userId },
    });
    if (!existing) {
      return { success: false, error: "السجل غير موجود أو لا تملك صلاحية حذفه" };
    }

    await prisma.trackerEntry.delete({
      where: { id: entryId },
    });

    revalidatePath("/habits");
    revalidatePath("/journal");
    revalidatePath("/");

    return { success: true, data: true };
  } catch (err: any) {
    console.error("[deleteTrackerEntry Error]:", err);
    return { success: false, error: "تعذر حذف السجل" };
  }
}
