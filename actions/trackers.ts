"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-session";
import { slugify } from "@/lib/validations/life-area";
import {
  CreateTrackerSchema,
  UpdateTrackerSchema,
  ReorderTrackersSchema,
  validateTrackerConfig,
  type TrackerMetricType,
  type TargetFrequency,
} from "@/lib/validations/tracker";

export type ActionResponse<T> =
  | { success: true; data: T; error?: never; code?: never; fieldErrors?: never }
  | { success: false; error: string; fieldErrors?: Record<string, string[]>; code?: string; data?: T };

export interface TrackerFilterOptions {
  lifeAreaId?: string | null;
  isArchived?: boolean;
  isPaused?: boolean;
  metricType?: TrackerMetricType;
  isPinned?: boolean;
}

/**
 * Retrieve all trackers belonging to the authenticated user with optional filtering.
 */
export async function getTrackers(
  filters: TrackerFilterOptions = {}
): Promise<ActionResponse<any[]>> {
  try {
    const userId = await requireUserId();

    const whereClause: any = {
      userId,
      isArchived: filters.isArchived ?? false,
    };

    if (filters.lifeAreaId !== undefined) {
      whereClause.lifeAreaId = filters.lifeAreaId;
    }

    if (filters.isPaused !== undefined) {
      whereClause.isPaused = filters.isPaused;
    }

    if (filters.metricType) {
      whereClause.metricType = filters.metricType;
    }

    const trackers = await prisma.tracker.findMany({
      where: whereClause,
      orderBy: [{ sortOrder: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      include: {
        lifeArea: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
            slug: true,
          },
        },
        _count: {
          select: {
            entries: true,
          },
        },
      },
    });

    // Handle isPinned client-side filtering if requested (stored inside displayPreferences Json)
    let result = trackers;
    if (filters.isPinned !== undefined) {
      result = trackers.filter((t) => {
        const pref = (t.displayPreferences as any) || {};
        return Boolean(pref.isPinned) === filters.isPinned;
      });
    }

    return { success: true, data: result };
  } catch (err: any) {
    if (err?.message?.includes("UNAUTHORIZED") || err?.digest?.includes("NEXT_REDIRECT")) {
      return { success: false, error: "يجب تسجيل الدخول لاستعراض العادات والمتعقبات" };
    }
    console.error("[getTrackers Error]:", err);
    return { success: false, error: "تعذر استرجاع قائمة المتعقبات" };
  }
}

/**
 * Retrieve a single tracker by ID with its active version and statistics.
 */
export async function getTrackerById(
  id: string
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();

    const tracker = await prisma.tracker.findFirst({
      where: { id, userId },
      include: {
        lifeArea: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 5,
        },
        _count: {
          select: {
            entries: true,
          },
        },
      },
    });

    if (!tracker) {
      return { success: false, error: "المتعقب غير موجود أو لا تملك صلاحية الوصول إليه" };
    }

    return { success: true, data: tracker };
  } catch (err: any) {
    console.error("[getTrackerById Error]:", err);
    return { success: false, error: "تعذر تحميل بيانات المتعقب" };
  }
}

/**
 * Create a new dynamic tracker of any of the 7 supported modalities.
 * Atomically generates the initial TrackerVersion snapshot to guarantee historical integrity.
 */
