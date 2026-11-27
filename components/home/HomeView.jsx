"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Sparkles,
  Flame,
  AlertTriangle,
  RotateCcw,
  Bell,
  Heart,
  ListTodo,
  BookMarked,
  Check,
  Plus,
  Compass,
} from "lucide-react";
import { soundManager } from "@/lib/audio";
import {
  getLocalDateString,
  addDaysToDateString,
  getDefaultTimezone,
  formatDurationArabic,
} from "@/lib/dates";
import { useLocalTasks } from "@/hooks/useLocalTasks";
import { useLocalSession } from "@/hooks/useLocalSession";
import { useDailyObligations } from "@/hooks/useDailyObligations";
import { localLifeAreaRepo } from "@/lib/local-db";
import {
  toggleBooleanEntryLocalFirst,
  incrementCounterLocalFirst,
  logDurationLocalFirst,
  logAvoidanceLocalFirst,
  toggleChecklistItemLocalFirst,
} from "@/lib/local-db/habit-ops";
import { useAthar } from "@/components/context/AtharContext";
import {
  formatPersonalizedGreeting,
  isPrayerModuleVisible,
} from "@/lib/onboarding";
import HomePrayerBar from "@/components/home/HomePrayerBar";
import TaskCardItem from "@/components/home/TaskCardItem";
import { activeTimerEngine } from "@/lib/timer/active-timer";
import { useActiveTimer } from "@/hooks/useActiveTimer";
import TaskEditorModal from "@/components/home/TaskEditorModal";
import TrackerModal from "@/components/trackers/TrackerModal";
import Modal from "@/components/ui/Modal";
import DatePickerModal from "@/components/ui/DatePickerModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { TaskCardSkeleton } from "@/components/ui/LoadingSkeleton";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export default function HomeView({
  user: propUser,
  initialDate,
  timezone,
  initialTodayTasks,
  initialPrayers = [],
  initialLifeAreas = [],
}) {
  const { userPreferences, updatePreferences } = useAthar();
  const {
    user: localSessionUser,
    userId: sessionUserId,
    isGuest: sessionIsGuest,
  } = useLocalSession();
  const user = propUser || localSessionUser;

  const {
    session: activeTaskSession,
    elapsedSeconds: activeTaskElapsedSeconds,
    resume: resumeActiveTaskTimer,
  } = useActiveTimer();

  const getPausedSecondsForTask = (taskId) =>
    activeTaskSession &&
    activeTaskSession.status === "paused" &&
    activeTaskSession.taskId === taskId
      ? activeTaskElapsedSeconds
      : null;

  const userId = propUser?.id || sessionUserId || "guest";
  const isGuest = propUser
    ? !propUser?.id || propUser?.id === "guest"
    : sessionIsGuest;

  const effectiveTimezone =
    userPreferences?.timezone ||
    (timezone && !isGuest ? timezone : getDefaultTimezone());

  const [lifeAreas, setLifeAreas] = useState(initialLifeAreas);
  const [todayStr, setTodayStr] = useState(
    () => initialDate || getLocalDateString(new Date(), effectiveTimezone)
  );

  useEffect(() => {
    let active = true;
    const loadAreas = () => {
      localLifeAreaRepo
        .getAllForUser(userId, false)
        .then((rows) => {
          if (active && Array.isArray(rows) && rows.length > 0) {
            setLifeAreas(rows);
          } else if (active && !initialLifeAreas.length) {
            setLifeAreas([]);
          }
        })
        .catch(() => {});
    };
    loadAreas();
    const onSynced = (ev) => {
      const types = ev?.detail?.changedTypes || [];
      if (types.includes("life_area")) loadAreas();
    };
    window.addEventListener("athar_data_synced", onSynced);
    return () => {
      active = false;
      window.removeEventListener("athar_data_synced", onSynced);
    };
  }, [userId, initialLifeAreas.length]);

  useEffect(() => {
    const syncDate = () => {
      const currentLocal = getLocalDateString(new Date(), effectiveTimezone);
      setTodayStr((prev) => (prev !== currentLocal ? currentLocal : prev));
    };
    syncDate();
    const timer = setInterval(syncDate, 60000);
    return () => clearInterval(timer);
  }, [effectiveTimezone]);

  const {
    tasks,
    isLoaded,
    addTask,
    updateTask,
    toggleTaskStatus,
    deleteTask,
    postponeTask,
    reorderTasks,
  } = useLocalTasks(userId, initialTodayTasks, {
    scope: "home",
    timezone: effectiveTimezone,
  });

  const { obligations, auxLoaded, refreshObligations } = useDailyObligations({
    userId,
    todayStr,
    timezone: effectiveTimezone,
    tasks,
    userPreferences,
    initialPrayers,
  });

  const {
    overdueTasks,
    todayTasks,
    pendingHabits,
    pendingPrayers,
    totalPendingCount,
    homeState,
  } = obligations;

  const showPrayerObligations = isPrayerModuleVisible(userPreferences);

  // Modal & interaction state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
  const [isPostponeOpen, setIsPostponeOpen] = useState(false);
  const [postponingTaskId, setPostponingTaskId] = useState(null);
  const [isCustomDatePickerOpen, setIsCustomDatePickerOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyingTask, setCopyingTask] = useState(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState(null);

  // Temporary undo snackbar (ephemeral 4s floating notice, NEVER a persistent completed list)
  const [undoableTaskId, setUndoableTaskId] = useState(null);
  const [undoableTaskTitle, setUndoableTaskTitle] = useState(null);

  const [scheduledAlertTask, setScheduledAlertTask] = useState(null);
  const alertedTaskIdsRef = useRef(new Set());
  const [prevTodayStr, setPrevTodayStr] = useState(todayStr);

  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverTaskId, setDragOverTaskId] = useState(null);
  const touchStartRef = useRef(null);

  if (prevTodayStr !== todayStr) {
    setPrevTodayStr(todayStr);
    if (scheduledAlertTask) setScheduledAlertTask(null);
  }

  useEffect(() => {
    alertedTaskIdsRef.current.clear();
  }, [todayStr]);

  useKeyboardShortcuts({
    onEscape: () => {
      setIsEditorOpen(false);
      setIsPostponeOpen(false);
      setIsCustomDatePickerOpen(false);
      setIsCopyModalOpen(false);
      setDeleteCandidateId(null);
      setScheduledAlertTask(null);
    },
  });

  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

      const dueNow = todayTasks.find(
        (t) =>
          t.startTime === currentHHMM &&
          t.status !== "COMPLETED" &&
          !alertedTaskIdsRef.current.has(t.id)
      );

      if (dueNow) {
        alertedTaskIdsRef.current.add(dueNow.id);
        soundManager.playReminder();
        if (!activeTaskSession || activeTaskSession.status !== "running") {
          activeTimerEngine.requestStart(dueNow, "stopwatch", userId);
        } else {
          setScheduledAlertTask(dueNow);
        }
      }
    };

    const interval = setInterval(checkSchedule, 15000);
    checkSchedule();
    return () => clearInterval(interval);
  }, [todayTasks, activeTaskSession, userId]);

  const handleToggleTask = useCallback(
    async (taskId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const willBeCompleted = task.status !== "COMPLETED";
      await toggleTaskStatus(taskId);
      if (willBeCompleted) {
        setUndoableTaskId(task.id);
        setUndoableTaskTitle(task.title);
      }
    },
    [tasks, toggleTaskStatus]
  );

  const handleUndo = useCallback(
    async (taskId) => {
      await toggleTaskStatus(taskId);
      setUndoableTaskId(null);
      setUndoableTaskTitle(null);
    },
    [toggleTaskStatus]
  );

  useEffect(() => {
    if (!undoableTaskId) return;
    const timer = setTimeout(() => {
      setUndoableTaskId(null);
      setUndoableTaskTitle(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [undoableTaskId]);

  const handleQuickHabitAction = async (habitItem) => {
    const { tracker } = habitItem;
    if (!tracker) return;

    try {
      if (tracker.metricType === "BOOLEAN") {
        await toggleBooleanEntryLocalFirst(userId, tracker, todayStr);
      } else if (
        tracker.metricType === "COUNTER" ||
        tracker.metricType === "NUMBER"
      ) {
        const step = Number(tracker.trackerConfig?.step) || 1;
        await incrementCounterLocalFirst(userId, tracker, step, todayStr);
      } else if (
        tracker.metricType === "DURATION" ||
        tracker.metricType === "TIME_RANGE"
      ) {
        const remainingMins = Math.max(
          1,
          habitItem.targetValue - habitItem.currentValue
        );
        await logDurationLocalFirst(
          userId,
          tracker,
          remainingMins * 60,
          todayStr,
          tracker.name
        );
      } else if (tracker.metricType === "AVOIDANCE") {
        await logAvoidanceLocalFirst(userId, tracker, true, todayStr);
      } else if (tracker.metricType === "CHECKLIST") {
        const firstUnchecked = (tracker.trackerConfig?.items || []).find(
          (it) =>
            !(
              habitItem.entriesToday[habitItem.entriesToday.length - 1]
                ?.entryPayload?.completedItemIds || []
            ).includes(it.id)
        );
        if (firstUnchecked) {
          await toggleChecklistItemLocalFirst(
            userId,
            tracker,
            firstUnchecked.id,
            todayStr
          );
        }
      }

      soundManager.playTaskDone();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("athar_entries_updated"));
      }
      await refreshObligations();
    } catch (err) {
      console.warn("Habit action error:", err);
    }
  };

  const handleSaveFromEditor = async (taskData) => {
    if (editingTask) {
      await updateTask(editingTask.id, taskData);
    }
    setIsEditorOpen(false);
    setEditingTask(null);
  };

  const handlePostponeClick = (taskId) => {
    setPostponingTaskId(taskId);
    setIsPostponeOpen(true);
  };

  const handleExecutePostpone = async (days, customDate) => {
    if (!postponingTaskId) return;
    await postponeTask(postponingTaskId, days, customDate);
    setIsPostponeOpen(false);
    setPostponingTaskId(null);
    soundManager.playClick();
  };

  const handleOpenCopyModal = (task) => {
    setCopyingTask(task);
    setIsCopyModalOpen(true);
  };

  const handleExecuteCopy = async (targetDate) => {
    if (!copyingTask) return;
    await addTask({
      ...copyingTask,
      id: crypto.randomUUID(),
      title: `${copyingTask.title} (نسخة)`,
      dueDate: targetDate,
      status: "TODO",
      completedAt: null,
      subtasks: copyingTask.subtasks
        ? JSON.parse(JSON.stringify(copyingTask.subtasks))
        : [],
    });
    setIsCopyModalOpen(false);
    setCopyingTask(null);
    soundManager.playTaskStart();
  };

  const executeReorder = async (sourceId, targetId) => {
    const currentIds = todayTasks.map((t) => t.id);
    const draggedIndex = currentIds.indexOf(sourceId);
    const targetIndex = currentIds.indexOf(targetId);
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex)
      return;
    const newIds = [...currentIds];
    newIds.splice(draggedIndex, 1);
    newIds.splice(targetIndex, 0, sourceId);
    await reorderTasks(newIds);
    soundManager.playClick();
  };

  const handleDragStart = (e, id) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, targetId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverTaskId !== targetId) setDragOverTaskId(targetId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    if (!sourceId || sourceId === targetId) return;
    await executeReorder(sourceId, targetId);
  };

  const handleHandleTouchStart = (e, taskId) => {
    if (e.target?.closest?.("button, a, input, textarea, select")) return;
    const touch = e.touches[0];
    if (!touch) return;
    const timer = setTimeout(() => {
      if (touchStartRef.current && touchStartRef.current.taskId === taskId) {
        touchStartRef.current.activated = true;
        setDraggedTaskId(taskId);
      }
    }, 200);
    touchStartRef.current = {
      taskId,
      startX: touch.clientX,
      startY: touch.clientY,
      currentHoverId: taskId,
      activated: false,
      timer,
    };
  };

  const handleHandleTouchMove = (e) => {
    const state = touchStartRef.current;
    if (!state) return;
    const touch = e.touches[0];
    if (!touch) return;

    if (!state.activated) {
      const dx = Math.abs(touch.clientX - state.startX);
      const dy = Math.abs(touch.clientY - state.startY);
      if (dx > 8 || dy > 8) {
        clearTimeout(state.timer);
        touchStartRef.current = null;
      }
      return;
    }

    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
    const taskCard = targetEl?.closest("[data-task-id]");
    const hoveredId = taskCard?.getAttribute("data-task-id");
    if (hoveredId && hoveredId !== state.currentHoverId) {
      state.currentHoverId = hoveredId;
      setDragOverTaskId(hoveredId);
    }
  };

  const handleHandleTouchEnd = async () => {
    const state = touchStartRef.current;
    if (!state) return;
    clearTimeout(state.timer);
    const { taskId, currentHoverId, activated } = state;
    touchStartRef.current = null;
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    if (activated && taskId && currentHoverId && taskId !== currentHoverId) {
      await executeReorder(taskId, currentHoverId);
    }
  };

  const formattedTodayDate = useMemo(() => {
    try {
      const d = new Date(todayStr + "T12:00:00");
      return new Intl.DateTimeFormat("ar-EG", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(d);
    } catch {
      return todayStr;
    }
  }, [todayStr]);

  const handleDisablePrayerTracking = useCallback(async () => {
    if (!updatePreferences) return;
    await updatePreferences({ prayerTrackingEnabled: false });
    soundManager.playClick();
  }, [updatePreferences]);

  const greetingText = formatPersonalizedGreeting(
    userPreferences?.salutation,
    userPreferences?.profileName || user?.name
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-28 md:pb-16 selection:bg-emerald-500/30 selection:text-emerald-200 relative">
      {scheduledAlertTask && (
        <div className="sticky top-0 z-40 bg-emerald-500/15 border-b border-emerald-500/30 backdrop-blur-md px-4 py-2.5">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <Bell className="w-4 h-4 animate-bounce text-emerald-400" />
              <span>
                حان موعد مهمة:{" "}
                <strong className="text-zinc-100">{scheduledAlertTask.title}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  activeTimerEngine.requestStart(scheduledAlertTask, "stopwatch", userId);
                  setScheduledAlertTask(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                ابدأ المؤقت الآن
              </button>
              <button
                type="button"
                onClick={() => setScheduledAlertTask(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                تجاهل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ephemeral Undo Toast only when user just completed a task */}
      {undoableTaskId && (
        <div className="fixed bottom-20 md:bottom-6 left-4 sm:left-6 z-50 bg-zinc-900 border border-emerald-500/40 text-zinc-100 text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <span className="truncate max-w-[200px]">
            تم إنجاز: <strong>{undoableTaskTitle}</strong>
          </span>
          <button
            type="button"
            onClick={() => handleUndo(undoableTaskId)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-300 font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>تراجع</span>
          </button>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 md:pt-8 space-y-6">
        {/* Minimal Daily Header: Day & Date only */}
        <header className="border-b border-zinc-800/80 pb-4">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-100">
            {formattedTodayDate}
          </h1>
        </header>

        {/* Loading skeleton while IDB resolves */}
        {(!isLoaded || !auxLoaded) && totalPendingCount === 0 && (
          <div className="space-y-2 pt-2">
            <TaskCardSkeleton />
            <TaskCardSkeleton />
          </div>
        )}

        {/* 1. New User Getting Started Experience (Primary Focus) */}
        {isLoaded && auxLoaded && homeState === "new_user" && (
          <section
            aria-label="بداية رحلتك في أثـر"
            data-testid="home-new-user-state"
            className="rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-950/20 via-zinc-900/50 to-zinc-900/30 px-6 py-10 sm:py-12 text-center space-y-5"
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-violet-500/15 border border-violet-500/30 text-violet-300 flex items-center justify-center shadow-lg shadow-violet-950/30">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-zinc-100">
                حابب نبدأ بإيه؟
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
                ابدأ بإضافة أول مهمة أو عادة يومية، أو خصّص مجالات حياتك بما يناسب يومك.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setIsEditorOpen(true);
                }}
                data-testid="new-user-add-task-btn"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shadow-md shadow-violet-600/20 transition-colors cursor-pointer"
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span>إضافة مهمة</span>
              </button>
              <button
                type="button"
                onClick={() => setIsTrackerModalOpen(true)}
                data-testid="new-user-add-habit-btn"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>إضافة عادة</span>
              </button>
              <Link
                href="/settings"
                data-testid="new-user-explore-areas-link"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900/70 hover:bg-zinc-800 border border-zinc-800/80 text-xs font-medium text-zinc-300 transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>استكشاف مجالات حياتي وتخصيص تجربتي</span>
              </Link>
            </div>
          </section>
        )}

        {/* Optional / Pending Prayer Tracker (Muslim users with prayer tracking enabled) */}
        {showPrayerObligations && pendingPrayers.length > 0 && (
          <section aria-label="الصلوات المتبقية اليوم">
            <HomePrayerBar
              userId={userId}
              dateStr={todayStr}
              initialPrayers={initialPrayers}
              pendingOnly={true}
              onDisablePrayerTracking={handleDisablePrayerTracking}
            />
          </section>
        )}

        {/* 2. Overdue Pending Tasks */}
        {overdueTasks.length > 0 && (
          <section
            aria-label="مهام متأخرة من أيام سابقة"
            className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>مهام متأخرة مستحقة ({overdueTasks.length})</span>
              </span>
              <button
                type="button"
                onClick={async () => {
                  for (const t of overdueTasks) {
                    await updateTask(t.id, { dueDate: todayStr });
                  }
                  soundManager.playClick();
                }}
                className="text-[11px] text-amber-300 hover:text-amber-200 underline cursor-pointer"
              >
                ترحيل الكل إلى اليوم
              </button>
            </div>

            <div className="space-y-2">
              {overdueTasks.map((task) => (
                <TaskCardItem
                  key={task.id}
                  task={task}
                  onToggleStatus={handleToggleTask}
                  onStartTimer={(t) =>
                    activeTimerEngine.requestStart(t, "stopwatch", userId)
                  }
                  pausedTimerSeconds={getPausedSecondsForTask(task.id)}
                  onResumeTimer={() => resumeActiveTaskTimer()}
                  onEdit={(t) => {
                    setEditingTask(t);
                    setIsEditorOpen(true);
                  }}
                  onPostpone={handlePostponeClick}
                  onCopy={handleOpenCopyModal}
                  onDelete={(id) => setDeleteCandidateId(id)}
                  isDraggable={false}
                />
              ))}
            </div>
          </section>
        )}

        {/* 3. Today's Pending Tasks */}
        {todayTasks.length > 0 && (
          <section aria-label="مهام اليوم المطلوبة" className="space-y-3">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-emerald-400" />
                <span>مهام اليوم ({todayTasks.length})</span>
              </span>
              {todayTasks.length > 1 && (
                <span className="text-[11px] text-zinc-500">
                  اسحب لإعادة الترتيب
                </span>
              )}
            </div>

            <div className="space-y-2">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  data-task-id={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnter={(e) => e.preventDefault()}
                  onDragOver={(e) => handleDragOver(e, task.id)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, task.id)}
                  className={`transition-all duration-150 ${
                    draggedTaskId === task.id ? "opacity-40 scale-[0.98]" : ""
                  } ${
                    dragOverTaskId === task.id && draggedTaskId !== task.id
                      ? "ring-2 ring-emerald-500/50 rounded-2xl"
                      : ""
                  }`}
                >
                  <TaskCardItem
                    task={task}
                    onToggleStatus={handleToggleTask}
                    onStartTimer={(t) =>
                      activeTimerEngine.requestStart(t, "stopwatch", userId)
                    }
                    pausedTimerSeconds={getPausedSecondsForTask(task.id)}
                    onResumeTimer={() => resumeActiveTaskTimer()}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setIsEditorOpen(true);
                    }}
                    onPostpone={handlePostponeClick}
                    onCopy={handleOpenCopyModal}
                    onDelete={(id) => setDeleteCandidateId(id)}
                    isDraggable={true}
                    dragHandleProps={{
                      onTouchStart: (e) => handleHandleTouchStart(e, task.id),
                      onTouchMove: handleHandleTouchMove,
                      onTouchEnd: handleHandleTouchEnd,
                      onTouchCancel: handleHandleTouchEnd,
                    }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. Pending Scheduled Habits for Today */}
        {pendingHabits.length > 0 && (
          <section aria-label="العادات المجدولة لليوم" className="space-y-3">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-violet-400" />
                <span>عادات متبقية اليوم ({pendingHabits.length})</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pendingHabits.map((item) => {
                const { tracker, currentValue, targetValue, progressPercent } = item;
                const isDuration =
                  tracker.metricType === "DURATION" ||
                  tracker.metricType === "TIME_RANGE";
                const progressText =
                  tracker.metricType === "BOOLEAN" || tracker.metricType === "AVOIDANCE"
                    ? "بانتظار الإنجاز"
                    : isDuration
                      ? `${formatDurationArabic(currentValue * 60)} / ${formatDurationArabic(targetValue * 60)}`
                      : `${currentValue} / ${targetValue} ${tracker.unit || ""}`.trim();

                return (
                  <div
                    key={tracker.id}
                    data-testid={`pending-habit-${tracker.id}`}
                    className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="text-sm font-bold text-zinc-100 truncate">
                        {tracker.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        {progressText}
                      </div>
                      {progressPercent > 0 && (
                        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuickHabitAction(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold shrink-0 transition-colors cursor-pointer"
                    >
                      {tracker.metricType === "COUNTER" ||
                      tracker.metricType === "NUMBER" ? (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>تم</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 5B. All Today's Scheduled Obligations Completed */}
        {isLoaded && auxLoaded && homeState === "all_completed" && (
          <section
            aria-label="تم إنجاز جميع التزامات اليوم"
            data-testid="home-all-done-state"
            className="rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 via-zinc-900/50 to-zinc-900/30 px-6 py-12 text-center space-y-5"
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/30">
              <Heart className="w-7 h-7 fill-emerald-400/20" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-zinc-100">
                خلصت كل المطلوب منك النهارده ❤️
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
                يومك خالٍ من الالتزامات المعلّقة الآن. استمتع بوقتك أو راجع ما أنجزته اليوم.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <Link
                href="/journal"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 transition-colors"
              >
                <BookMarked className="w-3.5 h-3.5 text-violet-400" />
                <span>عملت إيه النهارده</span>
              </Link>
              <Link
                href="/tasks"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition-colors"
              >
                <ListTodo className="w-3.5 h-3.5 text-emerald-400" />
                <span>إدارة المهام</span>
              </Link>
              <Link
                href="/habits"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition-colors"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>العادات</span>
              </Link>
            </div>
          </section>
        )}

        {/* 5C. Existing User With Nothing Scheduled Due Today */}
        {isLoaded && auxLoaded && homeState === "nothing_due_today" && (
          <section
            aria-label="لا توجد التزامات مجدولة اليوم"
            data-testid="home-nothing-due-state"
            className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 px-6 py-12 text-center space-y-5"
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-800/70 border border-zinc-700/60 text-zinc-300 flex items-center justify-center">
              <CalendarCheck className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-zinc-100">
                مفيش حاجة مطلوبة منك النهارده.
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
                لا توجد مهام أو عادات مجدولة لهذا اليوم.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <Link
                href="/tasks"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 transition-colors"
              >
                <ListTodo className="w-3.5 h-3.5 text-emerald-400" />
                <span>إدارة المهام</span>
              </Link>
              <Link
                href="/habits"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition-colors"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>العادات</span>
              </Link>
            </div>
          </section>
        )}
      </main>

      {isEditorOpen && (
        <TaskEditorModal
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingTask(null);
          }}
          task={editingTask}
          onSave={handleSaveFromEditor}
          lifeAreas={lifeAreas}
          todayStr={todayStr}
        />
      )}

      {isTrackerModalOpen && (
        <TrackerModal
          isOpen={isTrackerModalOpen}
          onClose={() => setIsTrackerModalOpen(false)}
          userId={userId}
          lifeAreas={lifeAreas}
          onSaved={() => {
            setIsTrackerModalOpen(false);
            refreshObligations();
          }}
        />
      )}

      {isPostponeOpen && postponingTaskId && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsPostponeOpen(false);
            setPostponingTaskId(null);
          }}
          title="تأجيل المهمة"
          maxWidth="sm"
        >
          <div className="space-y-2 text-right text-xs">
            <button
              type="button"
              onClick={() => handleExecutePostpone(1)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-850/70 hover:bg-zinc-800 text-zinc-200 transition-colors cursor-pointer"
            >
              <span>تأجيل إلى الغد</span>
              <span className="text-zinc-500 text-[11px]">
                {addDaysToDateString(todayStr, 1)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleExecutePostpone(2)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-850/70 hover:bg-zinc-800 text-zinc-200 transition-colors cursor-pointer"
            >
              <span>تأجيل لمدة يومين</span>
              <span className="text-zinc-500 text-[11px]">
                {addDaysToDateString(todayStr, 2)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleExecutePostpone(7)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-850/70 hover:bg-zinc-800 text-zinc-200 transition-colors cursor-pointer"
            >
              <span>تأجيل لمدة أسبوع</span>
              <span className="text-zinc-500 text-[11px]">
                {addDaysToDateString(todayStr, 7)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPostponeOpen(false);
                setIsCustomDatePickerOpen(true);
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800 text-emerald-400 font-medium transition-colors cursor-pointer border border-zinc-800"
            >
              <span>اختيار موعد مخصص...</span>
            </button>
          </div>
        </Modal>
      )}

      {isCustomDatePickerOpen && (
        <DatePickerModal
          isOpen={true}
          onClose={() => {
            setIsCustomDatePickerOpen(false);
            setPostponingTaskId(null);
          }}
          value={todayStr}
          onChange={(selectedDate) => {
            setIsCustomDatePickerOpen(false);
            if (postponingTaskId) {
              handleExecutePostpone(undefined, selectedDate);
            }
          }}
        />
      )}

      {isCopyModalOpen && copyingTask && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsCopyModalOpen(false);
            setCopyingTask(null);
          }}
          title="تكرار المهمة"
          maxWidth="sm"
        >
          <div className="space-y-3 text-right text-xs">
            <p className="text-zinc-400">
              اختر اليوم الذي تريد نسخ مهمة{" "}
              <strong className="text-zinc-200">«{copyingTask.title}»</strong>{" "}
              إليه:
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleExecuteCopy(todayStr)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-850/70 hover:bg-zinc-800 text-zinc-200 cursor-pointer"
              >
                <span>نسخ إلى اليوم</span>
                <span className="text-zinc-500 text-[11px]">{todayStr}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleExecuteCopy(addDaysToDateString(todayStr, 1))
                }
                className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-850/70 hover:bg-zinc-800 text-zinc-200 cursor-pointer"
              >
                <span>نسخ إلى الغد</span>
                <span className="text-zinc-500 text-[11px]">
                  {addDaysToDateString(todayStr, 1)}
                </span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteCandidateId && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteCandidateId(null)}
          onConfirm={async () => {
            await deleteTask(deleteCandidateId);
            setDeleteCandidateId(null);
          }}
          title="حذف المهمة نهائياً"
          description="هل أنت متأكد من حذف هذه المهمة نهائياً؟ سيتم مسح المهمة وسجلاتها المرتبطة بالكامل ولا يمكن التراجع عن هذا الإجراء."
          confirmLabel="حذف نهائي"
          cancelLabel="إلغاء"
          isDestructive={true}
        />
      )}
    </div>
  );
}
