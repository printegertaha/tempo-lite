"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useAthar } from "@/components/context/AtharContext";
import { useLocalSession } from "@/hooks/useLocalSession";
import TrackerCard from "@/components/trackers/TrackerCard";
import TrackerModal from "@/components/trackers/TrackerModal";
import LogEntryModal from "@/components/entries/LogEntryModal";
import RadialHabitWheel from "@/components/trackers/RadialHabitWheel";
import DatePickerField from "@/components/ui/DatePickerField";
import {
  Flame,
  Plus,
  Search,
  Layers,
  Archive,
  Pin,
  Pause,
  Loader2,
  Sparkles,
  Calendar,
  ChevronDown,
  Folder,
  Check,
} from "lucide-react";

import {
  localTrackerRepo,
  localEntryRepo,
  localLifeAreaRepo,
  localOutboxRepo,
} from "@/lib/local-db";
import { syncEngine } from "@/lib/sync/sync-engine";
import { getDefaultTimezone, getLocalDateString } from "@/lib/dates";

const habitsMemoryCache = new Map();

async function submitTrackerMutation(isGuest, effectiveUserId, entityId, action, payload) {
  if (isGuest) return;
  await localOutboxRepo.add({
    mutationId: crypto.randomUUID(),
    userId: effectiveUserId,
    entityType: "tracker",
    entityId,
    action,
    payload,
    clientTimestamp: Date.now(),
    version: 1,
    status: "pending",
    retryCount: 0,
  });
  syncEngine.scheduleSync(5000);
}

