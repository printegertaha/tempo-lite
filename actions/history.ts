"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-session";
import { recordDeletionTombstone } from "@/lib/sync/tombstone";
import {
  DailyNoteSaveSchema,
  DailyNoteSaveInput,
  DailyOverviewQuerySchema,
  CalendarMonthQuerySchema,
} from "@/lib/validations/history";
import { getLocalDateString } from "@/lib/dates";

/**
 * Helper to ensure the active user has a verified session.
 */
async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error("غير مصرح: يجب تسجيل الدخول للوصول للسجل التاريخي");
  }
  return session.user.id;
}

/**
 * 1. Get Daily Overview (Complete Historical Snapshot for a Single Local Date)
 */
export async function getDailyOverview(localDateInput?: string) {
  try {
    const userId = await requireAuth();

    // Get user timezone & optional prayer preference
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { timezone: true, prayerTrackingEnabled: true },
    });
    const timezone = userSettings?.timezone || "Africa/Cairo";
    const prayerTrackingEnabled = userSettings?.prayerTrackingEnabled ?? true;
    const localDate = localDateInput || getLocalDateString(new Date(), timezone);

    DailyOverviewQuerySchema.parse({ localDate });

    // Date-scoped parallel queries (only fetches for this specific localDate)
    const [trackers, entries, tasks, dailyNote, prayerRecords] = await Promise.all([
      // 1. Active Trackers (not archived, not paused)
      prisma.tracker.findMany({
        where: { userId, isArchived: false, isPaused: false },
        include: {
          lifeArea: { select: { id: true, name: true, color: true, icon: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      // 2. Entries logged for this local calendar date
      prisma.trackerEntry.findMany({
        where: { userId, localDate },
        include: {
          tracker: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
              metricType: true,
              unit: true,
              targetValue: true,
            },
          },
        },
        orderBy: { occurredAt: "asc" },
      }),
      // 3. Tasks due on this day (indexed by @@index([userId, status, dueDate]))
      prisma.task.findMany({
        where: {
          userId,
          isArchived: false,
          dueDate: localDate,
        },
        include: {
          lifeArea: { select: { id: true, name: true, color: true, icon: true } },
          tracker: { select: { id: true, name: true, color: true, icon: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take: 100,
      }),
      // 4. Daily Note / Reflection for this date
      prisma.dailyNote.findUnique({
        where: {
          userId_localDate: { userId, localDate },
        },
      }),
      // 5. Prayer Records for this date (skipped in UI/KPIs when disabled, never deleted)
      prayerTrackingEnabled
        ? prisma.prayerRecord.findMany({
            where: { userId, date: localDate },
            orderBy: { prayerKey: "asc" },
          })
        : Promise.resolve([]),
    ]);

    // Map trackers with their daily progress
    const [year, month, day] = localDate.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday

    const trackersWithProgress = trackers.map((t) => {
      const trackerEntries = entries.filter((e) => e.trackerId === t.id);
      const schedule = (t.scheduleConfig as any) || {};
      const scheduledDays = schedule.days || [0, 1, 2, 3, 4, 5, 6];
      const isScheduledForDay = scheduledDays.includes(dayOfWeek);

      // Compute progress
      let current = 0;
      let isCompleted = false;

      if (t.metricType === "BOOLEAN") {
        isCompleted = Boolean(trackerEntries[0]?.valueBoolean);
        current = isCompleted ? 1 : 0;
      } else if (t.metricType === "COUNTER" || t.metricType === "NUMBER") {
        current = trackerEntries.reduce((sum, e) => sum + (e.valueNumeric || 0), 0);
        isCompleted = t.targetValue ? current >= t.targetValue : current > 0;
      } else if (t.metricType === "DURATION" || t.metricType === "TIME_RANGE") {
        const totalSeconds = trackerEntries.reduce((sum, e) => sum + (e.valueDuration || 0), 0);
        current = Math.round(totalSeconds / 60); // in minutes
        const targetMinutes = t.targetValue || 0;
        isCompleted = targetMinutes > 0 ? current >= targetMinutes : totalSeconds > 0;
      } else if (t.metricType === "CHECKLIST") {
        const latest = trackerEntries[trackerEntries.length - 1];
        const payload = (latest?.entryPayload as any) || {};
        const completedIds = payload.completedItemIds || [];
        current = completedIds.length;
        const totalItems = (t.trackerConfig as any)?.items?.length || 1;
        isCompleted = current >= totalItems;
      } else if (t.metricType === "AVOIDANCE") {
        const latest = trackerEntries[trackerEntries.length - 1];
        isCompleted = Boolean(latest?.valueBoolean ?? true);
        current = isCompleted ? 1 : 0;
      }

      return {
        ...t,
        isScheduledForDay,
        entriesCount: trackerEntries.length,
        currentValue: current,
        isCompleted,
        entries: trackerEntries,
      };
    });

    // Breakdown sessions (study, gym, sleep, programming)
    const sessions = entries
      .filter((e) => e.valueDuration && e.valueDuration > 0)
      .map((e) => ({
        id: e.id,
        trackerName: e.tracker.name,
        trackerIcon: e.tracker.icon,
        durationSeconds: e.valueDuration || 0,
        subject: (e.entryPayload as any)?.subject || null,
        notes: e.notes,
        occurredAt: e.occurredAt,
      }));

    const totalDurationSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);

    // Filter relevant tasks for this date
    const tasksDueToday = tasks.filter((t) => t.dueDate === localDate);
    const tasksCompletedToday = tasks.filter((t) => t.status === "COMPLETED");

    return {
      success: true,
      data: {
        date: localDate,
        trackers: trackersWithProgress,
        entries,
        sessions,
        totalDurationSeconds,
        tasks: {
          due: tasksDueToday,
          completed: tasksCompletedToday,
        },
        dailyNote,
        prayers: prayerRecords,
        summary: {
          totalTrackers: trackers.length,
          completedTrackers: trackersWithProgress.filter((t) => t.isCompleted).length,
          completedTasksCount: tasksCompletedToday.length,
          completedPrayersCount: prayerRecords.filter((p) => p.isCompleted).length,
          totalDurationMinutes: Math.round(totalDurationSeconds / 60),
          hasNote: Boolean(dailyNote?.content),
        },
      },
    };
  } catch (error: any) {
    console.error("Error fetching daily overview:", error);
    return {
      success: false,
      error: error?.message || "فشل استرجاع النظرة اليومية",
    };
  }
}

/**
 * 2. Get Calendar Month Summary (Date-Scoped Activity per Day)
 */
export async function getCalendarMonthSummary(yearInput: number, monthInput: number) {
  try {
    const userId = await requireAuth();

    const validated = CalendarMonthQuerySchema.parse({
      year: yearInput,
      month: monthInput,
    });

    const { year, month } = validated;

    // Build startDate and endDate for this month (e.g. 2026-11-01 to 2026-11-30)
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { timezone: true, prayerTrackingEnabled: true },
    });
    const todayStr = getLocalDateString(new Date(), userSettings?.timezone || "Africa/Cairo");
    const prayerTrackingEnabled = userSettings?.prayerTrackingEnabled ?? true;

    // Date-scoped queries for the month
    const [entries, tasks, notes, prayers] = await Promise.all([
      prisma.trackerEntry.findMany({
        where: {
          userId,
          localDate: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          localDate: true,
          trackerId: true,
          valueBoolean: true,
          valueNumeric: true,
          valueDuration: true,
        },
      }),
      prisma.task.findMany({
        where: {
          userId,
          dueDate: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          dueDate: true,
          status: true,
        },
      }),
      prisma.dailyNote.findMany({
        where: {
          userId,
          localDate: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          localDate: true,
          mood: true,
        },
      }),
      prayerTrackingEnabled
        ? prisma.prayerRecord.findMany({
            where: {
              userId,
              date: { gte: startDate, lte: endDate },
              isCompleted: true,
            },
            select: {
              id: true,
              date: true,
              prayerKey: true,
              isCompleted: true,
            },
          })
        : Promise.resolve([]),
    ]);

    // Group by localDate
    const daysMap: Record<string, any> = {};

    for (let day = 1; day <= lastDayOfMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isFuture = dateStr > todayStr;
      const isToday = dateStr === todayStr;

      const dayEntries = entries.filter((e) => e.localDate === dateStr);
      const dayTasks = tasks.filter((t) => t.dueDate === dateStr);
      const dayNote = notes.find((n) => n.localDate === dateStr);
      const dayPrayers = prayers.filter((p) => p.date === dateStr);

      const entriesCount = dayEntries.length;
      const totalDurationSeconds = dayEntries.reduce((sum, e) => sum + (e.valueDuration || 0), 0);
      const completedTasksCount = dayTasks.filter((t) => t.status === "COMPLETED").length;
      const completedPrayersCount = dayPrayers.length;
      const hasData = entriesCount > 0 || Boolean(dayNote) || completedTasksCount > 0 || completedPrayersCount > 0;

      // Status indicator:
      // - "future": upcoming days
      // - "recorded": confirmed user tracking
      // - "no_data": days without sufficient data (neutral, never labeled failure)
      let status: "future" | "recorded" | "no_data" = "no_data";
      if (isFuture) {
        status = "future";
      } else if (hasData) {
        status = "recorded";
      } else {
        status = "no_data";
      }

      daysMap[dateStr] = {
        date: dateStr,
        day,
        isToday,
        isFuture,
        status,
        hasData,
        entriesCount,
        totalDurationSeconds,
        completedTasksCount,
        completedPrayersCount,
        hasNote: Boolean(dayNote),
        mood: dayNote?.mood || null,
      };
    }

    return {
      success: true,
      data: {
        year,
        month,
        startDate,
        endDate,
        todayStr,
        days: daysMap,
      },
    };
  } catch (error: any) {
    console.error("Error fetching calendar summary:", error);
    return {
      success: false,
      error: error?.message || "فشل استرجاع بيانات التقويم",
    };
  }
}

/**
 * 3. Save / Upsert Daily Note (Journal reflection for a specific local date)
 */
export async function saveDailyNote(rawInput: DailyNoteSaveInput) {
  try {
    const userId = await requireAuth();
    const validated = DailyNoteSaveSchema.parse(rawInput);

    const note = await prisma.dailyNote.upsert({
      where: {
        userId_localDate: {
          userId,
          localDate: validated.localDate,
        },
      },
      update: {
        title: validated.title || null,
        content: validated.content,
        mood: validated.mood || null,
        tags: validated.tags,
      },
      create: {
        userId,
        localDate: validated.localDate,
        title: validated.title || null,
        content: validated.content,
        mood: validated.mood || null,
        tags: validated.tags,
      },
    });

    revalidatePath("/journal");
    revalidatePath("/calendar");
    revalidatePath("/");

    return { success: true, data: note };
  } catch (error: any) {
    console.error("Error saving daily note:", error);
    return {
      success: false,
      error: error?.message || "فشل حفظ اليومية",
    };
  }
}

/**
 * 4. Delete Daily Note
 */
export async function deleteDailyNote(localDate: string) {
  try {
    const userId = await requireAuth();

    const existing = await prisma.dailyNote.findFirst({
      where: { userId, localDate },
      select: { id: true },
    });

    await prisma.dailyNote.deleteMany({
      where: {
        userId,
        localDate,
      },
    });
    if (existing?.id) {
      await recordDeletionTombstone(userId, "daily_note", existing.id);
    }

    revalidatePath("/journal");
    revalidatePath("/calendar");
    revalidatePath("/");

    return { success: true, message: "تم حذف اليومية بنجاح" };
  } catch (error: any) {
    console.error("Error deleting daily note:", error);
    return {
      success: false,
      error: error?.message || "فشل حذف اليومية",
    };
  }
}
