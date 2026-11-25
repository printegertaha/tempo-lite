"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Play,
  Pause,
  GripVertical,
  MoreVertical,
  Calendar,
  Copy,
  Trash2,
  Edit2,
  ListTree,
} from "lucide-react";
import TruncatedTaskTitle from "@/components/tasks/TruncatedTaskTitle";

function formatCompactPausedTime(seconds = 0) {
  const safe = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function TaskCardItem({
  task,
  onToggleStatus,
  onStartTimer,
  onResumeTimer,
  pausedTimerSeconds = null,
  onEdit,
  onPostpone,
  onCopy,
  onDelete,
  isDraggable = true,
  dragHandleProps,
}) {
  const isTimerPausedHere = pausedTimerSeconds !== null && task.status !== "COMPLETED";
  const isCompleted = task.status === "COMPLETED";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const completedSubtasksCount = subtasks.filter((s) => s.completed).length;

  const handleCheck = (e) => {
    e.stopPropagation();
    onToggleStatus(task.id);
  };

  const priorityColor = {
    LOW: "bg-zinc-800/80 text-zinc-400 border-zinc-700/60",
    MEDIUM: "bg-blue-500/10 text-blue-300 border-blue-500/25",
    HIGH: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    URGENT: "bg-red-500/15 text-red-300 border-red-500/30",
  }[task.priority || "MEDIUM"];

  const priorityLabel = {
    LOW: "منخفضة",
    MEDIUM: "متوسطة",
    HIGH: "عالية",
    URGENT: "قصوى",
  }[task.priority || "MEDIUM"];

  return (
    <article
      className={`group relative rounded-2xl border transition-all duration-150 p-4 sm:p-5 text-right space-y-3 ${
        isCompleted
          ? "bg-zinc-950/40 border-zinc-850 opacity-60 line-through"
          : "bg-zinc-900/70 hover:bg-zinc-900 border-zinc-800 shadow-sm hover:border-zinc-750"
      }`}
    >
      <div className="flex items-start justify-between gap-2.5 min-w-0">
        {/* Right side: Checkbox & Responsive Single-Line Title */}
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={handleCheck}
            className="mt-0.5 p-0.5 rounded-lg text-zinc-500 hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
            aria-label={isCompleted ? "تراجع عن إكمال المهمة" : "إكمال المهمة"}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <Circle className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300" />
            )}
          </button>

          <div className="flex-1 min-w-0 space-y-1">
            <TruncatedTaskTitle
              title={task.title}
              isCompleted={isCompleted}
              isExpanded={isExpanded}
              onToggleExpand={() => setIsExpanded((prev) => !prev)}
              size="sm"
            />

            {/* Paused Timer Status Indicator */}
            {isTimerPausedHere && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                <Pause className="w-2.5 h-2.5" />
                <span>متوقفة مؤقتاً</span>
                <span dir="ltr" className="font-mono text-amber-200">
                  {formatCompactPausedTime(pausedTimerSeconds)}
                </span>
              </div>
            )}

            {/* Description (1 compact line by default, expands with title) */}
            {task.description && (
              <p
                className={`text-xs text-zinc-400 leading-relaxed ${
                  isExpanded ? "whitespace-pre-wrap break-words" : "truncate"
                }`}
              >
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Left side: Drag handle & Action Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Resume button when paused, else Start Timer Trigger */}
          {isTimerPausedHere && onResumeTimer ? (
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
                className="p-2 rounded-xl bg-violet-600/10 hover:bg-violet-600/25 border border-violet-500/20 text-violet-300 hover:text-white transition-colors cursor-pointer"
                title="بدء مؤقت التركيز لهذه المهمة"
              >
                <Play className="w-4 h-4 fill-violet-300" />
              </button>
            )
          )}

          {/* Action Dropdown Menu Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              aria-label="خيارات المهمة"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute left-0 mt-1 w-44 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-1.5 z-30 space-y-0.5 text-right text-xs">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onEdit(task);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>تعديل التفاصيل</span>
                    </button>
                  )}

                  {onPostpone && !isCompleted && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onPostpone(task.id, 1);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>تأجيل لبكرة</span>
                    </button>
                  )}

                  {onCopy && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onCopy(task);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ المهمة</span>
                    </button>
                  )}

                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onDelete(task.id);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف المهمة</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Drag Grip Handle with touch-none for smooth mobile reordering */}
          {isDraggable && (
            <div
              {...dragHandleProps}
              className="p-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none select-none"
              title="سحب لإعادة الترتيب"
              aria-label="سحب لإعادة الترتيب"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      {/* Meta Pills (Time, Duration, Priority, Subtasks) */}
      <div className="flex items-center gap-2 flex-wrap text-[11px] pt-0.5">
        {/* Priority Badge */}
        {task.priority && (
          <span
            className={`px-2 py-0.5 rounded-lg font-semibold border ${priorityColor}`}
          >
            {priorityLabel}
          </span>
        )}

        {/* Scheduled Start Time */}
        {task.startTime && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-300 font-mono">
            <Clock className="w-3 h-3 text-indigo-400" />
            <span>{task.startTime}</span>
          </span>
        )}

        {/* Planned Duration */}
        {task.durationMinutes && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-400">
            <span>{task.durationMinutes} دقيقة</span>
          </span>
        )}

        {/* Subtasks Count */}
        {subtasks.length > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-400 font-mono">
            <ListTree className="w-3 h-3 text-violet-400" />
            <span>
              {completedSubtasksCount}/{subtasks.length}
            </span>
          </span>
        )}

        {/* Life Area Category if attached */}
        {task.lifeArea && (
          <span
            className="px-2 py-0.5 rounded-lg text-xs font-medium border"
            style={{
              backgroundColor: `rgba(139, 92, 246, 0.08)`,
              borderColor: `rgba(139, 92, 246, 0.25)`,
              color: "#c4b5fd",
            }}
          >
            {task.lifeArea.name}
          </span>
        )}
      </div>
    </article>
  );
}
