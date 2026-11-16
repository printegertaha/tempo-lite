"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Play,
  GripVertical,
  MoreVertical,
  Calendar,
  Copy,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  ListTree,
  Sparkles,
} from "lucide-react";
import { soundManager } from "@/lib/audio";
import { LocalTask } from "@/lib/local-db";

interface TaskCardItemProps {
  task: LocalTask;
  onToggleStatus: (taskId: string) => void;
  onStartTimer?: (task: LocalTask) => void;
  onEdit?: (task: LocalTask) => void;
  onPostpone?: (taskId: string, days?: number, customDate?: string) => void;
  onCopy?: (task: LocalTask) => void;
  onDelete?: (taskId: string) => void;
  isDraggable?: boolean;
  dragHandleProps?: any;
}

export default function TaskCardItem({
  task,
  onToggleStatus,
  onStartTimer,
  onEdit,
  onPostpone,
  onCopy,
  onDelete,
  isDraggable = true,
  dragHandleProps,
}: TaskCardItemProps) {
  const isCompleted = task.status === "COMPLETED";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const completedSubtasksCount = subtasks.filter((s: any) => s.completed).length;

  const handleCheck = (e: React.MouseEvent) => {
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

  // Handle long title safely
  const isLongTitle = (task.title || "").length > 70;
  const displayTitle = isLongTitle && !isExpanded
    ? `${task.title.slice(0, 68)}...`
    : task.title;

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-150 p-3.5 sm:p-4 text-right space-y-2.5 ${
        isCompleted
          ? "bg-zinc-950/40 border-zinc-850 opacity-60 line-through"
          : "bg-zinc-900/70 hover:bg-zinc-900 border-zinc-800 shadow-sm hover:border-zinc-750"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Right side: Checkbox & Title */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
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
            <div className="flex items-start justify-between gap-2">
              <span
                onClick={() => isLongTitle && setIsExpanded(!isExpanded)}
                className={`text-xs sm:text-sm font-semibold text-zinc-100 leading-snug break-words ${
                  isLongTitle ? "cursor-pointer" : ""
                }`}
              >
                {displayTitle}
              </span>

              {isLongTitle && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-zinc-500 hover:text-zinc-300 p-0.5 shrink-0"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>

            {/* Description if present and expanded */}
            {task.description && (
              <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Left side: Drag handle & Action Menu */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Timer Trigger */}
          {onStartTimer && !isCompleted && (
            <button
              type="button"
              onClick={() => onStartTimer(task)}
              className="p-1.5 rounded-xl bg-violet-600/10 hover:bg-violet-600/25 border border-violet-500/20 text-violet-300 hover:text-white transition-colors cursor-pointer"
              title="بدء مؤقت التركيز لهذه المهمة"
            >
              <Play className="w-3.5 h-3.5 fill-violet-300" />
            </button>
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
                <div className="absolute right-0 mt-1 w-44 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-1.5 z-30 space-y-0.5 text-right text-xs">
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

          {/* Drag Grip Handle */}
          {isDraggable && (
            <div
              {...dragHandleProps}
              className="p-1 text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing"
              title="سحب لإعادة الترتيب"
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
        {(task as any).lifeArea && (
          <span
            className="px-2 py-0.5 rounded-lg text-xs font-medium border"
            style={{
              backgroundColor: `rgba(139, 92, 246, 0.08)`,
              borderColor: `rgba(139, 92, 246, 0.25)`,
              color: "#c4b5fd",
            }}
          >
            {(task as any).lifeArea.name}
          </span>
        )}
      </div>
    </div>
  );
}
