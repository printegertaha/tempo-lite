"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { useProgressRouter } from "@/hooks/useProgressRouter";
import { useLocalSession } from "@/hooks/useLocalSession";
import { useAthar } from "@/components/context/AtharContext";
import {
  addDaysToDateString,
  getLocalDateString,
  getDefaultTimezone,
  formatDurationArabic,
  formatArabicDateTime,
  splitUtcToLocalDateTime,
} from "@/lib/dates";

function formatShortActiveDuration(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds || 0)));
  if (safe < 60) return `${safe} ث`;
  return formatDurationArabic(safe);
}
import { formatCurrency } from "@/lib/localization";
import {
  isIslamicFeatureVisible,
  normalizeSalutation,
} from "@/lib/onboarding";
import {
  isRecordOlderThanSevenDays,
  recordRevisionIfOlderThanSevenDays,
} from "@/lib/history/revisions";
import { permanentlyDeleteTaskLocalCascade } from "@/lib/tasks/task-lifecycle";
import { evaluateTrackerProgressForDate } from "@/lib/daily-obligations";
import { PRAYER_NAMES_ARABIC } from "@/lib/validations/prayer";
import {
  localTaskRepo,
  localTaskSessionRepo,
  localRevisionRepo,
  localNoteRepo,
  localTrackerRepo,
  localEntryRepo,
  localLifeAreaRepo,
  localPrayerRepo,
  localDomainRepo,
  localAbstinenceRepo,
  localOutboxRepo,
} from "@/lib/local-db";
import { syncEngine } from "@/lib/sync/sync-engine";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DatePickerField from "@/components/ui/DatePickerField";
import AbstinenceAchievementCard from "@/components/journal/AbstinenceAchievementCard";
import { computeAbstinenceAchievementsForDate } from "@/lib/abstinence/harvest";
import {
  BookMarked,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  Flame,
  Dumbbell,
  Wallet,
  Utensils,
  Compass,
  ShieldCheck,
  History,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Sparkles,
  Check,
} from "lucide-react";

const LOCATION_AR = {
  mosque: "المسجد",
  home: "المنزل",
  work: "العمل",
  other: "مكان آخر",
};

const MEAL_TYPE_AR = {
  breakfast: "فطور",
  lunch: "غداء",
  dinner: "عشاء",
  snack: "وجبة خفيفة",
};

function resolveTrackerSnapshotForDate(tracker, dateStr) {
  if (!tracker) return tracker;
  const versions = Array.isArray(tracker.versions) ? tracker.versions : [];
  if (versions.length === 0) return tracker;

  const sorted = [...versions].sort((a, b) => a.versionNumber - b.versionNumber);
  // Find latest version whose validFrom date <= dateStr (or latest validTo >= dateStr)
  let chosen = sorted[0];
  for (const v of sorted) {
    const validFromStr = v.validFrom
      ? new Date(v.validFrom).toISOString().slice(0, 10)
      : "";
    if (!validFromStr || validFromStr <= dateStr) {
      chosen = v;
    }
  }
  return {
    ...tracker,
    name: chosen.name || tracker.name,
    unit: chosen.unit ?? tracker.unit,
    targetValue: chosen.targetValue ?? tracker.targetValue,
    targetFrequency: chosen.targetFrequency ?? tracker.targetFrequency,
    trackerConfig: chosen.trackerConfig ?? tracker.trackerConfig,
    scheduleConfig: chosen.scheduleConfig ?? tracker.scheduleConfig,
  };
}

