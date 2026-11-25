"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  STORAGE_KEY,
  STORAGE_VERSION,
  generateId,
  getLocalDateString,
  calculateElapsedSeconds,
  loadSavedState,
  persistState,
  getInitialAppState,
  DEFAULT_PRAYER_SCHEDULE,
  calculatePace,
} from "../data/storage";
import {
  NUTRITION_DATA,
  INITIAL_JOURNAL_DATABASE,
} from "../data/mockData";
import {
  buildDefaultLocalizationPreferences,
  formatCurrency,
  getCountryByCodeOrName,
  getCountryFromTimezone,
} from "@/lib/localization";
import SessionFinishConfirmModal from "../timer/SessionFinishConfirmModal";
import PrayerDetailModal from "../prayer/PrayerDetailModal";
import PrayerScheduleModal from "../prayer/PrayerScheduleModal";
import SocialMediaModal from "../social/SocialMediaModal";
import SmokingEventModal from "../smoking/SmokingEventModal";
import RunningSessionModal from "../running/RunningSessionModal";
import GymSessionModal from "../gym/GymSessionModal";
import { useLocalSession } from "@/hooks/useLocalSession";
import { localDomainRepo, localOutboxRepo, localSyncMetaRepo } from "@/lib/local-db";
import { syncEngine } from "@/lib/sync/sync-engine";
import { activeTimerEngine } from "@/lib/timer/active-timer";

const AtharContext = createContext(null);

const LEGACY_SEED_EXPENSE_IDS = new Set([101, 102, 103, 104, 105, 106]);

export const EMPTY_EXPENSES_DATA = {
  monthlyBudget: 0,
  monthlySpent: 0,
  monthlyIncome: 0,
  dailyAverageSpent: 0,
  todaySpent: 0,
  categories: [
    { name: "طعام ومطاعم", budget: 0, spent: 0, percent: 0, color: "#f59e0b" },
    { name: "صحة ومكملات وجيم", budget: 0, spent: 0, percent: 0, color: "#10b981" },
    { name: "مواصلات ووقود", budget: 0, spent: 0, percent: 0, color: "#3b82f6" },
    { name: "تطوير واشتراكات تقنية", budget: 0, spent: 0, percent: 0, color: "#8b5cf6" },
    { name: "فواتير ومستلزمات", budget: 0, spent: 0, percent: 0, color: "#ec4899" },
  ],
  transactions: [],
};

export const EMPTY_GYM_DATA = {
  currentSplit: "",
  stats: {
    benchMaxKg: 0,
    squatMaxKg: 0,
    deadliftMaxKg: 0,
    totalWorkoutsThisMonth: 0,
  },
  bodyWeights: [],
  todayWorkoutPlan: {
    title: "",
    estimatedDuration: "",
    exercises: [],
  },
  muscleRecovery: [],
};

function sanitizeLegacyExpenses(raw) {
  if (!raw || typeof raw !== "object") return EMPTY_EXPENSES_DATA;
  const txs = Array.isArray(raw.transactions) ? raw.transactions : [];
  const realTxs = txs.filter((tx) => {
    const numId = Number(tx?.id);
    return !(Number.isInteger(numId) && LEGACY_SEED_EXPENSE_IDS.has(numId));
  });

  if (realTxs.length === 0 && Number(raw.monthlyBudget) === 5500 && Number(raw.monthlySpent) === 3420) {
    return EMPTY_EXPENSES_DATA;
  }

  return {
    ...EMPTY_EXPENSES_DATA,
    ...raw,
    monthlyBudget: Number(raw.monthlyBudget) === 5500 && realTxs.length === 0 ? 0 : Number(raw.monthlyBudget || 0),
    transactions: realTxs,
  };
}

function sanitizeLegacyGym(raw) {
  if (!raw || typeof raw !== "object") return EMPTY_GYM_DATA;
  const looksLikeLegacySeed =
    raw.stats?.benchMaxKg === 105 &&
    raw.stats?.squatMaxKg === 140 &&
    raw.stats?.deadliftMaxKg === 165 &&
    raw.stats?.totalWorkoutsThisMonth === 16;

  if (looksLikeLegacySeed) {
    return {
      ...EMPTY_GYM_DATA,
      bodyWeights: Array.isArray(raw.bodyWeights) ? raw.bodyWeights : [],
    };
  }

  return {
    ...EMPTY_GYM_DATA,
    ...raw,
    stats: { ...EMPTY_GYM_DATA.stats, ...(raw.stats || {}) },
    bodyWeights: Array.isArray(raw.bodyWeights) ? raw.bodyWeights : [],
  };
}

function normalizeUserPreferences(rawSettings) {
  const browserTz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "Africa/Cairo";
  const defaults = buildDefaultLocalizationPreferences(browserTz);

  if (!rawSettings || typeof rawSettings !== "object") {
    return {
      ...defaults,
      prayerTrackingEnabled: false,
      prayerPreferenceConfigured: false,
    };
  }

  const cfg = rawSettings.dashboardConfig && typeof rawSettings.dashboardConfig === "object"
    ? rawSettings.dashboardConfig
    : rawSettings;

  const countryDef =
    getCountryByCodeOrName(rawSettings.countryCode || cfg.countryCode || cfg.country) ||
    getCountryFromTimezone(rawSettings.timezone || cfg.timezone) ||
    getCountryByCodeOrName(defaults.countryCode);

  const timezone = rawSettings.timezone || cfg.timezone || countryDef?.defaultTimezone || defaults.timezone;
  const currencyAuto =
    rawSettings.currencyAuto !== undefined
      ? Boolean(rawSettings.currencyAuto)
      : cfg.currencyAuto !== undefined
        ? Boolean(cfg.currencyAuto)
        : true;
  const resolvedCurrency =
    (!currencyAuto && (rawSettings.currency || cfg.currency)) ||
    rawSettings.currency ||
    cfg.currency ||
    countryDef?.defaultCurrency ||
    defaults.currency;

  const resolvedProfileName =
    rawSettings.userProfile?.name ??
    rawSettings.profileName ??
    cfg.profileName ??
    rawSettings.name ??
    undefined;
  const resolvedProfileImage =
    rawSettings.userProfile?.image !== undefined
      ? rawSettings.userProfile.image
      : rawSettings.profileImage !== undefined
        ? rawSettings.profileImage
        : cfg.profileImage !== undefined
          ? cfg.profileImage
          : rawSettings.image;

  return {
    ...defaults,
    ...cfg,
    profileName: resolvedProfileName,
    profileImage: resolvedProfileImage,
    monthlySalary: Number(cfg.monthlySalary ?? rawSettings.monthlySalary ?? 0) || 0,
    countryCode: countryDef?.code || defaults.countryCode,
    country: countryDef?.nameAr || cfg.country || defaults.country,
    governorate:
      rawSettings.governorate ||
      cfg.governorate ||
      cfg.city ||
      countryDef?.defaultRegion ||
      defaults.governorate,
    city: rawSettings.city !== undefined ? rawSettings.city || "" : cfg.city || "",
    timezone,
    timezoneAuto: cfg.timezoneAuto !== undefined ? Boolean(cfg.timezoneAuto) : true,
    currency: String(resolvedCurrency).toUpperCase(),
    currencyAuto,
    prayerCalc: cfg.prayerCalc || countryDef?.defaultPrayerCalc || defaults.prayerCalc,
    prayerTrackingEnabled:
      rawSettings.prayerTrackingEnabled !== undefined
        ? Boolean(rawSettings.prayerTrackingEnabled)
        : cfg.prayerTrackingEnabled !== undefined
          ? Boolean(cfg.prayerTrackingEnabled)
          : true,
    prayerPreferenceConfigured:
      cfg.prayerPreferenceConfigured !== undefined
        ? Boolean(cfg.prayerPreferenceConfigured)
        : true,
  };
}

