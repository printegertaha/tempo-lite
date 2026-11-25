"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  Flame,
  MoreVertical,
  Edit2,
  Trash2,
  Archive,
  RotateCcw,
  Tag,
  Link2,
  Folder,
  FastForward,
  Maximize2,
  Play,
  Pause,
  CheckSquare,
  Square,
  Coffee,
  Repeat
} from "lucide-react";
import { formatArabicDueDate } from "@/lib/dates";
import TruncatedTaskTitle from "@/components/tasks/TruncatedTaskTitle";

const PRIORITY_CONFIG = {
  URGENT: {
    label: "عاجلة",
    color: "text-red-400 bg-red-500/10 border-red-500/30",
    badge: "border-red-500/40 text-red-300",
    glow: "shadow-red-500/10",
  },
  HIGH: {
    label: "مرتفعة",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    badge: "border-amber-500/40 text-amber-300",
    glow: "shadow-amber-500/10",
  },
  MEDIUM: {
    label: "متوسطة",
    color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    badge: "border-sky-500/30 text-sky-300",
    glow: "shadow-sky-500/5",
  },
  LOW: {
    label: "منخفضة",
    color: "text-zinc-400 bg-zinc-800/60 border-zinc-700/30",
    badge: "border-zinc-700 text-zinc-400",
    glow: "",
  },
};

