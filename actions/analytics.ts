"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-session";
import { getLocalDateString, addDaysToDateString } from "@/lib/dates";
import {
  calculateTrackerStreak,
  calculateTrackerMetrics,
  generateChartDataPoints,
} from "@/lib/analytics";

async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error("غير مصرح: يجب تسجيل الدخول للوصول للتحليلات");
  }
  return session.user.id;
}

/**
 * 1. Get Unified Analytics Overview
 */
export async function getAnalyticsOverview(timeRangeDays: number = 7) {
  try {
    const userId = await requireAuth();

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    const timezone = userSettings?.timezone || "Asia/Riyadh";
    const todayStr = getLocalDateString(new Date(), timezone);

    const startDate = addDaysToDateString(todayStr, -(timeRangeDays - 1));
    const endDate = todayStr;

    // Date-scoped queries
    const [trackers, entries, lifeAreas, tasks] = await Promise.all([
      prisma.tracker.findMany({
        where: { userId, isArchived: false },
        include: {
          lifeArea: { select: { id: true, name: true, color: true, icon: true } },
        },
        orderBy: [{ priority: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.trackerEntry.findMany({
        where: {
          userId,
          localDate: { gte: startDate, lte: endDate },
        },
        include: {
          tracker: {
            select: { id: true, name: true, metricType: true, unit: true, targetValue: true },
          },
        },
        orderBy: { occurredAt: "asc" },
      }),
      prisma.lifeArea.findMany({
        where: { userId, isArchived: false },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.task.findMany({
        where: {
          userId,
          isArchived: false,
          status: "COMPLETED",
          completedAt: { gte: new Date(startDate) },
        },
      }),
    ]);

    // Tracker-specific analytics & streaks
    const trackerAnalytics = trackers.map((tracker) => {
      const trackerEntries = entries.filter((e) => e.trackerId === tracker.id);
      const streak = calculateTrackerStreak(tracker, trackerEntries, todayStr);
      const metrics = calculateTrackerMetrics(tracker, trackerEntries);
      const chartPoints = generateChartDataPoints(tracker, trackerEntries, timeRangeDays, todayStr);

      return {
        id: tracker.id,
        name: tracker.name,
        slug: tracker.slug,
        icon: tracker.icon,
        color: tracker.color,
        priority: tracker.priority,
        metricType: tracker.metricType,
        unit: tracker.unit,
        targetValue: tracker.targetValue,
        lifeArea: tracker.lifeArea,
        streak,
        metrics,
        chartPoints,
      };
    });

    // Life Area Progress Breakdown
    const lifeAreaStats = lifeAreas.map((area) => {
      const areaTrackers = trackers.filter((t) => t.lifeAreaId === area.id);
      const areaTrackerIds = new Set(areaTrackers.map((t) => t.id));
      const areaEntries = entries.filter((e) => areaTrackerIds.has(e.trackerId));

      return {
        id: area.id,
        name: area.name,
        color: area.color,
        icon: area.icon,
        trackersCount: areaTrackers.length,
        entriesCount: areaEntries.length,
      };
    });

    // Total focus duration in hours
    const totalDurationSeconds = entries.reduce((acc, e) => acc + (e.valueDuration || 0), 0);
    const totalDurationHours = Number((totalDurationSeconds / 3600).toFixed(1));

    // Consistency score (Actual scheduled completed habits / total expected)
    const completedCount = trackerAnalytics.reduce((acc, t) => acc + (t.streak.currentStreak > 0 ? 1 : 0), 0);
    const overallConsistencyPct = trackers.length > 0 ? Math.min(100, Math.round((completedCount / trackers.length) * 100)) : 0;

    return {
      success: true,
      data: {
        timeRangeDays,
        startDate,
        endDate,
        todayStr,
        summary: {
          totalTrackers: trackers.length,
          activeStreaksCount: trackerAnalytics.filter((t) => t.streak.currentStreak > 0).length,
          totalDurationHours,
          completedTasksInRange: tasks.length,
          overallConsistencyPct,
        },
        trackers: trackerAnalytics,
        lifeAreas: lifeAreaStats,
      },
    };
  } catch (error: any) {
    console.error("Error generating analytics:", error);
    return {
      success: false,
      error: error?.message || "فشل توليد التحليلات",
    };
  }
}

/**
 * 2. Get Tracker Historical Comparison (Current period vs Previous period)
 */
export async function getTrackerComparison(trackerId: string, days: number = 7) {
  try {
    const userId = await requireAuth();

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    const todayStr = getLocalDateString(new Date(), userSettings?.timezone || "Asia/Riyadh");

    const currentStart = addDaysToDateString(todayStr, -(days - 1));
    const previousStart = addDaysToDateString(currentStart, -days);
    const previousEnd = addDaysToDateString(currentStart, -1);

    const tracker = await prisma.tracker.findFirst({
      where: { id: trackerId, userId },
      include: { lifeArea: true },
    });

    if (!tracker) {
      return { success: false, error: "المتعقب غير موجود" };
    }

    const [currentEntries, previousEntries] = await Promise.all([
      prisma.trackerEntry.findMany({
        where: {
          trackerId,
          userId,
          localDate: { gte: currentStart, lte: todayStr },
        },
      }),
      prisma.trackerEntry.findMany({
        where: {
          trackerId,
          userId,
          localDate: { gte: previousStart, lte: previousEnd },
        },
      }),
    ]);

    const currentMetrics = calculateTrackerMetrics(tracker, currentEntries);
    const previousMetrics = calculateTrackerMetrics(tracker, previousEntries);
    const streak = calculateTrackerStreak(tracker, currentEntries, todayStr);
    const chartPoints = generateChartDataPoints(tracker, currentEntries, days, todayStr);

    return {
      success: true,
      data: {
        tracker,
        current: currentMetrics,
        previous: previousMetrics,
        streak,
        chartPoints,
      },
    };
  } catch (error: any) {
    console.error("Error generating tracker comparison:", error);
    return {
      success: false,
      error: error?.message || "فشل حساب المقارنة التاريخية",
    };
  }
}