export function AtharProvider({ children }) {
  // Prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  // Core App State (SSR safe static defaults)
  const [appState, setAppState] = useState(() => getInitialAppState("2026-01-01"));
  const [selectedDate, setSelectedDate] = useState("2026-01-01");

  // Live Timer tick state for smooth UI updates (rerenders active component each second)
  const [timerTick, setTimerTick] = useState(0);

  // Global Confirmation & Dedicated Modals
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [prayerDetailModalData, setPrayerDetailModalData] = useState(null); // { isOpen: bool, prayerKey, data }
  const [prayerScheduleModalOpen, setPrayerScheduleModalOpen] = useState(false);
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [smokingModalOpen, setSmokingModalOpen] = useState(false);
  const [runningModalOpen, setRunningModalOpen] = useState(false);
  const [gymModalOpen, setGymModalOpen] = useState(false);
  const [quickLogModalOpen, setQuickLogModalOpen] = useState(false);
  const [quickLogInitialTab, setQuickLogInitialTab] = useState("prayer");

  // Toast feedback
  const [toast, setToast] = useState(null);
  const { userId: activeUserId, isGuest: isGuestUser } = useLocalSession();

  const showToast = (message, type = "success") => {
    setToast({ id: Date.now(), message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Secondary domain states (Expenses, Nutrition, Journal, Gym presets) — genuinely clean initial states
  const [gymData, setGymData] = useState(EMPTY_GYM_DATA);
  const [nutritionData, setNutritionData] = useState(NUTRITION_DATA);
  const [expensesData, setExpensesData] = useState(EMPTY_EXPENSES_DATA);
  const [journalData, setJournalData] = useState(INITIAL_JOURNAL_DATABASE);
  const [userPreferences, setUserPreferences] = useState(() =>
    normalizeUserPreferences(null)
  );
  const loadedUserRef = useRef(null);

  const loadDomainsForUser = async (uid) => {
    const today = getLocalDateString();
    const currentMonthPrefix = today.slice(0, 7);

    // 1. User-scoped settings (IDB -> scoped localStorage -> guest legacy fallback)
    let resolvedSettings = await localSyncMetaRepo.getUserSettings(uid).catch(() => null);
    if (!resolvedSettings && typeof window !== "undefined") {
      try {
        const scopedRaw =
          localStorage.getItem(`athar_user_settings:${uid}`) ||
          (uid === "guest" ? localStorage.getItem("athar_user_settings") : null);
        if (scopedRaw) resolvedSettings = JSON.parse(scopedRaw);
      } catch {}
    }
    const activePrefs = normalizeUserPreferences(resolvedSettings);
    setUserPreferences(activePrefs);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`athar_user_settings:${uid}`, JSON.stringify(activePrefs));
        localStorage.setItem("athar_user_settings", JSON.stringify(activePrefs));
      } catch {}
    }

    // 2. Expenses (IndexedDB immediate source of truth per account)
    const expRows = await localDomainRepo.getExpenseEntries(uid).catch(() => []);
    const activeCurrency = activePrefs.currency || "EGP";
    let mergedExpenses = expRows;
    if (mergedExpenses.length === 0 && uid === "guest" && typeof window !== "undefined") {
      try {
        const legacyExpRaw = localStorage.getItem("athar_expenses");
        if (legacyExpRaw) {
          const parsed = sanitizeLegacyExpenses(JSON.parse(legacyExpRaw));
          if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
            mergedExpenses = parsed.transactions;
          }
        }
      } catch {}
    }

    const monthlyRows = mergedExpenses.filter(
      (r) =>
        (r.date || "").startsWith(currentMonthPrefix) &&
        (r.type || "expense") === "expense" &&
        (r.currency || activeCurrency) === activeCurrency
    );
    const todaySpent = mergedExpenses
      .filter(
        (r) =>
          r.date === today &&
          (r.type || "expense") === "expense" &&
          (r.currency || activeCurrency) === activeCurrency
      )
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    const monthlySpent = monthlyRows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const dayOfMonth = Math.max(1, Number(today.split("-")[2] || 1));

    setExpensesData({
      ...EMPTY_EXPENSES_DATA,
      transactions: mergedExpenses.map((r) => ({
        id: r.id,
        title: r.title,
        amount: Number(r.amount),
        currency: r.currency || activeCurrency,
        type: r.type === "income" ? "income" : "expense",
        category: r.category,
        date: r.date,
        notes: r.notes || null,
        time:
          r.time ||
          (r.createdAt
            ? new Date(r.createdAt).toLocaleTimeString("ar-u-nu-latn", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""),
      })),
      todaySpent,
      monthlySpent,
      dailyAverageSpent: monthlySpent > 0 ? Math.round(monthlySpent / dayOfMonth) : 0,
    });

    // 3. Meals (IndexedDB immediate source of truth per account)
    const mealRows = await localDomainRepo.getMealEntries(uid).catch(() => []);
    if (mealRows.length > 0) {
      const todayMeals = mealRows.filter((m) => m.date === today);
      setNutritionData((prev) => ({
        ...prev,
        meals: mealRows.map((m) => ({
          id: m.id,
          name: m.title || m.name,
          title: m.title || m.name,
          mealType: m.mealType,
          date: m.date,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          notes: m.notes,
        })),
        todayLogged: {
          ...prev.todayLogged,
          calories: todayMeals.reduce((s, m) => s + Number(m.calories || 0), 0),
          protein: todayMeals.reduce((s, m) => s + Number(m.protein || 0), 0),
          carbs: todayMeals.reduce((s, m) => s + Number(m.carbs || 0), 0),
          fat: todayMeals.reduce((s, m) => s + Number(m.fat || 0), 0),
        },
      }));
    } else if (uid === "guest" && typeof window !== "undefined") {
      try {
        const legacyNut = localStorage.getItem("athar_nutrition");
        setNutritionData(legacyNut ? JSON.parse(legacyNut) : NUTRITION_DATA);
      } catch {
        setNutritionData(NUTRITION_DATA);
      }
    } else {
      setNutritionData(NUTRITION_DATA);
    }

    // 4. Body Weights + Gym Workouts (IndexedDB per account)
    const [weights, gymRows] = await Promise.all([
      localSyncMetaRepo.getBodyWeights(uid).catch(() => []),
      localDomainRepo.getGymWorkouts(uid).catch(() => []),
    ]);
    setGymData({
      ...EMPTY_GYM_DATA,
      bodyWeights: Array.isArray(weights) ? weights : [],
    });

    // Build scoped appState cleanly per user
    const scopedRawState =
      typeof window !== "undefined"
        ? localStorage.getItem(`${STORAGE_KEY}:${uid}`) ||
          (uid === "guest" ? localStorage.getItem(STORAGE_KEY) : null)
        : null;
    let baseAppState = getInitialAppState(today);
    if (scopedRawState) {
      try {
        const parsed = JSON.parse(scopedRawState);
        baseAppState = { ...baseAppState, ...parsed };
      } catch {}
    }

    if (gymRows.length > 0) {
      const nextRecords = { ...(baseAppState.recordsByDate || {}) };
      for (const w of gymRows) {
        const dKey = w.date || today;
        const existingDay = nextRecords[dKey] || { gymSessions: [] };
        const exists = (existingDay.gymSessions || []).some((s) => s.id === w.id);
        if (!exists) {
          nextRecords[dKey] = {
            ...existingDay,
            gymSessions: [
              {
                id: w.id,
                workoutType: w.title,
                gymName: "النادي الرياضي",
                durationMinutes: w.durationMinutes || 60,
                exercises: Array.isArray(w.exercises) ? w.exercises : [],
                notes: w.notes || "",
              },
              ...(existingDay.gymSessions || []),
            ],
          };
        }
      }
      baseAppState = { ...baseAppState, recordsByDate: nextRecords };
    }
    setAppState(baseAppState);
    loadedUserRef.current = uid;
  };

  // Mount effect & global listeners
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    setSelectedDate(getLocalDateString());

    if (typeof window !== "undefined") {
      const handlePrefsBroadcast = (ev) => {
        if (ev?.detail) {
          setUserPreferences((prev) => normalizeUserPreferences({ ...prev, ...ev.detail }));
        }
      };
      const handleQuotaWarning = (ev) => {
        showToast(
          ev?.detail?.message || "مساحة التخزين المحلية في المتصفح ممتلئة تقريباً.",
          "error"
        );
      };
      window.addEventListener("athar_preferences_updated", handlePrefsBroadcast);
      window.addEventListener("athar_storage_quota_warning", handleQuotaWarning);
      return () => {
        window.removeEventListener("athar_preferences_updated", handlePrefsBroadcast);
        window.removeEventListener("athar_storage_quota_warning", handleQuotaWarning);
      };
    }
  }, []);

  // Load isolated local IndexedDB data whenever active account changes + react to background pulls
  useEffect(() => {
    if (!isMounted) return;
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void loadDomainsForUser(activeUserId).catch(() => {});
      }
    });

    const handleSyncPullApplied = (ev) => {
      if (cancelled) return;
      const detail = ev?.detail;
      if (!detail?.userId || detail.userId === activeUserId) {
        void loadDomainsForUser(activeUserId).catch(() => {});
      }
    };

    window.addEventListener("athar_data_synced", handleSyncPullApplied);
    return () => {
      cancelled = true;
      window.removeEventListener("athar_data_synced", handleSyncPullApplied);
    };
  }, [isMounted, activeUserId]);

  useEffect(() => {
    if (isMounted && typeof window !== "undefined" && loadedUserRef.current === activeUserId) {
      try {
        localStorage.setItem(`athar_expenses:${activeUserId}`, JSON.stringify(expensesData));
      } catch {}
    }
  }, [expensesData, isMounted, activeUserId]);

  useEffect(() => {
    if (isMounted && typeof window !== "undefined" && loadedUserRef.current === activeUserId) {
      try {
        localStorage.setItem(`athar_nutrition:${activeUserId}`, JSON.stringify(nutritionData));
      } catch {}
    }
  }, [nutritionData, isMounted, activeUserId]);

  useEffect(() => {
    if (isMounted && typeof window !== "undefined" && loadedUserRef.current === activeUserId) {
      try {
        localStorage.setItem(`athar_journal:${activeUserId}`, JSON.stringify(journalData));
      } catch {}
    }
  }, [journalData, isMounted, activeUserId]);

  useEffect(() => {
    if (isMounted && typeof window !== "undefined" && loadedUserRef.current === activeUserId) {
      try {
        localStorage.setItem(`athar_gym:${activeUserId}`, JSON.stringify(gymData));
      } catch {}
    }
  }, [gymData, isMounted, activeUserId]);

  // Persist user-scoped appState on change
  useEffect(() => {
    if (isMounted && typeof window !== "undefined" && loadedUserRef.current === activeUserId) {
      try {
        localStorage.setItem(`${STORAGE_KEY}:${activeUserId}`, JSON.stringify(appState));
        if (activeUserId === "guest") {
          persistState(appState);
        }
      } catch {}
    }
  }, [appState, isMounted, activeUserId]);

  // Wall-clock ticker for active timer
  const isTimerRunning = Boolean(appState.activeTimer?.isRunning);
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerTick((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Helper: get or initialize record structure for any date
  const getDayRecords = (dateStr = selectedDate) => {
    const records = appState.recordsByDate[dateStr];
    if (records) return records;

    const schedule = appState.prayerSchedule || DEFAULT_PRAYER_SCHEDULE;
    return {
      prayers: {
        fajr: { done: false, scheduledTime: schedule.fajr.scheduledTime, location: "mosque", onTime: true },
        dhuhr: { done: false, scheduledTime: schedule.dhuhr.scheduledTime, location: "mosque", onTime: true },
        asr: { done: false, scheduledTime: schedule.asr.scheduledTime, location: "work", onTime: true },
        maghrib: { done: false, scheduledTime: schedule.maghrib.scheduledTime, location: "mosque", onTime: true },
        isha: { done: false, scheduledTime: schedule.isha.scheduledTime, location: "home", onTime: true },
      },
      sessions: [],
      gymSessions: [],
      runningSessions: [],
      socialMediaSessions: [],
      smokingEvents: [],
      waterCount: 0,
      customLogs: [],
    };
  };

  // ----------------------------------------------------
  // 1. UNIFIED TIMER SYSTEM (Timestamps as single source of truth)
  // ----------------------------------------------------
  const startTimer = (type = "programming", title = "جلسة عمل عميق", metadata = {}) => {
    const taskTimer = activeTimerEngine.getSession();
    if (taskTimer && (taskTimer.status === "running" || taskTimer.status === "paused")) {
      showToast(
        `مؤقت المهمة "${taskTimer.taskTitle}" قيد التشغيل الآن — أوقفه أو أنهِه أولاً`,
        "info"
      );
      return;
    }

    if (appState.activeTimer && appState.activeTimer.isRunning) {
      showToast("هناك جلسة نشطة بالفعل! أوقف الجلسة الحالية أولاً", "info");
      return;
    }

    const newTimer = {
      id: generateId("timer"),
      type,
      title: title || (type === "gym" ? "جلسة تمرين" : type === "running" ? "تمرين جري" : "عمل عميق"),
      startedAt: Date.now(),
      pausedAt: null,
      accumulatedMs: 0,
      isRunning: true,
      metadata,
    };

    setAppState((prev) => ({
      ...prev,
      activeTimer: newTimer,
    }));

    showToast(`بدأ مؤقت ${newTimer.title} ⏱️`, "success");
  };

  const pauseTimer = () => {
    if (!appState.activeTimer || !appState.activeTimer.isRunning) return;

    const currentSegment = Date.now() - (appState.activeTimer.startedAt || Date.now());
    const totalAccumulated = (appState.activeTimer.accumulatedMs || 0) + Math.max(0, currentSegment);

    setAppState((prev) => ({
      ...prev,
      activeTimer: {
        ...prev.activeTimer,
        isRunning: false,
        pausedAt: Date.now(),
        startedAt: null,
        accumulatedMs: totalAccumulated,
      },
    }));

    showToast("تم إيقاف المؤقت مؤقتاً ⏸️", "info");
  };

  const resumeTimer = () => {
    if (!appState.activeTimer || appState.activeTimer.isRunning) return;

    setAppState((prev) => ({
      ...prev,
      activeTimer: {
        ...prev.activeTimer,
        isRunning: true,
        startedAt: Date.now(),
        pausedAt: null,
      },
    }));

    showToast("تم استئناف المؤقت ▶️", "success");
  };

  // Trigger Confirmation Dialog to verify recorded time
  const requestFinishTimer = () => {
    if (!appState.activeTimer) return;
    // Pause timer while reviewing confirmation dialog
    if (appState.activeTimer.isRunning) {
      pauseTimer();
    }
    setFinishModalOpen(true);
  };

  const cancelTimer = () => {
    setAppState((prev) => ({ ...prev, activeTimer: null }));
    setFinishModalOpen(false);
    showToast("تم إلغاء الجلسة", "info");
  };

  // Confirm finish and record to selected/today's date
  const confirmFinishTimer = ({ durationSeconds, projectName, task, notes }) => {
    const timer = appState.activeTimer;
    if (!timer) return;

    const todayStr = getLocalDateString();
    const currentDay = getDayRecords(todayStr);

    if (timer.type === "gym") {
      const newGym = {
        id: generateId("gym"),
        gymName: timer.metadata?.gymName || "النادي الرياضي",
        workoutType: projectName || "تمرين قوة",
        startTime: new Date(Date.now() - durationSeconds * 1000).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
        endTime: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
        durationMinutes: Math.round(durationSeconds / 60),
        notes: notes || task,
      };
      setAppState((prev) => ({
        ...prev,
        activeTimer: null,
        recordsByDate: {
          ...prev.recordsByDate,
          [todayStr]: {
            ...currentDay,
            gymSessions: [newGym, ...(currentDay.gymSessions || [])],
          },
        },
      }));
    } else if (timer.type === "running") {
      const distance = timer.metadata?.distanceKm || 5.0;
      const newRun = {
        id: generateId("run"),
        distanceKm: Number(distance),
        durationSeconds,
        pace: calculatePace(distance, durationSeconds),
        startTime: new Date(Date.now() - durationSeconds * 1000).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
        endTime: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
        location: timer.metadata?.location || "المضمار الرياضي",
        notes,
        calories: Math.round(Number(distance) * 72),
      };
      setAppState((prev) => ({
        ...prev,
        activeTimer: null,
        recordsByDate: {
          ...prev.recordsByDate,
          [todayStr]: {
            ...currentDay,
            runningSessions: [newRun, ...(currentDay.runningSessions || [])],
          },
        },
      }));
    } else if (timer.type === "social_media") {
      const newSocial = {
        id: generateId("social"),
        platform: timer.metadata?.platform || "سوشيال ميديا",
        startTime: new Date(Date.now() - durationSeconds * 1000).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
        endTime: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
        durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
        reason: task || "تصفح",
        notes,
      };
      setAppState((prev) => ({
        ...prev,
        activeTimer: null,
        recordsByDate: {
          ...prev.recordsByDate,
          [todayStr]: {
            ...currentDay,
            socialMediaSessions: [newSocial, ...(currentDay.socialMediaSessions || [])],
          },
        },
      }));
    } else {
      // General Duration / Programming / Study session
      const newSession = {
        id: generateId("sess"),
        type: timer.type || "programming",
        projectName: projectName || timer.title,
        task: task || "",
        durationSeconds,
        startedAt: Date.now() - durationSeconds * 1000,
        endedAt: Date.now(),
        notes: notes || "",
        createdAt: new Date().toISOString(),
      };
      setAppState((prev) => ({
        ...prev,
        activeTimer: null,
        recordsByDate: {
          ...prev.recordsByDate,
          [todayStr]: {
            ...currentDay,
            sessions: [newSession, ...(currentDay.sessions || [])],
          },
        },
      }));
    }

    setFinishModalOpen(false);
    showToast(`تم توثيق الجلسة بنجاح! المدة: ${Math.round(durationSeconds / 60)} دقيقة 🔥`, "success");
  };

  // ----------------------------------------------------
  // 2. PRAYER TRACKING METHODS
  // ----------------------------------------------------
  const togglePrayerQuick = (prayerKey, dateStr = selectedDate) => {
    const day = getDayRecords(dateStr);
    const schedule = appState.prayerSchedule || DEFAULT_PRAYER_SCHEDULE;
    const currentPrayer = day.prayers?.[prayerKey] || {
      done: false,
      scheduledTime: schedule[prayerKey]?.scheduledTime || "12:00",
      location: "mosque",
      onTime: true,
    };

    const isNowDone = !currentPrayer.done;
    const updatedPrayer = {
      ...currentPrayer,
      name: schedule[prayerKey]?.name || prayerKey,
      scheduledTime: schedule[prayerKey]?.scheduledTime || currentPrayer.scheduledTime,
      actualTime: isNowDone
        ? (currentPrayer.actualTime || currentPrayer.scheduledTime)
        : currentPrayer.actualTime,
      done: isNowDone,
      onTime: true,
      location: currentPrayer.location || "mosque",
    };

    setAppState((prev) => ({
      ...prev,
      recordsByDate: {
        ...prev.recordsByDate,
        [dateStr]: {
          ...day,
          prayers: {
            ...day.prayers,
            [prayerKey]: updatedPrayer,
          },
        },
      },
    }));

    showToast(isNowDone ? `تم تحديد صلاة ${updatedPrayer.name || prayerKey} كمكتملة ✨` : `تم إلغاء تحديد الصلاة`, "success");
  };

  const openPrayerDetail = (prayerKey, dateStr = selectedDate) => {
    const day = getDayRecords(dateStr);
    const schedule = appState.prayerSchedule || DEFAULT_PRAYER_SCHEDULE;
    const prayer = day.prayers?.[prayerKey] || {
      name: schedule[prayerKey]?.name || prayerKey,
      scheduledTime: schedule[prayerKey]?.scheduledTime || "12:00",
      actualTime: schedule[prayerKey]?.scheduledTime || "12:00",
      done: false,
      onTime: true,
      location: "mosque",
    };

    setPrayerDetailModalData({
      prayerKey,
      dateStr,
      data: {
        name: schedule[prayerKey]?.name || prayerKey,
        ...prayer,
      },
    });
  };

  const savePrayerRecord = (prayerKey, record, dateStr = selectedDate) => {
    const day = getDayRecords(dateStr);
    setAppState((prev) => ({
      ...prev,
      recordsByDate: {
        ...prev.recordsByDate,
        [dateStr]: {
          ...day,
          prayers: {
            ...day.prayers,
            [prayerKey]: {
              ...day.prayers?.[prayerKey],
              ...record,
            },
          },
        },
      },
    }));
    showToast(`تم حفظ تفاصيل صلاة ${prayerKey} بنجاح ✨`, "success");
  };

  const updatePrayerSchedule = (newSchedule) => {
    setAppState((prev) => ({
      ...prev,
      prayerSchedule: newSchedule,
    }));
    showToast("تم تحديث جدول مواقيت الأذان بنجاح", "success");
  };

  // ----------------------------------------------------
  // 3. GYM TRACKING
  // ----------------------------------------------------
  const addGymSession = (session, dateStr = selectedDate) => {
    const day = getDayRecords(dateStr);
    const gymId = crypto.randomUUID();
    const newSession = {
      ...session,
      id: gymId,
    };
    setAppState((prev) => ({
      ...prev,
      recordsByDate: {
        ...prev.recordsByDate,
        [dateStr]: {
          ...day,
          gymSessions: [newSession, ...(day.gymSessions || [])],
        },
      },
    }));

    const workoutPayload = {
      id: gymId,
      userId: activeUserId,
      date: dateStr,
      title: session.workoutType || session.gymName || "تمرين رياضي",
      durationMinutes: Number(session.durationMinutes) || 60,
      exercises: Array.isArray(session.exercises) ? session.exercises : [],
      notes: session.notes || null,
    };
    localDomainRepo
      .saveGymWorkout(workoutPayload)
      .then(() => {
        if (!isGuestUser) {
          return localOutboxRepo
            .add({
              mutationId: crypto.randomUUID(),
              userId: activeUserId,
              entityType: "gym_workout",
              entityId: gymId,
              action: "create",
              payload: workoutPayload,
              clientTimestamp: Date.now(),
              version: 1,
              status: "pending",
              retryCount: 0,
            })
            .then(() => syncEngine.scheduleSync(500));
        }
      })
      .catch(() => {});
    showToast("تم توثيق تمرين الجيم والقوة 💪", "success");
  };

  const deleteGymSession = (id, dateStr = selectedDate) => {
    const day = getDayRecords(dateStr);
    setAppState((prev) => ({
      ...prev,
      recordsByDate: {
        ...prev.recordsByDate,
        [dateStr]: {
          ...day,
          gymSessions: (day.gymSessions || []).filter((s) => s.id !== id),
        },
      },
    }));
    localDomainRepo
      .deleteGymWorkout(String(id))
      .then(() => {
        if (!isGuestUser) {
          return localOutboxRepo
            .add({
              mutationId: crypto.randomUUID(),
              userId: activeUserId,
              entityType: "gym_workout",
              entityId: String(id),
              action: "delete",
              payload: {},
              clientTimestamp: Date.now(),
              version: 1,
              status: "pending",
              retryCount: 0,
            })
            .then(() => syncEngine.scheduleSync(500));
        }
      })
      .catch(() => {});
    showToast("تم حذف جلسة التمرين", "info");
  };

  // ----------------------------------------------------
  // 4. RUNNING & WALKING
  // ----------------------------------------------------
  const addRunningSession = (session, dateStr = selectedDate) => {
    const day = getDayRecords(dateStr);
    const newSession = {
      ...session,
      id: generateId("run"),
    };
    setAppState((prev) => ({
      ...prev,
      recordsByDate: {
        ...prev.recordsByDate,
        [dateStr]: {
          ...day,
          runningSessions: [newSession, ...(day.runningSessions || [])],
        },
      },
    }));
    showToast("تم توثيق تمرين الجري بنجاح 🏃", "success");
  };

  const deleteRunningSession = (id, dateStr = selectedDate) => {
    const day = getDayRecords(dateStr);
    setAppState((prev) => ({
      ...prev,
      recordsByDate: {
        ...prev.recordsByDate,
        [dateStr]: {
          ...day,
          runningSessions: (day.runningSessions || []).filter((s) => s.id !== id),
        },
      },
    }));
    showToast("تم حذف تمرين الجري", "info");
  };

  // ----------------------------------------------------
  // 5. SOCIAL MEDIA TRACKING
  // ----------------------------------------------------
  const addSocialMediaSession = (session, dateStr = selectedDate) => {
    const day = getDayRecords(dateStr);
    const newSession = {
      ...session,
      id: generateId("social"),
    };
    setAppState((prev) => ({
      ...prev,
      recordsByDate: {
        ...prev.recordsByDate,
        [dateStr]: {
          ...day,
          socialMediaSessions: [newSession, ...(day.socialMediaSessions || [])],
        },
      },
    }));
    showToast(`تم توثيق جلسة ${session.platform} (${session.durationMinutes} د)`, "info");
  };

  const deleteSocialMediaSession = (id, dateStr = selectedDate) => {
    const day = getDayRecords(dateStr);
    setAppState((prev) => ({
      ...prev,
      recordsByDate: {
        ...prev.recordsByDate,
        [dateStr]: {
          ...day,
          socialMediaSessions: (day.socialMediaSessions || []).filter((s) => s.id !== id),
        },
      },
    }));
    showToast("تم حذف جلسة السوشيال ميديا", "info");
  };

  // ----------------------------------------------------
  // 6. SMOKING TRACKING
  // ----------------------------------------------------
  const addSmokingEvent = (event, dateStr = selectedDate) => {
    const day = getDayRecords(dateStr);
    const newEvent = {
      ...event,
      id: generateId("smoke"),
      timestamp: event.timestamp || Date.now(),
    };
    setAppState((prev) => ({
      ...prev,
      recordsByDate: {
        ...prev.recordsByDate,
        [dateStr]: {
          ...day,
          smokingEvents: [newEvent, ...(day.smokingEvents || [])],
        },
      },
    }));
    showToast("تم توثيق الحدث بكل خصوصية. كل خطوة وعي تقربك من التمكين 🌿", "info");
  };

  const deleteSmokingEvent = (id, dateStr = selectedDate) => {
    const day = getDayRecords(dateStr);
    setAppState((prev) => ({
      ...prev,
      recordsByDate: {
        ...prev.recordsByDate,
        [dateStr]: {
          ...day,
          smokingEvents: (day.smokingEvents || []).filter((e) => e.id !== id),
        },
      },
    }));
    showToast("تم حذف الحدث", "info");
  };

  // ----------------------------------------------------
  // 7. WATER / COUNTERS
  // ----------------------------------------------------
  const addWaterCup = (cups = 1, dateStr = selectedDate) => {
    const day = getDayRecords(dateStr);
    const newCount = Math.max(0, (day.waterCount || 0) + cups);
    setAppState((prev) => ({
      ...prev,
      recordsByDate: {
        ...prev.recordsByDate,
        [dateStr]: {
          ...day,
          waterCount: newCount,
        },
      },
    }));
    showToast(`+${cups * 250} مل ماء 💧 (الإجمالي: ${(newCount * 0.25).toFixed(2)} لتر)`, "success");
  };

  // ----------------------------------------------------
  // 8. SESSIONS (Programming, Study, Reading)
  // ----------------------------------------------------
  const deleteSession = (id, dateStr = selectedDate) => {
    const day = getDayRecords(dateStr);
    setAppState((prev) => ({
      ...prev,
      recordsByDate: {
        ...prev.recordsByDate,
        [dateStr]: {
          ...day,
          sessions: (day.sessions || []).filter((s) => s.id !== id),
        },
      },
    }));
    showToast("تم حذف الجلسة", "info");
  };

  // ----------------------------------------------------
  // 9. CUSTOM HABIT CREATION
  // ----------------------------------------------------
  const createCustomHabit = (habit) => {
    const slug = habit.slug || habit.name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36);
    const newHabit = {
      id: generateId("hab"),
      slug,
      name: habit.name,
      category: habit.category || "intellect",
      categoryLabel: habit.categoryLabel || "تطوير ومهارات",
      trackingType: habit.trackingType || "duration", // completion, duration, distance_duration, counter, event_logging
      unit: habit.unit || "مرة",
      targetDailyCount: habit.targetDailyCount || 1,
      targetDailyMinutes: habit.targetDailyMinutes || 30,
      targetDailyKm: habit.targetDailyKm || 5.0,
      tagline: habit.tagline || "عادة جديدة لبناء الأثر",
      streak: 0,
      color: habit.color || "violet",
      iconName: "Sparkles",
    };

    setAppState((prev) => ({
      ...prev,
      habits: [newHabit, ...prev.habits],
    }));

    showToast(`تمت إضافة عادة "${habit.name}" بنجاح! 🎉`, "success");
  };

  // 10. Secondary domain helpers (Preferences, Expenses, Nutrition, Gym, Journal)
  const updatePreferences = async (patch) => {
    const nextPrefs = normalizeUserPreferences({
      ...userPreferences,
      ...patch,
      preferencesUpdatedAt: new Date().toISOString(),
    });
    setUserPreferences(nextPrefs);
    await localSyncMetaRepo.saveUserSettings(activeUserId, nextPrefs).catch(() => {});
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`athar_user_settings:${activeUserId}`, JSON.stringify(nextPrefs));
        localStorage.setItem("athar_user_settings", JSON.stringify(nextPrefs));
        window.dispatchEvent(new CustomEvent("athar_preferences_updated", { detail: nextPrefs }));
      } catch {}
    }
    if (!isGuestUser) {
      await localOutboxRepo
        .add({
          mutationId: crypto.randomUUID(),
          userId: activeUserId,
          entityType: "user_settings",
          entityId: activeUserId,
          action: "update",
          payload: {
            timezone: nextPrefs.timezone,
            countryCode: nextPrefs.countryCode,
            governorate: nextPrefs.governorate,
            city: nextPrefs.city,
            currency: nextPrefs.currency,
            currencyAuto: nextPrefs.currencyAuto,
            prayerTrackingEnabled: nextPrefs.prayerTrackingEnabled,
            dashboardConfig: nextPrefs,
            profileName: nextPrefs.profileName,
          },
          clientTimestamp: Date.now(),
          version: 1,
          status: "pending",
          retryCount: 0,
        })
        .catch(() => {});
      syncEngine.scheduleSync(500);
    }
    return nextPrefs;
  };

  const addBodyWeight = (weightKg, dateStr = selectedDate) => {
    const numeric = Number(weightKg);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    const entry = {
      id: generateId("bw"),
      weightKg: numeric,
      date: dateStr || getLocalDateString(),
      createdAt: new Date().toISOString(),
    };
    setGymData((prev) => {
      const nextWeights = [entry, ...(Array.isArray(prev.bodyWeights) ? prev.bodyWeights : [])];
      void localSyncMetaRepo.saveBodyWeights(activeUserId, nextWeights).catch(() => {});
      return {
        ...prev,
        bodyWeights: nextWeights,
      };
    });
    showToast(`تم تسجيل قياس الوزن (${numeric} كجم) بنجاح`, "success");
  };

  const deleteBodyWeight = (id) => {
    setGymData((prev) => {
      const nextWeights = (prev.bodyWeights || []).filter((w) => w.id !== id);
      void localSyncMetaRepo.saveBodyWeights(activeUserId, nextWeights).catch(() => {});
      return {
        ...prev,
        bodyWeights: nextWeights,
      };
    });
    showToast("تم حذف قياس الوزن", "info");
  };

  const addExpense = (expense) => {
    const expenseId = crypto.randomUUID();
    const txDate = expense.date || selectedDate || getLocalDateString();
    const txCurrency = String(
      expense.currency || userPreferences.currency || "EGP"
    ).toUpperCase();
    const txType = expense.type === "income" ? "income" : "expense";
    const newTx = {
      id: expenseId,
      title: expense.title,
      amount: Number(expense.amount),
      currency: txCurrency,
      type: txType,
      category: expense.category,
      date: txDate,
      time: new Date().toLocaleTimeString("ar-u-nu-latn", { hour: "2-digit", minute: "2-digit" }),
    };

    setExpensesData((prev) => {
      const updatedTxs = [newTx, ...prev.transactions];
      const countsTowardPrimarySpend =
        txType === "expense" && txCurrency === (userPreferences.currency || "EGP");
      const newTodaySpent = countsTowardPrimarySpend
        ? prev.todaySpent + newTx.amount
        : prev.todaySpent;
      const newMonthlySpent = countsTowardPrimarySpend
        ? prev.monthlySpent + newTx.amount
        : prev.monthlySpent;

      return {
        ...prev,
        transactions: updatedTxs,
        todaySpent: newTodaySpent,
        monthlySpent: newMonthlySpent,
      };
    });

    const expensePayload = {
      id: expenseId,
      userId: activeUserId,
      date: txDate,
      title: expense.title,
      amount: Number(expense.amount),
      currency: txCurrency,
      type: txType,
      category: expense.category,
      notes: expense.notes || null,
    };
    localDomainRepo
      .saveExpenseEntry(expensePayload)
      .then(() => {
        if (!isGuestUser) {
          return localOutboxRepo
            .add({
              mutationId: crypto.randomUUID(),
              userId: activeUserId,
              entityType: "expense_entry",
              entityId: expenseId,
              action: "create",
              payload: expensePayload,
              clientTimestamp: Date.now(),
              version: 1,
              status: "pending",
              retryCount: 0,
            })
            .then(() => syncEngine.scheduleSync(500));
        }
      })
      .catch(() => {});
    const formattedAmount = formatCurrency(expense.amount, txCurrency);
    showToast(
      txType === "income"
        ? `تم تسجيل دخل بقيمة ${formattedAmount}`
        : `تم تسجيل مصروف بقيمة ${formattedAmount} 💳`,
      "success"
    );
  };

  const deleteExpense = (id) => {
    const targetId = String(id);
    const today = getLocalDateString();

    setExpensesData((prev) => {
      const removed = prev.transactions.find((t) => String(t.id) === targetId);
      const removedAmount = Number(removed?.amount || 0);
      const isToday = removed?.date === today;

      const updatedCats = prev.categories.map((c) => {
        if (
          removed &&
          (c.name.includes(removed.category) || (removed.category || "").includes(c.name))
        ) {
          const newSpent = Math.max(0, c.spent - removedAmount);
          return {
            ...c,
            spent: newSpent,
            percent: Math.min(100, Math.round((newSpent / (c.budget || 1)) * 100)),
          };
        }
        return c;
      });

      return {
        ...prev,
        transactions: prev.transactions.filter((t) => String(t.id) !== targetId),
        todaySpent: isToday ? Math.max(0, prev.todaySpent - removedAmount) : prev.todaySpent,
        monthlySpent: Math.max(0, prev.monthlySpent - removedAmount),
        categories: updatedCats,
      };
    });

    localDomainRepo
      .deleteExpenseEntry(targetId)
      .then(() => {
        if (!isGuestUser) {
          return localOutboxRepo
            .add({
              mutationId: crypto.randomUUID(),
              userId: activeUserId,
              entityType: "expense_entry",
              entityId: targetId,
              action: "delete",
              payload: {},
              clientTimestamp: Date.now(),
              version: 1,
              status: "pending",
              retryCount: 0,
            })
            .then(() => syncEngine.scheduleSync(500));
        }
      })
      .catch(() => {});
    showToast("تم حذف المصروف", "info");
  };

  const addWater = (amountLiters = 0.25) => {
    addWaterCup(Math.round(amountLiters / 0.25));
    setNutritionData((prev) => {
      const current = prev.todayLogged.waterLiters;
      const newWater = parseFloat((current + amountLiters).toFixed(2));
      return {
        ...prev,
        todayLogged: {
          ...prev.todayLogged,
          waterLiters: Math.min(newWater, 6.0),
        }
      };
    });
  };

  const addMeal = (meal) => {
    const mealId = crypto.randomUUID();
    const mealDate = selectedDate || getLocalDateString();
    setNutritionData((prev) => {
      const updatedMeals = [
        { ...meal, id: mealId, date: mealDate },
        ...prev.meals,
      ];
      return {
        ...prev,
        meals: updatedMeals,
        todayLogged: {
          ...prev.todayLogged,
          calories: prev.todayLogged.calories + Number(meal.calories || 0),
          protein: prev.todayLogged.protein + Number(meal.protein || 0),
          carbs: prev.todayLogged.carbs + Number(meal.carbs || 0),
          fat: prev.todayLogged.fat + Number(meal.fat || 0),
        }
      };
    });

    const mealPayload = {
      id: mealId,
      userId: activeUserId,
      date: mealDate,
      mealType: meal.mealType || "lunch",
      title: meal.name || meal.title || "وجبة",
      calories: Number(meal.calories) || 0,
      protein: Number(meal.protein) || 0,
      carbs: Number(meal.carbs) || 0,
      fat: Number(meal.fat) || 0,
      notes: meal.notes || null,
    };
    localDomainRepo
      .saveMealEntry(mealPayload)
      .then(() => {
        if (!isGuestUser) {
          return localOutboxRepo
            .add({
              mutationId: crypto.randomUUID(),
              userId: activeUserId,
              entityType: "meal_entry",
              entityId: mealId,
              action: "create",
              payload: mealPayload,
              clientTimestamp: Date.now(),
              version: 1,
              status: "pending",
              retryCount: 0,
            })
            .then(() => syncEngine.scheduleSync(500));
        }
      })
      .catch(() => {});
    showToast("تم تسجيل الوجبة بنجاح 🥗", "success");
  };

  const toggleGymSet = (exerciseId, setNumber) => {
    setGymData((prev) => {
      const plan = prev.todayWorkoutPlan;
      const updatedExercises = plan.exercises.map((ex) => {
        if (ex.id === exerciseId) {
          const updatedSets = ex.sets.map((s) =>
            s.set === setNumber ? { ...s, completed: !s.completed } : s
          );
          return { ...ex, sets: updatedSets };
        }
        return ex;
      });
      return {
        ...prev,
        todayWorkoutPlan: {
          ...plan,
          exercises: updatedExercises,
        }
      };
    });
    showToast("تم تحديث حالة الجولة! 💪", "success");
  };

  const addJournalEntry = (sectionKey, entry) => {
    setJournalData((prev) => {
      const currentDay = prev[selectedDate] || {
        date: selectedDate,
        hijriDate: "٢٥ جمادى الأولى ١٤٤٨ هـ",
        dayLabel: "اليوم",
        rating: 9.0,
        focusHours: 3.5,
        mood: "great",
        moodLabel: "منجز ومطمئن النفس",
        moodEmoji: "🔥",
        summary: "تدوين يومي متجدد لأثر اليوم.",
        sections: {
          spiritual: [],
          deepWork: [],
          healthFitness: [],
          expenses: [],
          reflections: []
        }
      };

      const sectionItems = currentDay.sections[sectionKey] || [];
      const updatedSection = [
        { ...entry, id: `entry_${Date.now()}` },
        ...sectionItems,
      ];

      return {
        ...prev,
        [selectedDate]: {
          ...currentDay,
          sections: {
            ...currentDay.sections,
            [sectionKey]: updatedSection,
          }
        }
      };
    });
    showToast("تمت إضافة التدوينة إلى اليومية بنجاح ✍️", "success");
  };

  const deleteJournalEntry = (sectionKey, entryId) => {
    setJournalData((prev) => {
      const currentDay = prev[selectedDate];
      if (!currentDay) return prev;
      const sectionItems = currentDay.sections[sectionKey] || [];
      const updatedSection = sectionItems.filter((i) => i.id !== entryId);

      return {
        ...prev,
        [selectedDate]: {
          ...currentDay,
          sections: {
            ...currentDay.sections,
            [sectionKey]: updatedSection,
          }
        }
      };
    });
    showToast("تم حذف التدوينة", "info");
  };

  // Quick Log Modal opener
  const openQuickLog = (tab = "prayer") => {
    setQuickLogInitialTab(tab);
    setQuickLogModalOpen(true);
  };

  const closeQuickLog = () => {
    setQuickLogModalOpen(false);
  };

  // Current elapsed seconds for active timer
  const elapsedSeconds = calculateElapsedSeconds(appState.activeTimer);

  return (
    <AtharContext.Provider
      value={{
        isMounted,
        appState,
        selectedDate,
        setSelectedDate,
        getDayRecords,
        
        // Unified Timer
        activeTimer: appState.activeTimer,
        elapsedSeconds,
        startTimer,
        pauseTimer,
        resumeTimer,
        requestFinishTimer,
        cancelTimer,
        
        // Prayers
        prayerSchedule: appState.prayerSchedule || DEFAULT_PRAYER_SCHEDULE,
        togglePrayerQuick,
        openPrayerDetail,
        savePrayerRecord,
        updatePrayerSchedule,
        openPrayerScheduleModal: () => setPrayerScheduleModalOpen(true),
        
        // Gym
        addGymSession,
        deleteGymSession,
        openGymModal: () => setGymModalOpen(true),
        
        // Running
        addRunningSession,
        deleteRunningSession,
        openRunningModal: () => setRunningModalOpen(true),
        
        // Social Media
        addSocialMediaSession,
        deleteSocialMediaSession,
        openSocialModal: () => setSocialModalOpen(true),
        
        // Smoking
        addSmokingEvent,
        deleteSmokingEvent,
        openSmokingModal: () => setSmokingModalOpen(true),
        
        // Water
        addWaterCup,
        
        // General Sessions
        deleteSession,
        
        // Habits
        habits: appState.habits,
        createCustomHabit,

        // User Preferences & Localization
        userPreferences,
        updatePreferences,

        // Expenses Domain
        expensesData,
        addExpense,
        deleteExpense,

        // Gym Body Weight
        addBodyWeight,
        deleteBodyWeight,

        // Nutrition Domain
        nutritionData,
        addWater,
        addMeal,

        // Journal Domain
        journalData,
        addJournalEntry,
        deleteJournalEntry,

        // Gym Sets
        gymData,
        toggleGymSet,
        
        // Quick Log
        quickLogModalOpen,
        quickLogInitialTab,
        openQuickLog,
        closeQuickLog,
        
        // Feedback Toast
        toast,
        showToast,
      }}
    >
      {children}

      {/* Confirmation modal for finishing timer (Requirement 3) */}
      <SessionFinishConfirmModal
        isOpen={finishModalOpen}
        initialSeconds={elapsedSeconds}
        sessionType={appState.activeTimer?.type || "programming"}
        initialProject={appState.activeTimer?.title || ""}
        initialTask={appState.activeTimer?.metadata?.task || ""}
        onConfirm={confirmFinishTimer}
        onCancel={cancelTimer}
        onResume={() => {
          setFinishModalOpen(false);
          resumeTimer();
        }}
      />

      {/* Prayer Details Modal (Requirement 6) */}
      {prayerDetailModalData && (
        <PrayerDetailModal
          isOpen={Boolean(prayerDetailModalData)}
          prayerKey={prayerDetailModalData.prayerKey}
          prayerData={prayerDetailModalData.data}
          onSave={(key, rec) => savePrayerRecord(key, rec, prayerDetailModalData.dateStr)}
          onClose={() => setPrayerDetailModalData(null)}
        />
      )}

      {/* Prayer Schedule Configurator Modal (Requirement 6) */}
      <PrayerScheduleModal
        isOpen={prayerScheduleModalOpen}
        currentSchedule={appState.prayerSchedule}
        onSaveSchedule={updatePrayerSchedule}
        onClose={() => setPrayerScheduleModalOpen(false)}
      />

      {/* Social Media Usage Modal (Requirement 7) */}
      <SocialMediaModal
        isOpen={socialModalOpen}
        onSaveSession={(sess) => addSocialMediaSession(sess)}
        onClose={() => setSocialModalOpen(false)}
      />

      {/* Smoking Event Modal (Requirement 8) */}
      <SmokingEventModal
        isOpen={smokingModalOpen}
        onSaveEvent={(ev) => addSmokingEvent(ev)}
        onClose={() => setSmokingModalOpen(false)}
      />

      {/* Running Session Modal (Requirement 5) */}
      <RunningSessionModal
        isOpen={runningModalOpen}
        onSaveSession={(sess) => addRunningSession(sess)}
        onClose={() => setRunningModalOpen(false)}
      />

      {/* Gym Workout Modal (Requirement 4) */}
      <GymSessionModal
        isOpen={gymModalOpen}
        onSaveSession={(sess) => addGymSession(sess)}
        onClose={() => setGymModalOpen(false)}
      />
    </AtharContext.Provider>
  );
}

export function useAthar() {
  const context = useContext(AtharContext);
  if (!context) {
    throw new Error("useAthar must be used within an AtharProvider");
  }
  return context;
}
