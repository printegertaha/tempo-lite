"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-session";
import {
  CreateAbstinenceTrackerSchema,
  LogRelapseSchema,
  UpdateStartTimeSchema,
  UpdateAbstinenceTrackerSchema,
  CreateAbstinenceTrackerInput,
  LogRelapseInput,
  UpdateStartTimeInput,
  UpdateAbstinenceTrackerInput,
} from "@/lib/validations/abstinence";
import {
  parseLocalDateTimeToUtc,
  calculateAbstinenceDuration,
  getLocalDateString,
} from "@/lib/dates";

/**
 * Verify current authenticated user session
 */
async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error("غير مصرح: يجب تسجيل الدخول للوصول لنظام الامتناع");
  }
  return session.user.id;
}

/**
 * Fetch user's configured timezone or default to Asia/Riyadh
 */
async function getUserTimezone(userId: string): Promise<string> {
  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    return settings?.timezone || "Asia/Riyadh";
  } catch {
    return "Asia/Riyadh";
  }
}

/**
 * Format and enrich a single abstinence tracker with all calculated statistics
 */
function enrichTrackerData(tracker: any) {
  const sessions = tracker.sessions || [];
  const activeSession = sessions.find((s: any) => s.endedAt === null) || null;
  const pastSessions = sessions.filter((s: any) => s.endedAt !== null);

  const nowMs = Date.now();
  const currentDuration = activeSession
    ? calculateAbstinenceDuration(activeSession.startedAt, null, nowMs)
    : { totalSeconds: 0, days: 0, hours: 0, minutes: 0, seconds: 0, formattedArabic: "0 ثانية" };

  // Longest streak across past sessions and active session
  let longestStreakSeconds = currentDuration.totalSeconds;
  for (const s of pastSessions) {
    const dur = s.durationSeconds ?? Math.max(0, Math.floor((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000));
    if (dur > longestStreakSeconds) {
      longestStreakSeconds = dur;
    }
  }

  // Total time spent abstinent
  let totalAbstinentSeconds = currentDuration.totalSeconds;
  for (const s of pastSessions) {
    const dur = s.durationSeconds ?? Math.max(0, Math.floor((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000));
    totalAbstinentSeconds += dur;
  }

  // Target progress percentage
  let targetProgressPercent = 0;
  if (tracker.targetDays && tracker.targetDays > 0) {
    const targetSeconds = tracker.targetDays * 86400;
    targetProgressPercent = Math.min(100, Math.round((currentDuration.totalSeconds / targetSeconds) * 100));
  }

  return {
    ...tracker,
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
 * Get all active abstinence trackers for the current user
 */
export async function getAbstinenceTrackers() {
  try {
    const userId = await requireAuth();
    const timezone = await getUserTimezone(userId);

    const trackers = await prisma.abstinenceTracker.findMany({
      where: {
        userId,
        isArchived: false,
      },
      include: {
        sessions: {
          orderBy: { startedAt: "desc" },
        },
        tracker: {
          select: { id: true, name: true, slug: true, icon: true, color: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enriched = trackers.map(enrichTrackerData);

    return {
      success: true,
      data: enriched,
      timezone,
    };
  } catch (error: any) {
    console.error("Error in getAbstinenceTrackers:", error);
    return {
      success: false,
      error: error?.message || "فشل تحميل أهداف الامتناع",
      data: [],
      timezone: "Asia/Riyadh",
    };
  }
}

/**
 * Get a single abstinence tracker by ID
 */
export async function getAbstinenceTrackerById(trackerId: string) {
  try {
    const userId = await requireAuth();
    const timezone = await getUserTimezone(userId);

    const tracker = await prisma.abstinenceTracker.findFirst({
      where: {
        id: trackerId,
        userId,
      },
      include: {
        sessions: {
          orderBy: { startedAt: "desc" },
        },
        tracker: {
          select: { id: true, name: true, slug: true, icon: true, color: true },
        },
      },
    });

    if (!tracker) {
      return { success: false, error: "هدف الامتناع غير موجود" };
    }

    return {
      success: true,
      data: enrichTrackerData(tracker),
      timezone,
    };
  } catch (error: any) {
    console.error("Error in getAbstinenceTrackerById:", error);
    return {
      success: false,
      error: error?.message || "فشل تحميل تفاصيل هدف الامتناع",
    };
  }
}

/**
 * Create a new Abstinence Goal / Tracker
 */
export async function createAbstinenceTracker(rawInput: CreateAbstinenceTrackerInput) {
  try {
    const userId = await requireAuth();
    const validated = CreateAbstinenceTrackerSchema.parse(rawInput);
    const timezone = validated.timezone || (await getUserTimezone(userId));

    // Convert local start date and time to exact UTC timestamp
    const startedAt = parseLocalDateTimeToUtc(
      validated.startDate,
      validated.startTime,
      timezone
    );

    // Atomically create the AbstinenceTracker and its initial active session
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create a linked habit tracker (metricType: AVOIDANCE) to unify with dashboard & habits
      const slugBase = validated.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\u0621-\u064A]+/g, "-")
        .replace(/^-|-$/g, "");
      const uniqueSlug = `abstain-${slugBase || "behavior"}-${Date.now().toString(36)}`;

      const habitTracker = await tx.tracker.create({
        data: {
          userId,
          name: validated.name.trim(),
          slug: uniqueSlug,
          description: validated.description?.trim() || null,
          icon: validated.icon || "ShieldCheck",
          color: validated.color || "rose",
          metricType: "AVOIDANCE",
          unit: "يوم",
          targetValue: validated.targetDays || 30,
          targetFrequency: "DAILY",
          trackerConfig: {
            behaviorName: validated.name.trim(),
            cleanLabel: "يوم نظيف ومثالي",
            relapseLabel: "حدثت زلة أو انتكاسة",
            targetCleanDays: validated.targetDays || 30,
          },
        },
      });

      // 2. Create the AbstinenceTracker entity
      const abstinenceTracker = await tx.abstinenceTracker.create({
        data: {
          userId,
          trackerId: habitTracker.id,
          name: validated.name.trim(),
          description: validated.description?.trim() || null,
          icon: validated.icon || "ShieldCheck",
          color: validated.color || "rose",
          targetDays: validated.targetDays || null,
        },
      });

      // 3. Create initial active session
      const activeSession = await tx.abstinenceSession.create({
        data: {
          userId,
          abstinenceTrackerId: abstinenceTracker.id,
          startedAt,
          endedAt: null,
          durationSeconds: null,
        },
      });

      return { abstinenceTracker, activeSession, habitTracker };
    });

    revalidatePath("/abstinence");
    revalidatePath("/habits");
    revalidatePath("/");

    return {
      success: true,
      data: result.abstinenceTracker,
      message: "تم إنشاء هدف الامتناع بنجاح",
    };
  } catch (error: any) {
    console.error("Error creating abstinence tracker:", error);
    return {
      success: false,
      error: error?.message || "فشل إنشاء هدف الامتناع",
    };
  }
}

/**
 * Log a Relapse (تسجيل الانتكاسة)
 * Ends current active session, computes duration, logs notes/triggers, and starts new session.
 */
export async function logRelapse(rawInput: LogRelapseInput) {
  try {
    const userId = await requireAuth();
    const validated = LogRelapseSchema.parse(rawInput);
    const timezone = validated.timezone || (await getUserTimezone(userId));

    // Convert local relapse date and time to exact UTC timestamp
    const relapseTimestamp = parseLocalDateTimeToUtc(
      validated.relapseDate,
      validated.relapseTime,
      timezone
    );

    // Verify tracker ownership and get current active session
    const tracker = await prisma.abstinenceTracker.findFirst({
      where: {
        id: validated.trackerId,
        userId,
      },
      include: {
        sessions: {
          where: { endedAt: null },
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!tracker) {
      return { success: false, error: "هدف الامتناع غير موجود" };
    }

    const currentSession = tracker.sessions[0];
    if (!currentSession) {
      return { success: false, error: "لا توجد جلسة امتناع نشطة حالياً لإنهاءها" };
    }

    if (relapseTimestamp.getTime() < currentSession.startedAt.getTime()) {
      return {
        success: false,
        error: "تاريخ ووقت الانتكاسة لا يمكن أن يكون قبل تاريخ بداية الجلسة الحالية",
      };
    }

    // Compute exact session duration in seconds
    const durationSeconds = Math.max(
      0,
      Math.floor((relapseTimestamp.getTime() - currentSession.startedAt.getTime()) / 1000)
    );

    // Determine start timestamp for the new session
    let newSessionStartedAt = relapseTimestamp;
    if (!validated.startNewSessionFromRelapse && validated.newStartDate && validated.newStartTime) {
      newSessionStartedAt = parseLocalDateTimeToUtc(
        validated.newStartDate,
        validated.newStartTime,
        timezone
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. End current session and archive its duration and relapse details
      await tx.abstinenceSession.update({
        where: { id: currentSession.id },
        data: {
          endedAt: relapseTimestamp,
          durationSeconds,
          relapseReason: validated.relapseReason?.trim() || null,
          trigger: validated.trigger?.trim() || null,
          notes: validated.notes?.trim() || null,
        },
      });

      // 2. Start a fresh active session
      await tx.abstinenceSession.create({
        data: {
          userId,
          abstinenceTrackerId: tracker.id,
          startedAt: newSessionStartedAt,
          endedAt: null,
          durationSeconds: null,
        },
      });

      // 3. If linked to a habit Tracker, record an entry for calendar/timeline integration
      if (tracker.trackerId) {
        const localDate = getLocalDateString(relapseTimestamp, timezone);
        await tx.trackerEntry.create({
          data: {
            trackerId: tracker.trackerId,
            userId,
            localDate,
            occurredAt: relapseTimestamp,
            valueBoolean: false, // Relapse occurred
            valueNumeric: 1,
            entryPayload: {
              isClean: false,
              relapseReason: validated.relapseReason || null,
              trigger: validated.trigger || null,
            },
            notes: validated.notes || validated.relapseReason || "تسجيل انتكاسة وبداية عهد جديد",
          },
        });
      }
    });

    revalidatePath("/abstinence");
    revalidatePath("/habits");
    revalidatePath("/");

    return {
      success: true,
      message: "تم تسجيل الانتكاسة وحفظ سجل الجلسة وبدء جلسة جديدة بنجاح",
    };
  } catch (error: any) {
    console.error("Error logging relapse:", error);
    return {
      success: false,
      error: error?.message || "فشل تسجيل الانتكاسة",
    };
  }
}

/**
 * Update the Start Date & Time of the current active session
 */
export async function updateAbstinenceStartTime(rawInput: UpdateStartTimeInput) {
  try {
    const userId = await requireAuth();
    const validated = UpdateStartTimeSchema.parse(rawInput);
    const timezone = validated.timezone || (await getUserTimezone(userId));

    const newStartedAt = parseLocalDateTimeToUtc(
      validated.startDate,
      validated.startTime,
      timezone
    );

    // Verify tracker ownership
    const tracker = await prisma.abstinenceTracker.findFirst({
      where: {
        id: validated.trackerId,
        userId,
      },
      include: {
        sessions: {
          where: { endedAt: null },
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!tracker) {
      return { success: false, error: "هدف الامتناع غير موجود" };
    }

    const activeSession = tracker.sessions[0];
    if (!activeSession) {
      return { success: false, error: "لا توجد جلسة نشطة حالياً لتعديل وقت بدايتها" };
    }

    await prisma.abstinenceSession.update({
      where: { id: activeSession.id },
      data: {
        startedAt: newStartedAt,
      },
    });

    revalidatePath("/abstinence");
    revalidatePath("/habits");
    revalidatePath("/");

    return {
      success: true,
      message: "تم تعديل تاريخ ووقت بداية الامتناع وتحديث العداد بنجاح",
      newStartedAt,
    };
  } catch (error: any) {
    console.error("Error updating abstinence start time:", error);
    return {
      success: false,
      error: error?.message || "فشل تعديل تاريخ بداية الامتناع",
    };
  }
}

/**
 * Update general metadata of an abstinence tracker
 */
export async function updateAbstinenceTracker(rawInput: UpdateAbstinenceTrackerInput) {
  try {
    const userId = await requireAuth();
    const validated = UpdateAbstinenceTrackerSchema.parse(rawInput);

    const tracker = await prisma.abstinenceTracker.findFirst({
      where: { id: validated.trackerId, userId },
    });

    if (!tracker) {
      return { success: false, error: "هدف الامتناع غير موجود" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.abstinenceTracker.update({
        where: { id: tracker.id },
        data: {
          name: validated.name.trim(),
          description: validated.description?.trim() || null,
          targetDays: validated.targetDays || null,
          color: validated.color || tracker.color,
          icon: validated.icon || tracker.icon,
        },
      });

      if (tracker.trackerId) {
        await tx.tracker.update({
          where: { id: tracker.trackerId },
          data: {
            name: validated.name.trim(),
            description: validated.description?.trim() || null,
            targetValue: validated.targetDays || 30,
            color: validated.color || tracker.color,
            icon: validated.icon || tracker.icon,
          },
        });
      }
    });

    revalidatePath("/abstinence");
    revalidatePath("/habits");
    revalidatePath("/");

    return { success: true, message: "تم تحديث الهدف بنجاح" };
  } catch (error: any) {
    console.error("Error updating abstinence tracker:", error);
    return {
      success: false,
      error: error?.message || "فشل تحديث الهدف",
    };
  }
}

/**
 * Archive or Delete an abstinence tracker
 */
export async function deleteAbstinenceTracker(trackerId: string) {
  try {
    const userId = await requireAuth();

    const tracker = await prisma.abstinenceTracker.findFirst({
      where: { id: trackerId, userId },
    });

    if (!tracker) {
      return { success: false, error: "هدف الامتناع غير موجود" };
    }

    await prisma.$transaction(async (tx) => {
      if (tracker.trackerId) {
        await tx.tracker.delete({
          where: { id: tracker.trackerId },
        }).catch(() => {});
      }

      await tx.abstinenceTracker.delete({
        where: { id: tracker.id },
      });
    });

    revalidatePath("/abstinence");
    revalidatePath("/habits");
    revalidatePath("/");

    return { success: true, message: "تم حذف هدف الامتناع وسجلاته بنجاح" };
  } catch (error: any) {
    console.error("Error deleting abstinence tracker:", error);
    return {
      success: false,
      error: error?.message || "فشل حذف هدف الامتناع",
    };
  }
}

