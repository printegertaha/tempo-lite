/**
 * Athar (أثـر) — Dual-Axis Temporal & Date Coordinates Utilities
 *
 * Implements strict separation between local calendar date buckets ("YYYY-MM-DD")
 * and exact UTC timestamps ("occurredAt", "timeRangeStart", "timeRangeEnd").
 */

/**
 * Return the client's detected IANA timezone when running in a browser,
 * falling back to "Asia/Riyadh" on SSR or unsupported environments.
 */
export function getDefaultTimezone(): string {
  if (typeof Intl !== "undefined") {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && tz !== "UTC") return tz;
    } catch {}
  }
  return "Africa/Cairo";
}

/**
 * Format a Date object into "YYYY-MM-DD" local calendar date string
 * based on the user's specified IANA timezone.
 */
export function getLocalDateString(
  date: Date = new Date(),
  timezone: string = "Africa/Cairo"
): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
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

function getTimezoneOffsetAt(instant: Date, timezone: string): number {
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

  const parts = formatter.formatToParts(instant);
  const tzMap: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      tzMap[part.type] = Number(part.value);
    }
  }

  const hour = tzMap.hour === 24 ? 0 : (tzMap.hour ?? 0);
  const tzAsUtc = Date.UTC(
    tzMap.year ?? instant.getUTCFullYear(),
    (tzMap.month ?? instant.getUTCMonth() + 1) - 1,
    tzMap.day ?? instant.getUTCDate(),
    hour,
    tzMap.minute ?? 0,
    tzMap.second ?? 0
  );

  return tzAsUtc - instant.getTime();
}

/**
 * Convert a local calendar date string ("YYYY-MM-DD") and local time ("HH:MM")
 * in a given IANA timezone into an exact UTC Date timestamp (two-pass DST safe).
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

  const naiveUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));

  try {
    // Pass 1: estimate offset at naiveUtc
    const offset1 = getTimezoneOffsetAt(naiveUtc, timezone);
    const guess1 = new Date(naiveUtc.getTime() - offset1);
    // Pass 2: refine offset at the resulting instant for DST boundary accuracy
    const offset2 = getTimezoneOffsetAt(guess1, timezone);
    return new Date(naiveUtc.getTime() - offset2);
  } catch {
    return naiveUtc;
  }
}

/**
 * Return the exact UTC Date corresponding to 00:00 of a local calendar date in timezone.
 */
export function getUtcStartOfLocalDate(
  localDate: string,
  timezone: string = "Asia/Riyadh"
): Date {
  return parseLocalDateTimeToUtc(localDate, "00:00", timezone);
}

/**
 * Build UTC DateTime from a local date string "YYYY-MM-DD" and time "HH:MM",
 * correctly adjusting for the user's timezone and handling midnight crossing.
 */
export function parseLocalTimeWithCrossing(
  localDate: string,
  timeStr: string,
  isNextDay = false,
  timezone: string = "Asia/Riyadh"
): Date {
  const effectiveDate = isNextDay ? addDaysToDateString(localDate, 1) : localDate;
  return parseLocalDateTimeToUtc(effectiveDate, timeStr, timezone);
}

/**
 * Compute start Date, end Date, and duration in seconds from HH:MM strings.
 * Handles crossing midnight (when end time is <= start time, e.g. 23:00 -> 07:00).
 */
export function computeTimeRange(
  localDate: string,
  timeStart: string,
  timeEnd: string,
  timezone: string = "Asia/Riyadh"
): {
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  crossesMidnight: boolean;
} {
  const [startH, startM] = timeStart.split(":").map(Number);
  const [endH, endM] = timeEnd.split(":").map(Number);

  const startTime = parseLocalTimeWithCrossing(localDate, timeStart, false, timezone);
  const crossesMidnight = endH < startH || (endH === startH && endM <= startM);
  const endTime = parseLocalTimeWithCrossing(localDate, timeEnd, crossesMidnight, timezone);
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
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) {
    if (days === 1) parts.push("يوم واحد");
    else if (days === 2) parts.push("يومان");
    else if (days <= 10) parts.push(`${days} أيام`);
    else parts.push(`${days} يوماً`);
  }
  if (hours > 0) {
    if (hours === 1) parts.push("ساعة");
    else if (hours === 2) parts.push("ساعتان");
    else if (hours <= 10) parts.push(`${hours} ساعات`);
    else parts.push(`${hours} ساعة`);
  }
  if (minutes > 0 && days === 0) {
    if (minutes === 1) parts.push("دقيقة");
    else if (minutes === 2) parts.push("دقيقتان");
    else if (minutes <= 10) parts.push(`${minutes} دقائق`);
    else parts.push(`${minutes} دقيقة`);
  }
  if (parts.length === 0) {
    parts.push(`${seconds} ثانية`);
  }

  return {
    totalSeconds,
    days,
    hours,
    minutes,
    seconds,
    formattedArabic: parts.join(" و"),
  };
}

/**
 * Format total seconds into human-readable Arabic duration string (e.g. "2 س 30 د")
 */
export function formatDurationArabic(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0 د";
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0 && mins > 0) {
    return `${hours} س ${mins} د`;
  }
  if (hours > 0) {
    return `${hours} س`;
  }
  return `${mins} د`;
}

/**
 * Format hours & minutes in HH:MM digital string
 */
export function formatSecondsDigital(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Format a Date object into human-readable Arabic text with date and time
 */
export function formatArabicDateTime(
  date: Date | string,
  timezone: string = "Africa/Cairo"
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
      timeStr: d.toISOString().split("T")[1]?.slice(0, 5) || "00:00",
      fullStr: d.toISOString(),
    };
  }
}
