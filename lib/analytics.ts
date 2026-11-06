import { addDaysToDateString, getLocalDateString } from "./dates";

export interface StreakResult {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null;
  scheduledDaysCount: number;
}

/**
 * Meaningful Streak Calculation Engine
 * 
 * Rules:
 * 1. Respects each tracker's individual schedule (e.g. Mon-Fri; Sat/Sun are not penalties).
 * 2. Unscheduled days do NOT break or penalize streaks.
 * 3. Missing records on a scheduled day break the streak (does not assume missing = success).
 * 4. Archived periods are excluded.
 */
export function calculateTrackerStreak(
  tracker: {
    id: string;
    metricType: string;
    targetValue?: number | null;
    trackerConfig?: any;
    scheduleConfig?: any;
    createdAt: Date | string;
    isArchived?: boolean;
  },
  entries: Array<{
    localDate: string;
    valueBoolean?: boolean | null;
    valueNumeric?: number | null;
    valueDuration?: number | null;
    entryPayload?: any;
  }>,
  todayStr: string = getLocalDateString()
): StreakResult {
  if (tracker.isArchived) {
    return { currentStreak: 0, bestStreak: 0, lastCompletedDate: null, scheduledDaysCount: 0 };
  }

  const schedule = tracker.scheduleConfig || {};
  const scheduledDays: number[] = schedule.days || [0, 1, 2, 3, 4, 5, 6];

  // Group entries by localDate
  const entriesByDate = new Map<string, typeof entries>();
  for (const entry of entries) {
    const list = entriesByDate.get(entry.localDate) || [];
    list.push(entry);
    entriesByDate.set(entry.localDate, list);
  }

  // Check if a specific date met the tracker's goal
  const isDateCompleted = (dateStr: string): boolean => {
    const dayEntries = entriesByDate.get(dateStr);
    if (!dayEntries || dayEntries.length === 0) return false;

    const metric = tracker.metricType;
    if (metric === "BOOLEAN") {
      return Boolean(dayEntries[0].valueBoolean);
    }
    if (metric === "COUNTER" || metric === "NUMBER") {
      const sum = dayEntries.reduce((acc, e) => acc + (e.valueNumeric || 0), 0);
      return tracker.targetValue ? sum >= tracker.targetValue : sum > 0;
    }
    if (metric === "DURATION" || metric === "TIME_RANGE") {
      const totalSec = dayEntries.reduce((acc, e) => acc + (e.valueDuration || 0), 0);
      const targetSec = (tracker.targetValue || 0) * 60;
      return targetSec > 0 ? totalSec >= targetSec : totalSec > 0;
    }
    if (metric === "CHECKLIST") {
      const latest = dayEntries[dayEntries.length - 1];
      const completedIds = (latest.entryPayload as any)?.completedItemIds || [];
      const totalItems = (tracker.trackerConfig as any)?.items?.length || 1;
      return completedIds.length >= totalItems;
    }
    if (metric === "AVOIDANCE") {
      const latest = dayEntries[dayEntries.length - 1];
      return Boolean(latest.valueBoolean ?? true);
    }
    return false;
  };

  // Start evaluating from today backwards
  let currentStreak = 0;
  let bestStreak = 0;
  let runningStreak = 0;
  let lastCompletedDate: string | null = null;
  let currentDate = todayStr;

  // Check today's status
  const todayDateObj = new Date(todayStr);
  const todayDayOfWeek = todayDateObj.getDay();
  const isTodayScheduled = scheduledDays.includes(todayDayOfWeek);
  const isTodayDone = isDateCompleted(todayStr);

  if (isTodayDone) {
    currentStreak++;
    lastCompletedDate = todayStr;
  }

  // Iterate backwards up to 365 days
  let inspectDate = addDaysToDateString(todayStr, -1);
  const limitDate = new Date(tracker.createdAt).toISOString().split("T")[0];
  let daysInspected = 0;

  while (daysInspected < 365 && inspectDate >= limitDate) {
    const [y, m, d] = inspectDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay();

    const isScheduled = scheduledDays.includes(dayOfWeek);

    if (isScheduled) {
      const done = isDateCompleted(inspectDate);
      if (done) {
        if (!lastCompletedDate) lastCompletedDate = inspectDate;
        runningStreak++;
        if (currentStreak > 0 || isTodayDone || !isTodayScheduled) {
          currentStreak++;
        }
      } else {
        // Scheduled day was missed -> streak breaks here
        if (runningStreak > bestStreak) bestStreak = runningStreak;
        runningStreak = 0;
        break; // Current streak is halted
      }
    }
    // If not scheduled, we simply skip and do not break streak!

    inspectDate = addDaysToDateString(inspectDate, -1);
    daysInspected++;
  }

  bestStreak = Math.max(bestStreak, currentStreak, runningStreak);

  return {
    currentStreak,
    bestStreak,
    lastCompletedDate,
    scheduledDaysCount: scheduledDays.length,
  };
}

