/**
 * Athar (أثـر) — Dual-Axis Temporal & Date Coordinates Utilities
 *
 * Implements strict separation between local calendar date buckets ("YYYY-MM-DD")
 * and exact UTC timestamps ("occurredAt", "timeRangeStart", "timeRangeEnd").
 */

/**
 * Format a Date object into "YYYY-MM-DD" local calendar date string
 * based on the user's specified IANA timezone.
 */
export function getLocalDateString(
  date: Date = new Date(),
  timezone: string = "Asia/Riyadh"
): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch (err) {
    // Fallback to UTC if timezone string is invalid
    return date.toISOString().split("T")[0];
  }
}

/**
 * Parse an ISO date or Date object into a guaranteed Date instance
 */
export function parseDate(input: string | Date | undefined | null): Date {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  const parsed = new Date(input);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Calculate duration in total seconds between two timestamps
 */
export function calculateDurationSeconds(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diffMs / 1000));
}

/**
 * Build UTC DateTime from a local date string "YYYY-MM-DD" and time "HH:MM",
 * correctly adjusting for the user's timezone and handling midnight crossing.
 */
export function parseLocalTimeWithCrossing(
  localDate: string,
  timeStr: string,
  isNextDay = false
): Date {
  const [year, month, day] = localDate.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);

  const targetDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  if (isNextDay) {
    targetDate.setUTCDate(targetDate.getUTCDate() + 1);
  }
  return targetDate;
}

/**
 * Compute start Date, end Date, and duration in seconds from HH:MM strings.
 * Handles crossing midnight (when end time is <= start time, e.g. 23:00 -> 07:00).
 */
export function computeTimeRange(
  localDate: string,
  timeStart: string,
  timeEnd: string
): {
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  crossesMidnight: boolean;
} {
  const [startH, startM] = timeStart.split(":").map(Number);
  const [endH, endM] = timeEnd.split(":").map(Number);

  const startTime = parseLocalTimeWithCrossing(localDate, timeStart, false);
  const crossesMidnight = endH < startH || (endH === startH && endM < startM);
  const endTime = parseLocalTimeWithCrossing(localDate, timeEnd, crossesMidnight);
  const durationSeconds = calculateDurationSeconds(startTime, endTime);

  return { startTime, endTime, durationSeconds, crossesMidnight };
}

/**
 * Add or subtract days from a "YYYY-MM-DD" local date string
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Returns a human-friendly Arabic label for a task's due date relative to today
 */
export function formatArabicDueDate(
  dueDate: string | null | undefined,
  todayStr: string
): {
  label: string;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
} {
  if (!dueDate) {
    return { label: "بلا موعد", isOverdue: false, isToday: false, isTomorrow: false };
  }

  const tomorrowStr = addDaysToDateString(todayStr, 1);
  const yesterdayStr = addDaysToDateString(todayStr, -1);

  if (dueDate === todayStr) {
    return { label: "اليوم", isOverdue: false, isToday: true, isTomorrow: false };
  }
  if (dueDate === tomorrowStr) {
    return { label: "غداً", isOverdue: false, isToday: false, isTomorrow: true };
  }
  if (dueDate === yesterdayStr) {
    return { label: `أمس (${dueDate})`, isOverdue: true, isToday: false, isTomorrow: false };
  }
  if (dueDate < todayStr) {
    return { label: `متأخرة (${dueDate})`, isOverdue: true, isToday: false, isTomorrow: false };
  }
  return { label: dueDate, isOverdue: false, isToday: false, isTomorrow: false };
}

/**
 * Convert a local calendar date string ("YYYY-MM-DD") and local time ("HH:MM")
 * in a given IANA timezone into an exact UTC Date timestamp.
 */
