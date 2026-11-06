"use client";

import { useState, useEffect, useRef } from "react";
import { useAthar } from "@/components/context/AtharContext";
import {
  getTrackers,
  reorderTrackers,
  togglePinTracker,
  togglePauseTracker,
  archiveTracker,
  restoreTracker,
  deleteTracker,
} from "@/actions/trackers";
import { getLifeAreas } from "@/actions/life-areas";
import { getDailyEntries } from "@/actions/entries";
import TrackerCard from "@/components/trackers/TrackerCard";
import TrackerModal from "@/components/trackers/TrackerModal";
import LogEntryModal from "@/components/entries/LogEntryModal";
import Link from "next/link";
import {
  Flame,
  Plus,
  Search,
  Filter,
  Layers,
  Archive,
  Pin,
  Play,
  Pause,
  AlertTriangle,
  LogIn,
  Loader2,
  Sparkles,
  Calendar,
} from "lucide-react";

export default function HabitsClient({
  user,
  initialDate,
  initialTrackers = [],
  initialLifeAreas = [],
  initialDailyEntries = [],
}) {
  const { showToast } = useAthar();

  const [trackers, setTrackers] = useState(initialTrackers);
  const [lifeAreas, setLifeAreas] = useState(initialLifeAreas);
  const [dailyEntries, setDailyEntries] = useState(initialDailyEntries);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [isLoading, setIsLoading] = useState(false);

  // Filter States
  const [statusTab, setStatusTab] = useState("active"); // "active" | "pinned" | "paused" | "archived"
  const [selectedAreaId, setSelectedAreaId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTracker, setEditingTracker] = useState(null);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [loggingTracker, setLoggingTracker] = useState(null);

  const isInitialMount = useRef(true);

  // Load Trackers, Life Areas, and Today's Entries when tab or date changes
  const fetchDailyEntries = async (date) => {
    if (!user) return;
    const targetDate = date || selectedDate;
    if (!targetDate) return;
    try {
      const res = await getDailyEntries(targetDate);
      if (res.success) {
        setDailyEntries(res.data || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    let isCancelled = false;

    async function loadData() {
      if (user) {
        setIsLoading(true);
        try {
          const [trackersRes, areasRes, entriesRes] = await Promise.all([
            getTrackers({ isArchived: statusTab === "archived" }),
            getLifeAreas(false),
            getDailyEntries(selectedDate),
          ]);

          if (isCancelled) return;

          if (trackersRes.success) {
            setTrackers(trackersRes.data || []);
          }
          if (areasRes.success) {
            setLifeAreas(areasRes.data || []);
          }
          if (entriesRes.success) {
            setDailyEntries(entriesRes.data || []);
          }
        } catch (err) {
          console.error("Error loading trackers:", err);
        } finally {
          if (!isCancelled) setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [user, statusTab, selectedDate]);

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
    try {
      const res = await togglePinTracker(tracker.id);
      if (res.success) {
        setTrackers((prev) =>
          prev.map((t) => (t.id === tracker.id ? { ...t, ...res.data } : t))
        );
        const isNowPinned = Boolean(res.data.displayPreferences?.isPinned);
        showToast(isNowPinned ? "تم تثبيت المتعقب في الواجهة 📌" : "تم إلغاء تثبيت المتعقب", "info");
      }
    } catch {
      showToast("تعذر تعديل التثبيت", "error");
    }
  };

  const handleTogglePause = async (tracker) => {
    try {
      const res = await togglePauseTracker(tracker.id);
      if (res.success) {
        setTrackers((prev) =>
          prev.map((t) => (t.id === tracker.id ? { ...t, isPaused: res.data.isPaused } : t))
        );
        showToast(
          res.data.isPaused ? "تم إيقاف المتعقب مؤقتاً ⏸️" : "تم استئناف تشغيل المتعقب ▶️",
          "info"
        );
      }
    } catch {
      showToast("تعذر تغيير حالة الإيقاف", "error");
    }
  };

  const handleArchive = async (tracker) => {
    try {
      const res = await archiveTracker(tracker.id);
      if (res.success) {
        setTrackers((prev) => prev.filter((t) => t.id !== tracker.id));
        showToast("تم نقل المتعقب إلى الأرشيف (سجلاتك محفوظة بالكامل) 📁", "info");
      }
    } catch {
      showToast("تعذر أرشفة المتعقب", "error");
    }
  };

  const handleRestore = async (tracker) => {
    try {
      const res = await restoreTracker(tracker.id);
      if (res.success) {
        setTrackers((prev) => prev.filter((t) => t.id !== tracker.id));
        showToast("تمت استعادة المتعقب بنجاح ✨", "success");
      }
    } catch {
      showToast("تعذر استعادة المتعقب", "error");
    }
  };

  const handleDelete = async (tracker) => {
    try {
      const res = await deleteTracker(tracker.id, false);
      if (res.success) {
        setTrackers((prev) => prev.filter((t) => t.id !== tracker.id));
        showToast("تم حذف المتعقب بنجاح", "info");
      } else if (res.code === "HAS_ENTRIES") {
        if (
          confirm(
            `${res.error}\n\nهل أنت متأكد تماماً من رغبتك في حذف المتعقب وجميع سجلاته نهائياً؟`
          )
        ) {
          const forceRes = await deleteTracker(tracker.id, true);
          if (forceRes.success) {
            setTrackers((prev) => prev.filter((t) => t.id !== tracker.id));
            showToast("تم حذف المتعقب وسجلاته نهائياً", "info");
          }
        }
      } else {
        showToast(res.error || "تعذر حذف المتعقب", "error");
      }
    } catch {
      showToast("حدث خطأ أثناء محاولة الحذف", "error");
    }
  };

  const handleMoveOrder = async (index, direction) => {
    const activeList = filteredTrackers;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeList.length) return;

    const previousTrackers = [...trackers];
    const newList = [...activeList];
    const [moved] = newList.splice(index, 1);
    newList.splice(targetIndex, 0, moved);

    const reorderPayload = newList.map((item, idx) => ({
      id: item.id,
      sortOrder: idx,
    }));

    // 1. Optimistic update
    setTrackers((prev) =>
      prev.map((t) => {
        const found = reorderPayload.find((p) => p.id === t.id);
        return found ? { ...t, sortOrder: found.sortOrder } : t;
      })
    );

    try {
      const res = await reorderTrackers({ items: reorderPayload });
      if (!res.success) {
        // Rollback
        setTrackers(previousTrackers);
        showToast(res.error || "تعذر حفظ الترتيب، تم التراجع", "error");
      }
    } catch {
      // Rollback on network error
      setTrackers(previousTrackers);
      showToast("تعذر حفظ الترتيب، تم التراجع", "error");
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/80 text-emerald-400 shadow-inner">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100">
                العادات ومنظومة التتبع
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                {user ? `${filteredTrackers.length} متعقب` : "وضع المعاينة"}
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-1">
              حرية كاملة لتأسيس وتعديل أنظمة القياس الـ 7: إنجاز، عداد، قياس، مدة، نطاق وقت، قائمة تدقيق، وامتناع
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>متعقب جديد</span>
        </button>
      </div>

      {/* Guest Mode Banner */}
      {!user && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            <span className="text-xs font-medium">
              أنت تتصفح في وضع المعاينة المؤقت. سجّل الدخول بحساب Google لتأسيس وحفظ عاداتك ومتعقباتك الـ 7 سحابياً في قاعدة البيانات.
            </span>
          </div>
          <Link
            href="/login?returnTo=/habits"
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-xs font-bold transition-colors shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>تسجيل الدخول</span>
          </Link>
        </div>
      )}

      {/* 2. Controls: Status Tabs, Life Area Pills, Search */}
      <div className="space-y-4">
        {/* Row 1: Status Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center p-1 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setStatusTab("active")}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
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
              className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
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
              className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
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
              className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                statusTab === "archived"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Archive className="w-3 h-3" />
              <span>الأرشيف</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                fetchDailyEntries(e.target.value);
              }}
              className="px-3 py-2 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-violet-500 cursor-pointer"
              title="اختر تاريخ اليوميات"
            />
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في المتعقبات..."
                className="w-full pr-10 pl-4 py-2 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
              />
            </div>
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

      {/* 4. Tracker Builder / Editor Modal */}
      <TrackerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingTracker={editingTracker}
        lifeAreas={lifeAreas}
        onSaved={handleSaved}
        onToast={showToast}
      />

      {/* 5. Detailed Entry Logging Modal */}
      <LogEntryModal
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        tracker={loggingTracker}
        localDate={selectedDate}
        onLogged={() => fetchDailyEntries(selectedDate)}
        onToast={showToast}
      />
    </div>
  );
}