/**
 * Metric-Specific Aggregations
 */
export function calculateTrackerMetrics(
  tracker: {
    id: string;
    name: string;
    metricType: string;
    unit?: string | null;
    targetValue?: number | null;
    trackerConfig?: any;
  },
  entries: Array<{
    localDate: string;
    valueBoolean?: boolean | null;
    valueNumeric?: number | null;
    valueDuration?: number | null;
    entryPayload?: any;
  }>
) {
  const metricType = tracker.metricType;
  const entriesCount = entries.length;

  if (metricType === "DURATION" || metricType === "TIME_RANGE") {
    const totalSeconds = entries.reduce((sum, e) => sum + (e.valueDuration || 0), 0);
    const totalMinutes = Math.round(totalSeconds / 60);
    const totalHours = Number((totalSeconds / 3600).toFixed(1));
    const averageSessionMinutes = entriesCount > 0 ? Math.round(totalMinutes / entriesCount) : 0;

    return {
      type: "DURATION",
      totalSeconds,
      totalMinutes,
      totalHours,
      sessionsCount: entriesCount,
      averageSessionMinutes,
      unit: "دقيقة",
      primaryStat: `${totalHours} س`,
      secondaryStat: `${entriesCount} جلسات (متوسط ${averageSessionMinutes} د)`,
    };
  }

  if (metricType === "COUNTER") {
    const totalCount = entries.reduce((sum, e) => sum + (e.valueNumeric || 0), 0);
    const dates = new Set(entries.map((e) => e.localDate));
    const daysCount = dates.size || 1;
    const dailyAverage = Number((totalCount / daysCount).toFixed(1));

    return {
      type: "COUNTER",
      totalCount,
      dailyAverage,
      unit: tracker.unit || "مرات",
      primaryStat: `${totalCount} ${tracker.unit || "مرات"}`,
      secondaryStat: `متوسط ${dailyAverage} يومياً`,
    };
  }

  if (metricType === "NUMBER") {
    const values = entries.map((e) => e.valueNumeric).filter((v): v is number => v !== null && v !== undefined);
    const latestValue = values.length > 0 ? values[values.length - 1] : 0;
    const sum = values.reduce((a, b) => a + b, 0);
    const averageValue = values.length > 0 ? Number((sum / values.length).toFixed(1)) : 0;
    const minValue = values.length > 0 ? Math.min(...values) : 0;
    const maxValue = values.length > 0 ? Math.max(...values) : 0;

    return {
      type: "NUMBER",
      latestValue,
      averageValue,
      minValue,
      maxValue,
      unit: tracker.unit || "",
      primaryStat: `${latestValue} ${tracker.unit || ""}`.trim(),
      secondaryStat: `المتوسط: ${averageValue} (الأدنى: ${minValue} / الأعلى: ${maxValue})`,
    };
  }

  if (metricType === "CHECKLIST") {
    const dates = new Set(entries.map((e) => e.localDate));
    const totalDays = dates.size || 1;
    const totalItems = (tracker.trackerConfig as any)?.items?.length || 1;

    let fullCompletedDays = 0;
    for (const d of dates) {
      const dayEntries = entries.filter((e) => e.localDate === d);
      const latest = dayEntries[dayEntries.length - 1];
      const completedIds = (latest?.entryPayload as any)?.completedItemIds || [];
      if (completedIds.length >= totalItems) fullCompletedDays++;
    }

    const completionRatePct = Math.min(100, Math.round((fullCompletedDays / totalDays) * 100));

    return {
      type: "CHECKLIST",
      totalDays,
      fullCompletedDays,
      completionRatePct,
      primaryStat: `${fullCompletedDays} / ${totalDays} يوم`,
      secondaryStat: `معدل إتمام: ${completionRatePct}%`,
    };
  }

  if (metricType === "AVOIDANCE") {
    const cleanDays = entries.filter((e) => Boolean(e.valueBoolean)).length;
    const lapseDays = entries.filter((e) => !Boolean(e.valueBoolean)).length;
    const totalRecordedDays = cleanDays + lapseDays || 1;
    const cleanRatePct = Math.round((cleanDays / totalRecordedDays) * 100);

    return {
      type: "AVOIDANCE",
      cleanDays,
      lapseDays,
      cleanRatePct,
      primaryStat: `${cleanDays} أيام نظيفة`,
      secondaryStat: `انتكاسات: ${lapseDays} (نسبة الثبات ${cleanRatePct}%)`,
    };
  }

  // BOOLEAN default
  const completedCount = entries.filter((e) => Boolean(e.valueBoolean)).length;
  const dates = new Set(entries.map((e) => e.localDate));
  const totalDays = dates.size || 1;
  const adherencePct = Math.round((completedCount / totalDays) * 100);

  return {
    type: "BOOLEAN",
    completedCount,
    adherencePct,
    primaryStat: `${completedCount} أيام`,
    secondaryStat: `نسبة الالتزام ${adherencePct}%`,
  };
}