export async function createTracker(
  rawInput: unknown
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();

    const validation = CreateTrackerSchema.safeParse(rawInput);
    if (!validation.success) {
      const fieldErrors: Record<string, string[]> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        fieldErrors[path] = fieldErrors[path] || [];
        fieldErrors[path].push(issue.message);
      });
      return { success: false, error: "بيانات إنشاء المتعقب غير صحيحة", fieldErrors };
    }

    const {
      name,
      description,
      lifeAreaId,
      icon,
      color,
      priority,
      metricType,
      unit,
      targetValue,
      targetFrequency,
      scheduleConfig,
      trackerConfig,
      displayPreferences,
    } = validation.data;

    // Validate type-specific configuration schema
    const configValidation = validateTrackerConfig(metricType, trackerConfig);
    if (!configValidation.success) {
      const fieldErrors: Record<string, string[]> = {};
      configValidation.error.issues.forEach((issue) => {
        fieldErrors[`trackerConfig.${issue.path.join(".")}`] = [issue.message];
      });
      return {
        success: false,
        error: "تكوين المتعقب غير متوافق مع نوع القياس المختار",
        fieldErrors,
      };
    }
    const validatedTrackerConfig = configValidation.data;

    // If lifeAreaId is provided, verify it belongs to the authenticated user
    if (lifeAreaId) {
      const areaExists = await prisma.lifeArea.findFirst({
        where: { id: lifeAreaId, userId },
        select: { id: true },
      });
      if (!areaExists) {
        return { success: false, error: "مجال الحياة المحدد غير صالح أو غير موجود" };
      }
    }

    // Generate unique slug for this tracker
    let slug = slugify(name);
    let counter = 1;
    while (true) {
      const existing = await prisma.tracker.findUnique({
        where: {
          userId_slug: {
            userId,
            slug,
          },
        },
        select: { id: true },
      });
      if (!existing) break;
      counter += 1;
      slug = `${slugify(name)}-${counter}`;
    }

    // Determine the next sort order
    const aggregate = await prisma.tracker.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (aggregate._max.sortOrder ?? -1) + 1;

    // Atomic transaction: create Tracker and initial TrackerVersion snapshot
    const tracker = await prisma.$transaction(async (tx) => {
      const createdTracker = await tx.tracker.create({
        data: {
          userId,
          name,
          slug,
          description: description || null,
          lifeAreaId: lifeAreaId || null,
          icon,
          color,
          priority,
          metricType,
          unit: unit || null,
          targetValue: targetValue ?? null,
          targetFrequency,
          scheduleConfig,
          trackerConfig: validatedTrackerConfig,
          displayPreferences,
          sortOrder: nextSortOrder,
          version: 1,
        },
      });

      await tx.trackerVersion.create({
        data: {
          trackerId: createdTracker.id,
          userId,
          versionNumber: 1,
          name,
          metricType,
          unit: unit || null,
          targetValue: targetValue ?? null,
          targetFrequency,
          trackerConfig: validatedTrackerConfig,
          scheduleConfig,
          validFrom: new Date(),
          validTo: null,
        },
      });

      if (metricType === "AVOIDANCE") {
        const abstTracker = await tx.abstinenceTracker.create({
          data: {
            userId,
            trackerId: createdTracker.id,
            name,
            description: description || null,
            icon: icon || "ShieldCheck",
            color: color || "rose",
            targetDays: targetValue ? Math.round(targetValue) : 30,
          },
        });

        await tx.abstinenceSession.create({
          data: {
            userId,
            abstinenceTrackerId: abstTracker.id,
            startedAt: new Date(),
            endedAt: null,
            durationSeconds: null,
          },
        });
      }

      return createdTracker;
    });

    revalidatePath("/habits");
    revalidatePath("/abstinence");
    revalidatePath("/");

    return { success: true, data: tracker };
  } catch (err: any) {
    console.error("[createTracker Error]:", err);
    return { success: false, error: "تعذر إنشاء المتعقب، يرجى المحاولة لاحقاً" };
  }
}

/**
 * Update an existing tracker.
 * When target or configuration changes, a new TrackerVersion is appended to preserve historical targets.
 */
