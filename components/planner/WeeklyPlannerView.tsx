"use client";

import { useState, useMemo } from "react";
import { useLocalTasks } from "@/hooks/useLocalTasks";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { soundManager } from "@/lib/audio";
import {
  getWeekDates,
  buildPlannerDays,
  calculateWeeklyMetrics,
  calculatePlannerStreak,
  generateCommitmentHeatmap,
  PlannerDay,
} from "@/lib/planner";
import { getLocalDateString, addDaysToDateString } from "@/lib/dates";
import TaskCard from "@/components/tasks/TaskCard";
import ZenFocusModal from "@/components/planner/ZenFocusModal";
import SyncStatusBadge from "@/components/sync/SyncStatusBadge";
import {
  ChevronRight,
  ChevronLeft,
  Calendar,
  Sparkles,
  Flame,
  Trophy,
  Clock,
  Plus,
  Volume2,
  VolumeX,
  Maximize2,
  Keyboard,
  HelpCircle,
  Tag,
  BarChart3,
  CheckCircle2,
} from "lucide-react";

interface WeeklyPlannerViewProps {
  user: any;
  initialTasks?: any[];
  initialDate?: string;
  lifeAreas?: any[];
}

export default function WeeklyPlannerView({
  user,
  initialTasks = [],
  initialDate = getLocalDateString(),
  lifeAreas = [],
}: WeeklyPlannerViewProps) {
  const {
    tasks,
    addTask,
    updateTask,
    toggleTaskStatus,
    deleteTask,
    postponeTask,
  } = useLocalTasks(user?.id, initialTasks);

  const [anchorDate, setAnchorDate] = useState<string>(initialDate);
  const [selectedTaskForZen, setSelectedTaskForZen] = useState<any>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => soundManager.isEnabled());
  const [activeDayInput, setActiveDayInput] = useState<{ dateStr: string; title: string }>({
    dateStr: "",
    title: "",
  });
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Sound toggle
  const toggleSound = () => {
    const next = !soundEnabled;
    soundManager.setEnabled(next);
    setSoundEnabled(next);
    if (next) soundManager.playClick();
  };

  // Week navigation
  const handlePrevWeek = () => {
    setAnchorDate((prev) => addDaysToDateString(prev, -7));
    soundManager.playClick();
  };

  const handleNextWeek = () => {
    setAnchorDate((prev) => addDaysToDateString(prev, 7));
    soundManager.playClick();
  };

  const handleCurrentWeek = () => {
    setAnchorDate(getLocalDateString());
    soundManager.playClick();
  };

  // Build the 7 days of the active week
  const weekDates = useMemo(() => getWeekDates(anchorDate, 6), [anchorDate]);
  const plannerDays = useMemo(
    () => buildPlannerDays(weekDates, tasks, getLocalDateString()),
    [weekDates, tasks]
  );
  const weeklyMetrics = useMemo(() => calculateWeeklyMetrics(plannerDays), [plannerDays]);
  const streak = useMemo(() => calculatePlannerStreak(tasks, getLocalDateString()), [tasks]);
  const heatmap = useMemo(() => generateCommitmentHeatmap(tasks, 12, getLocalDateString()), [tasks]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onQuickAdd: () => {
      setActiveDayInput({ dateStr: weekDates[0], title: "" });
    },
    onEscape: () => {
      setSelectedTaskForZen(null);
      setActiveDayInput({ dateStr: "", title: "" });
      setShowShortcutsHelp(false);
    },
    onToggleHelp: () => {
      setShowShortcutsHelp((prev) => !prev);
    },
  });

  // Handle quick inline task add in a specific day
  const handleInlineSubmit = async (e: React.FormEvent, dateStr: string) => {
    e.preventDefault();
    if (!activeDayInput.title.trim()) return;

    await addTask({
      title: activeDayInput.title.trim(),
      dueDate: dateStr,
      priority: "MEDIUM",
    });

    setActiveDayInput({ dateStr: "", title: "" });
  };

  // Handle subtask toggle
  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const subtasks = Array.isArray(task.subtasks) ? [...task.subtasks] : [];
    const updatedSubtasks = subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    const allCompleted = updatedSubtasks.every((st) => st.completed);
    await updateTask(taskId, {
      subtasks: updatedSubtasks,
      status: allCompleted ? "COMPLETED" : "TODO",
    });
  };

  return (
    <div className="space-y-8 select-none">
      {/* 1. Header & Navigation Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-2xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              المُخَطِّطُ الأسبوعي
            </h1>
            <SyncStatusBadge />
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            هندسة وجدولة مهام الأسبوع، إدارة الوقت، ودورات التركيز العميق بدون أي تأخير شبكي.
          </p>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Week Switcher */}
          <div className="flex items-center bg-zinc-900/90 border border-zinc-800 rounded-2xl p-1 shadow-inner">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="الأسبوع السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCurrentWeek}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              الأسبوع الحالي
            </button>
            <button
              type="button"
              onClick={handleNextWeek}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="الأسبوع القادم"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Sound Toggle Button */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-2.5 rounded-2xl border transition-colors cursor-pointer ${
              soundEnabled
                ? "bg-violet-500/10 border-violet-500/30 text-violet-300 hover:bg-violet-500/20"
                : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
            title={soundEnabled ? "كتم الأصوات" : "تفعيل الأصوات التفاعلية"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Shortcuts Help */}
          <button
            type="button"
            onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
            className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="اختصارات لوحة المفاتيح (?)"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Shortcuts Helper Modal */}
      {showShortcutsHelp && (
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-violet-500/30 shadow-xl flex items-center justify-between text-xs text-zinc-300 animate-in fade-in">
          <div className="flex items-center gap-6 flex-wrap">
            <span className="font-bold text-violet-300 flex items-center gap-1.5">
              <Keyboard className="w-4 h-4" />
              <span>اختصارات الإنتاجية السريعة:</span>
            </span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono">A</kbd> إضافة مهمة سريعة</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono">P</kbd> إيقاف/استئناف مؤقت التركيز</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono">D</kbd> إتمام المهمة النشطة</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono">Esc</kbd> خروج من التركيز العميق</span>
          </div>
          <button
            type="button"
            onClick={() => setShowShortcutsHelp(false)}
            className="text-zinc-500 hover:text-zinc-300 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Weekly High-Precision Analytics Dashboard (Reference Parity) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Planned vs Completed Hours */}
        <div className="p-5 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>ساعات العمل الأسبوعية</span>
            <Clock className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              {weeklyMetrics.totalCompletedHours}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              / {weeklyMetrics.totalPlannedHours} س
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{
                width: `${weeklyMetrics.totalPlannedHours > 0 ? Math.min(100, Math.round((weeklyMetrics.totalCompletedHours / weeklyMetrics.totalPlannedHours) * 100)) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Metric 2: Multi-Week Streak (سلسلة الالتزام) */}
        <div className="p-5 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>سلسلة الالتزام (Streak)</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-300 font-mono">
              {streak}
            </span>
            <span className="text-xs text-zinc-500">أيام متصلة (إنجاز ≥80%)</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            الأيام ذات معدل إنجاز عالي تصنع الأثر الحقيقي
          </p>
        </div>

        {/* Metric 3: Peak Day (اليوم الذهبي) */}
        <div className="p-5 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>اليوم الذهبي (Peak Day)</span>
            <Trophy className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-300 font-mono">
              {weeklyMetrics.peakDayName}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              ({weeklyMetrics.peakDayHours} س)
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">
            أعلى أيام أسبوعك تركيزاً وإنتاجية
          </p>
        </div>

        {/* Metric 4: Tasks Ratio */}
        <div className="p-5 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>نسبة إنجاز المهام</span>
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              {weeklyMetrics.overallPercent}%
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              ({weeklyMetrics.completedTasksCount} / {weeklyMetrics.totalTasksCount})
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-500"
              style={{ width: `${weeklyMetrics.overallPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. 7-Day Weekly Planner Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3.5 items-start">
        {plannerDays.map((day) => (
          <div
            key={day.dateStr}
            className={`rounded-3xl border flex flex-col justify-between p-3.5 transition-all min-h-[460px] ${
              day.isToday
                ? "bg-zinc-950/90 border-violet-500/40 shadow-xl shadow-violet-950/20"
                : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700/80"
            }`}
          >
            {/* Day Header */}
            <div className="space-y-2 pb-3 border-b border-zinc-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-black ${day.isToday ? "text-violet-300" : "text-zinc-200"}`}>
                    {day.dayName}
                  </span>
                  {day.isToday && (
                    <span className="px-1.5 py-0.2 rounded-full bg-violet-500/20 text-violet-300 text-[9px] font-bold">
                      اليوم
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-zinc-400">
                  {day.formattedDayNumber} {day.formattedMonthName}
                </span>
              </div>

              {/* Progress & Count Bar */}
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span className="font-mono">
                  {day.completedCount}/{day.totalCount} منجز
                </span>
                <span className="font-mono text-zinc-400">
                  {Math.round((day.plannedMinutes / 60) * 10) / 10} س
                </span>
              </div>

              <div className="w-full h-1 rounded-full bg-zinc-900 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    day.completionPercent >= 80 ? "bg-emerald-500" : "bg-violet-500"
                  }`}
                  style={{ width: `${day.completionPercent}%` }}
                />
              </div>
            </div>

            {/* Task Cards List */}
            <div className="flex-1 space-y-2.5 my-3 overflow-y-auto max-h-[500px] pr-0.5">
              {day.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  todayStr={day.dateStr}
                  onToggleStatus={() => toggleTaskStatus(task.id)}
                  onEdit={() => {}}
                  onPostpone={() => postponeTask(task.id, 1)}
                  onDelete={() => deleteTask(task.id)}
                  onArchive={(id: string, archived: boolean) =>
                    updateTask(id, { isArchived: archived })
                  }
                  onOpenZen={() => setSelectedTaskForZen(task)}
                  onToggleSubtask={handleToggleSubtask}
                />
              ))}

              {day.tasks.length === 0 && (
                <div className="py-12 text-center text-[11px] text-zinc-600 space-y-1">
                  <span>لا توجد مهام</span>
                </div>
              )}
            </div>

            {/* Bottom Quick Inline Task Creator */}
            <div className="pt-2 border-t border-zinc-900">
              {activeDayInput.dateStr === day.dateStr ? (
                <form
                  onSubmit={(e) => handleInlineSubmit(e, day.dateStr)}
                  className="space-y-1.5"
                >
                  <input
                    type="text"
                    autoFocus
                    placeholder="عنوان المهمة..."
                    value={activeDayInput.title}
                    onChange={(e) =>
                      setActiveDayInput({ dateStr: day.dateStr, title: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-violet-500/40 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveDayInput({ dateStr: "", title: "" })}
                      className="px-2 py-1 rounded-lg text-[10px] text-zinc-400 hover:text-white"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-[10px] font-bold text-white shadow"
                    >
                      إضافة
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveDayInput({ dateStr: day.dateStr, title: "" })}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-zinc-400 hover:text-violet-300 hover:bg-zinc-900/80 border border-dashed border-zinc-800 hover:border-violet-500/30 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة مهمة</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 4. Category Time Distribution & 12-Week Heatmap (Reference Parity) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Tag/Category Time Distribution */}
        <div className="p-6 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <Tag className="w-4 h-4 text-violet-400" />
              <span>توزيع وقت التصنيفات للأسبوع</span>
            </h3>
            <span className="text-xs font-mono text-zinc-500">
              {weeklyMetrics.tagDistribution.length} تصنيفات
            </span>
          </div>

          <div className="space-y-3">
            {weeklyMetrics.tagDistribution.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium">{item.tag}</span>
                  <span className="text-zinc-400 font-mono">
                    {item.hours} س ({item.percent}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}

            {weeklyMetrics.tagDistribution.length === 0 && (
              <div className="py-8 text-center text-xs text-zinc-500">
                لا توجد تصنيفات مستخدمة هذا الأسبوع بعد.
              </div>
            )}
          </div>
        </div>

        {/* Right: 12-Week Commitment Heatmap */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>خريطة الالتزام والإنجاز (آخر 12 أسبوعاً)</span>
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <span>أقل</span>
              <span className="w-2.5 h-2.5 rounded-sm bg-zinc-900 border border-zinc-800" />
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-950/60 border border-emerald-900/60" />
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-700/80" />
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span>أكثر</span>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="flex flex-wrap gap-1.5 pt-2">
            {heatmap.map((cell, idx) => {
              const bgClass =
                cell.level === 3
                  ? "bg-emerald-500 shadow-sm shadow-emerald-500/20"
                  : cell.level === 2
                  ? "bg-emerald-700/80"
                  : cell.level === 1
                  ? "bg-emerald-950/60 border border-emerald-900/60"
                  : "bg-zinc-900 border border-zinc-800/60";

              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-sm transition-transform hover:scale-125 cursor-pointer ${bgClass}`}
                  title={`${cell.dateStr}: ${cell.count} مهام منجزة`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Zen Focus Overlay Modal */}
      {selectedTaskForZen && (
        <ZenFocusModal
          isOpen={!!selectedTaskForZen}
          onClose={() => setSelectedTaskForZen(null)}
          task={selectedTaskForZen}
          onTaskCompleted={(id) => {
            toggleTaskStatus(id);
            setSelectedTaskForZen(null);
          }}
        />
      )}
    </div>
  );
}