/**
 * Generate Chart Data Points for StockMarketChart (Last 7 or 14 Days)
 */
export function generateChartDataPoints(
  tracker: { metricType: string },
  entries: Array<{
    localDate: string;
    valueBoolean?: boolean | null;
    valueNumeric?: number | null;
    valueDuration?: number | null;
    entryPayload?: any;
  }>,
  daysCount: number = 7,
  todayStr: string = getLocalDateString()
) {
  const points = [];
  const entriesByDate = new Map<string, typeof entries>();
  for (const e of entries) {
    const list = entriesByDate.get(e.localDate) || [];
    list.push(e);
    entriesByDate.set(e.localDate, list);
  }

  const arabicDayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

  for (let i = daysCount - 1; i >= 0; i--) {
    const dStr = addDaysToDateString(todayStr, -i);
    const dayEntries = entriesByDate.get(dStr) || [];

    const [year, month, day] = dStr.split("-").map(Number);
    const dt = new Date(year, month - 1, day);
    const weekdayName = i === 0 ? "اليوم" : arabicDayNames[dt.getDay()];
    const shortDate = `${month}-${day}`;

    let val = 0;
    const metric = tracker.metricType;

    if (metric === "DURATION" || metric === "TIME_RANGE") {
      const totalSec = dayEntries.reduce((sum, e) => sum + (e.valueDuration || 0), 0);
      val = Number((totalSec / 3600).toFixed(1)); // hours
    } else if (metric === "COUNTER" || metric === "NUMBER") {
      val = dayEntries.reduce((sum, e) => sum + (e.valueNumeric || 0), 0);
    } else if (metric === "BOOLEAN" || metric === "AVOIDANCE") {
      val = dayEntries.some((e) => Boolean(e.valueBoolean)) ? 100 : 0;
    } else if (metric === "CHECKLIST") {
      const latest = dayEntries[dayEntries.length - 1];
      const completedIds = (latest?.entryPayload as any)?.completedItemIds || [];
      val = completedIds.length;
    }

    points.push({
      label: weekdayName,
      date: shortDate,
      val,
      volume: dayEntries.length,
    });
  }

  return points;
}
