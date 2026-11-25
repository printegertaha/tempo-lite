"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Sparkles,
  Plus,
  ChevronDown,
  ChevronUp,
  Inbox,
  Flame,
  AlertTriangle,
  RotateCcw,
  Copy,
  CalendarCheck,
  Check,
  Bell,
  ArrowRight,
} from "lucide-react";
import { soundManager } from "@/lib/audio";
import {
  getLocalDateString,
  addDaysToDateString,
  splitUtcToLocalDateTime,
  getDefaultTimezone,
} from "@/lib/dates";
import { useLocalTasks } from "@/hooks/useLocalTasks";
import { useLocalSession } from "@/hooks/useLocalSession";
import { localLifeAreaRepo } from "@/lib/local-db";
import { useAthar } from "@/components/context/AtharContext";
import HomePrayerBar from "@/components/home/HomePrayerBar";
import QuickTaskInput from "@/components/home/QuickTaskInput";
import TaskCardItem from "@/components/home/TaskCardItem";
import { activeTimerEngine } from "@/lib/timer/active-timer";
import { useActiveTimer } from "@/hooks/useActiveTimer";
import CompletedTasksSection from "@/components/home/CompletedTasksSection";
import TaskEditorModal from "@/components/home/TaskEditorModal";
import Modal from "@/components/ui/Modal";
import DatePickerModal from "@/components/ui/DatePickerModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import { TaskCardSkeleton } from "@/components/ui/LoadingSkeleton";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

function toIsoDateString(val) {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (val instanceof Date) return val.toISOString();
  if (typeof val?.toISOString === "function") return val.toISOString();
  return String(val);
}