export async function updateTracker(
  rawInput: unknown
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();

    const validation = UpdateTrackerSchema.safeParse(rawInput);
    if (!validation.success) {
      const fieldErrors: Record<string, string[]> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        fieldErrors[path] = fieldErrors[path] || [];
        fieldErrors[path].push(issue.message);
      });
      return { success: false, error: "بيانات تعديل المتعقب غير صحيحة", fieldErrors };
    }

    const {
      id,
      name,
      description,
      lifeAreaId,
      icon,
      color,
      priority,
      metricType,
      unit,
      targetValue,
      targetFrequency,
      scheduleConfig,
      trackerConfig,
      displayPreferences,
      isPaused,
    } = validation.data;

    // Verify ownership
    const existing = await prisma.tracker.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return { success: false, error: "المتعقب غير موجود أو لا تملك صلاحية تعديله" };
    }

    // Verify lifeAreaId ownership if updated
    if (lifeAreaId !== undefined && lifeAreaId !== null) {
      const areaExists = await prisma.lifeArea.findFirst({
        where: { id: lifeAreaId, userId },
        select: { id: true },
      });
      if (!areaExists) {
        return { success: false, error: "مجال الحياة المحدد غير موجود" };
      }
    }

    const targetMetricType = metricType || existing.metricType;

    // Check metric type change compatibility
    if (metricType && metricType !== existing.metricType) {
      const entryCount = await prisma.trackerEntry.count({
        where: { trackerId: id },
      });
      if (entryCount > 0) {
        const compatibleNumerics = ["COUNTER", "NUMBER"];
        const isCompatible =
          compatibleNumerics.includes(existing.metricType) &&
          compatibleNumerics.includes(metricType);

        if (!isCompatible) {
          return {
            success: false,
            error:
              "لا يمكن تغيير نوع القياس لمتعقب يحتوي على سجلات تاريخية مسبقة. يُنصح بأرشفة هذا المتعقب وإنشاء متعقب جديد لحفظ سلامة البيانات.",
          };
        }
      }
    }

    // Validate type-specific trackerConfig if provided
    let validatedConfig = existing.trackerConfig;
    if (trackerConfig !== undefined) {
      const configValidation = validateTrackerConfig(targetMetricType, trackerConfig);
      if (!configValidation.success) {
        const fieldErrors: Record<string, string[]> = {};
        configValidation.error.issues.forEach((issue) => {
          fieldErrors[`trackerConfig.${issue.path.join(".")}`] = [issue.message];
        });
        return {
          success: false,
          error: "تكوين المتعقب غير متوافق مع نوع القياس",
          fieldErrors,
        };
      }
      validatedConfig = configValidation.data;
    }

    // Detect if version-sensitive fields changed (requiring snapshot)
    const isTargetChanged = targetValue !== undefined && targetValue !== existing.targetValue;
    const isFrequencyChanged =
      targetFrequency !== undefined && targetFrequency !== existing.targetFrequency;
    const isConfigChanged = trackerConfig !== undefined;
    const isScheduleChanged = scheduleConfig !== undefined;
    const isMetricChanged = metricType !== undefined && metricType !== existing.metricType;
    const isUnitChanged = unit !== undefined && unit !== existing.unit;

    const requiresNewVersion =
      isTargetChanged ||
      isFrequencyChanged ||
      isConfigChanged ||
      isScheduleChanged ||
      isMetricChanged ||
      isUnitChanged;

    const updated = await prisma.$transaction(async (tx) => {
      let currentVersion = existing.version;

      if (requiresNewVersion) {
        // 1. Close current active version
        await tx.trackerVersion.updateMany({
          where: {
            trackerId: id,
            versionNumber: existing.version,
          },
          data: {
            validTo: new Date(),
          },
        });

        // 2. Increment version number
        currentVersion = existing.version + 1;

        // 3. Create new historical snapshot
        await tx.trackerVersion.create({
          data: {
            trackerId: id,
            userId,
            versionNumber: currentVersion,
            name: name ?? existing.name,
            metricType: targetMetricType,
            unit: unit !== undefined ? unit : existing.unit,
            targetValue: targetValue !== undefined ? targetValue : existing.targetValue,
            targetFrequency: targetFrequency ?? existing.targetFrequency,
            trackerConfig: validatedConfig as any,
            scheduleConfig: scheduleConfig ?? (existing.scheduleConfig as any),
            validFrom: new Date(),
            validTo: null,
          },
        });
      }

      // Update tracker record
      return tx.tracker.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(description !== undefined ? { description: description || null } : {}),
          ...(lifeAreaId !== undefined
            ? {
                lifeArea: lifeAreaId
                  ? { connect: { id: lifeAreaId } }
                  : { disconnect: true },
              }
            : {}),
          ...(icon !== undefined ? { icon } : {}),
          ...(color !== undefined ? { color } : {}),
          ...(priority !== undefined ? { priority } : {}),
          ...(metricType !== undefined ? { metricType } : {}),
          ...(unit !== undefined ? { unit: unit || null } : {}),
          ...(targetValue !== undefined ? { targetValue } : {}),
          ...(targetFrequency !== undefined ? { targetFrequency } : {}),
          ...(scheduleConfig !== undefined ? { scheduleConfig: scheduleConfig as any } : {}),
          ...(trackerConfig !== undefined ? { trackerConfig: validatedConfig as any } : {}),
          ...(displayPreferences !== undefined ? { displayPreferences: displayPreferences as any } : {}),
          ...(isPaused !== undefined ? { isPaused } : {}),
          version: currentVersion,
        },
      });
    });

    revalidatePath("/habits");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (err: any) {
    console.error("[updateTracker Error]:", err);
    return { success: false, error: "تعذر تحديث المتعقب" };
  }
}

/**
 * Adjust priority ranking directly (1 to 10).
 */
export async function changeTrackerPriority(
  id: string,
  priority: number
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();
    const cleanPriority = Math.max(1, Math.min(10, Math.round(priority)));

    const existing = await prisma.tracker.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return { success: false, error: "المتعقب غير موجود" };
    }

    const updated = await prisma.tracker.update({
      where: { id },
      data: { priority: cleanPriority },
    });

    revalidatePath("/habits");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (err: any) {
    console.error("[changeTrackerPriority Error]:", err);
    return { success: false, error: "تعذر تحديث أولوية المتعقب" };
  }
}

/**
 * Reorder display sequence of multiple trackers.
 */
export async function reorderTrackers(
  rawInput: unknown
): Promise<ActionResponse<{ count: number }>> {
  try {
    const userId = await requireUserId();

    const validation = ReorderTrackersSchema.safeParse(rawInput);
    if (!validation.success) {
      return { success: false, error: "بيانات الترتيب غير صالحة" };
    }

    const { items } = validation.data;

    await prisma.$transaction(
      items.map((item) =>
        prisma.tracker.updateMany({
          where: {
            id: item.id,
            userId,
          },
          data: {
            sortOrder: item.sortOrder,
          },
        })
      )
    );

    revalidatePath("/habits");
    revalidatePath("/");

    return { success: true, data: { count: items.length } };
  } catch (err: any) {
    console.error("[reorderTrackers Error]:", err);
    return { success: false, error: "تعذر حفظ ترتيب المتعقبات" };
  }
}

