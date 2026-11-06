"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  AlertCircle,
  Flame,
  ChevronDown,
  MoreVertical,
  Edit2,
  Trash2,
  Archive,
  RotateCcw,
  Tag,
  Link2,
  Folder,
  ArrowRight,
  FastForward,
} from "lucide-react";
import { formatArabicDueDate } from "@/lib/dates";

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
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [postponeMenuOpen, setPostponeMenuOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isCompleted = task.status === "COMPLETED";
  const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
  const dueInfo = formatArabicDueDate(task.dueDate, todayStr);

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onToggleStatus(task.id);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePostponeClick = async (days) => {
    setPostponeMenuOpen(false);
    setMenuOpen(false);
    if (onPostpone) {
      await onPostpone(task.id, days);
    }
  };

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-200 bg-zinc-950/60 p-4 ${
        isCompleted
          ? "border-zinc-800/60 opacity-60 bg-zinc-900/20"
          : dueInfo.isOverdue
          ? "border-red-950/50 hover:border-red-500/40 bg-red-950/5 shadow-lg shadow-red-950/20"
          : dueInfo.isToday
          ? "border-amber-950/50 hover:border-amber-500/30 bg-amber-950/5"
          : "border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/40"
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Completion Checkbox */}
        <button
          onClick={handleToggle}
          disabled={isUpdating}
          className={`mt-0.5 shrink-0 transition-transform active:scale-90 ${
            isCompleted
              ? "text-emerald-400 hover:text-emerald-300"
              : dueInfo.isOverdue
              ? "text-red-400/80 hover:text-red-400"
              : "text-zinc-500 hover:text-zinc-200"
          }`}
          title={isCompleted ? "إعادة فتح المهمة" : "إتمام المهمة"}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 fill-emerald-500/10" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>

        {/* Task Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`text-sm font-semibold leading-snug transition-colors ${
                isCompleted
                  ? "line-through text-zinc-500"
                  : "text-zinc-100 group-hover:text-white"
              }`}
            >
              {task.title}
            </h3>

            {/* Priority Indicator */}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${priorityInfo.color}`}
            >
              {priorityInfo.label}
            </span>

            {/* Due Date Indicator */}
            {task.dueDate && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border font-mono flex items-center gap-1 ${
                  dueInfo.isOverdue
                    ? "bg-red-500/15 border-red-500/40 text-red-400 font-semibold animate-pulse"
                    : dueInfo.isToday
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold"
                    : "bg-zinc-800/60 border-zinc-700/40 text-zinc-400"
                }`}
              >
                <Calendar className="w-2.5 h-2.5" />
                <span>{dueInfo.label}</span>
              </span>
            )}
          </div>

          {/* Description if present */}
          {task.description && (
            <p
              className={`text-xs mt-1 leading-relaxed whitespace-pre-wrap ${
                isCompleted ? "text-zinc-600 line-through" : "text-zinc-400"
              }`}
            >
              {task.description}
            </p>
          )}

          {/* Metadata badges (Life Area, Linked Tracker, Tags) */}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            {/* Life Area Badge */}
            {task.lifeArea && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
                <Folder className="w-3 h-3 text-zinc-400" />
                <span>{task.lifeArea.name}</span>
              </span>
            )}

            {/* Linked Tracker Badge */}
            {task.tracker && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-300">
                <Link2 className="w-3 h-3 text-violet-400" />
                <span>مرتبط: {task.tracker.name}</span>
              </span>
            )}

            {/* Tags / Labels */}
            {Array.isArray(task.tags) &&
              task.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-zinc-900/80 border border-zinc-800 text-zinc-400"
                >
                  <Tag className="w-2.5 h-2.5 text-zinc-500" />
                  <span>{tag}</span>
                </span>
              ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Quick Postpone Button (+1 day) if not completed */}
          {!isCompleted && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setPostponeMenuOpen((prev) => !prev)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-zinc-800/60 transition-colors"
                title="تأجيل المهمة"
              >
                <FastForward className="w-4 h-4" />
              </button>

              {/* Postpone Popup Menu */}
              {postponeMenuOpen && (
                <div
                  className="absolute left-0 mt-1 w-36 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl py-1 z-30 text-xs"
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
                  <button
                    type="button"
                    onClick={() => {
                      setPostponeMenuOpen(false);
                      onEdit(task);
                    }}
                    className="w-full text-right px-3 py-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border-t border-zinc-800/60 transition-colors"
                  >
                    تاريخ مخصص...
                  </button>
                </div>
              )}
            </div>
          )}

          {/* More Actions Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
              title="خيارات إضافية"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div
                className="absolute left-0 mt-1 w-36 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl py-1 z-30 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(task);
                  }}
                  className="w-full text-right px-3 py-1.5 text-zinc-200 hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>تعديل</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onArchive(task.id, !task.isArchived);
                  }}
                  className="w-full text-right px-3 py-1.5 text-zinc-200 hover:bg-zinc-800 flex items-center gap-2 transition-colors"
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

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(task.id);
                  }}
                  className="w-full text-right px-3 py-1.5 text-red-400 hover:bg-red-500/10 flex items-center gap-2 border-t border-zinc-800/80 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