export default function HomeView({
  user: propUser,
  initialDate,
  timezone,
  initialTodayTasks,
  initialPrayers = [],
  initialLifeAreas = [],
}) {
  const { userPreferences, updatePreferences } = useAthar();
  const { user: localSessionUser, userId: sessionUserId, isGuest: sessionIsGuest } =
    useLocalSession();
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
  const isGuest = propUser ? (!propUser?.id || propUser?.id === "guest") : sessionIsGuest;
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

  // Automatically detect midnight transitions while the app stays open
  useEffect(() => {
    const syncDate = () => {
      const currentLocal = getLocalDateString(new Date(), effectiveTimezone);
      setTodayStr((prev) => (prev !== currentLocal ? currentLocal : prev));
    };
    syncDate();
    const timer = setInterval(syncDate, 60000);
    return () => clearInterval(timer);
  }, [effectiveTimezone]);

  // Task Engine
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

  // UI state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isPostponeOpen, setIsPostponeOpen] = useState(false);
  const [postponingTaskId, setPostponingTaskId] = useState(null);
  const [isCustomDatePickerOpen, setIsCustomDatePickerOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyingTask, setCopyingTask] = useState(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState(null);

  // Sections collapse
  const [isOpenTasksExpanded, setIsOpenTasksExpanded] = useState(false);
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);

  // Undo Toast state (6-second timer)
  const [undoableTaskId, setUndoableTaskId] = useState(null);
  const [undoableTaskTitle, setUndoableTaskTitle] = useState(null);

  // Scheduled Reminder Alert State
  const [scheduledAlertTask, setScheduledAlertTask] = useState(null);
  const alertedTaskIdsRef = useRef(new Set());
  const [prevTodayStr, setPrevTodayStr] = useState(todayStr);

  // Drag and drop state (Touch + Pointer / Mouse)
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverTaskId, setDragOverTaskId] = useState(null);
  const touchStartRef = useRef(null);

  // Reset alert state when active date changes
  if (prevTodayStr !== todayStr) {
    setPrevTodayStr(todayStr);
    if (scheduledAlertTask) setScheduledAlertTask(null);
  }

  useEffect(() => {
    alertedTaskIdsRef.current.clear();
  }, [todayStr]);

  // Keyboard shortcuts support for HomeView
  useKeyboardShortcuts({
    onQuickAdd: () => {
      document.getElementById("quick-task-input")?.focus();
    },
    onEscape: () => {
      setIsEditorOpen(false);
      setIsPostponeOpen(false);
      setIsCustomDatePickerOpen(false);
      setIsCopyModalOpen(false);
      setDeleteCandidateId(null);
      setScheduledAlertTask(null);
    },
  });

  // Filter Tasks into categories (Deduplicated by task.id)
  const {
    todayTasks,
    overdueTasks,
    openTasks,
    upcomingTasks,
    completedTodayTasks,
  } = useMemo(() => {
    const today = [];
    const overdue = [];
    const open = [];
    const upcoming = [];
    const completed = [];

    // Deduplicate tasks by ID
    const seenIds = new Set();
    const uniqueTasks = [];
    for (const t of tasks) {
      if (t && t.id && !seenIds.has(t.id)) {
        seenIds.add(t.id);
        uniqueTasks.push(t);
      }
    }

    for (const t of uniqueTasks) {
      if (t.isArchived) continue;

      if (t.status === "COMPLETED") {
        const completedLocalDate = t.completedAt
          ? splitUtcToLocalDateTime(t.completedAt, effectiveTimezone).localDate
          : "";
        if (
          !t.completedAt ||
          completedLocalDate === todayStr ||
          t.dueDate === todayStr
        ) {
          completed.push(t);
        }
      } else {
        if (!t.dueDate) {
          open.push(t);
        } else if (t.dueDate === todayStr) {
          today.push(t);
        } else if (t.dueDate < todayStr) {
          overdue.push(t);
        } else {
          upcoming.push(t);
        }
      }
    }

    // Sort today tasks by sortOrder, then startTime
    today.sort((a, b) => {
      if (a.startTime && b.startTime)
        return a.startTime.localeCompare(b.startTime);
      if (a.startTime) return -1;
      if (b.startTime) return 1;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

    overdue.sort((a, b) => (b.dueDate || "").localeCompare(a.dueDate || ""));
    upcoming.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
    open.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    completed.sort((a, b) => {
      const aTime = toIsoDateString(a.completedAt);
      const bTime = toIsoDateString(b.completedAt);
      return bTime.localeCompare(aTime);
    });

    return {
      todayTasks: today,
      overdueTasks: overdue,
      openTasks: open,
      upcomingTasks: upcoming,
      completedTodayTasks: completed,
    };
  }, [tasks, todayStr, effectiveTimezone]);

  // Periodic checker for scheduled start times (every 30 seconds)
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
        setScheduledAlertTask(dueNow);
        soundManager.playReminder();
      }
    };

    const interval = setInterval(checkSchedule, 30000);
    checkSchedule();
    return () => clearInterval(interval);
  }, [todayTasks]);

  // Task Toggle with 6-second Undo
  const handleToggleTask = useCallback(
    async (taskId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const willBeCompleted = task.status !== "COMPLETED";
      await toggleTaskStatus(taskId);

      if (willBeCompleted) {
        setUndoableTaskId(task.id);
        setUndoableTaskTitle(task.title);
      } else {
        if (undoableTaskId === taskId) {
          setUndoableTaskId(null);
          setUndoableTaskTitle(null);
        }
      }
    },
    [tasks, toggleTaskStatus, undoableTaskId]
  );

  const handleUndo = useCallback(
    async (taskId) => {
      await toggleTaskStatus(taskId);
      setUndoableTaskId(null);
      setUndoableTaskTitle(null);
    },
    [toggleTaskStatus]
  );

  // Auto-hide "تم إكمال" toast notification after 1.8 seconds
  useEffect(() => {
    if (!undoableTaskId) return;
    const timer = setTimeout(() => {
      setUndoableTaskId(null);
      setUndoableTaskTitle(null);
    }, 1800);
    return () => clearTimeout(timer);
  }, [undoableTaskId]);

  // Quick Add handler
  const handleQuickAdd = async (data) => {
    await addTask({
      title: data.title,
      priority: data.priority || "MEDIUM",
      dueDate: data.dueDate !== undefined ? data.dueDate : todayStr,
      startTime: data.startTime || null,
      durationMinutes: data.durationMinutes || null,
      status: "TODO",
    });
  };

  // Editor Modal Save handler
  const handleSaveFromEditor = async (taskData) => {
    if (editingTask) {
      await updateTask(editingTask.id, taskData);
    } else {
      await addTask({
        ...taskData,
        dueDate: taskData.dueDate || todayStr,
      });
    }
    setIsEditorOpen(false);
    setEditingTask(null);
  };

  // Postpone handlers
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

  // Schedule Open Task for Today
  const handleScheduleForToday = async (taskId) => {
    await updateTask(taskId, { dueDate: todayStr });
    soundManager.playClick();
  };

  // Duplication Handler
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

  // Reorder Execution
  const executeReorder = async (sourceId, targetId) => {
    const currentIds = todayTasks.map((t) => t.id);
    const draggedIndex = currentIds.indexOf(sourceId);
    const targetIndex = currentIds.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;

    const newIds = [...currentIds];
    newIds.splice(draggedIndex, 1);
    newIds.splice(targetIndex, 0, sourceId);

    await reorderTasks(newIds);
    soundManager.playClick();
  };

  // HTML5 Drag and drop handlers (Mouse)
  const handleDragStart = (e, id) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, targetId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverTaskId !== targetId) {
      setDragOverTaskId(targetId);
    }
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

  // Touch Drag-and-Drop handlers (Mobile Touch with touch-none on drag handle)
  const handleHandleTouchStart = (e, taskId) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      taskId,
      startY: touch.clientY,
      currentHoverId: taskId,
    };
    setDraggedTaskId(taskId);
  };

  const handleHandleTouchMove = (e) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
    const taskCard = targetEl?.closest("[data-task-id]");
    const hoveredId = taskCard?.getAttribute("data-task-id");

    if (hoveredId && hoveredId !== touchStartRef.current.currentHoverId) {
      touchStartRef.current.currentHoverId = hoveredId;
      setDragOverTaskId(hoveredId);
    }
  };

  const handleHandleTouchEnd = async () => {
    if (!touchStartRef.current) return;
    const { taskId, currentHoverId } = touchStartRef.current;
    touchStartRef.current = null;
    setDraggedTaskId(null);
    setDragOverTaskId(null);

    if (taskId && currentHoverId && taskId !== currentHoverId) {
      await executeReorder(taskId, currentHoverId);
    }
  };

  // Format today's date in Arabic
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

  const totalActiveToday = todayTasks.length + overdueTasks.length;
  const totalCompletedToday = completedTodayTasks.length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-28 md:pb-16 selection:bg-emerald-500/30 selection:text-emerald-200 relative">
      {/* Top Banner / Notification for Scheduled Task */}
      {scheduledAlertTask && (
        <div className="sticky top-0 z-40 bg-emerald-500/15 border-b border-emerald-500/30 backdrop-blur-md px-4 py-2.5">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <Bell className="w-4 h-4 animate-bounce text-emerald-400" />
              <span>
                حان موعد مهمة:{" "}
                <strong className="text-zinc-100">
                  {scheduledAlertTask.title}
                </strong>
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-3 md:pt-6 space-y-4 md:space-y-6">
        {/* 2. Header Section: Date & Progress (Hidden on mobile < md, visible on desktop md:flex) */}
        <header className="hidden md:flex md:items-center justify-between border-b border-zinc-800/80 pb-4 gap-3 pt-2">
          <div>
            <span className="text-xs font-medium text-emerald-400 tracking-wide flex items-center gap-1.5">
              <span>اليوم</span>
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 mt-0.5">
              {formattedTodayDate}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Progress Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs">
              <span className="text-zinc-400">
                الإنجاز: ({totalCompletedToday}/
                {totalActiveToday + totalCompletedToday})
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingTask(null);
                setIsEditorOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-xs font-medium text-zinc-200 transition-colors cursor-pointer shadow-sm"
              title="مهمة مفصلة جديدة"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>مهمة تفصيلية</span>
            </button>
          </div>
        </header>

        {/* 3. Optional Five Daily Prayers Card (Hidden completely when disabled; offers optional setup if unconfigured) */}
        {userPreferences?.prayerTrackingEnabled ? (
          <section aria-label="شريط الصلوات">
            <HomePrayerBar
              userId={userId}
              dateStr={todayStr}
              initialPrayers={initialPrayers}
            />
          </section>
        ) : !userPreferences?.prayerPreferenceConfigured ? (
          <section
            aria-label="تخصيص تتبع الصلوات"
            className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-0.5 text-right">
              <p className="text-xs font-bold text-zinc-200">هل ترغب في تفعيل تتبع الصلوات؟</p>
              <p className="text-[11px] text-zinc-400">
                يمكنك تشغيل أو إخفاء متابعة الصلوات حسب تفضيلاتك في أي وقت من الإعدادات.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  updatePreferences({
                    prayerTrackingEnabled: true,
                    prayerPreferenceConfigured: true,
                  })
                }
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                تشغيل تتبع الصلوات
              </button>
              <button
                type="button"
                onClick={() =>
                  updatePreferences({
                    prayerTrackingEnabled: false,
                    prayerPreferenceConfigured: true,
                  })
                }
                className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
              >
                إخفاء
              </button>
            </div>
          </section>
        ) : null}

        {/* Quick Task Input Bar */}
        <section aria-label="إضافة سريعة للمهمة">
          <QuickTaskInput
            onAddTask={handleQuickAdd}
            todayStr={todayStr}
            onOpenFullModal={() => {
              setEditingTask(null);
              setIsEditorOpen(true);
            }}
          />
        </section>

        {/* Loading State */}
        {!isLoaded && tasks.length === 0 && (
          <div className="space-y-2 pt-2">
            <TaskCardSkeleton />
            <TaskCardSkeleton />
            <TaskCardSkeleton />
          </div>
        )}

        {/* Overdue Tasks Warning Section (if any exist) */}
        {overdueTasks.length > 0 && (
          <section
            aria-label="المهام المتأخرة"
            className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>مهام متأخرة من أيام سابقة ({overdueTasks.length})</span>
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
                  onStartTimer={(t) => activeTimerEngine.requestStart(t, "stopwatch", userId)}
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

        {/* Today's Tasks Section with Touch & Mouse Drag Reordering */}
        <section aria-label="مهام اليوم" className="space-y-3">
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

          {todayTasks.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 text-center">
              {completedTodayTasks.length > 0 ? (
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-200">
                    أحسنت! أكملت جميع مهام اليوم
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    لقد أنجزت كل ما كان مخططاً لليوم. خذ استراحة أو خطط لمهمة
                    جديدة.
                  </p>
                </div>
              ) : (
                <EmptyState
                  title="لا توجد مهام مجدولة لليوم"
                  description="ابدأ بكتابة أول مهمة تريد إنجازها في شريط الإضافة بالأعلى."
                  icon={<Inbox className="w-8 h-8 text-zinc-500" />}
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.querySelector(
                          'input[type="text"]'
                        );
                        input?.focus();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-xs text-zinc-200 transition-colors cursor-pointer"
                    >
                      إضافة مهمة سريعة
                    </button>
                  }
                />
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  data-task-id={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
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
                    onStartTimer={(t) => activeTimerEngine.requestStart(t, "stopwatch", userId)}
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
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Collapsible: Open Tasks Without Date */}
        {openTasks.length > 0 && (
          <section className="rounded-2xl border border-zinc-850 bg-zinc-900/30 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsOpenTasksExpanded(!isOpenTasksExpanded)}
              className="w-full flex items-center justify-between p-3.5 text-xs text-right hover:bg-zinc-850/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                <Inbox className="w-4 h-4 text-violet-400" />
                <span>مهام مفتوحة بدون موعد ({openTasks.length})</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-500">
                <span className="text-[11px]">
                  {isOpenTasksExpanded ? "إخفاء" : "عرض"}
                </span>
                {isOpenTasksExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </div>
            </button>

            {isOpenTasksExpanded && (
              <div className="p-3 pt-0 space-y-2 border-t border-zinc-850/60 mt-1">
                {openTasks.map((task) => (
                  <div key={task.id} className="relative group">
                    <TaskCardItem
                      task={task}
                      onToggleStatus={handleToggleTask}
                      onStartTimer={(t) => activeTimerEngine.requestStart(t, "stopwatch", userId)}
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
                    <button
                      type="button"
                      onClick={() => handleScheduleForToday(task.id)}
                      className="mt-1 text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 mr-8 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>جدولة لليوم</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Collapsible: Upcoming Tasks */}
        {upcomingTasks.length > 0 && (
          <section className="rounded-2xl border border-zinc-850 bg-zinc-900/30 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsUpcomingExpanded(!isUpcomingExpanded)}
              className="w-full flex items-center justify-between p-3.5 text-xs text-right hover:bg-zinc-850/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>المهام القادمة ({upcomingTasks.length})</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-500">
                <span className="text-[11px]">
                  {isUpcomingExpanded ? "إخفاء" : "عرض"}
                </span>
                {isUpcomingExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </div>
            </button>

            {isUpcomingExpanded && (
              <div className="p-3 pt-0 space-y-2 border-t border-zinc-850/60 mt-1">
                {upcomingTasks.map((task) => (
                  <TaskCardItem
                    key={task.id}
                    task={task}
                    onToggleStatus={handleToggleTask}
                    onStartTimer={(t) => activeTimerEngine.requestStart(t, "stopwatch", userId)}
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
            )}
          </section>
        )}

        {/* Completed Tasks Log & Undo Toast Section */}
        <section aria-label="المهام المكتملة">
          <CompletedTasksSection
            completedTasks={completedTodayTasks}
            onUndoTask={handleUndo}
            onDuplicateTask={handleOpenCopyModal}
            undoableTaskId={undoableTaskId}
            undoableTaskTitle={undoableTaskTitle}
            onClearUndo={() => {
              setUndoableTaskId(null);
              setUndoableTaskTitle(null);
            }}
          />
        </section>
      </main>

      {/* Full Task Editor Modal */}
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

      {/* Postpone Modal */}
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
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>
        </Modal>
      )}

      {/* Custom Date Picker for Postpone */}
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

      {/* Task Copy / Multi-Date Duplication Modal */}
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

      {/* Confirm Delete Dialog */}
      {deleteCandidateId && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteCandidateId(null)}
          onConfirm={async () => {
            await deleteTask(deleteCandidateId);
            setDeleteCandidateId(null);
          }}
          title="حذف المهمة"
          description="هل أنت متأكد من حذف هذه المهمة نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
          confirmLabel="حذف"
          cancelLabel="إلغاء"
          isDestructive={true}
        />
      )}
    </div>
  );
}
