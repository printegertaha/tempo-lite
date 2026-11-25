// Centralized Local Storage, Timer, and Data Management Utilities for Athar

export const STORAGE_VERSION = 2;
export const STORAGE_KEY = `athar_v${STORAGE_VERSION}_data`;

// Generate stable unique IDs
export function generateId(prefix = "rec") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Get standard local calendar date string (YYYY-MM-DD), with dynamic today fallback
export function getLocalDateString(dateInput) {
  const d = dateInput
    ? typeof dateInput === "string"
      ? new Date(dateInput)
      : dateInput
    : new Date();
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, "0")}-${String(fallback.getDate()).padStart(2, "0")}`;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Format seconds into Arabic readable string ("ساعتان و 15 دقيقة" / "2 س و 15 د")
export function formatDurationDetailed(seconds) {
  const totalMins = Math.floor(seconds / 60);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const secs = seconds % 60;

  if (hrs === 0 && mins === 0) {
    return `${secs} ثانية`;
  }
  if (hrs === 0) {
    return `${mins} دقيقة ${secs > 0 ? `و ${secs} ث` : ""}`;
  }
  if (mins === 0) {
    return `${hrs} ${hrs === 1 ? "ساعة" : hrs === 2 ? "ساعتان" : "ساعات"}`;
  }
  return `${hrs} ${hrs === 1 ? "ساعة" : "ساعات"} و ${mins} دقيقة`;
}

// Format seconds into digital clock "HH:MM:SS" or "MM:SS"
export function formatDigitalClock(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// Calculate running pace (min/km)
export function calculatePace(distanceKm, durationSeconds) {
  if (!distanceKm || distanceKm <= 0 || !durationSeconds || durationSeconds <= 0) {
    return "-";
  }
  const paceSecondsPerKm = durationSeconds / distanceKm;
  const paceMins = Math.floor(paceSecondsPerKm / 60);
  const paceSecs = Math.round(paceSecondsPerKm % 60);
  return `${paceMins}'${String(paceSecs).padStart(2, "0")}" /كم`;
}

// Calculate elapsed seconds from timestamp-based timer (never drifts on background/refresh)
export function calculateElapsedSeconds(timer) {
  if (!timer) return 0;
  const baseMs = timer.accumulatedMs || 0;
  if (timer.isRunning && timer.startedAt) {
    const currentSegment = Math.max(0, Date.now() - timer.startedAt);
    return Math.floor((baseMs + currentSegment) / 1000);
  }
  return Math.floor(baseMs / 1000);
}

// Default Prayer Schedule
export const DEFAULT_PRAYER_SCHEDULE = {
  fajr: { name: "الفجر", scheduledTime: "04:52" },
  dhuhr: { name: "الظهر", scheduledTime: "11:48" },
  asr: { name: "العصر", scheduledTime: "14:52" },
  maghrib: { name: "المغرب", scheduledTime: "17:10" },
  isha: { name: "العشاء", scheduledTime: "18:28" },
};

// Initial state data structure (SSR-deterministic & clean for new users)
export function getInitialAppState() {
  return {
    version: STORAGE_VERSION,
    prayerSchedule: DEFAULT_PRAYER_SCHEDULE,
    activeTimer: null, // Only ONE active timer at a time across all habits

    // Custom & default habit definitions — all streaks start at 0 until user logs real activity
    habits: [
      {
        id: "hab_programming",
        slug: "programming",
        name: "البرمجة والعمل العميق",
        category: "intellect",
        categoryLabel: "تطوير ومهارات",
        trackingType: "duration",
        targetDailyMinutes: 210,
        unit: "دقيقة",
        tagline: "بناء المنتجات وحل المشكلات دون مشتتات",
        streak: 0,
        color: "cyan",
        iconName: "Code2",
      },
      {
        id: "hab_gym",
        slug: "gym",
        name: "تمرين الجيم والقوة",
        category: "health",
        categoryLabel: "صحة ولياقة",
        trackingType: "duration",
        targetDailyMinutes: 75,
        unit: "تمرين",
        tagline: "بناء القوة الوظيفية والكتلة العضلية",
        streak: 0,
        color: "orange",
        iconName: "Dumbbell",
      },
      {
        id: "hab_running",
        slug: "running",
        name: "الجري وتحمل القلب",
        category: "health",
        categoryLabel: "صحة ولياقة",
        trackingType: "distance_duration",
        targetDailyKm: 5.0,
        unit: "كم",
        tagline: "تحسين اللياقة القلبية والتنفسية",
        streak: 0,
        color: "lime",
        iconName: "Footprints",
      },
      {
        id: "hab_prayer",
        slug: "prayer",
        name: "الصلوات الخمس والسنن",
        category: "spiritual",
        categoryLabel: "روحانية وإيمانية",
        trackingType: "prayer_daily",
        targetDailyCount: 5,
        unit: "فروض",
        tagline: "عماد الدين وبوصلة اليوم وبركة الوقت",
        streak: 0,
        color: "emerald",
        iconName: "Flame",
      },
      {
        id: "hab_social",
        slug: "social-media",
        name: "ترشيد السوشيال ميديا",
        category: "discipline",
        categoryLabel: "انضباط وسلوك",
        trackingType: "event_logging",
        dailyLimitMinutes: 60,
        unit: "دقيقة حد أقصى",
        tagline: "حماية الانتباه والتركيز من التشتت",
        streak: 0,
        color: "pink",
        iconName: "Smartphone",
      },
      {
        id: "hab_smoking",
        slug: "smoking",
        name: "تتبع والتعافي من التدخين",
        category: "discipline",
        categoryLabel: "انضباط وسلوك",
        trackingType: "counter",
        targetDailyCount: 0,
        unit: "سجائر",
        tagline: "رئة نقية وحرية واستقلال عن الإدمان",
        streak: 0,
        color: "rose",
        iconName: "CigaretteOff",
      },
      {
        id: "hab_water",
        slug: "water",
        name: "شرب الماء والترطيب",
        category: "health",
        categoryLabel: "صحة ولياقة",
        trackingType: "counter",
        targetDailyCount: 14,
        unit: "كوب (250 مل)",
        tagline: "حيوية الخلايا ونقاء البشرة والدماغ",
        streak: 0,
        color: "teal",
        iconName: "Droplets",
      },
      {
        id: "hab_reading",
        slug: "reading",
        name: "القراءة وتطوير الذات",
        category: "intellect",
        categoryLabel: "تطوير ومهارات",
        trackingType: "duration",
        targetDailyMinutes: 45,
        unit: "دقيقة",
        tagline: "تغذية العقل وتوسيع المدارك",
        streak: 0,
        color: "violet",
        iconName: "BookMarked",
      },
    ],

    // Records grouped by date (YYYY-MM-DD) — genuinely empty for new users
    recordsByDate: {},
  };
}

