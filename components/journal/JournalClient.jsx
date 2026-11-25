"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocalSession } from "@/hooks/useLocalSession";
import { useAthar } from "@/components/context/AtharContext";
import {
  addDaysToDateString,
  getLocalDateString,
  getDefaultTimezone,
  splitUtcToLocalDateTime,
} from "@/lib/dates";
import {
  localTaskRepo,
  localNoteRepo,
  localTrackerRepo,
  localEntryRepo,
  localPrayerRepo,
  localOutboxRepo,
} from "@/lib/local-db";
import {
  deleteTrackerEntryLocalFirst,
  toggleTaskCompletionLocalFirst,
} from "@/lib/local-db/habit-ops";
import { syncEngine } from "@/lib/sync/sync-engine";

import Link from "next/link";
import {
  BookMarked,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  CheckSquare,
  Circle,
  Flame,
  Timer,
  Hash,
  Smile,
  Meh,
  Frown,
  BatteryCharging,
  Save,
  Trash2,
  Loader2,
  LogIn,
} from "lucide-react";

const MOODS = [
  { id: "great", label: "ممتاز", icon: Sparkles, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  { id: "good", label: "جيد", icon: Smile, color: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
  { id: "neutral", label: "عادي", icon: Meh, color: "text-zinc-400 bg-zinc-800 border-zinc-700" },
  { id: "tired", label: "متعب", icon: BatteryCharging, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { id: "stressed", label: "مضغوط", icon: Frown, color: "text-red-400 bg-red-500/10 border-red-500/30" },
];

const journalMemoryCache = new Map();

export default function JournalClient({
  user: propUser,
  initialDate,
  timezone,
  initialData,
}) {
  const { userPreferences } = useAthar();
  const { user: localUser, userId: sessionUserId, isGuest: sessionIsGuest } =
    useLocalSession();
  const user = propUser || localUser;
  const effectiveUserId = propUser?.id || sessionUserId || "guest";
  const isGuest = propUser ? (!propUser?.id || propUser?.id === "guest") : sessionIsGuest;
  const effectiveTimezone =
    userPreferences?.timezone ||
    (timezone && !isGuest ? timezone : getDefaultTimezone());

  const [selectedDate, setSelectedDate] = useState(
    () => initialDate || getLocalDateString(new Date(), effectiveTimezone)
  );
  const [data, setData] = useState(
    () => initialData || journalMemoryCache.get(`${effectiveUserId}:${selectedDate}`) || null
  );
  const [isLoading, setIsLoading] = useState(false);

  // Daily note form state
  const [noteTitle, setNoteTitle] = useState(
    () => data?.dailyNote?.title || ""
  );
  const [noteContent, setNoteContent] = useState(
    () => data?.dailyNote?.content || ""
  );
  const [noteMood, setNoteMood] = useState(
    () => data?.dailyNote?.mood || "good"
  );
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const buildLocalDayOverview = useCallback(
    async (dateToLoad) => {
      const [matchingNote, userTasks, allTrackers, dayEntries, dayPrayers] =
        await Promise.all([
          localNoteRepo.getByDate(effectiveUserId, dateToLoad).catch(() => null),
          localTaskRepo.getAllForUser(effectiveUserId, false).catch(() => []),
          localTrackerRepo.getAllForUser(effectiveUserId, false).catch(() => []),
          localEntryRepo.getByDate(effectiveUserId, dateToLoad).catch(() => []),
          localPrayerRepo.getByDate(effectiveUserId, dateToLoad).catch(() => []),
        ]);

      const activeTrackers = allTrackers.filter((t) => !t.isPaused);
      const trackerMap = new Map(activeTrackers.map((t) => [t.id, t]));

      const enrichedEntries = dayEntries.map((e) => ({
        ...e,
        tracker: e.tracker || trackerMap.get(e.trackerId) || { name: "عادة" },
      }));

      const sessions = enrichedEntries
        .filter((e) => e.valueDuration && e.valueDuration > 0)
        .map((e) => ({
          id: e.id,
          trackerName: e.tracker?.name || "جلسة تركيز",
          trackerIcon: e.tracker?.icon || "Timer",
          durationSeconds: e.valueDuration || 0,
          subject: e.entryPayload?.subject || null,
          notes: e.notes,
          occurredAt: e.occurredAt,
        }));

      const totalDurationSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);

      const tasksDue = userTasks.filter(
        (t) => t.dueDate === dateToLoad && t.status !== "COMPLETED"
      );
      const tasksCompleted = userTasks.filter((t) => {
        if (t.status !== "COMPLETED") return false;
        const completedLocal = t.completedAt
          ? splitUtcToLocalDateTime(t.completedAt, effectiveTimezone).localDate
          : "";
        return t.dueDate === dateToLoad || completedLocal === dateToLoad;
      });

      const trackersWithProgress = activeTrackers.map((t) => {
        const tEntries = enrichedEntries.filter((e) => e.trackerId === t.id);
        let isCompleted = false;
        if (t.metricType === "BOOLEAN") {
          isCompleted = Boolean(tEntries[tEntries.length - 1]?.valueBoolean);
        } else if (t.metricType === "COUNTER" || t.metricType === "NUMBER") {
          const sum = tEntries.reduce((s, e) => s + (e.valueNumeric || 0), 0);
          isCompleted = t.targetValue ? sum >= t.targetValue : sum > 0;
        } else if (t.metricType === "DURATION" || t.metricType === "TIME_RANGE") {
          const secs = tEntries.reduce((s, e) => s + (e.valueDuration || 0), 0);
          isCompleted = t.targetValue ? secs >= t.targetValue * 60 : secs > 0;
        } else if (t.metricType === "CHECKLIST") {
          const latest = tEntries[tEntries.length - 1];
          const ids = latest?.entryPayload?.completedItemIds || [];
          const totalItems = t.trackerConfig?.items?.length || 1;
          isCompleted = ids.length >= totalItems;
        } else if (t.metricType === "AVOIDANCE") {
          const latest = tEntries[tEntries.length - 1];
          isCompleted = Boolean(latest?.valueBoolean ?? true);
        }
        return { ...t, isCompleted, entries: tEntries };
      });

      return {
        date: dateToLoad,
        trackers: trackersWithProgress,
        entries: enrichedEntries,
        sessions,
        totalDurationSeconds,
        tasks: {
          due: tasksDue,
          completed: tasksCompleted,
        },
        dailyNote: matchingNote || null,
        prayers: dayPrayers,
        summary: {
          totalTrackers: activeTrackers.length,
          completedTrackers: trackersWithProgress.filter((t) => t.isCompleted).length,
          completedTasksCount: tasksCompleted.length,
          completedPrayersCount: dayPrayers.filter((p) => p.isCompleted).length,
          totalDurationMinutes: Math.round(totalDurationSeconds / 60),
          hasNote: Boolean(matchingNote?.content),
        },
      };
    },
    [effectiveUserId, effectiveTimezone]
  );

  // Load day overview immediately from IndexedDB (Local-First for ALL accounts)
  const loadDayData = useCallback(
    async (targetDate) => {
      const dateToLoad = targetDate || selectedDate;
      if (!dateToLoad) return;

      const cacheKey = `${effectiveUserId}:${dateToLoad}`;
      const cached = journalMemoryCache.get(cacheKey);
      if (cached) {
        setData(cached);
      }

      try {
        const overview = await buildLocalDayOverview(dateToLoad);
        journalMemoryCache.set(cacheKey, overview);
        setData(overview);
        if (overview.dailyNote) {
          setNoteTitle(overview.dailyNote.title || "");
          setNoteContent(overview.dailyNote.content || "");
          setNoteMood(overview.dailyNote.mood || "good");
        } else {
          setNoteTitle("");
          setNoteContent("");
          setNoteMood("good");
        }
      } catch (err) {
        console.error("Error loading local day data from IndexedDB:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [effectiveUserId, selectedDate, buildLocalDayOverview]
  );

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void loadDayData(selectedDate);
    });
    const refresh = () => void loadDayData(selectedDate);
    window.addEventListener("athar_data_synced", refresh);
    window.addEventListener("athar_tasks_updated", refresh);
    return () => {
      active = false;
      window.removeEventListener("athar_data_synced", refresh);
      window.removeEventListener("athar_tasks_updated", refresh);
    };
  }, [selectedDate, loadDayData]);

  // Date Navigation Handlers
  const handlePrevDay = () => {
    if (!selectedDate) return;
    const prev = addDaysToDateString(selectedDate, -1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    if (!selectedDate) return;
    const next = addDaysToDateString(selectedDate, 1);
    setSelectedDate(next);
  };

  const handleGoToday = () => {
    const today = getLocalDateString(new Date(), effectiveTimezone);
    setSelectedDate(today);
  };

  // Note Actions (Strict Local-First + Outbox)
  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) {
      showToast("يرجى كتابة نص اليومية أولاً");
      return;
    }

    setIsSavingNote(true);
    const noteId = data?.dailyNote?.id || `${effectiveUserId}_note_${selectedDate}`;
    const noteObj = {
      id: noteId,
      userId: effectiveUserId,
      localDate: selectedDate,
      title: noteTitle.trim() || undefined,
      content: noteContent.trim(),
      mood: noteMood,
      updatedAt: new Date().toISOString(),
    };

    try {
      await localNoteRepo.save(noteObj);
      setData((prev) => ({ ...(prev || {}), dailyNote: noteObj }));
      journalMemoryCache.set(`${effectiveUserId}:${selectedDate}`, {
        ...(data || {}),
        dailyNote: noteObj,
      });

      if (isGuest) {
        showToast("تم حفظ اليومية محلياً بنجاح ✍️");
        return;
      }

      await localOutboxRepo.add({
        mutationId: crypto.randomUUID(),
        userId: effectiveUserId,
        entityType: "daily_note",
        entityId: noteId,
        action: "update",
        payload: {
          localDate: selectedDate,
          title: noteTitle.trim() || null,
          content: noteContent.trim(),
          mood: noteMood,
        },
        clientTimestamp: Date.now(),
        baseUpdatedAt: data?.dailyNote?.updatedAt,
        version: 1,
        status: "pending",
        retryCount: 0,
      });
      syncEngine.scheduleSync(600);
      showToast("تم حفظ اليومية محلياً وستتم مزامنتها تلقائياً ✍️");
    } catch {
      showToast("حدث خطأ أثناء حفظ اليومية");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!confirm("هل أنت متأكد من حذف هذه اليومية؟")) return;
    setIsSavingNote(true);
    const noteId = data?.dailyNote?.id || `${effectiveUserId}_note_${selectedDate}`;
    try {
      await localNoteRepo.delete(noteId).catch(() => {});
      await localNoteRepo.delete(`${effectiveUserId}_note_${selectedDate}`).catch(() => {});
      await localNoteRepo.delete(`guest_note_${selectedDate}`).catch(() => {});

      setNoteTitle("");
      setNoteContent("");
      setData((prev) => ({ ...(prev || {}), dailyNote: null }));

      if (isGuest) {
        showToast("تم حذف اليومية محلياً");
        return;
      }

      await localOutboxRepo.add({
        mutationId: crypto.randomUUID(),
        userId: effectiveUserId,
        entityType: "daily_note",
        entityId: noteId,
        action: "delete",
        payload: { localDate: selectedDate },
        clientTimestamp: Date.now(),
        version: 1,
        status: "pending",
        retryCount: 0,
      });
      syncEngine.scheduleSync(600);
      showToast("تم حذف اليومية محلياً وستتم مزامنة الحذف");
    } finally {
      setIsSavingNote(false);
    }
  };

  // Task Toggle (Local-first + Cross-page sync via BroadcastChannel)
  const handleToggleTask = async (taskId) => {
    const allDisplayed = [...(data?.tasks?.due || []), ...(data?.tasks?.completed || [])];
    const target = allDisplayed.find((t) => t.id === taskId);
    await toggleTaskCompletionLocalFirst(effectiveUserId, taskId, target);
    loadDayData(selectedDate);
  };

  // Entry Delete (Local-first)
  const handleDeleteEntry = async (entryId) => {
    if (!confirm("هل أنت متأكد من حذف هذا السجل؟")) return;
    await deleteTrackerEntryLocalFirst(effectiveUserId, entryId);
    loadDayData(selectedDate);
  };

  const todayStr = getLocalDateString(new Date(), effectiveTimezone);
  const isToday = selectedDate === todayStr;

  // Format date header
  let formattedDateHeader = selectedDate;
  if (selectedDate) {
    try {
      const [y, m, d] = selectedDate.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      formattedDateHeader = new Intl.DateTimeFormat("ar-EG", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(dt);
    } catch {}
  }

  const trackers = data?.trackers || [];
  const sessions = data?.sessions || [];
  const tasksDue = data?.tasks?.due || [];
  const tasksCompleted = data?.tasks?.completed || [];
  const entries = data?.entries || [];
  const summary = data?.summary || {
    totalTrackers: 0,
    completedTrackers: 0,
    completedTasksCount: 0,
    totalDurationMinutes: 0,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Guest Mode Informational Banner */}
      {!user && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-violet-500/10 border border-violet-500/25 text-violet-300">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse shrink-0" />
            <span className="text-xs font-medium">
              <b>وضع الضيف المحلي (Offline-First):</b> تدويناتك وملاحظاتك اليومية محفوظة محلياً على هذا الجهاز في متصفحك، ويمكنك إنشاء حساب في أي وقت لمزامنتها سحابياً.
            </span>
          </div>
          <Link
            href="/login?returnTo=/journal"
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all shrink-0 active:scale-95"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>تسجيل الدخول / حساب جديد</span>
          </Link>
        </div>
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-zinc-900 border border-violet-500/40 text-zinc-100 text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar: Date Navigator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-violet-400 flex items-center gap-1">
              <BookMarked className="w-3.5 h-3.5" />
              <span>النظرة اليومية والتاريخية</span>
            </span>
            {isToday ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                اليوم
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-mono">
                سجل تاريخي
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-100 tracking-tight">
              {formattedDateHeader}
            </h1>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-7 h-7 opacity-70 hover:opacity-100 bg-transparent text-transparent border-0 cursor-pointer focus:outline-none"
              title="اختيار تاريخ مخصص"
            />
          </div>
        </div>

        {/* Date Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevDay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
            <span>اليوم السابق</span>
          </button>

          {!isToday && (
            <button
              type="button"
              onClick={handleGoToday}
              className="px-3 py-1.5 rounded-xl bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 text-xs font-bold text-violet-300 transition-colors cursor-pointer"
            >
              العودة لليوم
            </button>
          )}

          <button
            type="button"
            onClick={handleNextDay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition-colors cursor-pointer"
          >
            <span>اليوم التالي</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
          <p className="text-xs text-zinc-500">جاري تحميل سجلات هذا اليوم...</p>
        </div>
      ) : (
        <>
          {/* Summary KPI Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-[11px] text-zinc-500 block mb-1">العادات المكتملة</span>
              <div className="text-xl font-bold font-mono text-zinc-100">
                {summary.completedTrackers} <span className="text-xs text-zinc-500">/ {summary.totalTrackers}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-[11px] text-zinc-500 block mb-1">جلسات التركيز</span>
              <div className="text-xl font-bold font-mono text-violet-400">
                {summary.totalDurationMinutes} <span className="text-xs text-zinc-500">دقيقة</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-[11px] text-zinc-500 block mb-1">مهام اليوم المنجزة</span>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {summary.completedTasksCount}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-[11px] text-zinc-500 block mb-1">إجمالي التدوينات</span>
              <div className="text-xl font-bold font-mono text-zinc-100">
                {entries.length} <span className="text-xs text-zinc-500">سجل</span>
              </div>
            </div>
          </div>

          {/* Section 1: Daily Reflection / Journal Note */}
          <div className="rounded-3xl bg-zinc-950/70 border border-zinc-800/80 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                  <BookMarked className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">يومية وتأملات اليوم</h3>
                  <p className="text-[11px] text-zinc-500">
                    سجل أفكارك ومشاعرك وملاحظاتك الشخصية المرتبطة بهذا التاريخ
                  </p>
                </div>
              </div>

              {/* Mood Selector */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {MOODS.map((m) => {
                  const Icon = m.icon;
                  const isSelected = noteMood === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setNoteMood(m.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs border transition-all ${
                        isSelected ? m.color : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                      }`}
                      title={m.label}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline text-[11px]">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-3">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="عنوان اليومية (مثال: يوم عمل مثمر في البرمجة، تحديات الامتحانات)..."
                className="w-full px-4 py-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
              />

              <textarea
                rows={4}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="اكتب خلاصة يومك، مشاعرك، ما أنجزته، أو الدروس المستفادة..."
                className="w-full px-4 py-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-zinc-500">
                  يتم حفظ اليومية وربطها برقم التاريخ التقويمي {selectedDate}
                </span>

                <div className="flex items-center gap-2">
                  {data?.dailyNote && (
                    <button
                      type="button"
                      onClick={handleDeleteNote}
                      className="px-3 py-1.5 rounded-xl text-xs text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors"
                    >
                      حذف اليومية
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingNote || !noteContent.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/20 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {isSavingNote ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>حفظ اليومية</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Section 2: Study & Focus Sessions Breakdown */}
          {sessions.length > 0 && (
            <div className="rounded-3xl bg-zinc-950/70 border border-zinc-800/80 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Timer className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100">جلسات التركيز والدراسة لهذا اليوم</h3>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-400">
                  إجمالي: {Math.round(data?.totalDurationSeconds ? data.totalDurationSeconds / 60 : 0)} دقيقة
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/70 flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">{s.trackerName}</h4>
                      {s.subject && (
                        <span className="text-[11px] text-zinc-400 block mt-0.5">{s.subject}</span>
                      )}
                      {s.notes && (
                        <p className="text-[10px] text-zinc-500 mt-1">{s.notes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-indigo-300">
                        {Math.round(s.durationSeconds / 60)} دقيقة
                      </span>
                      <span className="text-[10px] text-zinc-500 block">
                        {new Date(s.occurredAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Trackers Status for this Day */}
          <div className="rounded-3xl bg-zinc-950/70 border border-zinc-800/80 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Flame className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-100">العادات المقررة لهذا اليوم</h3>
              </div>
              <span className="text-xs text-zinc-500 font-mono">
                {trackers.length} عادات
              </span>
            </div>

            {trackers.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                لا توجد عادات مسجلة. يمكنك إنشاء عادات جديدة من صفحة العادات.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {trackers.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      t.isCompleted
                        ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-300"
                        : "bg-zinc-900/30 border-zinc-800/70 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-zinc-100">{t.name}</span>
                      {t.isCompleted ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                          مكتملة ✓
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500">
                          {t.entriesCount > 0 ? "سجلات جزئية" : "لم تدون بعد"}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-zinc-400 font-mono">
                      المسجل: {t.currentValue} {t.unit || ""} {t.targetValue ? `/ ${t.targetValue}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Tasks Due or Completed on this Day */}
          <div className="rounded-3xl bg-zinc-950/70 border border-zinc-800/80 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-100">المهام التنفيذية لهذا اليوم</h3>
              </div>
              <span className="text-xs text-zinc-500 font-mono">
                {tasksDue.length} مستحقة • {tasksCompleted.length} مكتملة
              </span>
            </div>

            {tasksDue.length === 0 && tasksCompleted.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                لا توجد مهام مستحقة في هذا التاريخ
              </div>
            ) : (
              <div className="space-y-2">
                {tasksDue.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id)}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <button type="button" className="text-zinc-500 hover:text-sky-400">
                        <Circle className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-medium text-zinc-200">{task.title}</span>
                    </div>
                    {task.priority === "URGENT" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 font-bold">
                        عاجلة
                      </span>
                    )}
                  </div>
                ))}

                {tasksCompleted.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id)}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/20 border border-zinc-800/40 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <button type="button" className="text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <span className="text-xs line-through text-zinc-500">{task.title}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">أُنجزت ✓</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Chronological Activity Stream */}
          <div className="rounded-3xl bg-zinc-950/70 border border-zinc-800/80 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-zinc-100">سجل الأحداث الزمني</h3>
              </div>
              <span className="text-xs text-zinc-500 font-mono">{entries.length} تدوينات</span>
            </div>

            {entries.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                لا توجد تدوينات مسجلة في هذا اليوم. يمكنك إضافة سجلات عبر لوحة التحكم.
              </div>
            ) : (
              <div className="space-y-2.5">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-zinc-500">
                        {new Date(entry.occurredAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-xs font-semibold text-zinc-200">
                        {entry.tracker?.name}
                      </span>
                      {entry.notes && (
                        <span className="text-[11px] text-zinc-400 italic truncate max-w-xs">
                          ({entry.notes})
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                      title="حذف السجل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