/**
 * Toggle whether tracker is pinned to the top of dashboard widgets.
 */
export async function togglePinTracker(
  id: string
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();

    const tracker = await prisma.tracker.findFirst({
      where: { id, userId },
    });
    if (!tracker) {
      return { success: false, error: "المتعقب غير موجود" };
    }

    const pref = ((tracker.displayPreferences as any) || {}) as Record<string, any>;
    const updatedPref = {
      ...pref,
      isPinned: !pref.isPinned,
    };

    const updated = await prisma.tracker.update({
      where: { id },
      data: {
        displayPreferences: updatedPref,
      },
    });

    revalidatePath("/habits");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (err: any) {
    console.error("[togglePinTracker Error]:", err);
    return { success: false, error: "تعذر تعديل تثبيت المتعقب" };
  }
}

/**
 * Toggle whether tracker is visible in habits overview.
 */
export async function toggleVisibilityTracker(
  id: string
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();

    const tracker = await prisma.tracker.findFirst({
      where: { id, userId },
    });
    if (!tracker) {
      return { success: false, error: "المتعقب غير موجود" };
    }

    const pref = ((tracker.displayPreferences as any) || {}) as Record<string, any>;
    const updatedPref = {
      ...pref,
      isHidden: !pref.isHidden,
    };

    const updated = await prisma.tracker.update({
      where: { id },
      data: {
        displayPreferences: updatedPref,
      },
    });

    revalidatePath("/habits");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (err: any) {
    console.error("[toggleVisibilityTracker Error]:", err);
    return { success: false, error: "تعذر تعديل ظهور المتعقب" };
  }
}

/**
 * Pause or resume tracker.
 */
export async function togglePauseTracker(
  id: string
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();

    const tracker = await prisma.tracker.findFirst({
      where: { id, userId },
    });
    if (!tracker) {
      return { success: false, error: "المتعقب غير موجود" };
    }

    const updated = await prisma.tracker.update({
      where: { id },
      data: {
        isPaused: !tracker.isPaused,
      },
    });

    revalidatePath("/habits");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (err: any) {
    console.error("[togglePauseTracker Error]:", err);
    return { success: false, error: "تعذر تعديل حالة إيقاف المتعقب" };
  }
}

/**
 * Archive a tracker.
 * Entries and historical metrics are never deleted.
 */
export async function archiveTracker(
  id: string
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();

    const tracker = await prisma.tracker.findFirst({
      where: { id, userId },
    });
    if (!tracker) {
      return { success: false, error: "المتعقب غير موجود" };
    }

    const updated = await prisma.tracker.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    revalidatePath("/habits");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (err: any) {
    console.error("[archiveTracker Error]:", err);
    return { success: false, error: "تعذر أرشفة المتعقب" };
  }
}

/**
 * Restore an archived tracker.
 */
export async function restoreTracker(
  id: string
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();

    const tracker = await prisma.tracker.findFirst({
      where: { id, userId },
    });
    if (!tracker) {
      return { success: false, error: "المتعقب غير موجود" };
    }

    const updated = await prisma.tracker.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    });

    revalidatePath("/habits");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (err: any) {
    console.error("[restoreTracker Error]:", err);
    return { success: false, error: "تعذر استعادة المتعقب" };
  }
}

/**
 * Delete a tracker.
 * If force=false and entries exist, prompts confirmation.
 */
export async function deleteTracker(
  id: string,
  force = false
): Promise<ActionResponse<{ deleted: boolean; entriesCount?: number }>> {
  try {
    const userId = await requireUserId();

    const tracker = await prisma.tracker.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: { entries: true },
        },
      },
    });

    if (!tracker) {
      return { success: false, error: "المتعقب غير موجود" };
    }

    const entryCount = tracker._count.entries;
    if (entryCount > 0 && !force) {
      return {
        success: false,
        code: "HAS_ENTRIES",
        error: `يحتوي هذا المتعقب على ${entryCount} من السجلات التاريخية. لحماية بياناتك، يُفضل أرشفته بدلاً من حذفه.`,
        data: { deleted: false, entriesCount: entryCount },
      };
    }

    await prisma.tracker.delete({
      where: { id },
    });

    revalidatePath("/habits");
    revalidatePath("/");

    return { success: true, data: { deleted: true } };
  } catch (err: any) {
    console.error("[deleteTracker Error]:", err);
    return { success: false, error: "تعذر حذف المتعقب" };
  }
}
