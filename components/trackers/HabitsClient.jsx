"use client";

import { useState, useEffect, useRef } from "react";
import { useAthar } from "@/components/context/AtharContext";
import { useLocalSession } from "@/hooks/useLocalSession";
import TrackerCard from "@/components/trackers/TrackerCard";
import TrackerModal from "@/components/trackers/TrackerModal";
import LogEntryModal from "@/components/entries/LogEntryModal";
import RadialHabitWheel from "@/components/trackers/RadialHabitWheel";
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
  const [mainView, setMainView] = useState("cards"); // "cards" | "wheel"
  const [statusTab, setStatusTab] = useState("active"); // "active" | "pinned" | "paused" | "archived"
  const [selectedAreaId, setSelectedAreaId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

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
        const filteredByArchive = localTrackers.filter((t) =>
          statusTab === "archived" ? Boolean(t.isArchived) : !t.isArchived
        );
        setTrackers(filteredByArchive);
        setLifeAreas(localAreas || []);
        setDailyEntries(localEntries || []);
        habitsMemoryCache.set(effectiveUserId, {
          trackers: filteredByArchive,
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
  }, [effectiveUserId, statusTab, selectedDate]);

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
    setTrackers((prev) => prev.filter((t) => t.id !== tracker.id));
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
    setTrackers((prev) => prev.filter((t) => t.id !== tracker.id));
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
  const filteredTrackers = trackers.filter((t) => {
    if (statusTab === "pinned" && !t.displayPreferences?.isPinned) return false;
    if (statusTab === "paused" && !t.isPaused) return false;
    if (statusTab === "active" && t.isPaused) return false;

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-8">
      {/* 1. Compact Sleek Header (Single-row on mobile) */}
      <div className="flex items-center justify-between gap-3 p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-zinc-800/80 border border-zinc-700/80 text-emerald-400 shrink-0 shadow-inner">
            <Flame className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-2xl font-black text-zinc-100 truncate">
                العادات ومنظومة التتبع
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shrink-0">
                {user ? `${filteredTrackers.length}` : "معاينة"}
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-0.5 hidden sm:block">
              حرية كاملة لتأسيس وتعديل أنظمة القياس الـ 7: إنجاز، عداد، قياس، مدة، نطاق وقت، قائمة تدقيق، وامتناع
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Main View Toggle */}
          <div className="hidden sm:flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setMainView("cards")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
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
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                mainView === "wheel"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>العجلة</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>متعقب جديد</span>
          </button>
        </div>
      </div>



      {/* Main View Conditional Rendering */}
      {mainView === "wheel" ? (
        <RadialHabitWheel existingTrackers={trackers} />
      ) : (
        <>
          {/* 2. Controls: Status Tabs, Date & Search cleanly stacked for mobile */}
          <div className="space-y-3">
            {/* Row 1: Status Tabs (Full width grid on mobile, inline on desktop) */}
            <div className="grid grid-cols-4 sm:flex items-center gap-1 p-1 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs w-full sm:w-fit">
              <button
                type="button"
                onClick={() => setStatusTab("active")}
                className={`py-1.5 px-2.5 sm:px-3.5 rounded-xl font-bold transition-all text-center whitespace-nowrap ${
                  statusTab === "active"
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                النشطة
              </button>
              <button
                type="button"
                onClick={() => setStatusTab("pinned")}
                className={`flex items-center justify-center gap-1 py-1.5 px-2.5 sm:px-3.5 rounded-xl font-bold transition-all text-center whitespace-nowrap ${
                  statusTab === "pinned"
                    ? "bg-zinc-800 text-violet-300 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Pin className="w-3 h-3" />
                <span>المثبتة</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusTab("paused")}
                className={`flex items-center justify-center gap-1 py-1.5 px-2.5 sm:px-3.5 rounded-xl font-bold transition-all text-center whitespace-nowrap ${
                  statusTab === "paused"
                    ? "bg-zinc-800 text-amber-300 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Pause className="w-3 h-3" />
                <span>المتوقفة</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusTab("archived")}
                className={`flex items-center justify-center gap-1 py-1.5 px-2.5 sm:px-3.5 rounded-xl font-bold transition-all text-center whitespace-nowrap ${
                  statusTab === "archived"
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Archive className="w-3 h-3" />
                <span>الأرشيف</span>
              </button>
            </div>

            {/* Row 2: Date Picker & Search Input cleanly stacked or flexed */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400 absolute right-3 pointer-events-none" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      fetchDailyEntries(e.target.value);
                    }}
                    className="pr-8 pl-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-violet-500 cursor-pointer w-full sm:w-auto"
                    title="اختر تاريخ اليوميات"
                  />
                </div>

                {/* Mobile View Toggle */}
                <button
                  type="button"
                  onClick={() => setMainView(mainView === "cards" ? "wheel" : "cards")}
                  className="sm:hidden flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-bold text-zinc-300"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{mainView === "cards" ? "العجلة" : "البطاقات"}</span>
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث في المتعقبات..."
                  className="w-full pr-8 pl-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

        {/* Row 2: Life Areas Filter Pills */}
        {lifeAreas.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-zinc-400 flex items-center gap-1 shrink-0 ml-1">
              <Layers className="w-3.5 h-3.5" />
              <span>المجال:</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedAreaId("all")}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap border transition-all ${
                selectedAreaId === "all"
                  ? "bg-violet-600/20 text-violet-300 border-violet-500/40"
                  : "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              الكل
            </button>
            {lifeAreas.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => setSelectedAreaId(area.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap border transition-all ${
                  selectedAreaId === area.id
                    ? "bg-violet-600/20 text-violet-300 border-violet-500/40"
                    : "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                }`}
              >
                {area.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedAreaId("none")}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap border transition-all ${
                selectedAreaId === "none"
                  ? "bg-violet-600/20 text-violet-300 border-violet-500/40"
                  : "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              بدون مجال
            </button>
          </div>
        )}
      </div>

      {/* 3. Trackers List / Clean Empty State */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
          <p className="text-xs text-zinc-400">جارٍ تحميل منظومة العادات والمتعقبات...</p>
        </div>
      ) : filteredTrackers.length === 0 ? (
        <div className="py-16 px-6 rounded-3xl bg-[#0c0e17]/80 border border-dashed border-zinc-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-zinc-900/80 border border-zinc-750 text-zinc-400 flex items-center justify-center mx-auto shadow-inner">
            <Flame className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-zinc-100">
              {statusTab === "archived"
                ? "الأرشيف فارغ"
                : statusTab === "paused"
                ? "لا توجد متعقبات متوقفة مؤقتاً"
                : statusTab === "pinned"
                ? "لم تقم بتثبيت أي متعقب بعد"
                : "لم تقم بإنشاء أي متعقب بعد"}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {statusTab === "active"
                ? "تبدأ منظومة أثـر فارغة تماماً لتمكينك من صياغة تتبعك الخاص وفق أسلوب حياتك الحقيقي (صلوات، برمجة، قراءة، شرب ماء، نوم، أو امتناع عن عادة سيئة)."
                : "يمكنك إدارة حالات المتعقبات بحرية في أي وقت مع الحفاظ التام على السجلات التاريخية."}
            </p>
          </div>
          {statusTab === "active" && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>أنشئ أول متعقب لك الآن ✨</span>
            </button>
          )}
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

