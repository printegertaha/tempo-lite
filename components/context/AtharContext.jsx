"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
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
  INITIAL_JOURNAL_DATABASE,
} from "../data/mockData";
import { getLocalDateString as getTzLocalDateString } from "@/lib/dates";
import {
  calculateNutritionPlan,
  createEmptyNutritionProfile,
  isNutritionProfileCompleted,
  resolveNutritionExperienceMode,
} from "@/lib/nutrition/calculations";
import {
  DEMO_MEAL_IDS,
  EMPTY_NUTRITION_LOGGED,
  buildMealSnapshotWithMeta,
  filterRealMealsOnly,
  getDayStatusForDate,
  isDemoMealRecord,
  mergeBodyWeights,
  normalizeMealRecord,
  resolveTargetsForDate,
} from "@/lib/nutrition/storage-helpers";
import { isPlannedMealConfirmedForDate } from "@/lib/nutrition/meal-planner";
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
      salutation: null,
      religion: null,
      onboardingCompleted: false,
      onboardingStep: 1,
      onboardingCompletedAt: null,
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
    salutation: rawSettings.salutation ?? cfg.salutation ?? null,
    religion: rawSettings.religion ?? cfg.religion ?? null,
    onboardingCompleted:
      rawSettings.onboardingCompleted !== undefined
        ? Boolean(rawSettings.onboardingCompleted)
        : cfg.onboardingCompleted !== undefined
          ? Boolean(cfg.onboardingCompleted)
          : false,
    onboardingStep:
      Number(rawSettings.onboardingStep ?? cfg.onboardingStep ?? 1) || 1,
    onboardingCompletedAt:
      rawSettings.onboardingCompletedAt ?? cfg.onboardingCompletedAt ?? null,
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
  const [allMeals, setAllMeals] = useState([]);
  const [allWaterEntries, setAllWaterEntries] = useState([]);
  const [expensesData, setExpensesData] = useState(EMPTY_EXPENSES_DATA);
  const [journalData, setJournalData] = useState(INITIAL_JOURNAL_DATABASE);
  const [userPreferences, setUserPreferences] = useState(() =>
    normalizeUserPreferences(null)
  );
  const [domainsLoadedForUser, setDomainsLoadedForUser] = useState(null);
  const [domainsLoadError, setDomainsLoadError] = useState(false);
  const loadedUserRef = useRef(null);

  const loadDomainsForUser = async (uid) => {
    setDomainsLoadError(false);
    // 1. User-scoped settings (IDB -> scoped localStorage -> guest legacy fallback)
    let idbReadFailed = false;
    let resolvedSettings = await localSyncMetaRepo.getUserSettings(uid).catch(() => {
      idbReadFailed = true;
      return null;
    });
    if (!resolvedSettings && typeof window !== "undefined") {
      try {
        const scopedRaw =
          localStorage.getItem(`athar_user_settings:${uid}`) ||
          (uid === "guest" ? localStorage.getItem("athar_user_settings") : null);
        if (scopedRaw) resolvedSettings = JSON.parse(scopedRaw);
      } catch {}
    }
    if (idbReadFailed && !resolvedSettings) {
      setDomainsLoadError(true);
      setDomainsLoadedForUser(uid);
      return;
    }
    const activePrefs = normalizeUserPreferences(resolvedSettings);
    const activeTz = activePrefs.timezone || "Africa/Cairo";
    const today = getTzLocalDateString(new Date(), activeTz);
    const currentMonthPrefix = today.slice(0, 7);

    setUserPreferences(activePrefs);
    setSelectedDate((prev) => (prev === "2026-01-01" ? today : prev));
    void activeTimerEngine
      .migrateLegacyTimerHistory(uid, activePrefs.timezone)
      .catch(() => {});
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

    // 3. Meals (IndexedDB immediate source of truth per account — ZERO demo fallback)
    const rawMealRows = await localDomainRepo.getMealEntries(uid).catch(() => []);
    for (const m of rawMealRows) {
      if (m?.id && DEMO_MEAL_IDS.has(String(m.id))) {
        void localDomainRepo.deleteMealEntry(m.id).catch(() => {});
      }
    }
    let cleanMeals = filterRealMealsOnly(rawMealRows);

    // Migrate any real guest meals from legacy localStorage (never importing demo meals m1..m4)
    if (uid === "guest" && typeof window !== "undefined") {
      try {
        const legacyRaw =
          localStorage.getItem(`athar_nutrition:${uid}`) ||
          localStorage.getItem("athar_nutrition");
        if (legacyRaw) {
          const parsedLegacy = JSON.parse(legacyRaw);
          const realLegacyMeals = filterRealMealsOnly(parsedLegacy?.meals || []).map((m) => ({
            ...m,
            id: m.id || crypto.randomUUID(),
            userId: "guest",
            date: m.date || today,
          }));
          if (realLegacyMeals.length > 0 && cleanMeals.length === 0) {
            await localDomainRepo.saveMealBatch(realLegacyMeals).catch(() => {});
            cleanMeals = realLegacyMeals;
          }
          // Scrub legacy demo meals from localStorage so they never resurface
          if (Array.isArray(parsedLegacy?.meals) && parsedLegacy.meals.some(isDemoMealRecord)) {
            localStorage.removeItem("athar_nutrition");
            localStorage.removeItem(`athar_nutrition:${uid}`);
          }
        }
      } catch {}
    }

    cleanMeals.sort((a, b) => {
      const dCmp = String(b.date || "").localeCompare(String(a.date || ""));
      if (dCmp !== 0) return dCmp;
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
    setAllMeals(cleanMeals);

    // 4. Water Entries (Canonical IndexedDB source of truth)
    let waterRows = await localDomainRepo.getWaterEntries(uid).catch(() => []);

    // 5. Body Weights + Gym Workouts (IndexedDB + synced UserSettings.dashboardConfig.bodyWeights)
    const [idbWeights, gymRows] = await Promise.all([
      localSyncMetaRepo.getBodyWeights(uid).catch(() => []),
      localDomainRepo.getGymWorkouts(uid).catch(() => []),
    ]);
    const syncedWeights = Array.isArray(activePrefs.bodyWeights) ? activePrefs.bodyWeights : [];
    const mergedWeights = mergeBodyWeights(idbWeights, syncedWeights);
    if (mergedWeights.length > 0) {
      void localSyncMetaRepo.saveBodyWeights(uid, mergedWeights).catch(() => {});
    }
    setGymData({
      ...EMPTY_GYM_DATA,
      bodyWeights: mergedWeights,
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

    // One-time non-destructive migration of real legacy waterCount records into canonical water_entries
    if (
      !baseAppState?.waterEntriesMigrated &&
      baseAppState?.recordsByDate &&
      typeof baseAppState.recordsByDate === "object"
    ) {
      const toMigrate = [];
      const cleanedRecordsByDate = { ...baseAppState.recordsByDate };
      for (const [dKey, dayObj] of Object.entries(baseAppState.recordsByDate)) {
        const cups = Number(dayObj?.waterCount || 0);
        if (cups > 0 && !waterRows.some((w) => w.date === dKey)) {
          toMigrate.push({
            id: `migrated_water_${uid}_${dKey}`,
            userId: uid,
            date: dKey,
            amountMl: Math.round(cups * 250),
            occurredAt: `${dKey}T12:00:00.000Z`,
            source: "habit_water",
            notes: null,
          });
        }
        if (dayObj && "waterCount" in dayObj) {
          const { waterCount: _legacyWater, ...restDay } = dayObj;
          cleanedRecordsByDate[dKey] = restDay;
        }
      }
      if (toMigrate.length > 0) {
        await localDomainRepo.saveWaterBatch(toMigrate).catch(() => {});
        waterRows = [...waterRows, ...toMigrate];
      }
      baseAppState = {
        ...baseAppState,
        recordsByDate: cleanedRecordsByDate,
        waterEntriesMigrated: true,
      };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`${STORAGE_KEY}:${uid}`, JSON.stringify(baseAppState));
          if (uid === "guest") persistState(baseAppState);
        } catch {}
      }
    }
    setAllWaterEntries(
      waterRows.sort((a, b) =>
        String(b.occurredAt || b.createdAt || "").localeCompare(
          String(a.occurredAt || a.createdAt || "")
        )
      )
    );

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
    setDomainsLoadError(false);
    setDomainsLoadedForUser(uid);
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

  const activeTimezone = userPreferences?.timezone || "Africa/Cairo";
  const todayLocalDate = isMounted
    ? getTzLocalDateString(new Date(), activeTimezone)
    : "2026-01-01";
  const activeNutritionDate =
    selectedDate && selectedDate !== "2026-01-01" ? selectedDate : todayLocalDate;

  const nutritionBreakdown = useMemo(
    () => calculateNutritionPlan(userPreferences?.nutritionProfile),
    [userPreferences?.nutritionProfile]
  );

  const nutritionData = useMemo(() => {
    const dateMeals = allMeals.filter((m) => m.date === activeNutritionDate);
    const dateWater = allWaterEntries.filter((w) => w.date === activeNutritionDate);
    const waterMl = dateWater.reduce((s, w) => s + Number(w.amountMl || 0), 0);
    const waterLiters = Math.round((waterMl / 1000) * 100) / 100;

    const todayLogged = {
      calories: Math.round(dateMeals.reduce((s, m) => s + Number(m.calories || 0), 0)),
      protein: Math.round(dateMeals.reduce((s, m) => s + Number(m.protein || 0), 0) * 10) / 10,
      carbs: Math.round(dateMeals.reduce((s, m) => s + Number(m.carbs || 0), 0) * 10) / 10,
      fat: Math.round(dateMeals.reduce((s, m) => s + Number(m.fat || 0), 0) * 10) / 10,
      waterMl,
      waterLiters,
    };

    const dailyTargets = resolveTargetsForDate({
      dateStr: activeNutritionDate,
      todayStr: todayLocalDate,
      currentTargets: nutritionBreakdown.targets,
      targetSnapshots: userPreferences?.nutritionTargetSnapshots,
      mealsForDate: dateMeals,
    });

    return {
      activeDate: activeNutritionDate,
      todayDate: todayLocalDate,
      dailyTargets,
      todayLogged,
      meals: dateMeals,
      allMeals,
      waterEntries: dateWater,
      allWaterEntries,
      breakdown: nutritionBreakdown,
      profile: userPreferences?.nutritionProfile || createEmptyNutritionProfile(),
      nutritionPlans: Array.isArray(userPreferences?.nutritionPlans)
        ? userPreferences.nutritionPlans
        : [],
      favoriteMeals: Array.isArray(userPreferences?.favoriteMeals)
        ? userPreferences.favoriteMeals
        : [],
      customFoods: Array.isArray(userPreferences?.customFoods)
        ? userPreferences.customFoods
        : [],
      nutritionDayStatus:
        userPreferences?.nutritionDayStatus && typeof userPreferences.nutritionDayStatus === "object"
          ? userPreferences.nutritionDayStatus
          : {},
      dayStatus: getDayStatusForDate(userPreferences?.nutritionDayStatus, activeNutritionDate),
      nutritionReady: isMounted && domainsLoadedForUser === activeUserId,
      nutritionLoadError: domainsLoadError,
      isProfileCompleted: isNutritionProfileCompleted(userPreferences?.nutritionProfile),
      experienceMode: resolveNutritionExperienceMode({
        explicitMode: userPreferences?.nutritionExperienceMode,
        hasExistingMeals: allMeals.length > 0,
        hasExistingPlans:
          Array.isArray(userPreferences?.nutritionPlans) &&
          userPreferences.nutritionPlans.length > 0,
      }),
      nutritionDietDraft: userPreferences?.nutritionDietDraft || null,
    };
  }, [
    allMeals,
    allWaterEntries,
    activeNutritionDate,
    todayLocalDate,
    nutritionBreakdown,
    userPreferences,
    isMounted,
    domainsLoadedForUser,
    domainsLoadError,
    activeUserId,
  ]);

  useEffect(() => {
    if (isMounted && typeof window !== "undefined" && loadedUserRef.current === activeUserId) {
      try {
        localStorage.setItem(
          `athar_nutrition:${activeUserId}`,
          JSON.stringify({
            dailyTargets: nutritionData.dailyTargets,
            todayLogged: nutritionData.todayLogged,
            meals: allMeals,
          })
        );
      } catch {}
    }
  }, [nutritionData.dailyTargets, nutritionData.todayLogged, allMeals, isMounted, activeUserId]);

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
    const dayWaterMl = allWaterEntries
      .filter((w) => w.date === dateStr)
      .reduce((s, w) => s + Number(w.amountMl || 0), 0);
    const unifiedWaterCups = Math.round(dayWaterMl / 250);

    const records = appState.recordsByDate[dateStr];
    if (records) {
      return {
        ...records,
        waterCount: unifiedWaterCups,
      };
    }

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
      waterCount: unifiedWaterCups,
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
  // 7. WATER / HYDRATION (Unified Canonical WaterEntry Store)
  // ----------------------------------------------------
  const addWaterMl = (amountMlInput = 250, dateStr = activeNutritionDate, source = "nutrition") => {
    const amountMl = Math.round(Number(amountMlInput));
    if (!Number.isFinite(amountMl) || amountMl <= 0) return null;

    const targetDate = dateStr || todayLocalDate;
    const entryId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const waterPayload = {
      id: entryId,
      userId: activeUserId,
      date: targetDate,
      amountMl,
      occurredAt: nowIso,
      source,
      notes: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setAllWaterEntries((prev) => [waterPayload, ...prev]);
    localDomainRepo
      .saveWaterEntry(waterPayload)
      .then(() => {
        if (!isGuestUser) {
          return localOutboxRepo
            .add({
              mutationId: crypto.randomUUID(),
              userId: activeUserId,
              entityType: "water_entry",
              entityId: entryId,
              action: "create",
              payload: waterPayload,
              clientTimestamp: Date.now(),
              version: 1,
              status: "pending",
              retryCount: 0,
            })
            .then(() => syncEngine.scheduleSync(500));
        }
      })
      .catch(() => {});

    const nextDayTotalMl =
      allWaterEntries
        .filter((w) => w.date === targetDate)
        .reduce((s, w) => s + Number(w.amountMl || 0), 0) + amountMl;
    showToast(
      `+${amountMl} مل ماء 💧 (إجمالي ${targetDate === todayLocalDate ? "اليوم" : targetDate}: ${(nextDayTotalMl / 1000).toFixed(2)} لتر)`,
      "success"
    );
    return waterPayload;
  };

  const updateWaterEntry = (id, amountMlInput) => {
    const amountMl = Math.round(Number(amountMlInput));
    if (!Number.isFinite(amountMl) || amountMl <= 0) return;

    const existing = allWaterEntries.find((w) => w.id === id);
    if (!existing) return;
    const updated = {
      ...existing,
      amountMl,
      updatedAt: new Date().toISOString(),
    };
    setAllWaterEntries((prev) => prev.map((w) => (w.id === id ? updated : w)));

    localDomainRepo
      .saveWaterEntry(updated)
      .then(() => {
        if (!isGuestUser) {
          return localOutboxRepo
            .add({
              mutationId: crypto.randomUUID(),
              userId: activeUserId,
              entityType: "water_entry",
              entityId: id,
              action: "update",
              payload: { amountMl, date: existing.date },
              baseUpdatedAt: existing.updatedAt,
              clientTimestamp: Date.now(),
              version: 1,
              status: "pending",
              retryCount: 0,
            })
            .then(() => syncEngine.scheduleSync(500));
        }
      })
      .catch(() => {});
    showToast("تم تعديل كمية الماء", "success");
  };

  const deleteWaterEntry = (id) => {
    const existing = allWaterEntries.find((w) => w.id === id);
    if (!existing) return;
    setAllWaterEntries((prev) => prev.filter((w) => w.id !== id));

    localDomainRepo
      .deleteWaterEntry(id)
      .then(() => {
        if (!isGuestUser) {
          return localOutboxRepo
            .add({
              mutationId: crypto.randomUUID(),
              userId: activeUserId,
              entityType: "water_entry",
              entityId: id,
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
    showToast("تم حذف سجل الماء", "info");
  };

  const addWaterCup = (cups = 1, dateStr = activeNutritionDate) => {
    if (cups > 0) {
      addWaterMl(Math.round(cups * 250), dateStr, "habit_water");
    } else if (cups < 0) {
      const targetDate = dateStr || todayLocalDate;
      const latestForDay = allWaterEntries.find((w) => w.date === targetDate);
      if (latestForDay) {
        deleteWaterEntry(latestForDay.id);
      }
    }
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
            salutation: nextPrefs.salutation ?? null,
            religion: nextPrefs.religion ?? null,
            onboardingCompleted: Boolean(nextPrefs.onboardingCompleted),
            onboardingStep: Number(nextPrefs.onboardingStep || 1),
            onboardingCompletedAt: nextPrefs.onboardingCompletedAt ?? null,
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
      date: dateStr || todayLocalDate,
      createdAt: new Date().toISOString(),
    };
    setGymData((prev) => {
      const nextWeights = mergeBodyWeights([entry], prev.bodyWeights || []);
      void localSyncMetaRepo.saveBodyWeights(activeUserId, nextWeights).catch(() => {});
      void updatePreferences({ bodyWeights: nextWeights }).catch(() => {});
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
      void updatePreferences({ bodyWeights: nextWeights }).catch(() => {});
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

  const addWater = (amountLiters = 0.25, dateStr = activeNutritionDate) => {
    const ml = Math.round(Number(amountLiters) * 1000);
    return addWaterMl(ml, dateStr, "nutrition");
  };

  const saveNutritionProfileDraft = async (profilePatch) => {
    const currentProfile = userPreferences?.nutritionProfile || createEmptyNutritionProfile();
    const nextProfile = {
      ...currentProfile,
      ...profilePatch,
      setupCompleted: false,
      setupInProgress: true,
      setupVersion: 1,
      updatedAt: new Date().toISOString(),
    };
    await updatePreferences({
      nutritionProfile: nextProfile,
    });
    return nextProfile;
  };

  const saveNutritionProfile = async (profilePatch, options = {}) => {
    const currentProfile = userPreferences?.nutritionProfile || createEmptyNutritionProfile();
    const nowIso = new Date().toISOString();
    const candidateProfile = {
      ...currentProfile,
      ...profilePatch,
      setupInProgress: false,
      setupVersion: 1,
      updatedAt: nowIso,
    };
    const nextPlan = calculateNutritionPlan(candidateProfile);
    const completedFlag = isNutritionProfileCompleted({
      ...candidateProfile,
      setupCompleted: true,
    });
    const nextProfile = {
      ...candidateProfile,
      setupCompleted: completedFlag,
      setupCompletedAt: completedFlag
        ? profilePatch?.setupCompletedAt || currentProfile?.setupCompletedAt || nowIso
        : null,
    };
    const nextSnapshots = {
      ...(userPreferences?.nutritionTargetSnapshots || {}),
      ...(nextPlan.targets ? { [todayLocalDate]: nextPlan.targets } : {}),
    };

    await updatePreferences({
      nutritionProfile: nextProfile,
      nutritionTargetSnapshots: nextSnapshots,
    });

    if (options.syncWeightToGym && Number(nextProfile.weightKg) > 0) {
      const latestGym = gymData?.bodyWeights?.[0];
      if (!latestGym || Math.abs(Number(latestGym.weightKg) - Number(nextProfile.weightKg)) >= 0.05) {
        const entry = {
          id: generateId("bw"),
          weightKg: Number(nextProfile.weightKg),
          date: todayLocalDate,
          createdAt: new Date().toISOString(),
        };
        const nextWeights = mergeBodyWeights([entry], gymData?.bodyWeights || []);
        setGymData((prev) => ({ ...prev, bodyWeights: nextWeights }));
        void localSyncMetaRepo.saveBodyWeights(activeUserId, nextWeights).catch(() => {});
        void updatePreferences({
          nutritionProfile: nextProfile,
          nutritionTargetSnapshots: nextSnapshots,
          bodyWeights: nextWeights,
        }).catch(() => {});
      }
    }

    showToast("تم حفظ الملف الغذائي وتحديث الأهداف اليومية", "success");
    return nextPlan;
  };

  const saveNutritionExperienceMode = async (mode) => {
    if (mode !== "calculator_only" && mode !== "diet_builder" && mode !== "full_tracking") return;
    await updatePreferences({ nutritionExperienceMode: mode });
    showToast(
      mode === "calculator_only"
        ? "تم التبديل لوضع حاسبة الاحتياجات فقط"
        : mode === "diet_builder"
          ? "تم فتح باني النظام الغذائي"
          : "تم تفعيل نظام المتابعة الكامل",
      "success"
    );
  };

  const saveNutritionDietDraft = async (draft) => {
    await updatePreferences({ nutritionDietDraft: draft || null });
  };

  const saveNutritionPlans = async (nextPlans) => {
    await updatePreferences({ nutritionPlans: nextPlans });
    showToast("تم حفظ خطة الوجبات", "success");
  };

  const saveFavoriteMeals = async (nextFavorites) => {
    await updatePreferences({ favoriteMeals: nextFavorites });
    showToast("تم تحديث الوجبات المفضلة", "success");
  };

  const saveCustomFoods = async (nextCustomFoods) => {
    await updatePreferences({ customFoods: nextCustomFoods });
    void localSyncMetaRepo.saveCustomFoods(activeUserId, nextCustomFoods).catch(() => {});
    showToast("تم حفظ الطعام المخصص (مُعرّف كمُدخل يدوي)", "success");
  };

  const saveNutritionDayStatus = async (dateStr, statusPatch) => {
    const targetDate = dateStr || activeNutritionDate || todayLocalDate;
    const currentMap =
      userPreferences?.nutritionDayStatus && typeof userPreferences.nutritionDayStatus === "object"
        ? userPreferences.nutritionDayStatus
        : {};
    const nextEntry = {
      offPlan: Boolean(statusPatch?.offPlan),
      reason: typeof statusPatch?.reason === "string" ? statusPatch.reason.trim() : "",
      updatedAt: new Date().toISOString(),
    };
    const nextMap = { ...currentMap };
    if (!nextEntry.offPlan && !nextEntry.reason) {
      delete nextMap[targetDate];
    } else {
      nextMap[targetDate] = nextEntry;
    }
    await updatePreferences({ nutritionDayStatus: nextMap });
    showToast(
      nextEntry.offPlan
        ? "تم تسجيل اليوم كـ «خارج خطتي» — خطتك محفوظة كما هي"
        : "تمت إعادة اليوم للوضع المعتاد",
      "info"
    );
  };

  const addMeal = (meal) => {
    const mealId = crypto.randomUUID();
    const mealDate = meal.date || activeNutritionDate || todayLocalDate;
    const nowIso = new Date().toISOString();
    const activeSnapshot = resolveTargetsForDate({
      dateStr: mealDate,
      todayStr: todayLocalDate,
      currentTargets: nutritionBreakdown.targets,
      targetSnapshots: userPreferences?.nutritionTargetSnapshots,
    });

    const snapshotWithMeta = buildMealSnapshotWithMeta({
      targetsSnapshot: meal.dailyTargetsSnapshot || activeSnapshot || null,
      sourcePlanId: meal.sourcePlanId || null,
      isEstimated: Boolean(meal.isEstimated),
      entrySource: meal.entrySource || null,
    });

    const mealPayload = normalizeMealRecord({
      id: mealId,
      userId: activeUserId,
      date: mealDate,
      time: meal.time || "",
      mealType: meal.mealType || "lunch",
      title: meal.name || meal.title || "وجبة",
      calories: Math.round(Number(meal.calories) || 0),
      protein: Number(meal.protein) || 0,
      carbs: Number(meal.carbs) || 0,
      fat: Number(meal.fat) || 0,
      items: Array.isArray(meal.items) ? meal.items : [],
      sourcePlanId: meal.sourcePlanId || null,
      isEstimated: Boolean(meal.isEstimated),
      entrySource: meal.entrySource || null,
      dailyTargetsSnapshot: snapshotWithMeta,
      notes: meal.notes || null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    setAllMeals((prev) => [mealPayload, ...prev]);

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
    return mealPayload;
  };

  const updateMeal = (mealId, updates) => {
    const existing = allMeals.find((m) => m.id === mealId);
    if (!existing) return null;

    const nowIso = new Date().toISOString();
    const nextSourcePlanId = updates.sourcePlanId !== undefined ? updates.sourcePlanId : existing.sourcePlanId;
    const nextIsEstimated = updates.isEstimated !== undefined ? Boolean(updates.isEstimated) : existing.isEstimated;
    const nextEntrySource = updates.entrySource !== undefined ? updates.entrySource : existing.entrySource;
    const updatedMeal = normalizeMealRecord({
      ...existing,
      ...updates,
      id: mealId,
      userId: activeUserId,
      title: updates.name || updates.title || existing.title,
      calories: Math.round(Number(updates.calories ?? existing.calories) || 0),
      protein: Number(updates.protein ?? existing.protein) || 0,
      carbs: Number(updates.carbs ?? existing.carbs) || 0,
      fat: Number(updates.fat ?? existing.fat) || 0,
      items: Array.isArray(updates.items) ? updates.items : existing.items,
      sourcePlanId: nextSourcePlanId,
      isEstimated: nextIsEstimated,
      entrySource: nextEntrySource,
      dailyTargetsSnapshot: buildMealSnapshotWithMeta({
        targetsSnapshot: existing.dailyTargetsSnapshot,
        sourcePlanId: nextSourcePlanId,
        isEstimated: nextIsEstimated,
        entrySource: nextEntrySource,
      }),
      updatedAt: nowIso,
    });

    setAllMeals((prev) => prev.map((m) => (m.id === mealId ? updatedMeal : m)));

    localDomainRepo
      .saveMealEntry(updatedMeal)
      .then(() => {
        if (!isGuestUser) {
          return localOutboxRepo
            .add({
              mutationId: crypto.randomUUID(),
              userId: activeUserId,
              entityType: "meal_entry",
              entityId: mealId,
              action: "update",
              payload: updatedMeal,
              baseUpdatedAt: existing.updatedAt,
              clientTimestamp: Date.now(),
              version: 1,
              status: "pending",
              retryCount: 0,
            })
            .then(() => syncEngine.scheduleSync(500));
        }
      })
      .catch(() => {});
    showToast("تم تحديث الوجبة بنجاح", "success");
    return updatedMeal;
  };

  const deleteMeal = (mealId) => {
    const existing = allMeals.find((m) => m.id === mealId);
    if (!existing) return;

    setAllMeals((prev) => prev.filter((m) => m.id !== mealId));

    localDomainRepo
      .deleteMealEntry(mealId)
      .then(() => {
        if (!isGuestUser) {
          return localOutboxRepo
            .add({
              mutationId: crypto.randomUUID(),
              userId: activeUserId,
              entityType: "meal_entry",
              entityId: mealId,
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
    showToast("تم حذف الوجبة", "info");
  };

  const confirmPlannedMeal = (plan, dateStr = activeNutritionDate) => {
    if (!plan?.id) return null;
    const targetDate = dateStr || activeNutritionDate || todayLocalDate;
    const dateMeals = allMeals.filter((m) => m.date === targetDate);
    if (isPlannedMealConfirmedForDate(plan.id, dateMeals)) {
      showToast("تم تأكيد هذه الوجبة من خطتك بالفعل اليوم", "info");
      return null;
    }
    const clonedItems = Array.isArray(plan.items)
      ? plan.items.map((it) => (typeof it === "object" && it ? { ...it } : it))
      : [];
    return addMeal({
      ...plan,
      id: undefined,
      date: targetDate,
      items: clonedItems,
      sourcePlanId: plan.id,
    });
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
        addWaterMl,
        updateWaterEntry,
        deleteWaterEntry,
        addMeal,
        updateMeal,
        deleteMeal,
        confirmPlannedMeal,
        saveNutritionProfile,
        saveNutritionProfileDraft,
        saveNutritionExperienceMode,
        saveNutritionDietDraft,
        retryNutritionLoad: () => loadDomainsForUser(activeUserId),
        saveNutritionPlans,
        saveFavoriteMeals,
        saveCustomFoods,
        saveNutritionDayStatus,

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