export function parseLocalDateTimeToUtc(
  dateStr: string,
  timeStr: string,
  timezone: string = "Asia/Riyadh"
): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);

  if (!timezone) {
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  }

  // 1. Create a reference UTC date with the literal numbers
  const naiveUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));

  try {
    // 2. Format that reference date in the specified timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });

    const parts = formatter.formatToParts(naiveUtc);
    const tzMap: Record<string, number> = {};
    for (const part of parts) {
      if (part.type !== "literal") {
        tzMap[part.type] = Number(part.value);
      }
    }

    const tzDate = new Date(
      Date.UTC(
        tzMap.year || year,
        (tzMap.month || month) - 1,
        tzMap.day || day,
        tzMap.hour === 24 ? 0 : tzMap.hour || hours,
        tzMap.minute || minutes,
        tzMap.second || 0
      )
    );

    const offsetMs = tzDate.getTime() - naiveUtc.getTime();
    return new Date(naiveUtc.getTime() - offsetMs);
  } catch {
    // Fallback if timezone string is invalid
    return naiveUtc;
  }
}

/**
 * Split a UTC Date into local date "YYYY-MM-DD" and local time "HH:mm" in timezone
 */
export function splitUtcToLocalDateTime(
  date: Date | string,
  timezone: string = "Asia/Riyadh"
): { localDate: string; localTime: string } {
  const d = new Date(date);
  try {
    const datePart = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);

    const timePart = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);

    return { localDate: datePart, localTime: timePart };
  } catch {
    const iso = d.toISOString();
    return {
      localDate: iso.split("T")[0],
      localTime: iso.split("T")[1].slice(0, 5),
    };
  }
}

export interface AbstinenceDurationBreakdown {
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formattedArabic: string;
}

/**
 * Calculate accurate real-time abstinence duration from start timestamp to end (or now).
 * Strictly enforces that 1 full day is completed ONLY after 24 full hours have elapsed.
 */
export function calculateAbstinenceDuration(
  startedAt: Date | string,
  endedAt?: Date | string | null,
  currentNowMs?: number
): AbstinenceDurationBreakdown {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : currentNowMs || Date.now();
  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));

  const days = Math.floor(totalSeconds / 86400);
  const remainingAfterDays = totalSeconds % 86400;
  const hours = Math.floor(remainingAfterDays / 3600);
  const remainingAfterHours = remainingAfterDays % 3600;
  const minutes = Math.floor(remainingAfterHours / 60);
  const seconds = remainingAfterHours % 60;

  let formattedArabic = "";
  if (days > 0) {
    formattedArabic =
      days === 1 ? "يوم" : days === 2 ? "يومان" : `${days} ${days <= 10 ? "أيام" : "يوم"}`;
    if (hours > 0) {
      formattedArabic += ` و ${
        hours === 1 ? "ساعة" : hours === 2 ? "ساعتان" : `${hours} ${hours <= 10 ? "ساعات" : "ساعة"}`
      }`;
    }
  } else if (hours > 0) {
    formattedArabic =
      hours === 1 ? "ساعة" : hours === 2 ? "ساعتان" : `${hours} ${hours <= 10 ? "ساعات" : "ساعة"}`;
    if (minutes > 0) {
      formattedArabic += ` و ${
        minutes === 1 ? "دقيقة" : minutes === 2 ? "دقيقتان" : `${minutes} ${minutes <= 10 ? "دقائق" : "دقيقة"}`
      }`;
    }
  } else if (minutes > 0) {
    formattedArabic =
      minutes === 1 ? "دقيقة" : minutes === 2 ? "دقيقتان" : `${minutes} ${minutes <= 10 ? "دقائق" : "دقيقة"}`;
    if (seconds > 0) {
      formattedArabic += ` و ${seconds} ثانية`;
    }
  } else {
    formattedArabic = `${seconds} ثانية`;
  }

  return { totalSeconds, days, hours, minutes, seconds, formattedArabic };
}

/**
 * Format a Date object into human-readable Arabic text with date and time
 */
export function formatArabicDateTime(
  date: Date | string,
  timezone: string = "Asia/Riyadh"
): { dateStr: string; timeStr: string; fullStr: string } {
  const d = new Date(date);
  try {
    const dateStr = new Intl.DateTimeFormat("ar-EG", {
      timeZone: timezone,
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    }).format(d);

    const timeStr = new Intl.DateTimeFormat("ar-EG", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);

    return {
      dateStr,
      timeStr,
      fullStr: `${dateStr}، ${timeStr}`,
    };
  } catch {
    return {
      dateStr: d.toISOString().split("T")[0],
      timeStr: d.toISOString().split("T")[1].slice(0, 5),
      fullStr: d.toISOString(),
    };
  }
}