const LEGACY_SEED_SESSION_IDS = new Set([
  "sess_initial_1",
  "sess_initial_2",
  "sess_initial_3",
]);
const LEGACY_SEED_GYM_IDS = new Set(["gym_initial_1", "gym_initial_2"]);
const LEGACY_SEED_RUN_IDS = new Set(["run_initial_1"]);
const LEGACY_SEED_SOCIAL_IDS = new Set([
  "social_initial_1",
  "social_initial_2",
  "social_initial_3",
]);

function stripLegacyMockSeedFromState(parsed) {
  if (!parsed || typeof parsed !== "object") return parsed;
  if (parsed.cleanSeedMigrated) return parsed;

  const nextRecords = {};
  const recordsByDate = parsed.recordsByDate || {};

  for (const [dateKey, day] of Object.entries(recordsByDate)) {
    if (!day || typeof day !== "object") continue;
    const isSeedDate = dateKey === "2026-01-01" || dateKey === "2025-12-31";

    const sessions = (day.sessions || []).filter((s) => !LEGACY_SEED_SESSION_IDS.has(s?.id));
    const gymSessions = (day.gymSessions || []).filter((g) => !LEGACY_SEED_GYM_IDS.has(g?.id));
    const runningSessions = (day.runningSessions || []).filter(
      (r) => !LEGACY_SEED_RUN_IDS.has(r?.id)
    );
    const socialMediaSessions = (day.socialMediaSessions || []).filter(
      (s) => !LEGACY_SEED_SOCIAL_IDS.has(s?.id)
    );
    const smokingEvents = day.smokingEvents || [];
    const customLogs = day.customLogs || [];

    // On fake seed dates ("2026-01-01" / "2025-12-31"), drop synthetic seed prayers/water if no user logs remain
    if (
      isSeedDate &&
      sessions.length === 0 &&
      gymSessions.length === 0 &&
      runningSessions.length === 0 &&
      socialMediaSessions.length === 0 &&
      smokingEvents.length === 0 &&
      customLogs.length === 0
    ) {
      continue;
    }

    nextRecords[dateKey] = {
      ...day,
      sessions,
      gymSessions,
      runningSessions,
      socialMediaSessions,
    };
  }

  const hasAnyRealRecords = Object.keys(nextRecords).length > 0;
  const cleanedHabits = Array.isArray(parsed.habits)
    ? parsed.habits.map((h) => ({
        ...h,
        streak: hasAnyRealRecords ? h.streak : 0,
      }))
    : getInitialAppState().habits;

  return {
    ...parsed,
    habits: cleanedHabits,
    recordsByDate: nextRecords,
    cleanSeedMigrated: true,
  };
}

// Safely load state from localStorage or start clean
export function loadSavedState() {
  if (typeof window === "undefined") {
    return getInitialAppState();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = { ...getInitialAppState(), cleanSeedMigrated: true };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== STORAGE_VERSION) {
      const initial = { ...getInitialAppState(), cleanSeedMigrated: true };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const migrated = stripLegacyMockSeedFromState(parsed);
    if (!parsed.cleanSeedMigrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch (err) {
    console.error("Error reading localStorage, using defaults", err);
    return getInitialAppState();
  }
}

// Safely save state to localStorage
export function persistState(state) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Error writing to localStorage", err);
  }
}
