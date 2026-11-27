import {
  addDaysToDateString,
  getDefaultTimezone,
  getLocalDateString,
  splitUtcToLocalDateTime,
} from "@/lib/dates";
import { isPrayerModuleVisible } from "@/lib/onboarding";
import type { LocalTask, LocalPrayerRecord } from "@/lib/local-db";

export type HomeObligationState =
  | "pending"
  | "new_user"
  | "all_completed"
  | "nothing_due_today";

export interface DailyObligationSummary {
  overdueTasks: LocalTask[];
  todayTasks: LocalTask[];
  pendingHabits: Array<{
    tracker: any;
    entriesToday: any[];
    progressPercent: number;
    currentValue: number;
    targetValue: number;
  }>;
  pendingPrayers: Array<{
    prayerKey: string;
    nameArabic: string;
    scheduledTime?: string;
    record?: LocalPrayerRecord;
  }>;
  allDone: boolean;
  totalPendingCount: number;
  completedTodayCount: number;
  hasAnyConfiguredObligations: boolean;
  homeState: HomeObligationState;
}

const DEFAULT_PRAYER_META: ReadonlyArray<{
  key: LocalPrayerRecord["prayerKey"];
  nameArabic: string;
}> = [
  { key: "fajr", nameArabic: "الفجر" },
  { key: "dhuhr", nameArabic: "الظهر" },
  { key: "asr", nameArabic: "العصر" },
  { key: "maghrib", nameArabic: "المغرب" },
  { key: "isha", nameArabic: "العشاء" },
];

export function getCalendarDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return new Date().getDay();
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sunday..6=Saturday
}

