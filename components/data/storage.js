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

// Get standard local calendar date string (YYYY-MM-DD), with SSR-safe static fallback
export function getLocalDateString(dateInput) {
  if (!dateInput) {
    if (typeof window === "undefined") return "2026-11-05";
    dateInput = new Date();
  }
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "2026-11-05";
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

// Initial state data structure (SSR-deterministic)
export function getInitialAppState() {
  const today = "2026-11-05";
  const yesterday = "2026-11-04";

  return {
    version: STORAGE_VERSION,
    prayerSchedule: DEFAULT_PRAYER_SCHEDULE,
    activeTimer: null, // Only ONE active timer at a time across all habits
    
    // Custom & default habit definitions
    habits: [
      {
        id: "hab_programming",
        slug: "programming",
        name: "البرمجة والعمل العميق",
        category: "intellect",
        categoryLabel: "تطوير ومهارات",
        trackingType: "duration", // Duration
        targetDailyMinutes: 210, // 3.5 hours
        unit: "دقيقة",
        tagline: "بناء المنتجات وحل المشكلات دون مشتتات",
        streak: 28,
        color: "cyan",
        iconName: "Code2"
      },
      {
        id: "hab_gym",
        slug: "gym",
        name: "تمرين الجيم والقوة",
        category: "health",
        categoryLabel: "صحة ولياقة",
        trackingType: "duration", // Duration with sets/routine
        targetDailyMinutes: 75,
        unit: "تمرين",
        tagline: "بناء القوة الوظيفية والكتلة العضلية",
        streak: 12,
        color: "orange",
        iconName: "Dumbbell"
      },
      {
        id: "hab_running",
        slug: "running",
        name: "الجري وتحمل القلب",
        category: "health",
        categoryLabel: "صحة ولياقة",
        trackingType: "distance_duration", // Distance + Duration
        targetDailyKm: 5.0,
        unit: "كم",
        tagline: "تحسين اللياقة القلبية والتنفسية",
        streak: 8,
        color: "lime",
        iconName: "Footprints"
      },
      {
        id: "hab_prayer",
        slug: "prayer",
        name: "الصلوات الخمس والسنن",
        category: "spiritual",
        categoryLabel: "روحانية وإيمانية",
        trackingType: "prayer_daily", // Dedicated 5 prayers
        targetDailyCount: 5,
        unit: "فروض",
        tagline: "عماد الدين وبوصلة اليوم وبركة الوقت",
        streak: 42,
        color: "emerald",
        iconName: "Flame"
      },
      {
        id: "hab_social",
        slug: "social-media",
        name: "ترشيد السوشيال ميديا",
        category: "discipline",
        categoryLabel: "انضباط وسلوك",
        trackingType: "event_logging", // Event logging with duration per session
        dailyLimitMinutes: 60,
        unit: "دقيقة حد أقصى",
        tagline: "حماية الانتباه والتركيز من التشتت",
        streak: 9,
        color: "pink",
        iconName: "Smartphone"
      },
      {
        id: "hab_smoking",
        slug: "smoking",
        name: "تتبع والتعافي من التدخين",
        category: "discipline",
        categoryLabel: "انضباط وسلوك",
        trackingType: "counter", // Counter & Event logging with triggers & notes
        targetDailyCount: 0,
        unit: "سجائر",
        tagline: "رئة نقية وحرية واستقلال عن الإدمان",
        streak: 90,
        color: "rose",
        iconName: "CigaretteOff"
      },
      {
        id: "hab_water",
        slug: "water",
        name: "شرب الماء والترطيب",
        category: "health",
        categoryLabel: "صحة ولياقة",
        trackingType: "counter",
        targetDailyCount: 14, // 14 cups (3.5L)
        unit: "كوب (250 مل)",
        tagline: "حيوية الخلايا ونقاء البشرة والدماغ",
        streak: 15,
        color: "teal",
        iconName: "Droplets"
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
        streak: 19,
        color: "violet",
        iconName: "BookMarked"
      }
    ],

    // Records grouped by date (YYYY-MM-DD)
    recordsByDate: {
      [today]: {
        // 1. Prayer Records for today
        prayers: {
          fajr: { done: true, scheduledTime: "04:52", actualTime: "04:52", onTime: true, location: "mosque", durationMinutes: 15, notes: "حضور تكبيرة الإحرام وجلسة الذكر" },
          dhuhr: { done: true, scheduledTime: "11:48", actualTime: "11:55", onTime: true, location: "mosque", durationMinutes: 12, notes: "سنة الظهر القبلية والبعدية" },
          asr: { done: true, scheduledTime: "14:52", actualTime: "14:52", onTime: true, location: "work", durationMinutes: 10, notes: "في مصلى العمل" },
          maghrib: { done: true, scheduledTime: "17:10", actualTime: "17:15", onTime: true, location: "mosque", durationMinutes: 14, notes: "قراءة أذكار المساء" },
          isha: { done: true, scheduledTime: "18:28", actualTime: "18:40", onTime: true, location: "home", durationMinutes: 12, notes: "الشفع والوتر" },
        },
        // 2. Completed Duration Sessions (Programming, Study, Gym, Reading)
        sessions: [
          {
            id: "sess_initial_1",
            type: "programming",
            projectName: "منصة أثر v2 (Next.js)",
            task: "تطوير معمارية المؤقت الحقيقي وإدارة البيانات المحلية",
            durationSeconds: 2 * 3600 + 35 * 60, // 2h 35m
            startedAt: 1762329600000,
            endedAt: 1762338900000,
            notes: "جلسة عمل عميق بدون أي مشتتات أو وسائل تواصل",
            createdAt: "2026-11-05T10:35:00.000Z"
          },
          {
            id: "sess_initial_2",
            type: "programming",
            projectName: "منصة أثر v2 (Next.js)",
            task: "تحسين واجهة تفاصيل العادات والمؤقت التفاعلي",
            durationSeconds: 1 * 3600 + 40 * 60, // 1h 40m
            startedAt: 1762347600000,
            endedAt: 1762353600000,
            notes: "حل جميع حالات الهيدريشن وتزامن التوقيتات",
            createdAt: "2026-11-05T14:40:00.000Z"
          }
        ],
        // 3. Gym Sessions
        gymSessions: [
          {
            id: "gym_initial_1",
            gymName: "نادي وقت اللياقة (Fitness Time)",
            workoutType: "Push Day (صدر وأكتاف وترايسبس)",
            startTime: "16:00",
            endTime: "17:15",
            durationMinutes: 75,
            notes: "كسر رقم شخصي في البنش برس 85 كجم × 9 عدات",
            exercises: [
              { name: "Barbell Bench Press", sets: "4 جولات × 8-9 عدات (85 كجم)" },
              { name: "Incline DB Press", sets: "3 جولات × 10 عدات (28 كجم)" },
              { name: "Overhead Military Press", sets: "3 جولات × 8 عدات (50 كجم)" }
            ]
          }
        ],
        // 4. Running & Walking Sessions
        runningSessions: [
          {
            id: "run_initial_1",
            distanceKm: 5.20,
            durationSeconds: 27 * 60 + 40, // 27m 40s
            pace: "5'19\" /كم",
            startTime: "05:45",
            endTime: "06:13",
            location: "حديقة الحي والمضمار الخارجي",
            notes: "جري صباحي منعش مع شروق الشمس",
            calories: 385
          }
        ],
        // 5. Social Media Sessions
        socialMediaSessions: [
          {
            id: "social_initial_1",
            platform: "X (تويتر)",
            startTime: "12:15",
            endTime: "12:35",
            durationMinutes: 20,
            reason: "متابعة أخبار تقنية وذكاء اصطناعي",
            notes: "ضمن الحدود المسموح بها"
          },
          {
            id: "social_initial_2",
            platform: "يوتيوب",
            startTime: "20:00",
            endTime: "20:22",
            durationMinutes: 22,
            reason: "بودكاست معرفي وتطوير الذات",
            notes: "محتوى إيجابي مفيد"
          }
        ],
        // 6. Smoking Events
        smokingEvents: [], // Clean today! 0 cigarettes
        // 7. Water (glasses of 250ml)
        waterCount: 12, // 3.0 Liters
        // 8. Custom Habit Logs
        customLogs: []
      },

      // Yesterday mock for realistic historical views
      [yesterday]: {
        prayers: {
          fajr: { done: true, scheduledTime: "04:52", actualTime: "04:52", onTime: true, location: "mosque", durationMinutes: 15 },
          dhuhr: { done: true, scheduledTime: "11:48", actualTime: "11:50", onTime: true, location: "mosque", durationMinutes: 12 },
          asr: { done: true, scheduledTime: "14:52", actualTime: "14:52", onTime: true, location: "mosque", durationMinutes: 10 },
          maghrib: { done: true, scheduledTime: "17:10", actualTime: "17:10", onTime: true, location: "mosque", durationMinutes: 15 },
          isha: { done: true, scheduledTime: "18:28", actualTime: "18:30", onTime: true, location: "mosque", durationMinutes: 15 },
        },
        sessions: [
          {
            id: "sess_initial_3",
            type: "programming",
            projectName: "منصة أثر v2",
            task: "برمجة شاشات التقويم والمصاريف",
            durationSeconds: 3 * 3600 + 30 * 60,
            startedAt: 1762243200000,
            endedAt: 1762255800000,
            notes: "عمل متصل بتركيز ممتاز"
          }
        ],
        gymSessions: [
          {
            id: "gym_initial_2",
            gymName: "Fitness Time",
            workoutType: "Pull Day (ظهر وبايسبس وعقلة)",
            startTime: "16:30",
            endTime: "17:45",
            durationMinutes: 75,
            notes: "عقلة بأوزان إضافية وسحب كابل"
          }
        ],
        runningSessions: [],
        socialMediaSessions: [
          {
            id: "social_initial_3",
            platform: "إنستغرام",
            startTime: "21:00",
            endTime: "21:35",
            durationMinutes: 35,
            reason: "ترفيه ومراسلة أصدقاء"
          }
        ],
        smokingEvents: [],
        waterCount: 14,
        customLogs: []
      }
    }
  };
}

// Safely load state from localStorage or seed
export function loadSavedState() {
  if (typeof window === "undefined") {
    return getInitialAppState();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialAppState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== STORAGE_VERSION) {
      const initial = getInitialAppState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return parsed;
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
