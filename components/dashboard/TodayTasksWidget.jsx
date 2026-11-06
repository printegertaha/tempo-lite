"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Check,
  Plus,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Folder,
  Link2,
  Tag,
  Sparkles,
} from "lucide-react";
import { toggleTaskStatus, createTask } from "@/actions/tasks";

/**
 * TaskCard Item for the responsive grid layout
 */
function DailyTaskCard({ task, isUpdating, onToggle }) {
  const isCompleted = task.status === "COMPLETED";
  const isUrgent = task.priority === "URGENT";
  const isHigh = task.priority === "HIGH";
  const isLow = task.priority === "LOW";

  return (
    <div
      role="checkbox"
      aria-checked={isCompleted}
      tabIndex={0}
      aria-label={`${isCompleted ? "إلغاء إكمال المهمة" : "إكمال المهمة"}: ${task.title}`}
      onClick={() => onToggle(task.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(task.id);
        }
      }}
      className={`group relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 cursor-pointer select-none min-h-[175px] sm:min-h-[190px] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 active:scale-[0.99] ${
        isCompleted
          ? "bg-zinc-950/40 border-zinc-800/60 hover:border-zinc-700/80 shadow-none"
          : isUrgent
          ? "bg-zinc-900/50 hover:bg-zinc-900/80 border-red-500/30 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/5"
          : isHigh
          ? "bg-zinc-900/50 hover:bg-zinc-900/80 border-amber-500/30 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/5"
          : "bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-800/80 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5"
      }`}
    >
      {/* 1. Top Section: Large distinct checkbox + Priority & Area badges */}
      <div className="flex items-start justify-between gap-3">
        {/* Large, clearly visible checkbox */}
        <div
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
            isCompleted
              ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/25"
              : isUpdating
              ? "border-violet-500/60 bg-violet-500/10 text-violet-400"
              : "border-zinc-700 bg-zinc-900/90 text-transparent group-hover:border-violet-400 group-hover:bg-violet-500/10"
          }`}
          aria-hidden="true"
        >
          {isUpdating ? (
            <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
          ) : isCompleted ? (
            <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[3] text-white" />
          ) : (
            <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5] text-violet-400 opacity-0 group-hover:opacity-40 transition-opacity" />
          )}
        </div>

        {/* Priority & Life Area badges */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {isUrgent && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500/10 border border-red-500/30 text-red-400">
              عاجلة
            </span>
          )}
          {isHigh && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
              مرتفعة
            </span>
          )}
          {isLow && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-zinc-800/80 border border-zinc-700/40 text-zinc-400">
              منخفضة
            </span>
          )}
          {task.lifeArea && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-zinc-800/60 border border-zinc-700/40 text-zinc-400 flex items-center gap-1">
              <Folder className="w-2.5 h-2.5" />
              <span>{task.lifeArea.name}</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Middle Section: Bold readable title with natural wrapping */}
      <div className="my-auto py-3">
        <h4
          className={`text-base sm:text-lg font-bold leading-snug break-words transition-colors ${
            isCompleted
              ? "line-through text-zinc-400 group-hover:text-zinc-300 font-medium"
              : "text-zinc-100 group-hover:text-white"
          }`}
        >
          {task.title}
        </h4>
        {task.description && (
          <p
            className={`text-xs mt-1.5 leading-relaxed break-words ${
              isCompleted ? "text-zinc-500 line-through" : "text-zinc-400"
            }`}
          >
            {task.description}
          </p>
        )}
      </div>

      {/* 3. Bottom Section: Linked tracker / tag & completion status */}
      <div className="pt-2.5 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-500 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {task.tracker ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-violet-400 font-medium truncate">
              <Link2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{task.tracker.name}</span>
            </span>
          ) : task.tags && Array.isArray(task.tags) && task.tags.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 truncate">
              <Tag className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{task.tags[0]}</span>
            </span>
          ) : (
            <span className="text-[11px] text-zinc-500">
              {isCompleted ? "تم الإنجاز" : "مستحقة اليوم"}
            </span>
          )}
        </div>

        <div>
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              مكتملة ✓
            </span>
          ) : (
            <span className="text-[11px] font-medium text-zinc-500 group-hover:text-violet-400 transition-colors flex items-center gap-1">
              <span>إتمام</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TodayTasksWidget({
  tasks = [],
  stats = { todayCount: 0, overdueCount: 0 },
  selectedDate,
  onTaskUpdated,
  onOpenCreateTask,
}) {
  const [localTasks, setLocalTasks] = useState(tasks);
  const [quickInput, setQuickInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "open" | "completed"

  // Keep localTasks in sync when server props refresh
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const handleToggle = async (taskId) => {
    if (updatingTaskId) return;
    setUpdatingTaskId(taskId);
    const previousTasks = [...localTasks];

    // Optimistic toggle: instantly flip task status in UI
    setLocalTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const isDone = t.status === "COMPLETED";
          return {
            ...t,
            status: isDone ? "TODO" : "COMPLETED",
            completedAt: isDone ? null : new Date(),
          };
        }
        return t;
      })
    );

    try {
      const res = await toggleTaskStatus(taskId);
      if (res.success) {
        onTaskUpdated?.();
      } else {
        // Rollback on failure
        setLocalTasks(previousTasks);
      }
    } catch {
      // Rollback on error
      setLocalTasks(previousTasks);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await createTask({
        title: quickInput.trim(),
        dueDate: selectedDate,
        priority: "MEDIUM",
        status: "TODO",
      });
      if (res.success) {
        setQuickInput("");
        if (onTaskUpdated) onTaskUpdated();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTasks = localTasks.filter((t) => t.status !== "COMPLETED");
  const completedTasks = localTasks.filter((t) => t.status === "COMPLETED");

  const displayedTasks =
    activeFilter === "open"
      ? openTasks
      : activeFilter === "completed"
      ? completedTasks
      : [...openTasks, ...completedTasks];

  return (
    <div className="rounded-3xl bg-zinc-950/70 border border-zinc-800/80 p-5 sm:p-6 space-y-5">
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-zinc-100">مهام وأولويات اليوم</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                {openTasks.length} متبقية
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              مهام تنفيذية فردية مستقلة عن العادات اليومية
            </p>
          </div>
        </div>

        {/* Header Right Actions & Filter Pills */}
        <div className="flex items-center gap-3 flex-wrap justify-between sm:justify-end">
          {completedTasks.length > 0 && (
            <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                  activeFilter === "all"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                الكل ({localTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("open")}
                className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                  activeFilter === "open"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                المتبقية ({openTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("completed")}
                className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                  activeFilter === "completed"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                المكتملة ({completedTasks.length})
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {stats?.overdueCount > 0 && (
              <Link
                href="/tasks"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-500/20 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>{stats.overdueCount} متأخرة</span>
              </Link>
            )}

            <Link
              href="/tasks"
              className="flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              <span>عرض الكل</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Add Task Field: Prominent and immediately accessible */}
      <form onSubmit={handleQuickAdd} className="flex items-center gap-2 sm:gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="إضافة مهمة سريعة لليوم... (اضغط Enter للحفظ)"
            className="w-full px-4 py-2.5 pr-10 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
          />
          <Plus className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !quickInput.trim()}
          className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-violet-600/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>إضافة</span>
            </>
          )}
        </button>

        {onOpenCreateTask && (
          <button
            type="button"
            onClick={onOpenCreateTask}
            title="إنشاء مهمة بتفاصيل إضافية"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 hover:text-white font-medium transition-all active:scale-95 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>مهمة مفصلة</span>
          </button>
        )}
      </form>

      {/* Task Card Grid Layout */}
      {localTasks.length === 0 ? (
        <div className="py-12 px-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-400">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-zinc-200 font-bold">لا توجد مهام مستحقة اليوم</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
              يومك خالٍ من الضغوط التنفيذية. يمكنك إضافة مهمة عاجلة عبر الحقل أعلاه لتنظيم يومك.
            </p>
          </div>
        </div>
      ) : displayedTasks.length === 0 ? (
        <div className="py-10 px-4 rounded-2xl bg-zinc-900/20 border border-zinc-800/40 text-center text-xs text-zinc-400">
          {activeFilter === "completed"
            ? "لم يتم إكمال أي مهمة بعد اليوم."
            : "تم إكمال جميع مهام اليوم بنجاح!"}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedTasks.map((task) => (
            <DailyTaskCard
              key={task.id}
              task={task}
              isUpdating={updatingTaskId === task.id}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