export function calendarDaysDiff(fromDateStr: string, toDateStr: string): number {
  const [fy, fm, fd] = fromDateStr.split("-").map(Number);
  const [ty, tm, td] = toDateStr.split("-").map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return 0;
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

/**
 * Evaluate completion status of a tracker for a given local date.
 */
export function evaluateTrackerProgressForDate(
  tracker: any,
  entriesForDate: any[]
): {
  isCompleted: boolean;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
} {
  const safeEntries = Array.isArray(entriesForDate) ? entriesForDate : [];
  const metric = tracker?.metricType || "BOOLEAN";

  if (metric === "BOOLEAN") {
    const done = Boolean(safeEntries[safeEntries.length - 1]?.valueBoolean);
    return {
      isCompleted: done,
      currentValue: done ? 1 : 0,
      targetValue: 1,
      progressPercent: done ? 100 : 0,
    };
  }

  if (metric === "COUNTER" || metric === "NUMBER") {
    const sum = safeEntries.reduce((acc, e) => acc + Number(e?.valueNumeric || 0), 0);
    const target = Number(tracker?.targetValue) > 0 ? Number(tracker.targetValue) : 1;
    const pct = Math.min(100, Math.round((sum / target) * 100));
    return {
      isCompleted: tracker?.targetValue ? sum >= Number(tracker.targetValue) : sum > 0,
      currentValue: sum,
      targetValue: target,
      progressPercent: pct,
    };
  }

  if (metric === "DURATION" || metric === "TIME_RANGE") {
    const totalSecs = safeEntries.reduce((acc, e) => acc + Number(e?.valueDuration || 0), 0);
    const totalMins = Math.floor(totalSecs / 60);
    const targetMins = Number(tracker?.targetValue) > 0 ? Number(tracker.targetValue) : 1;
    const targetSecs = Number(tracker?.targetValue) > 0 ? Number(tracker.targetValue) * 60 : 1;
    const pct = Math.min(100, Math.round((totalSecs / targetSecs) * 100));
    return {
      isCompleted: totalSecs >= targetSecs,
      currentValue: totalMins,
      targetValue: targetMins,
      progressPercent: pct,
    };
  }

  if (metric === "CHECKLIST") {
    const latest = safeEntries[safeEntries.length - 1];
    const completedIds = Array.isArray(latest?.entryPayload?.completedItemIds)
      ? latest.entryPayload.completedItemIds
      : [];
    const totalItems = Array.isArray(tracker?.trackerConfig?.items)
      ? Math.max(1, tracker.trackerConfig.items.length)
      : 1;
    const pct = Math.min(100, Math.round((completedIds.length / totalItems) * 100));
    return {
      isCompleted: completedIds.length >= totalItems,
      currentValue: completedIds.length,
      targetValue: totalItems,
      progressPercent: pct,
    };
  }

  if (metric === "AVOIDANCE") {
    const hasLog = safeEntries.length > 0;
    return {
      isCompleted: hasLog,
      currentValue: hasLog ? 1 : 0,
      targetValue: 1,
      progressPercent: hasLog ? 100 : 0,
    };
  }

  return {
    isCompleted: safeEntries.length > 0,
    currentValue: safeEntries.length,
    targetValue: 1,
    progressPercent: safeEntries.length > 0 ? 100 : 0,
  };
}

/**
 * Determine whether a habit/tracker actually has an obligation due on `dateStr`
 * evaluating daily, weekly quota, and custom weekday/interval schedules without
 * inventing occurrences.
 */
export function isTrackerScheduledForDate(
  tracker: any,
  dateStr: string,
  allEntriesForTracker: any[],
  options?: { timezone?: string; weekStartDay?: number }
): boolean {
  if (!tracker || tracker.isArchived || tracker.isPaused || tracker.displayPreferences?.isHidden) {
    return false;
  }

  const tz = options?.timezone || getDefaultTimezone();
  const weekStartDay =
    typeof options?.weekStartDay === "number" ? options.weekStartDay : 6; // Saturday default

  const cfg =
    tracker.scheduleConfig && typeof tracker.scheduleConfig === "object"
      ? tracker.scheduleConfig
      : {};
  const schedType = cfg.type || "daily";
  const freq = tracker.targetFrequency || "DAILY";
  const dayOfWeek = getCalendarDayOfWeek(dateStr);

  const daysList = Array.isArray(cfg.days)
    ? cfg.days.map((d: any) => Number(d)).filter((d: number) => d >= 0 && d <= 6)
    : null;

  // Custom interval days check (every N days since creation local date)
  if (
    (schedType === "custom" || freq === "CUSTOM") &&
    Number(cfg.intervalDays) > 1
  ) {
    const createdAnchor = tracker.createdAt
      ? getLocalDateString(new Date(tracker.createdAt), tz)
      : dateStr;
    const diff = calendarDaysDiff(createdAnchor, dateStr);
    if (diff < 0 || diff % Number(cfg.intervalDays) !== 0) {
      return false;
    }
  }

  // Specific weekdays schedule check
  if (
    (schedType === "weekdays" || schedType === "custom" || freq === "CUSTOM") &&
    daysList &&
    daysList.length > 0 &&
    daysList.length < 7
  ) {
    if (!daysList.includes(dayOfWeek)) {
      return false;
    }
  } else if (
    daysList &&
    daysList.length > 0 &&
    daysList.length < 7 &&
    !daysList.includes(dayOfWeek)
  ) {
    return false;
  }

  // Weekly quota check (WEEKLY targetFrequency or `weekly_target` schedule type)
  if (schedType === "weekly_target" || freq === "WEEKLY") {
    const offsetFromWeekStart = (dayOfWeek - weekStartDay + 7) % 7;
    const weekStartDate = addDaysToDateString(dateStr, -offsetFromWeekStart);
    const weekEndDate = addDaysToDateString(weekStartDate, 6);

    const entriesThisWeek = allEntriesForTracker.filter(
      (e) =>
        e?.localDate &&
        e.localDate >= weekStartDate &&
        e.localDate <= weekEndDate
    );

    const weeklyQuota = Number(cfg.targetDaysPerWeek);
    if (weeklyQuota >= 1 && weeklyQuota <= 7) {
      // Count completed days in week prior to or including today
      const byDay = new Map<string, any[]>();
      for (const e of entriesThisWeek) {
        const list = byDay.get(e.localDate) || [];
        list.push(e);
        byDay.set(e.localDate, list);
      }
      let completedDays = 0;
      for (const [dk, dayEntries] of byDay.entries()) {
        if (dk > dateStr) continue;
        if (evaluateTrackerProgressForDate(tracker, dayEntries).isCompleted) {
          completedDays += 1;
        }
      }
      if (completedDays >= weeklyQuota) {
        return false;
      }
    } else if (freq === "WEEKLY") {
      // Single weekly goal or weekly numeric target across the week
      if (
        tracker.metricType === "COUNTER" ||
        tracker.metricType === "NUMBER"
      ) {
        const weeklySum = entriesThisWeek.reduce(
          (acc, e) => acc + Number(e?.valueNumeric || 0),
          0
        );
        const target = Number(tracker.targetValue) > 0 ? Number(tracker.targetValue) : 1;
        if (weeklySum >= target) return false;
      } else if (
        tracker.metricType === "DURATION" ||
        tracker.metricType === "TIME_RANGE"
      ) {
        const weeklySecs = entriesThisWeek.reduce(
          (acc, e) => acc + Number(e?.valueDuration || 0),
          0
        );
        const targetSecs =
          Number(tracker.targetValue) > 0 ? Number(tracker.targetValue) * 60 : 1;
        if (weeklySecs >= targetSecs) return false;
      } else {
        // Default weekly quota: 1 completion in the week
        const anyDone = entriesThisWeek.some(
          (e) =>
            e.valueBoolean === true ||
            Number(e.valueNumeric || 0) > 0 ||
            Number(e.valueDuration || 0) > 0
        );
        if (anyDone) return false;
      }
    }
  }

  return true;
}

/**
 * Shared pure selector returning strictly today's pending obligations across
 * overdue/today tasks, uncompleted scheduled habits, and Muslim prayer duties.
 */
export function selectDailyObligations(params: {
  todayStr: string;
  timezone?: string;
  weekStartDay?: number;
  tasks: LocalTask[];
  trackers: any[];
  trackerEntries: any[];
  prayersToday?: LocalPrayerRecord[];
  userPreferences?: {
    religion?: string | null;
    prayerTrackingEnabled?: boolean;
  } | null;
}): DailyObligationSummary {
  const {
    todayStr,
    timezone = getDefaultTimezone(),
    weekStartDay = 6,
    tasks = [],
    trackers = [],
    trackerEntries = [],
    prayersToday = [],
    userPreferences = null,
  } = params;

  // 1. Deduplicated pending tasks strictly overdue (< todayStr) or due today (=== todayStr)
  const seenTaskIds = new Set<string>();
  const overdueTasks: LocalTask[] = [];
  const todayTasks: LocalTask[] = [];
  let completedTodayTasksCount = 0;
  let hasConfiguredTasks = false;

  for (const t of tasks) {
    if (!t?.id || seenTaskIds.has(t.id)) continue;
    seenTaskIds.add(t.id);

    if (t.isArchived || t.status === "CANCELLED") continue;
    hasConfiguredTasks = true;

    if (t.status === "COMPLETED") {
      if (wasTaskCompletedOnLocalDate(t, todayStr, timezone)) {
        completedTodayTasksCount += 1;
      }
      continue;
    }

    if (!t.dueDate) continue; // Do not treat unscheduled backlog tasks as today's obligations

    if (t.dueDate < todayStr) {
      overdueTasks.push(t);
    } else if (t.dueDate === todayStr) {
      todayTasks.push(t);
    }
    // Future tasks (t.dueDate > todayStr) strictly excluded.
    // Note: Do not invent occurrences solely from `t.isRecurring === true` without a recurrence rule.
  }

  todayTasks.sort((a, b) => {
    const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (orderDiff !== 0) return orderDiff;
    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
    if (a.startTime) return -1;
    if (b.startTime) return 1;
    return 0;
  });

  overdueTasks.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

  // 2. Uncompleted scheduled habits for today
  const entriesByTracker = new Map<string, any[]>();
  for (const e of trackerEntries) {
    if (!e?.trackerId) continue;
    const list = entriesByTracker.get(e.trackerId) || [];
    list.push(e);
    entriesByTracker.set(e.trackerId, list);
  }

  const seenTrackerIds = new Set<string>();
  const pendingHabits: DailyObligationSummary["pendingHabits"] = [];
  let completedTodayHabitsCount = 0;
  let hasConfiguredTrackers = false;

  for (const tracker of trackers) {
    if (!tracker?.id || seenTrackerIds.has(tracker.id)) continue;
    seenTrackerIds.add(tracker.id);

    if (!tracker.isArchived) {
      hasConfiguredTrackers = true;
    }

    const allTrackerEntries = entriesByTracker.get(tracker.id) || [];
    const entriesToday = allTrackerEntries.filter((e) => e.localDate === todayStr);
    const evalRes = evaluateTrackerProgressForDate(tracker, entriesToday);

    const scheduledToday = isTrackerScheduledForDate(
      tracker,
      todayStr,
      allTrackerEntries,
      { timezone, weekStartDay }
    );

    if (
      evalRes.isCompleted &&
      !tracker.isArchived &&
      !tracker.isPaused &&
      !tracker.displayPreferences?.isHidden
    ) {
      completedTodayHabitsCount += 1;
      continue;
    }

    if (!scheduledToday || evalRes.isCompleted) continue;

    pendingHabits.push({
      tracker,
      entriesToday,
      progressPercent: evalRes.progressPercent,
      currentValue: evalRes.currentValue,
      targetValue: evalRes.targetValue,
    });
  }

  pendingHabits.sort(
    (a, b) =>
      (Number(b.tracker.priority) || 1) - (Number(a.tracker.priority) || 1) ||
      (Number(a.tracker.sortOrder) || 0) - (Number(b.tracker.sortOrder) || 0)
  );

  // 3. Prayer obligations (strictly ONLY for eligible Muslim users with prayers enabled)
  const pendingPrayers: DailyObligationSummary["pendingPrayers"] = [];
  let completedTodayPrayersCount = 0;
  const prayerEnabled = isPrayerModuleVisible(userPreferences);
  if (prayerEnabled) {
    const byKey = new Map(prayersToday.map((p) => [p.prayerKey, p]));
    for (const meta of DEFAULT_PRAYER_META) {
      const rec = byKey.get(meta.key);
      if (rec?.isCompleted) {
        completedTodayPrayersCount += 1;
        continue;
      }
      pendingPrayers.push({
        prayerKey: meta.key,
        nameArabic: meta.nameArabic,
        record: rec,
      });
    }
  }

  const totalPendingCount =
    overdueTasks.length +
    todayTasks.length +
    pendingHabits.length +
    pendingPrayers.length;

  const completedTodayCount =
    completedTodayTasksCount +
    completedTodayHabitsCount +
    completedTodayPrayersCount;

  const hasAnyConfiguredObligations =
    hasConfiguredTasks ||
    hasConfiguredTrackers ||
    trackerEntries.length > 0;

  let homeState: HomeObligationState = "pending";
  if (!hasAnyConfiguredObligations) {
    homeState = "new_user";
  } else if (totalPendingCount > 0) {
    homeState = "pending";
  } else if (completedTodayCount > 0) {
    homeState = "all_completed";
  } else {
    homeState = "nothing_due_today";
  }

  return {
    overdueTasks,
    todayTasks,
    pendingHabits,
    pendingPrayers,
    allDone: homeState === "all_completed",
    totalPendingCount,
    completedTodayCount,
    hasAnyConfiguredObligations,
    homeState,
  };
}

/**
 * Helper to check if a task was completed on a specific local calendar date.
 */
export function wasTaskCompletedOnLocalDate(
  task: LocalTask,
  dateStr: string,
  timezone: string = getDefaultTimezone()
): boolean {
  if (task.status !== "COMPLETED") return false;
  if (task.completedAt) {
    return splitUtcToLocalDateTime(task.completedAt, timezone).localDate === dateStr;
  }
  return task.dueDate === dateStr;
}
