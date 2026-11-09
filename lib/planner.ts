import { getLocalDateString, addDaysToDateString } from "./dates";
import { LocalTask } from "./local-db";

export interface PlannerDay {
  dateStr: string; // "YYYY-MM-DD"
  dayName: string; // e.g. "السبت"
  formattedDayNumber: string; // e.g. "9"
  formattedMonthName: string; // e.g. "نوفمبر"
  isToday: boolean;
  tasks: LocalTask[];
  completedCount: number;
  totalCount: number;
  completionPercent: number;
  plannedMinutes: number;
  completedMinutes: number;
}

export interface WeeklyMetrics {
  totalPlannedHours: number;
  totalCompletedHours: number;
  completedTasksCount: number;
  totalTasksCount: number;
  overallPercent: number;
  peakDayName: string;
  peakDayHours: number;
  tagDistribution: Array<{ tag: string; hours: number; percent: number }>;
}

export const ARABIC_WEEKDAYS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

/**
 * Returns the 7 days of the week starting from weekStartDay (6 = Saturday default)
 */
export function getWeekDates(
  anchorDate: string = getLocalDateString(),
  weekStartDay: number = 6
): string[] {
  const [year, month, day] = anchorDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const currentDayOfWeek = date.getUTCDay(); // 0 = Sun, 6 = Sat

  // Distance from week start day
  const diff = (currentDayOfWeek - weekStartDay + 7) % 7;
  const startOfWeek = new Date(date);
  startOfWeek.setUTCDate(date.getUTCDate() - diff);

  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setUTCDate(startOfWeek.getUTCDate() + i);
    weekDates.push(d.toISOString().split("T")[0]);
  }

  return weekDates;
}

/**
 * Groups tasks by day for the weekly planner
 */
export function buildPlannerDays(
  weekDates: string[],
  tasks: LocalTask[],
  todayStr: string = getLocalDateString()
): PlannerDay[] {
  return weekDates.map((dateStr) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = dateObj.getUTCDay();

    const dayTasks = tasks
      .filter((t) => t.dueDate === dateStr && !t.isArchived)
      .sort((a, b) => {
        // Sort by startTime if available, then sortOrder
        if (a.startTime && b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        }
        if (a.startTime) return -1;
        if (b.startTime) return 1;
        return a.sortOrder - b.sortOrder;
      });

    const completed = dayTasks.filter((t) => t.status === "COMPLETED");
    const totalCount = dayTasks.length;
    const completedCount = completed.length;
    const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const plannedMinutes = dayTasks.reduce(
      (sum, t) => sum + (t.durationMinutes || (t.isPomodoro ? t.workCycle || 25 : 30)),
      0
    );
    const completedMinutes = completed.reduce(
      (sum, t) => sum + (t.durationMinutes || (t.isPomodoro ? t.workCycle || 25 : 30)),
      0
    );

    return {
      dateStr,
      dayName: ARABIC_WEEKDAYS[dayOfWeek],
      formattedDayNumber: String(day),
      formattedMonthName: new Intl.DateTimeFormat("ar-EG", { month: "short" }).format(dateObj),
      isToday: dateStr === todayStr,
      tasks: dayTasks,
      completedCount,
      totalCount,
      completionPercent,
      plannedMinutes,
      completedMinutes,
    };
  });
}

/**
 * Computes weekly metrics, Peak Day (اليوم الذهبي), and tag distribution
 */