export default function HabitsClient({
  user: propUser,
  initialDate,
  timezone,
  initialTrackers,
  initialLifeAreas,
  initialDailyEntries,
}) {
  const { showToast, userPreferences } = useAthar();
  const { user: localUser, userId: sessionUserId, isGuest: sessionIsGuest } =
    useLocalSession();
  const user = propUser || localUser;
  const effectiveUserId = propUser?.id || sessionUserId || "guest";
  const isGuest = propUser ? (!propUser?.id || propUser?.id === "guest") : sessionIsGuest;
  const effectiveTimezone =
    userPreferences?.timezone ||
    (timezone && !isGuest ? timezone : getDefaultTimezone());

  const cached = habitsMemoryCache.get(effectiveUserId);
  const [selectedDate, setSelectedDate] = useState(
    () => initialDate || getLocalDateString(new Date(), effectiveTimezone)
  );
  const [trackers, setTrackers] = useState(
    () => initialTrackers || cached?.trackers || []
  );
  const [lifeAreas, setLifeAreas] = useState(
    () => initialLifeAreas || cached?.lifeAreas || []
  );
  const [dailyEntries, setDailyEntries] = useState(
    () => initialDailyEntries || cached?.entriesByDate?.[selectedDate] || []
  );
  const [isLoading, setIsLoading] = useState(false);

  // Filter States
  const [showControls, setShowControls] = useState(false);
  const [mainView, setMainView] = useState("cards"); // "cards" | "wheel"
  const [statusTab, setStatusTab] = useState("active"); // "active" | "pinned" | "paused" | "archived"
  const [selectedAreaId, setSelectedAreaId] = useState("all");
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);
  const areaDropdownRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!areaDropdownOpen) return;
    const onOutside = (e) => {
      if (areaDropdownRef.current && !areaDropdownRef.current.contains(e.target)) {
        setAreaDropdownOpen(false);
      }
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setAreaDropdownOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [areaDropdownOpen]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTracker, setEditingTracker] = useState(null);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [loggingTracker, setLoggingTracker] = useState(null);

  const trackersRef = useRef(trackers);
  useEffect(() => {
    trackersRef.current = trackers;
  }, [trackers]);

  const queueTrackerMutation = async (entityId, action, payload, version = 1) => {
    if (isGuest) return;
    await localOutboxRepo.add({
      mutationId: crypto.randomUUID(),
      userId: effectiveUserId,
      entityType: "tracker",
      entityId,
      action,
      payload,
      clientTimestamp: new Date().getTime(),
      version,
      status: "pending",
      retryCount: 0,
    });
    syncEngine.scheduleSync(600);
  };

  // Load daily entries immediately from IndexedDB
  const fetchDailyEntries = async (date) => {
    const targetDate = date || selectedDate;
    if (!targetDate) return;
    try {
      const local = await localEntryRepo.getByDate(effectiveUserId, targetDate);
      setDailyEntries(local || []);
      const cur = habitsMemoryCache.get(effectiveUserId) || {};
      habitsMemoryCache.set(effectiveUserId, {
        ...cur,
        entriesByDate: { ...(cur.entriesByDate || {}), [targetDate]: local || [] },
      });
    } catch {}
  };

  useEffect(() => {
    let isCancelled = false;

    async function loadFromIndexedDB() {
      try {
        const [localTrackers, localAreas, localEntries] = await Promise.all([
          localTrackerRepo.getAllForUser(effectiveUserId, true),
          localLifeAreaRepo.getAllForUser(effectiveUserId, false).catch(() => []),
          localEntryRepo.getByDate(effectiveUserId, selectedDate),
        ]);
        if (isCancelled) return;
        setTrackers(localTrackers || []);
        setLifeAreas(localAreas || []);
        setDailyEntries(localEntries || []);
        habitsMemoryCache.set(effectiveUserId, {
          trackers: localTrackers || [],
          lifeAreas: localAreas || [],
          entriesByDate: {
            ...(habitsMemoryCache.get(effectiveUserId)?.entriesByDate || {}),
            [selectedDate]: localEntries || [],
          },
        });
      } catch (err) {
        console.warn("Failed loading local trackers/entries from IndexedDB:", err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    void loadFromIndexedDB();

    const onSynced = (ev) => {
      const types = ev?.detail?.changedTypes || [];
      if (
        types.includes("tracker") ||
        types.includes("tracker_entry") ||
        types.includes("life_area")
      ) {
        void loadFromIndexedDB();
      }
    };
    window.addEventListener("athar_data_synced", onSynced);

    return () => {
      isCancelled = true;
      window.removeEventListener("athar_data_synced", onSynced);
    };
  }, [effectiveUserId, selectedDate]);

  // Actions
  const handleOpenCreate = () => {
    setEditingTracker(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (tracker) => {
    setEditingTracker(tracker);
    setModalOpen(true);
  };

  const handleSaved = (savedTracker) => {
    setTrackers((prev) => {
      const exists = prev.some((t) => t.id === savedTracker.id);
      if (exists) {
        return prev.map((t) => (t.id === savedTracker.id ? { ...t, ...savedTracker } : t));
      }
      return [...prev, savedTracker];
    });
  };

  const handleTogglePin = async (tracker) => {
    const nextPinned = !Boolean(tracker.displayPreferences?.isPinned);
    const updatedPrefs = { ...(tracker.displayPreferences || {}), isPinned: nextPinned };
    const updatedTracker = { ...tracker, displayPreferences: updatedPrefs };

    setTrackers((prev) => prev.map((t) => (t.id === tracker.id ? updatedTracker : t)));
    await localTrackerRepo.save({ ...updatedTracker, userId: effectiveUserId });
    await queueTrackerMutation(
      tracker.id,
      "update",
      { displayPreferences: updatedPrefs },
      tracker.version || 1
    );
    showToast(nextPinned ? "تم تثبيت المتعقب في الواجهة 📌" : "تم إلغاء تثبيت المتعقب", "info");
  };

  const handleTogglePause = async (tracker) => {
    const nextPaused = !tracker.isPaused;
    const updatedTracker = { ...tracker, isPaused: nextPaused };

    setTrackers((prev) => prev.map((t) => (t.id === tracker.id ? updatedTracker : t)));
    await localTrackerRepo.save({ ...updatedTracker, userId: effectiveUserId });
    await queueTrackerMutation(
      tracker.id,
      "update",
      { isPaused: nextPaused },
      tracker.version || 1
    );
    showToast(
      nextPaused ? "تم إيقاف المتعقب مؤقتاً ⏸️" : "تم استئناف تشغيل المتعقب ▶️",
      "info"
    );
  };

  const handleArchive = async (tracker) => {
    setTrackers((prev) =>
      prev.map((t) => (t.id === tracker.id ? { ...t, isArchived: true } : t))
    );
    await localTrackerRepo.save({ ...tracker, userId: effectiveUserId, isArchived: true });
    await queueTrackerMutation(
      tracker.id,
      "update",
      { isArchived: true },
      tracker.version || 1
    );
    showToast("تم نقل المتعقب إلى الأرشيف (سجلاتك محفوظة بالكامل) 📁", "info");
  };

  const handleRestore = async (tracker) => {
    setTrackers((prev) =>
      prev.map((t) => (t.id === tracker.id ? { ...t, isArchived: false } : t))
    );
    await localTrackerRepo.save({ ...tracker, userId: effectiveUserId, isArchived: false });
    await queueTrackerMutation(
      tracker.id,
      "update",
      { isArchived: false },
      tracker.version || 1
    );
    showToast("تمت استعادة المتعقب بنجاح ✨", "success");
  };

  const handleDelete = async (tracker) => {
    if (confirm(`هل أنت متأكد من حذف المتعقب "${tracker.name}" وجميع سجلاته؟`)) {
      setTrackers((prev) => prev.filter((t) => t.id !== tracker.id));
      await localTrackerRepo.delete(tracker.id);
      await localEntryRepo.deleteByTracker(effectiveUserId, tracker.id);
      await queueTrackerMutation(tracker.id, "delete", {}, tracker.version || 1);
      showToast("تم حذف المتعقب بنجاح", "info");
    }
  };

  const handleMoveOrder = async (index, direction) => {
    const activeList = filteredTrackers;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeList.length) return;

    const newList = [...activeList];
    const [moved] = newList.splice(index, 1);
    newList.splice(targetIndex, 0, moved);

    const reorderPayload = newList.map((item, idx) => ({
      id: item.id,
      sortOrder: idx,
    }));

    setTrackers((prev) =>
      prev.map((t) => {
        const found = reorderPayload.find((p) => p.id === t.id);
        return found ? { ...t, sortOrder: found.sortOrder } : t;
      })
    );

    for (const p of reorderPayload) {
      const trk = trackersRef.current.find((t) => t.id === p.id);
      if (trk) {
        await localTrackerRepo.save({ ...trk, userId: effectiveUserId, sortOrder: p.sortOrder });
        await queueTrackerMutation(p.id, "update", { sortOrder: p.sortOrder }, trk.version || 1);
      }
    }
  };

  // Filter Computation
  const stats = useMemo(() => {
    let activeCount = 0;
    let pinnedCount = 0;
    let pausedCount = 0;
    let archivedCount = 0;

    for (const t of trackers) {
      if (t.isArchived) {
        archivedCount += 1;
      } else {
        if (t.isPaused) pausedCount += 1;
        else activeCount += 1;
        if (t.displayPreferences?.isPinned) pinnedCount += 1;
      }
    }

    return { activeCount, pinnedCount, pausedCount, archivedCount };
  }, [trackers]);

  const activeNonArchivedTrackers = useMemo(
    () => trackers.filter((t) => !t.isArchived),
    [trackers]
  );

  const filteredTrackers = trackers.filter((t) => {
    if (statusTab === "archived") {
      if (!t.isArchived) return false;
    } else {
      if (t.isArchived) return false;
      if (statusTab === "pinned" && !t.displayPreferences?.isPinned) return false;
      if (statusTab === "paused" && !t.isPaused) return false;
      if (statusTab === "active" && t.isPaused) return false;
    }

    if (selectedAreaId !== "all") {
      if (selectedAreaId === "none" && t.lifeAreaId !== null) return false;
      if (selectedAreaId !== "none" && t.lifeAreaId !== selectedAreaId) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }

    return true;
  });

  const FILTER_TABS = [
    {
      id: "active",
      label: "النشطة",
      count: stats.activeCount,
      icon: Flame,
      activeColor: "bg-violet-600/20 text-violet-300 border-violet-500/40 shadow-sm",
      badgeColor: "bg-violet-500/25 text-violet-200",
    },
    {
      id: "pinned",
      label: "المثبتة",
      count: stats.pinnedCount,
      icon: Pin,
      activeColor: "bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm",
      badgeColor: "bg-sky-500/25 text-sky-200",
    },
    {
      id: "paused",
      label: "المتوقفة",
      count: stats.pausedCount,
      icon: Pause,
      activeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm",
      badgeColor: "bg-amber-500/25 text-amber-200",
    },
    {
      id: "archived",
      label: "الأرشيف",
      count: stats.archivedCount,
      icon: Archive,
      activeColor: "bg-zinc-800 text-zinc-300 border-zinc-700 shadow-sm",
      badgeColor: "bg-zinc-850 text-zinc-400",
    },
  ];

  const getSummaryForTracker = (tracker) => {
    const entries = dailyEntries.filter((e) => e.trackerId === tracker.id);
    let isCompleted = false;
    let totalNumeric = 0;
    let totalDurationSeconds = 0;
    let checklistCompletedIds = [];
    let avoidanceState = null;

    if (tracker.metricType === "BOOLEAN") {
      const latest = entries[entries.length - 1];
      isCompleted = Boolean(latest?.valueBoolean);
    } else if (tracker.metricType === "COUNTER" || tracker.metricType === "NUMBER") {
      totalNumeric = entries.reduce((acc, e) => acc + (e.valueNumeric || 0), 0);
      if (tracker.targetValue) {
        isCompleted = totalNumeric >= tracker.targetValue;
      }
    } else if (tracker.metricType === "DURATION" || tracker.metricType === "TIME_RANGE") {
      totalDurationSeconds = entries.reduce((acc, e) => acc + (e.valueDuration || 0), 0);
      if (tracker.targetValue) {
        isCompleted = totalDurationSeconds >= tracker.targetValue * 60;
      }
    } else if (tracker.metricType === "CHECKLIST") {
      const latest = entries[entries.length - 1];
      const payload = latest?.entryPayload || {};
      checklistCompletedIds = payload.completedItemIds || [];
      const totalItems = tracker.trackerConfig?.items?.length || 1;
      isCompleted = checklistCompletedIds.length >= totalItems;
    } else if (tracker.metricType === "AVOIDANCE") {
      const latest = entries[entries.length - 1];
      if (latest) {
        const isClean = Boolean(latest.valueBoolean);
        isCompleted = isClean;
        avoidanceState = {
          isClean,
          urgeRating: latest.entryPayload?.urgeRating,
        };
      }
    }

    return {
      entries,
      isCompleted,
      totalNumeric,
      totalDurationSeconds,
      checklistCompletedIds,
      avoidanceState,
    };
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-5 select-none">
      {/* Page Header: Clickable "إدارة العادات" toggle + "+" Quick Add button */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <button
          type="button"
          onClick={() => setShowControls((prev) => !prev)}
          aria-expanded={showControls}
          className="group flex items-center gap-2 text-right cursor-pointer focus:outline-none"
        >
          <h1 className="text-xl sm:text-3xl font-extrabold text-zinc-100 group-hover:text-violet-300 transition-colors tracking-tight">
            إدارة العادات
          </h1>
          <ChevronDown
            className={`w-5 h-5 text-zinc-400 group-hover:text-violet-300 transition-transform duration-200 ${
              showControls ? "rotate-180" : ""
            }`}
          />
        </button>

        <button
          type="button"
          onClick={handleOpenCreate}
          aria-label="إضافة متعقب جديد"
          title="إضافة متعقب جديد"
          className="p-2.5 rounded-xl bg-gray-950 hover:bg-gray-900 text-white shadow-lg shadow-violet-600/30 transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {showControls && (
        <div className="space-y-4">
          {/* 1. Sleek Compact Top Bar: New Tracker on far right, Date & View Toggle on far left */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl backdrop-blur-xl">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>متعقب جديد</span>
            </button>

            <div className="flex items-center gap-2">
              <DatePickerField
                value={selectedDate}
                onChange={(d) => {
                  setSelectedDate(d);
                  fetchDailyEntries(d);
                }}
                title="اختر تاريخ اليوميات"
                className="px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 text-xs text-zinc-200 min-w-[125px]"
              />

              <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMainView("cards")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mainView === "cards"
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  البطاقات
                </button>
                <button
                  type="button"
                  onClick={() => setMainView("wheel")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    mainView === "wheel"
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>العجلة</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Unified Compact Interactive Filter Bar */}
          {mainView === "cards" && (
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Outer padded container -> Inner scrollable tabs div */}
              <div className="p-1.5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80">
                <div
                  role="tablist"
                  aria-label="تصفية العادات"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(161,161,170,0.22) transparent" }}
                  className="flex sm:grid sm:grid-cols-4 gap-1.5 pb-1 sm:pb-0 overflow-x-auto sm:overflow-visible snap-x snap-proximity [&::-webkit-scrollbar]:h-[2px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-600/40"
                >
                  {FILTER_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = statusTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={(e) => {
                          setStatusTab(tab.id);
                          e.currentTarget.scrollIntoView({
                            block: "nearest",
                            inline: "nearest",
                            behavior: "smooth",
                          });
                        }}
                        className={`shrink-0 sm:shrink snap-start flex items-center justify-center gap-1.5 px-3 sm:px-2.5 py-2 rounded-xl border transition-all text-xs font-semibold cursor-pointer whitespace-nowrap ${
                          isActive
                            ? tab.activeColor
                            : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                        }`}
                      >
                        <Icon
                          className={`w-3.5 h-3.5 ${
                            isActive ? "" : "text-zinc-500"
                          }`}
                        />
                        <span className="truncate">{tab.label}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold ${
                            isActive ? tab.badgeColor : "text-zinc-500 bg-zinc-900"
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter by Life Area (Custom Dropdown) & Instant Search */}
              <div className="flex items-center gap-2">
                {lifeAreas.length > 0 && (
                  <div className="relative shrink-0" ref={areaDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setAreaDropdownOpen((v) => !v)}
                      aria-expanded={areaDropdownOpen}
                      aria-haspopup="listbox"
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        selectedAreaId !== "all"
                          ? "bg-violet-600/15 border-violet-500/40 text-violet-200"
                          : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      <Folder className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      <span className="max-w-[110px] truncate">
                        {selectedAreaId === "none"
                          ? "بدون مجال"
                          : lifeAreas.find((a) => a.id === selectedAreaId)?.name ||
                            "جميع المجالات"}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${
                          areaDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {areaDropdownOpen && (
                      <div
                        role="listbox"
                        className="absolute right-0 sm:left-0 sm:right-auto top-full mt-1.5 min-w-[180px] max-h-60 overflow-y-auto p-1.5 rounded-2xl bg-[#0c0e17]/98 border border-zinc-800 shadow-2xl backdrop-blur-2xl z-40 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150"
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={selectedAreaId === "all"}
                          onClick={() => {
                            setSelectedAreaId("all");
                            setAreaDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            selectedAreaId === "all"
                              ? "bg-violet-600/20 text-violet-200"
                              : "text-zinc-300 hover:bg-zinc-800/70"
                          }`}
                        >
                          <span>جميع المجالات</span>
                          {selectedAreaId === "all" && (
                            <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                          )}
                        </button>
                        {lifeAreas.map((a) => {
                          const isSelected = selectedAreaId === a.id;
                          return (
                            <button
                              key={a.id}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => {
                                setSelectedAreaId(a.id);
                                setAreaDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-violet-600/20 text-violet-200"
                                  : "text-zinc-300 hover:bg-zinc-800/70"
                              }`}
                            >
                              <span className="truncate">{a.name}</span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          role="option"
                          aria-selected={selectedAreaId === "none"}
                          onClick={() => {
                            setSelectedAreaId("none");
                            setAreaDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            selectedAreaId === "none"
                              ? "bg-violet-600/20 text-violet-200"
                              : "text-zinc-300 hover:bg-zinc-800/70"
                          }`}
                        >
                          <span>بدون مجال</span>
                          {selectedAreaId === "none" && (
                            <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="relative flex-1 md:w-48">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في العادات..."
                    className="w-full pr-8 pl-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main View Conditional Rendering */}
      {mainView === "wheel" ? (
        <RadialHabitWheel existingTrackers={activeNonArchivedTrackers} />
      ) : (
        <>
          {/* 3. Trackers List / Clean Empty State */}
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
              <p className="text-xs text-zinc-500">جارٍ تحميل منظومة العادات والمتعقبات...</p>
            </div>
          ) : filteredTrackers.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-3xl bg-zinc-950/60 border border-zinc-800/80 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center mx-auto text-violet-400">
                <Flame className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-zinc-100">
                  {statusTab === "archived"
                    ? "الأرشيف فارغ"
                    : statusTab === "paused"
                    ? "لا توجد عادات متوقفة مؤقتاً"
                    : statusTab === "pinned"
                    ? "لم تقم بتثبيت أي عادة بعد"
                    : "لم تقم بإنشاء أي عادة بعد"}
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  أضف عاداتك ومتعقباتك اليومية لبناء روتين مستدام ومتابعة تقدمك بوضوح.
                </p>
              </div>
            </div>
          ) : (
        <div className="space-y-3">
          {filteredTrackers.map((tracker, index) => (
            <TrackerCard
              key={tracker.id}
              userId={effectiveUserId}
              tracker={tracker}
              index={index}
              totalCount={filteredTrackers.length}
              localDate={selectedDate}
              dailySummary={getSummaryForTracker(tracker)}
              onLogged={() => fetchDailyEntries(selectedDate)}
              onToast={showToast}
              onOpenDetailedModal={(trk) => {
                setLoggingTracker(trk);
                setLogModalOpen(true);
              }}
              onMoveUp={
                statusTab === "active" && index > 0
                  ? () => handleMoveOrder(index, "up")
                  : undefined
              }
              onMoveDown={
                statusTab === "active" && index < filteredTrackers.length - 1
                  ? () => handleMoveOrder(index, "down")
                  : undefined
              }
              onTogglePin={() => handleTogglePin(tracker)}
              onTogglePause={() => handleTogglePause(tracker)}
              onEdit={() => handleOpenEdit(tracker)}
              onArchive={() => handleArchive(tracker)}
              onRestore={() => handleRestore(tracker)}
              onDelete={() => handleDelete(tracker)}
            />
          ))}
        </div>
      )}
    </>
  )}

      {/* 4. Tracker Builder / Editor Modal */}
      <TrackerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        userId={effectiveUserId}
        editingTracker={editingTracker}
        lifeAreas={lifeAreas}
        onSaved={handleSaved}
        onToast={showToast}
      />

      {/* 5. Detailed Entry Logging Modal */}
      <LogEntryModal
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        userId={effectiveUserId}
        timezone={effectiveTimezone}
        tracker={loggingTracker}
        localDate={selectedDate}
        onLogged={() => fetchDailyEntries(selectedDate)}
        onToast={showToast}
      />
    </div>
  );
}

