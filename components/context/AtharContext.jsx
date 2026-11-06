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
  EXPENSES_DATA,
  NUTRITION_DATA,
  INITIAL_JOURNAL_DATABASE,
  GYM_WORKOUTS_DATA,
} from "../data/mockData";
import SessionFinishConfirmModal from "../timer/SessionFinishConfirmModal";
import PrayerDetailModal from "../prayer/PrayerDetailModal";
import PrayerScheduleModal from "../prayer/PrayerScheduleModal";
import SocialMediaModal from "../social/SocialMediaModal";
import SmokingEventModal from "../smoking/SmokingEventModal";
import RunningSessionModal from "../running/RunningSessionModal";
import GymSessionModal from "../gym/GymSessionModal";

const AtharContext = createContext(null);

export function AtharProvider({ children }) {
  // Prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  // Core App State (SSR safe static defaults)
  const [appState, setAppState] = useState(getInitialAppState);
  const [selectedDate, setSelectedDate] = useState("2026-11-05");

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

  const showToast = (message, type = "success") => {
    setToast({ id: Date.now(), message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Secondary domain states (Expenses, Nutrition, Journal, Gym presets)
  const [gymData, setGymData] = useState(GYM_WORKOUTS_DATA);
  const [nutritionData, setNutritionData] = useState(NUTRITION_DATA);
  const [expensesData, setExpensesData] = useState(EXPENSES_DATA);
  const [journalData, setJournalData] = useState(INITIAL_JOURNAL_DATABASE);

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
    const loaded = loadSavedState();
    setAppState(loaded);

    if (typeof window !== "undefined") {
      try {
        const savedExpenses = localStorage.getItem("athar_expenses");
        if (savedExpenses) setExpensesData(JSON.parse(savedExpenses));
        const savedNutrition = localStorage.getItem("athar_nutrition");
        if (savedNutrition) setNutritionData(JSON.parse(savedNutrition));
        const savedJournal = localStorage.getItem("athar_journal");
        if (savedJournal) setJournalData(JSON.parse(savedJournal));
        const savedGym = localStorage.getItem("athar_gym");
        if (savedGym) setGymData(JSON.parse(savedGym));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (isMounted && typeof window !== "undefined") {
      try {
        localStorage.setItem("athar_expenses", JSON.stringify(expensesData));
      } catch {}
    }
  }, [expensesData, isMounted]);

  useEffect(() => {
    if (isMounted && typeof window !== "undefined") {
      try {
        localStorage.setItem("athar_nutrition", JSON.stringify(nutritionData));
      } catch {}
    }
  }, [nutritionData, isMounted]);

  useEffect(() => {
    if (isMounted && typeof window !== "undefined") {
      try {
        localStorage.setItem("athar_journal", JSON.stringify(journalData));
      } catch {}
    }
  }, [journalData, isMounted]);

  useEffect(() => {
    if (isMounted && typeof window !== "undefined") {
      try {
        localStorage.setItem("athar_gym", JSON.stringify(gymData));
      } catch {}
    }
  }, [gymData, isMounted]);

  // Persist to localStorage on change
  useEffect(() => {
    if (isMounted) {
      persistState(appState);
    }
  }, [appState, isMounted]);

  // Wall-clock ticker for active timer
  useEffect(() => {
    let interval = null;
    if (appState.activeTimer && appState.activeTimer.isRunning) {
      interval = setInterval(() => {
        setTimerTick((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [appState.activeTimer?.isRunning]);

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
    const newSession = {
      ...session,
      id: generateId("gym"),
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

  // 10. Secondary domain helpers (Expenses, Nutrition, Gym, Journal)
  const addExpense = (expense) => {
    const newTx = {
      id: Date.now(),
      title: expense.title,
      amount: Number(expense.amount),
      category: expense.category,
      date: "2026-11-05",
      time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
    };

    setExpensesData((prev) => {
      const updatedTxs = [newTx, ...prev.transactions];
      const newTodaySpent = prev.todaySpent + newTx.amount;
      const newMonthlySpent = prev.monthlySpent + newTx.amount;

      const updatedCats = prev.categories.map((c) => {
        if (c.name.includes(expense.category) || expense.category.includes(c.name)) {
          const newSpent = c.spent + newTx.amount;
          return {
            ...c,
            spent: newSpent,
            percent: Math.min(100, Math.round((newSpent / c.budget) * 100)),
          };
        }
        return c;
      });

      return {
        ...prev,
        transactions: updatedTxs,
        todaySpent: newTodaySpent,
        monthlySpent: newMonthlySpent,
        categories: updatedCats,
      };
    });
    showToast(`تم تسجيل مصروف بقيمة ${expense.amount} ر.س 💳`, "success");
  };

  const deleteExpense = (id) => {
    setExpensesData((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
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
    setNutritionData((prev) => {
      const updatedMeals = [
        { ...meal, id: `m_${Date.now()}` },
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

        // Expenses Domain
        expensesData,
        addExpense,
        deleteExpense,

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