export function calculateWeeklyMetrics(days: PlannerDay[]): WeeklyMetrics {
  let totalPlannedMinutes = 0;
  let totalCompletedMinutes = 0;
  let completedTasksCount = 0;
  let totalTasksCount = 0;

  let peakDayName = "—";
  let peakDayMinutes = 0;

  const tagMinutesMap = new Map<string, number>();

  for (const day of days) {
    totalPlannedMinutes += day.plannedMinutes;
    totalCompletedMinutes += day.completedMinutes;
    completedTasksCount += day.completedCount;
    totalTasksCount += day.totalCount;

    if (day.completedMinutes > peakDayMinutes) {
      peakDayMinutes = day.completedMinutes;
      peakDayName = day.dayName;
    }

    for (const task of day.tasks) {
      const taskMins = task.durationMinutes || (task.isPomodoro ? task.workCycle || 25 : 30);
      const tags = task.tags?.length ? task.tags : ["مهام عامة"];
      for (const tag of tags) {
        tagMinutesMap.set(tag, (tagMinutesMap.get(tag) || 0) + taskMins);
      }
    }
  }

  const overallPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Tag distribution
  const totalTaggedMinutes = Array.from(tagMinutesMap.values()).reduce((a, b) => a + b, 0) || 1;
  const tagDistribution = Array.from(tagMinutesMap.entries())
    .map(([tag, mins]) => ({
      tag,
      hours: Math.round((mins / 60) * 10) / 10,
      percent: Math.round((mins / totalTaggedMinutes) * 100),
    }))
    .sort((a, b) => b.hours - a.hours);

  return {
    totalPlannedHours: Math.round((totalPlannedMinutes / 60) * 10) / 10,
    totalCompletedHours: Math.round((totalCompletedMinutes / 60) * 10) / 10,
    completedTasksCount,
    totalTasksCount,
    overallPercent,
    peakDayName,
    peakDayHours: Math.round((peakDayMinutes / 60) * 10) / 10,
    tagDistribution,
  };
}

/**
 * Calculates Multi-Week Streak (Days with completion >= 80%)
 */
export function calculatePlannerStreak(
  tasks: LocalTask[],
  todayStr: string = getLocalDateString()
): number {
  const tasksByDate = new Map<string, LocalTask[]>();
  for (const t of tasks) {
    if (t.dueDate && !t.isArchived) {
      const list = tasksByDate.get(t.dueDate) || [];
      list.push(t);
      tasksByDate.set(t.dueDate, list);
    }
  }

  let streak = 0;
  let cur = todayStr;

  // If today has tasks and completed >= 80%, increment
  const todayTasks = tasksByDate.get(todayStr) || [];
  if (todayTasks.length > 0) {
    const done = todayTasks.filter((t) => t.status === "COMPLETED").length;
    if (done / todayTasks.length >= 0.8) {
      streak++;
    }
  }

  // Count backwards from yesterday
  for (let i = 1; i <= 365; i++) {
    const checkDate = addDaysToDateString(todayStr, -i);
    const dayTasks = tasksByDate.get(checkDate);
    if (!dayTasks || dayTasks.length === 0) {
      // Days with no tasks do not break streak if user didn't plan any
      continue;
    }

    const done = dayTasks.filter((t) => t.status === "COMPLETED").length;
    if (done / dayTasks.length >= 0.8) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Generates a 12-week GitHub-style commitment heatmap
 */
export function generateCommitmentHeatmap(
  tasks: LocalTask[],
  numWeeks: number = 12,
  todayStr: string = getLocalDateString()
): Array<{ dateStr: string; level: number; count: number }> {
  const tasksByDate = new Map<string, { total: number; completed: number }>();
  for (const t of tasks) {
    if (t.dueDate && !t.isArchived) {
      const cur = tasksByDate.get(t.dueDate) || { total: 0, completed: 0 };
      cur.total++;
      if (t.status === "COMPLETED") cur.completed++;
      tasksByDate.set(t.dueDate, cur);
    }
  }

  const totalDays = numWeeks * 7;
  const result: Array<{ dateStr: string; level: number; count: number }> = [];

  for (let i = totalDays - 1; i >= 0; i--) {
    const dateStr = addDaysToDateString(todayStr, -i);
    const dayData = tasksByDate.get(dateStr);

    let level = 0;
    let count = 0;
    if (dayData && dayData.total > 0) {
      count = dayData.completed;
      const pct = dayData.completed / dayData.total;
      if (pct >= 0.8) level = 3;
      else if (pct >= 0.5) level = 2;
      else if (dayData.completed > 0) level = 1;
    }

    result.push({ dateStr, level, count });
  }

  return result;
}