export default function JournalClient({
  user: propUser,
  initialDate,
  timezone,
}) {
  const router = useProgressRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { userPreferences } = useAthar();
  const {
    user: localUser,
    userId: sessionUserId,
    isGuest: sessionIsGuest,
  } = useLocalSession();

  const effectiveUserId = propUser?.id || sessionUserId || "guest";
  const isGuest = propUser
    ? !propUser?.id || propUser?.id === "guest"
    : sessionIsGuest;
  const effectiveTimezone =
    userPreferences?.timezone ||
    (timezone && !isGuest ? timezone : getDefaultTimezone());

  const urlDateParam = searchParams?.get("date");
  const validUrlDate =
    urlDateParam && /^\d{4}-\d{2}-\d{2}$/.test(urlDateParam) ? urlDateParam : null;

  const todayStr = getLocalDateString(new Date(), effectiveTimezone);
  const [fallbackDate, setFallbackDate] = useState(() => initialDate || todayStr);
  const selectedDate = validUrlDate || fallbackDate;

  const navigateToDate = useCallback(
    (nextDate) => {
      setFallbackDate(nextDate);
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("date", nextDate);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const [isLoading, setIsLoading] = useState(true);
  const [dayPayload, setDayPayload] = useState(null);
  const [expandedTaskKeys, setExpandedTaskKeys] = useState(() => new Set());
  const [expandedRevisionKeys, setExpandedRevisionKeys] = useState(() => new Set());

  // Edit modals with >7-day revision preservation
  const [editingTaskItem, setEditingTaskItem] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskNotes, setEditTaskNotes] = useState("");
  const [editReason, setEditReason] = useState("");

  const [editingNoteModal, setEditingNoteModal] = useState(false);
  const [editNoteTitle, setEditNoteTitle] = useState("");
  const [editNoteContent, setEditNoteContent] = useState("");

  const [deleteTaskCandidateId, setDeleteTaskCandidateId] = useState(null);

  const showIslamic = isIslamicFeatureVisible(userPreferences);

  const loadDayData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        taskSessions,
        allTasks,
        allTrackers,
        dayEntries,
        lifeAreas,
        dayPrayers,
        allGym,
        allMeals,
        allExpenses,
        absTrackers,
        absSessions,
        dayNote,
        allRevisions,
      ] = await Promise.all([
        localTaskSessionRepo.getByDate(effectiveUserId, selectedDate).catch(() => []),
        localTaskRepo.getAllForUser(effectiveUserId, true).catch(() => []),
        localTrackerRepo.getAllForUser(effectiveUserId, true).catch(() => []),
        localEntryRepo.getByDate(effectiveUserId, selectedDate).catch(() => []),
        localLifeAreaRepo.getAllForUser(effectiveUserId, true).catch(() => []),
        localPrayerRepo.getByDate(effectiveUserId, selectedDate).catch(() => []),
        localDomainRepo.getGymWorkouts(effectiveUserId).catch(() => []),
        localDomainRepo.getMealEntries(effectiveUserId).catch(() => []),
        localDomainRepo.getExpenseEntries(effectiveUserId).catch(() => []),
        localAbstinenceRepo.getAllTrackers(effectiveUserId).catch(() => []),
        localAbstinenceRepo.getAllSessions(effectiveUserId).catch(() => []),
        localNoteRepo.getByDate(effectiveUserId, selectedDate).catch(() => null),
        localRevisionRepo.getAllForUser(effectiveUserId).catch(() => []),
      ]);

      const taskMap = new Map(allTasks.map((t) => [t.id, t]));
      const areaMap = new Map(lifeAreas.map((a) => [a.id, a]));
      const revisionMap = new Map();
      for (const rev of allRevisions) {
        const key = `${rev.entityType}:${rev.entityId}`;
        const list = revisionMap.get(key) || [];
        list.push(rev);
        revisionMap.set(key, list);
      }

      // Build unified task achievement records from durable TaskSession + legacy fallback completed tasks
      const representedTaskIds = new Set();
      const achievementTasks = [];

      for (const sess of taskSessions) {
        if (!sess || sess.status === "cancelled") continue;
        // Safety guard: ignore orphan sessions if a deleted task still exists locally only as deleted
        representedTaskIds.add(sess.taskId);
        const liveTask = taskMap.get(sess.taskId);
        const areaId = sess.lifeAreaIdSnapshot || liveTask?.lifeAreaId || null;
        const areaName =
          sess.lifeAreaNameSnapshot ||
          (areaId ? areaMap.get(areaId)?.name : null) ||
          "المهام";

        const revKeyTask = `task:${sess.taskId}`;
        const revKeySession = `task_session:${sess.id}`;
        const combinedRevs = [
          ...(revisionMap.get(revKeyTask) || []),
          ...(revisionMap.get(revKeySession) || []),
        ].sort((a, b) => new Date(b.editedAt).getTime() - new Date(a.editedAt).getTime());

        achievementTasks.push({
          recordKey: sess.id,
          taskId: sess.taskId,
          sessionId: sess.id,
          title: sess.taskTitleSnapshot || liveTask?.title || "مهمة منجزة",
          description: sess.taskDescriptionSnapshot ?? liveTask?.description ?? null,
          notes: sess.notes ?? null,
          status: sess.status,
          completionSource: sess.completionSource,
          isEstimated: Boolean(sess.isEstimated),
          startedAt: sess.startedAt || null,
          endedAt: sess.endedAt || sess.createdAt,
          durationSeconds: sess.durationSeconds ?? null,
          completedCycles: sess.completedCycles || 0,
          subtasks: Array.isArray(sess.subtasksSnapshot)
            ? sess.subtasksSnapshot
            : liveTask?.subtasks || [],
          categoryName: areaName,
          liveTask: liveTask || null,
          revisions: combinedRevs,
        });
      }

      // Include completed tasks completed on `selectedDate` that don't already have a TaskSession row on this date
      for (const t of allTasks) {
        if (t.status !== "COMPLETED" || t.isArchived) continue;
        if (representedTaskIds.has(t.id)) continue;
        const completedLocal = t.completedAt
          ? splitUtcToLocalDateTime(t.completedAt, effectiveTimezone).localDate
          : t.dueDate || "";
        if (completedLocal !== selectedDate) continue;

        const areaName = t.lifeAreaId ? areaMap.get(t.lifeAreaId)?.name || "المهام" : "المهام";
        const combinedRevs = revisionMap.get(`task:${t.id}`) || [];

        achievementTasks.push({
          recordKey: `task_done_${t.id}`,
          taskId: t.id,
          sessionId: null,
          title: t.title,
          description: t.description || null,
          notes: null,
          status: "completed",
          completionSource: "checkbox",
          isEstimated: false,
          startedAt: null,
          endedAt: t.completedAt || t.updatedAt,
          durationSeconds: null,
          completedCycles: 0,
          subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
          categoryName: areaName,
          liveTask: t,
          revisions: combinedRevs,
        });
      }

      // Group tasks strictly by Life Area / Category
      const taskCategoriesMap = new Map();
      for (const item of achievementTasks) {
        const list = taskCategoriesMap.get(item.categoryName) || [];
        list.push(item);
        taskCategoriesMap.set(item.categoryName, list);
      }

      // Habits with recorded logs on selectedDate
      const entriesByTracker = new Map();
      for (const e of dayEntries) {
        const list = entriesByTracker.get(e.trackerId) || [];
        list.push(e);
        entriesByTracker.set(e.trackerId, list);
      }

      const habitRecords = [];
      for (const rawTracker of allTrackers) {
        const tEntries = entriesByTracker.get(rawTracker.id) || [];
        if (tEntries.length === 0) continue;
        const snapshotTracker = resolveTrackerSnapshotForDate(rawTracker, selectedDate);
        const progress = evaluateTrackerProgressForDate(snapshotTracker, tEntries);
        // Show only trackers with actual positive activity/completion logged
        const hasPositiveRecord =
          progress.isCompleted ||
          progress.currentValue > 0 ||
          tEntries.some((e) => e.valueBoolean !== null || e.notes);
        if (!hasPositiveRecord) continue;

        const entryRevs = tEntries.flatMap(
          (e) => revisionMap.get(`tracker_entry:${e.id}`) || []
        );

        habitRecords.push({
          tracker: snapshotTracker,
          entries: tEntries,
          progress,
          revisions: entryRevs,
          areaName: snapshotTracker.lifeAreaId
            ? areaMap.get(snapshotTracker.lifeAreaId)?.name || "العادات"
            : "العادات",
        });
      }

      const completedPrayers = showIslamic
        ? dayPrayers.filter((p) => p.isCompleted)
        : [];

      const gymToday = allGym.filter((g) => g.date === selectedDate);
      const mealsToday = allMeals.filter((m) => m.date === selectedDate);
      const expensesToday = allExpenses.filter((e) => e.date === selectedDate);

      const absRecords = computeAbstinenceAchievementsForDate({
        trackers: absTrackers,
        sessions: absSessions,
        selectedDate,
        timezone: effectiveTimezone,
      });

      const noteRevs = dayNote
        ? revisionMap.get(`daily_note:${dayNote.id}`) || []
        : [];

      setDayPayload({
        taskCategories: Array.from(taskCategoriesMap.entries()).map(
          ([categoryName, items]) => ({ categoryName, items })
        ),
        habits: habitRecords,
        prayers: completedPrayers,
        gym: gymToday,
        meals: mealsToday,
        expenses: expensesToday,
        abstinence: absRecords,
        dailyNote: dayNote && dayNote.content?.trim() ? { ...dayNote, revisions: noteRevs } : null,
      });
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUserId, selectedDate, effectiveTimezone, showIslamic]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void loadDayData();
    });
    const refresh = () => void loadDayData();
    window.addEventListener("athar_data_synced", refresh);
    window.addEventListener("athar_tasks_updated", refresh);
    window.addEventListener("athar_task_sessions_updated", refresh);
    window.addEventListener("athar_revisions_updated", refresh);
    return () => {
      active = false;
      window.removeEventListener("athar_data_synced", refresh);
      window.removeEventListener("athar_tasks_updated", refresh);
      window.removeEventListener("athar_task_sessions_updated", refresh);
      window.removeEventListener("athar_revisions_updated", refresh);
    };
  }, [loadDayData]);

  const toggleExpandTask = (key) => {
    setExpandedTaskKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleExpandRevisions = (key) => {
    setExpandedRevisionKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleOpenEditTask = (item) => {
    setEditingTaskItem(item);
    setEditTaskTitle(item.title || "");
    setEditTaskNotes(item.notes ?? item.description ?? "");
    setEditReason("");
  };

  const handleSaveTaskRevisionEdit = async (e) => {
    e.preventDefault();
    if (!editingTaskItem || !editTaskTitle.trim()) return;
    const trimmedTitle = editTaskTitle.trim();
    const trimmedNotes = editTaskNotes.trim() || null;
    const editorIdentity = localUser?.name || effectiveUserId;

    if (editingTaskItem.sessionId) {
      const prevSess = await localTaskSessionRepo.getById(editingTaskItem.sessionId);
      if (prevSess) {
        const nextSess = {
          ...prevSess,
          taskTitleSnapshot: trimmedTitle,
          notes: trimmedNotes,
          updatedAt: new Date().toISOString(),
          clientUpdatedAt: Date.now(),
        };
        await recordRevisionIfOlderThanSevenDays({
          userId: effectiveUserId,
          entityType: "task_session",
          entityId: prevSess.id,
          recordDate: selectedDate,
          previousRecord: prevSess,
          nextRecord: nextSess,
          candidateKeys: ["taskTitleSnapshot", "notes"],
          editedBy: editorIdentity,
          timezone: effectiveTimezone,
          reason: editReason.trim() || "تعديل سجل من عملت إيه النهارده",
        });
        await localTaskSessionRepo.save(nextSess);
        if (!isGuest) {
          await localOutboxRepo
            .add({
              mutationId: crypto.randomUUID(),
              userId: effectiveUserId,
              entityType: "task_session",
              entityId: nextSess.id,
              action: "update",
              payload: {
                taskTitleSnapshot: trimmedTitle,
                notes: trimmedNotes,
              },
              clientTimestamp: Date.now(),
              version: 1,
              status: "pending",
              retryCount: 0,
            })
            .catch(() => {});
          syncEngine.scheduleSync(800);
        }
      }
    } else if (editingTaskItem.liveTask) {
      const prevTask = editingTaskItem.liveTask;
      const nextTask = {
        ...prevTask,
        title: trimmedTitle,
        description: trimmedNotes,
        updatedAt: new Date().toISOString(),
        clientUpdatedAt: Date.now(),
      };
      await recordRevisionIfOlderThanSevenDays({
        userId: effectiveUserId,
        entityType: "task",
        entityId: prevTask.id,
        recordDate: selectedDate,
        previousRecord: prevTask,
        nextRecord: nextTask,
        candidateKeys: ["title", "description"],
        editedBy: editorIdentity,
        timezone: effectiveTimezone,
        reason: editReason.trim() || "تعديل مهمة تاريخية",
      });
      await localTaskRepo.save(nextTask);
      if (!isGuest) {
        await localOutboxRepo
          .add({
            mutationId: crypto.randomUUID(),
            userId: effectiveUserId,
            entityType: "task",
            entityId: prevTask.id,
            action: "update",
            payload: { title: trimmedTitle, description: trimmedNotes },
            clientTimestamp: Date.now(),
            version: prevTask.version || 1,
            status: "pending",
            retryCount: 0,
          })
          .catch(() => {});
        syncEngine.scheduleSync(800);
      }
    }

    setEditingTaskItem(null);
    await loadDayData();
  };

  const handleSaveHistoricalNoteEdit = async (e) => {
    e.preventDefault();
    if (!dayPayload?.dailyNote || !editNoteContent.trim()) return;
    const prevNote = dayPayload.dailyNote;
    const nextNote = {
      ...prevNote,
      title: editNoteTitle.trim() || null,
      content: editNoteContent.trim(),
      updatedAt: new Date().toISOString(),
    };
    await recordRevisionIfOlderThanSevenDays({
      userId: effectiveUserId,
      entityType: "daily_note",
      entityId: prevNote.id,
      recordDate: selectedDate,
      previousRecord: prevNote,
      nextRecord: nextNote,
      candidateKeys: ["title", "content"],
      editedBy: localUser?.name || effectiveUserId,
      timezone: effectiveTimezone,
      reason: "تعديل تأمل يومي",
    });
    await localNoteRepo.save(nextNote);
    if (!isGuest) {
      await localOutboxRepo
        .add({
          mutationId: crypto.randomUUID(),
          userId: effectiveUserId,
          entityType: "daily_note",
          entityId: prevNote.id,
          action: "update",
          payload: {
            localDate: selectedDate,
            title: nextNote.title,
            content: nextNote.content,
            mood: nextNote.mood,
          },
          clientTimestamp: Date.now(),
          baseUpdatedAt: prevNote.updatedAt,
          version: 1,
          status: "pending",
          retryCount: 0,
        })
        .catch(() => {});
      syncEngine.scheduleSync(800);
    }
    setEditingNoteModal(false);
    await loadDayData();
  };

  const formattedDateHeader = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      return new Intl.DateTimeFormat("ar-EG", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(dt);
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const hasAnyAchievement = Boolean(
    dayPayload &&
      (dayPayload.taskCategories.length > 0 ||
        dayPayload.habits.length > 0 ||
        dayPayload.prayers.length > 0 ||
        dayPayload.gym.length > 0 ||
        dayPayload.meals.length > 0 ||
        dayPayload.expenses.length > 0 ||
        dayPayload.abstinence.length > 0 ||
        dayPayload.dailyNote)
  );

  const isDateOlderThan7 = isRecordOlderThanSevenDays(selectedDate, effectiveTimezone);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 pb-24">
      {/* Header & Date Navigator */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-violet-400">
            <BookMarked className="w-4 h-4" />
            <span>سجل الإنجازات</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-100">
            عملت إيه النهارده
          </h1>
          <p className="text-sm text-zinc-400">{formattedDateHeader}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigateToDate(addDaysToDateString(selectedDate, -1))}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
            aria-label="اليوم السابق"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <DatePickerField
            value={selectedDate}
            onChange={(d) => {
              if (d) navigateToDate(d);
            }}
            title="اختيار تاريخ الحصاد"
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 min-w-[130px]"
          />

          <button
            type="button"
            onClick={() => navigateToDate(addDaysToDateString(selectedDate, 1))}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
            aria-label="اليوم التالي"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {selectedDate !== todayStr && (
            <button
              type="button"
              onClick={() => navigateToDate(todayStr)}
              className="px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-bold cursor-pointer"
            >
              اليوم
            </button>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-violet-400" />
        </div>
      ) : !hasAnyAchievement ? (
        (() => {
          const isTodayHarvest = selectedDate === todayStr;
          const isFemale =
            normalizeSalutation(userPreferences?.salutation) === "بشمهندسة";
          const emptyHeadline = isTodayHarvest
            ? isFemale
              ? "للأسف  مهببتيش حاجة النهاردة"
              : "للأسف  مهببتش حاجة النهاردة لسه"
            : isFemale
              ? "للأسف مهببتيش حاجة اليوم دا"
              : "للأسف مهببتش حاجة اليوم دا";

          return (
            <div className="rounded-3xl bg-[#0c0e17]/80 border border-zinc-800/80 p-8 sm:p-12 text-center space-y-4">
              {/* 404/500-style Empty Achievement SVG Illustration */}
              <div className="mx-auto w-44 h-36 flex items-center justify-center relative">
                <div className="absolute inset-4 rounded-full bg-violet-500/10 blur-2xl" />
                <svg
                  viewBox="0 0 220 160"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full relative z-10"
                  aria-hidden="true"
                >
                  {/* Background dashed orbit */}
                  <ellipse
                    cx="110"
                    cy="132"
                    rx="74"
                    ry="10"
                    fill="#18181b"
                    stroke="#27272a"
                    strokeDasharray="4 4"
                  />
                  {/* Empty Clipboard / Page */}
                  <rect
                    x="62"
                    y="24"
                    width="96"
                    height="104"
                    rx="14"
                    fill="#11131f"
                    stroke="#3f3f46"
                    strokeWidth="2"
                  />
                  {/* Clipboard Top Clip */}
                  <rect
                    x="88"
                    y="16"
                    width="44"
                    height="14"
                    rx="6"
                    fill="#1e1b4b"
                    stroke="#6366f1"
                    strokeWidth="1.5"
                  />
                  {/* Sad / Empty Face on Page */}
                  <circle cx="94" cy="64" r="3.5" fill="#71717a" />
                  <circle cx="126" cy="64" r="3.5" fill="#71717a" />
                  <path
                    d="M98 82C104 76 116 76 122 82"
                    stroke="#71717a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Blank checklist lines */}
                  <rect x="80" y="96" width="60" height="5" rx="2.5" fill="#27272a" />
                  <rect x="88" y="108" width="44" height="5" rx="2.5" fill="#27272a" />
                  {/* Floating "0%" / Empty Status Pill (404-style badge) */}
                  <g transform="translate(136 22) rotate(8)">
                    <rect
                      x="0"
                      y="0"
                      width="46"
                      height="24"
                      rx="8"
                      fill="#2e1065"
                      stroke="#8b5cf6"
                      strokeWidth="1.5"
                    />
                    <text
                      x="23"
                      y="16"
                      textAnchor="middle"
                      fill="#c4b5fd"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      0%
                    </text>
                  </g>
                  {/* Little floating sparkles/dots */}
                  <circle cx="44" cy="52" r="3" fill="#3f3f46" />
                  <circle cx="176" cy="96" r="2.5" fill="#6366f1" fillOpacity="0.6" />
                  <path
                    d="M46 96L52 102M52 96L46 102"
                    stroke="#52525b"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="space-y-1.5">
                <p className="text-base font-black text-zinc-200">
                  {emptyHeadline}
                </p>
                <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                  عند إتمام المهام أو العادات أو الأنشطة سيظهر حصادك مصنفاً هنا تلقائياً.
                </p>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="space-y-6">
          {/* Categorized Completed Tasks & Sessions (Grouped by Category / Life Area) */}
          {dayPayload.taskCategories.map(({ categoryName, items }) => (
            <section
              key={categoryName}
              className="rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 p-5 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-zinc-800/70 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-zinc-100">
                    {categoryName}
                  </h2>
                </div>
                <span className="text-xs font-mono text-zinc-400">
                  {items.length} منجزة
                </span>
              </div>

              <div className="space-y-2.5">
                {items.map((item) => {
                  const isExpanded = expandedTaskKeys.has(item.recordKey);
                  const revOpen = expandedRevisionKeys.has(item.recordKey);
                  const hasRevs = item.revisions.length > 0;
                  const isTrackedTimer =
                    item.completionSource === "timer" && item.startedAt;

                  return (
                    <div
                      key={item.recordKey}
                      data-testid={`journal-task-${item.taskId}`}
                      className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpandTask(item.recordKey)}
                        className="w-full flex items-center justify-between gap-3 p-3.5 text-right hover:bg-zinc-900 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-sm font-bold text-zinc-100 truncate">
                            {item.title}
                          </span>
                          {hasRevs && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold shrink-0">
                              معدّل
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 text-xs text-zinc-400">
                          {isTrackedTimer && item.durationSeconds !== null ? (
                            <span className="font-mono text-emerald-300 text-[11px]">
                              {formatShortActiveDuration(item.durationSeconds)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-400">
                              {item.completionSource === "legacy"
                                ? "سجل سابق"
                                : "إتمام مباشر"}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-zinc-800/70 space-y-3 text-xs bg-zinc-950/40">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                              <span className="text-[10px] text-zinc-500 block">
                                حالة التنفيذ
                              </span>
                              <span className="font-semibold text-zinc-200">
                                {item.completionSource === "timer"
                                  ? "مكتملة بالمؤقت"
                                  : item.completionSource === "legacy"
                                    ? "سجل سابق (تقديري)"
                                    : "إتمام مباشر (بدون مؤقت)"}
                              </span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                              <span className="text-[10px] text-zinc-500 block">
                                وقت البداية الفعلي
                              </span>
                              <span className="font-mono text-zinc-200">
                                {item.startedAt
                                  ? formatArabicDateTime(item.startedAt, effectiveTimezone).fullStr
                                  : "غير مسجل"}
                              </span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                              <span className="text-[10px] text-zinc-500 block">
                                وقت الانتهاء الفعلي
                              </span>
                              <span className="font-mono text-zinc-200">
                                {item.endedAt
                                  ? formatArabicDateTime(item.endedAt, effectiveTimezone).fullStr
                                  : "—"}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-zinc-300">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-emerald-400" />
                              <span>
                                المدة الفعلية:{" "}
                                {item.durationSeconds !== null
                                  ? formatShortActiveDuration(item.durationSeconds)
                                  : "غير متتبعة"}
                              </span>
                            </span>
                            {item.completedCycles > 0 && (
                              <span>دورات التركيز: {item.completedCycles}</span>
                            )}
                          </div>

                          {(item.description || item.notes) && (
                            <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/60 text-zinc-300 space-y-1">
                              <span className="text-[10px] text-zinc-500 block">
                                الوصف والملاحظات
                              </span>
                              <p className="whitespace-pre-wrap leading-relaxed">
                                {item.notes || item.description}
                              </p>
                            </div>
                          )}

                          {item.subtasks.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] text-zinc-500 block">
                                المهام الفرعية ({item.subtasks.length})
                              </span>
                              <ul className="space-y-1">
                                {item.subtasks.map((st, idx) => (
                                  <li
                                    key={st.id || idx}
                                    className="flex items-center gap-2 text-zinc-300"
                                  >
                                    <Check
                                      className={`w-3 h-3 ${
                                        st.completed
                                          ? "text-emerald-400"
                                          : "text-zinc-600"
                                      }`}
                                    />
                                    <span
                                      className={
                                        st.completed ? "text-zinc-300" : "text-zinc-500"
                                      }
                                    >
                                      {st.title}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {hasRevs && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => toggleExpandRevisions(item.recordKey)}
                                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 hover:text-amber-200 cursor-pointer"
                              >
                                <History className="w-3.5 h-3.5" />
                                <span>
                                  سجل التعديلات ({item.revisions.length})
                                </span>
                              </button>
                              {revOpen && (
                                <div className="mt-2 space-y-2">
                                  {item.revisions.map((rev) => (
                                    <div
                                      key={rev.id}
                                      className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[11px] space-y-1"
                                    >
                                      <div className="flex items-center justify-between text-amber-300">
                                        <span>تعديل رقم {rev.revisionNumber}</span>
                                        <span className="font-mono">
                                          {formatArabicDateTime(rev.editedAt, effectiveTimezone).fullStr}
                                        </span>
                                      </div>
                                      <div className="text-zinc-400">
                                        السابق:{" "}
                                        <span className="text-zinc-300">
                                          {JSON.stringify(rev.previousValues)}
                                        </span>
                                      </div>
                                      <div className="text-zinc-400">
                                        الجديد:{" "}
                                        <span className="text-zinc-200">
                                          {JSON.stringify(rev.newValues)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/60">
                            <button
                              type="button"
                              onClick={() => handleOpenEditTask(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[11px] cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>
                                {isDateOlderThan7 ? "تعديل (يحفظ النسخة)" : "تعديل"}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTaskCandidateId(item.taskId)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/25 text-rose-300 text-[11px] cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>حذف نهائي</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Habits Completed / Logged */}
          {dayPayload.habits.length > 0 && (
            <section className="rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800/70 pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-zinc-100">العادات</h2>
                </div>
                <span className="text-xs font-mono text-zinc-400">
                  {dayPayload.habits.length} مسجلة
                </span>
              </div>

              <div className="space-y-2">
                {dayPayload.habits.map((h) => {
                  const latestEntry = h.entries[h.entries.length - 1];
                  const hasRevs = h.revisions.length > 0;
                  return (
                    <div
                      key={h.tracker.id}
                      className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-zinc-100">
                            {h.tracker.name}
                          </span>
                          {hasRevs && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                              معدّل
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {h.tracker.metricType === "BOOLEAN"
                            ? "منجزة ✓"
                            : h.tracker.metricType === "DURATION" ||
                                h.tracker.metricType === "TIME_RANGE"
                              ? `${formatDurationArabic(h.progress.currentValue * 60)} من أصل ${formatDurationArabic(h.progress.targetValue * 60)}`
                              : `${h.progress.currentValue} / ${h.progress.targetValue} ${h.tracker.unit || ""}`.trim()}
                          {latestEntry?.notes ? ` — ${latestEntry.notes}` : ""}
                        </div>
                      </div>

                      {latestEntry?.occurredAt && (
                        <span className="text-[11px] font-mono text-zinc-500">
                          {formatArabicDateTime(latestEntry.occurredAt, effectiveTimezone).timeStr}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Muslim Worship Records */}
          {showIslamic && dayPayload.prayers.length > 0 && (
            <section className="rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800/70 pb-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-zinc-100">العبادات</h2>
                </div>
                <span className="text-xs font-mono text-emerald-400">
                  {dayPayload.prayers.length} صلوات
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {dayPayload.prayers.map((p) => (
                  <div
                    key={p.id || p.prayerKey}
                    className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-bold text-zinc-100 block">
                        صلاة {PRAYER_NAMES_ARABIC[p.prayerKey] || p.prayerKey}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {[
                          p.location ? LOCATION_AR[p.location] || p.location : null,
                          p.withSunnah ? "مع السنة" : null,
                          p.notes || null,
                        ]
                          .filter(Boolean)
                          .join(" • ") || "أُديت"}
                      </span>
                    </div>
                    {p.completedAt && (
                      <span className="font-mono text-[10px] text-zinc-500">
                        {new Date(p.completedAt).toLocaleTimeString("ar-EG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Health & Fitness: Gym, Meals, Abstinence */}
          {(dayPayload.gym.length > 0 ||
            dayPayload.meals.length > 0 ||
            dayPayload.abstinence.length > 0) && (
            <section className="rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800/70 pb-3">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-bold text-zinc-100">
                    الصحة والرياضة
                  </h2>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                {dayPayload.gym.map((g) => (
                  <div
                    key={g.id}
                    className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-zinc-100 block">
                        {g.title}
                      </span>
                      <span className="text-zinc-400 text-[11px]">
                        {[g.muscleGroup, g.durationMinutes ? `${g.durationMinutes} دقيقة` : null, g.notes]
                          .filter(Boolean)
                          .join(" • ")}
                      </span>
                    </div>
                  </div>
                ))}

                {dayPayload.meals.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Utensils className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <div>
                        <span className="font-bold text-zinc-100">
                          {m.title} ({MEAL_TYPE_AR[m.mealType] || m.mealType})
                        </span>
                        <span className="text-zinc-400 text-[11px] block">
                          {m.calories} سعرة • بروتين {m.protein}غ
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {dayPayload.abstinence.map((a) => (
                  <AbstinenceAchievementCard key={a.id} item={a} />
                ))}
              </div>
            </section>
          )}

          {/* Finance */}
          {dayPayload.expenses.length > 0 && (
            <section className="rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800/70 pb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-zinc-100">المصاريف</h2>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                {dayPayload.expenses.map((ex) => (
                  <div
                    key={ex.id}
                    className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-zinc-100 block">
                        {ex.title}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {ex.category || "عام"}
                      </span>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        ex.type === "income"
                          ? "text-emerald-400"
                          : "text-rose-300"
                      }`}
                    >
                      {ex.type === "income" ? "+" : "-"}
                      {formatCurrency(
                        ex.amount,
                        ex.currency || userPreferences?.currency || "EGP"
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recorded Daily Note (only if one was saved for this date) */}
          {dayPayload.dailyNote && (
            <section className="rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800/70 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-violet-400" />
                  <h2 className="text-sm font-bold text-zinc-100">
                    التأملات اليومية
                  </h2>
                  {dayPayload.dailyNote.revisions.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                      معدّل
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditNoteTitle(dayPayload.dailyNote.title || "");
                    setEditNoteContent(dayPayload.dailyNote.content || "");
                    setEditingNoteModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[11px] cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                  <span>تعديل</span>
                </button>
              </div>

              {dayPayload.dailyNote.title && (
                <h3 className="text-sm font-bold text-zinc-200">
                  {dayPayload.dailyNote.title}
                </h3>
              )}
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {dayPayload.dailyNote.content}
              </p>

              {dayPayload.dailyNote.revisions.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-zinc-800/60">
                  <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                    <History className="w-3.5 h-3.5" />
                    <span>سجل التعديلات ({dayPayload.dailyNote.revisions.length})</span>
                  </span>
                  {dayPayload.dailyNote.revisions.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-2 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[11px] text-zinc-300"
                    >
                      السابق: {rev.previousValues?.content || "—"} (
                      {formatArabicDateTime(rev.editedAt, effectiveTimezone).fullStr})
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Historical Task / Session Edit Modal */}
      {editingTaskItem && (
        <Modal
          isOpen={true}
          onClose={() => setEditingTaskItem(null)}
          title={
            isDateOlderThan7
              ? "تعديل سجل تاريخي (سيتم حفظ المراجعة)"
              : "تعديل سجل المهمة"
          }
          maxWidth="md"
        >
          <form onSubmit={handleSaveTaskRevisionEdit} className="space-y-4 text-right text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-zinc-300 block">عنوان المهمة</label>
              <input
                type="text"
                required
                value={editTaskTitle}
                onChange={(e) => setEditTaskTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-zinc-300 block">الوصف / الملاحظات</label>
              <textarea
                rows={3}
                value={editTaskNotes}
                onChange={(e) => setEditTaskNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:border-violet-500 focus:outline-none"
              />
            </div>
            {isDateOlderThan7 && (
              <div className="space-y-1.5">
                <label className="font-bold text-amber-300 block">
                  سبب التعديل (سجل تاريخي أقدم من ٧ أيام)
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="اختياري..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-amber-500/30 text-zinc-100 focus:outline-none"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingTaskItem(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold cursor-pointer"
              >
                حفظ التعديل
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Historical Note Edit Modal */}
      {editingNoteModal && (
        <Modal
          isOpen={true}
          onClose={() => setEditingNoteModal(false)}
          title={isDateOlderThan7 ? "تعديل التأمل (مع حفظ المراجعة)" : "تعديل التأمل"}
          maxWidth="md"
        >
          <form onSubmit={handleSaveHistoricalNoteEdit} className="space-y-4 text-right text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-zinc-300 block">العنوان</label>
              <input
                type="text"
                value={editNoteTitle}
                onChange={(e) => setEditNoteTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-zinc-300 block">المحتوى</label>
              <textarea
                rows={4}
                required
                value={editNoteContent}
                onChange={(e) => setEditNoteContent(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingNoteModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-violet-600 text-white font-bold cursor-pointer"
              >
                حفظ التعديل
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Permanent Task Cascade Deletion Dialog */}
      {deleteTaskCandidateId && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteTaskCandidateId(null)}
          onConfirm={async () => {
            await permanentlyDeleteTaskLocalCascade(
              deleteTaskCandidateId,
              effectiveUserId
            );
            setDeleteTaskCandidateId(null);
            await loadDayData();
          }}
          title="حذف المهمة وسجلها نهائياً"
          description="سيتم حذف المهمة وجميع جلساتها وتعديلات السجل المرتبطة بها نهائياً من عملت إيه النهارده والمزامنة."
          confirmLabel="حذف نهائي"
          cancelLabel="إلغاء"
          isDestructive={true}
        />
      )}
    </div>
  );
}