export default function TaskCard({
  task,
  todayStr,
  onToggleStatus,
  onEdit,
  onPostpone,
  onDelete,
  onArchive,
  onOpenZen,
  onStartTimer,
  onResumeTimer,
  pausedTimerSeconds = null,
  onToggleSubtask,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [postponeMenuOpen, setPostponeMenuOpen] = useState(false);
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);
  const [titleExpanded, setTitleExpanded] = useState(false);

  const isCompleted = task.status === "COMPLETED";
  const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
  const dueInfo = formatArabicDueDate(task.dueDate, todayStr);

  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const completedSubtasksCount = subtasks.filter((s) => s.completed).length;

  const handleToggle = (e) => {
    e.stopPropagation();
    onToggleStatus(task.id);
  };

  const handlePostponeClick = (days) => {
    setPostponeMenuOpen(false);
    setMenuOpen(false);
    if (onPostpone) {
      onPostpone(task.id, days);
    }
  };

  return (
    <article
      className={`group relative rounded-2xl border transition-all duration-200 bg-zinc-950/75 p-5 sm:p-6 min-h-[184px] flex flex-col justify-between h-full ${
        isCompleted
          ? "border-zinc-800/50 opacity-60 bg-zinc-900/20"
          : dueInfo.isOverdue
          ? "border-red-950/60 hover:border-red-500/40 bg-red-950/5 shadow-md shadow-red-950/20"
          : dueInfo.isToday
          ? "border-amber-950/60 hover:border-amber-500/40 bg-amber-950/5"
          : "border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50 hover:shadow-xl hover:shadow-black/50"
      }`}
    >
      <div className="min-w-0">
        {/* Top Header: Checkbox + Full-Width Uniform Title */}
        <div className="flex items-start gap-2.5 min-w-0">
          {/* Large Touch Target Completion Checkbox */}
          <button
            type="button"
            onClick={handleToggle}
            className={`mt-0.5 shrink-0 transition-transform active:scale-90 p-0.5 cursor-pointer ${
              isCompleted
                ? "text-emerald-400 hover:text-emerald-300"
                : dueInfo.isOverdue
                ? "text-red-400 hover:text-red-300"
                : "text-zinc-500 hover:text-violet-400"
            }`}
            aria-label={isCompleted ? "إعادة فتح المهمة" : "إتمام المهمة"}
            title={isCompleted ? "إعادة فتح المهمة" : "إتمام المهمة"}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 fill-emerald-500/10 text-emerald-400" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>

          <TruncatedTaskTitle
            title={task.title}
            isCompleted={isCompleted}
            isExpanded={titleExpanded}
            onToggleExpand={() => setTitleExpanded((prev) => !prev)}
            size="md"
          />
        </div>

        {/* Badges bar */}
        <div className="flex items-center gap-2 flex-wrap mt-3">
              {/* Priority Indicator */}
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${priorityInfo.color}`}
              >
                {priorityInfo.label}
              </span>

              {/* Start Time Badge */}
              {task.startTime && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">
                  <Clock className="w-2.5 h-2.5 text-zinc-400" />
                  <span>{task.startTime}</span>
                </span>
              )}

              {/* Duration / Pomodoro Badge */}
              {task.isPomodoro ? (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 font-mono">
                  <Flame className="w-2.5 h-2.5 text-violet-400" />
                  <span>{task.workCycle || 25}+{task.breakCycle || 5}د بومودورو</span>
                </span>
              ) : task.durationMinutes ? (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
                  <span>{task.durationMinutes} دقيقة</span>
                </span>
              ) : null}

              {/* Due Date Indicator */}
              {task.dueDate && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-mono flex items-center gap-1 ${
                    dueInfo.isOverdue
                      ? "bg-red-500/15 border-red-500/40 text-red-400 font-bold animate-pulse"
                      : dueInfo.isToday
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold"
                      : "bg-zinc-800/60 border-zinc-700/40 text-zinc-400"
                  }`}
                >
                  <Calendar className="w-2.5 h-2.5" />
                  <span>{dueInfo.label}</span>
                </span>
              )}

              {/* Recurring Badge */}
              {task.isRecurring && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300"
                  title="مهمة دورية تتكرر أسبوعياً"
                >
                  <Repeat className="w-2.5 h-2.5" />
                  <span>دورية</span>
                </span>
              )}

              {/* Paused Timer Status Badge */}
              {pausedTimerSeconds !== null && !isCompleted && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 font-bold">
                  <Pause className="w-2.5 h-2.5" />
                  <span>متوقفة مؤقتاً</span>
                  <span dir="ltr" className="font-mono text-amber-200">
                    {`${String(Math.floor(pausedTimerSeconds / 60)).padStart(2, "0")}:${String(
                      pausedTimerSeconds % 60
                    ).padStart(2, "0")}`}
                  </span>
                </span>
              )}
            </div>

            {/* Description (uniform 1-line unless title card is expanded) */}
            {task.description && (
              <p
                className={`text-xs mt-2 leading-relaxed ${
                  titleExpanded
                    ? "whitespace-pre-wrap break-words"
                    : "truncate"
                } ${
                  isCompleted ? "text-zinc-600 line-through" : "text-zinc-400"
                }`}
              >
                {task.description}
              </p>
            )}

            {/* Sub-tasks checklist progress */}
            {subtasks.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setSubtasksExpanded(!subtasksExpanded)}
                  className="w-full flex items-center justify-between text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-violet-400" />
                    <span>المهام الفرعية:</span>
                    <span className="font-mono font-bold text-zinc-300">
                      {completedSubtasksCount} / {subtasks.length}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {subtasksExpanded ? "إخفاء" : "عرض"}
                  </span>
                </button>

                {/* Progress bar */}
                <div className="w-full h-1 rounded-full bg-zinc-900 mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${(completedSubtasksCount / subtasks.length) * 100}%`,
                    }}
                  />
                </div>

                {/* Expanded Subtasks */}
                {subtasksExpanded && (
                  <div className="mt-2 space-y-1.5 pl-2">
                    {subtasks.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => onToggleSubtask && onToggleSubtask(task.id, st.id)}
                        className="flex items-center gap-2 text-xs text-zinc-300 hover:text-white cursor-pointer py-0.5"
                      >
                        {st.completed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                        )}
                        <span className={st.completed ? "line-through text-zinc-500" : ""}>
                          {st.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
      </div>

      {/* Unified Card Footer: Life Area / Tags + Action Controls */}
      <footer className="flex items-center justify-between gap-2.5 mt-4 pt-3.5 border-t border-zinc-900">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
          {task.lifeArea && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 max-w-[130px] truncate">
              <Folder className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
              <span className="truncate">{task.lifeArea.name}</span>
            </span>
          )}
          {Array.isArray(task.tags) &&
            task.tags.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 max-w-[90px] truncate"
              >
                <Tag className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{tag}</span>
              </span>
            ))}
        </div>

        {/* Action Controls (Fixed clean toolbar baseline across all cards) */}
        <div className="flex items-center gap-1 shrink-0">
            {/* Resume Paused Timer OR Start Stopwatch Timer Button */}
            {pausedTimerSeconds !== null && onResumeTimer && !isCompleted ? (
              <button
                type="button"
                onClick={() => onResumeTimer(task)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-200 text-[11px] font-bold transition-colors cursor-pointer"
                title="استئناف المؤقت المتوقف"
              >
                <Play className="w-3.5 h-3.5 fill-amber-300" />
                <span>استئناف</span>
              </button>
            ) : (
              onStartTimer &&
              !isCompleted && (
                <button
                  type="button"
                  onClick={() => onStartTimer(task)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                  title="تشغيل مؤقت المهمة"
                >
                  <Play className="w-4 h-4" />
                </button>
              )
            )}

            {/* Zen Mode Button (Focus) */}
            {onOpenZen && !isCompleted && (
              <button
                type="button"
                onClick={() => onOpenZen(task)}
                className="p-2 rounded-xl text-zinc-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors cursor-pointer"
                title="فتح وضع التركيز العميق (Zen Mode)"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}

            {/* Quick Postpone Button */}
            {!isCompleted && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPostponeMenuOpen((prev) => !prev)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/60 transition-colors cursor-pointer"
                  title="تأجيل المهمة"
                >
                  <FastForward className="w-4 h-4" />
                </button>

                {postponeMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setPostponeMenuOpen(false)}
                    />
                  <div
                    className="absolute left-0 mt-1 w-36 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl py-1 z-30 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-2.5 py-1 text-[10px] text-zinc-400 font-semibold border-b border-zinc-800/80">
                      تأجيل المهمة
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePostponeClick(1)}
                      className="w-full text-right px-3 py-1.5 text-zinc-200 hover:bg-zinc-800 hover:text-amber-300 transition-colors"
                    >
                      +1 يوم (غداً)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePostponeClick(3)}
                      className="w-full text-right px-3 py-1.5 text-zinc-200 hover:bg-zinc-800 hover:text-amber-300 transition-colors"
                    >
                      +3 أيام
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePostponeClick(7)}
                      className="w-full text-right px-3 py-1.5 text-zinc-200 hover:bg-zinc-800 hover:text-amber-300 transition-colors"
                    >
                      +أسبوع
                    </button>
                  </div>
                  </>
                )}
              </div>
            )}

            {/* More Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer"
                title="خيارات إضافية"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setMenuOpen(false)}
                  />
                <div
                  className="absolute left-0 mt-1 w-36 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl py-1 z-30 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(task);
                    }}
                    className="w-full text-right px-3 py-1.5 text-zinc-200 hover:bg-zinc-800 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>تعديل</span>
                  </button>

                  {onArchive && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onArchive(task.id, !task.isArchived);
                      }}
                      className="w-full text-right px-3 py-1.5 text-zinc-200 hover:bg-zinc-800 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      {task.isArchived ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                          <span>استعادة</span>
                        </>
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5 text-zinc-400" />
                          <span>أرشفة</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(task.id);
                    }}
                    className="w-full text-right px-3 py-1.5 text-red-400 hover:bg-red-500/10 flex items-center gap-2 border-t border-zinc-800/80 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
                </>
              )}
            </div>
        </div>
      </footer>
    </article>
  );
}
