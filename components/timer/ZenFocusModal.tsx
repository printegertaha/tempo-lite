"use client";

import { useEffect, useState } from "react";
import {
  Minimize2,
  Trash2,
  Info,
  Play,
  Pause,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { useActiveTimer } from "@/hooks/useActiveTimer";
import { normalizeYouTubeMetaList } from "@/components/tasks/YouTubePreviewCard";
import TaskTimerInfoModal from "@/components/timer/TaskTimerInfoModal";

interface ZenFocusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestCancel?: () => void;
  task: any;
  onTaskCompleted?: (taskId: string) => void;
}

export default function ZenFocusModal({
  isOpen,
  onClose,
  onRequestCancel,
  task,
  onTaskCompleted,
}: ZenFocusModalProps) {
  const {
    session,
    zenState,
    pause,
    resume,
    resetZenPhase,
    complete,
    cancel,
  } = useActiveTimer();

  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const isRunning = Boolean(session?.isRunning);
  const { secondsRemaining, isBreak, completedCycles, progressPercent } = zenState;

  const taskLinks = normalizeYouTubeMetaList(
    session?.youtubeMeta ?? task?.youtubeMeta
  );
  const taskSubtasks = Array.isArray(session?.subtasks)
    ? session.subtasks
    : Array.isArray(task?.subtasks)
      ? task.subtasks
      : [];
  const showInfoButton = taskLinks.length > 0 && taskSubtasks.length > 0;

  // Lock background page scroll while Zen Focus Modal is open
  useEffect(() => {
    if (!isOpen || !task) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, task]);

  // Handle Keyboard Shortcuts (P = pause/resume, D = complete, Esc = minimize back to bar)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key.toLowerCase() === "p") {
        if (isRunning) pause();
        else resume();
      } else if (e.key.toLowerCase() === "d" && task) {
        void complete().then(() => {
          onTaskCompleted?.(task.id);
        });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, isRunning, onClose, task, onTaskCompleted, pause, resume, complete]);

  if (!isOpen || !task) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const handleComplete = async () => {
    await complete();
    onTaskCompleted?.(task.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#08090d]/95 backdrop-blur-2xl text-zinc-100 p-4 select-none">
      {/* Ambient background glows */}
      <div
        className={`absolute w-[600px] h-[600px] rounded-full blur-[160px] pointer-events-none transition-colors duration-1000 ${
          isBreak ? "bg-emerald-600/10" : "bg-violet-600/15"
        }`}
      />

      {/* Top Controls Bar */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-400">
          <span>وضع التركيز</span>
        </div>

        <div className="flex items-center gap-2">
          {showInfoButton && (
            <button
              type="button"
              onClick={() => setIsInfoOpen(true)}
              className="p-2.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="الروابط والمهام الفرعية"
              aria-label="الروابط والمهام الفرعية"
            >
              <Info className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="تصغير إلى الشريط العلوي (Esc)"
            aria-label="تصغير إلى الشريط العلوي"
          >
            <Minimize2 className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (onRequestCancel) {
                onRequestCancel();
              } else {
                void cancel();
              }
            }}
            className="p-2.5 rounded-2xl bg-zinc-900/80 hover:bg-red-500/15 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
            title="إلغاء المؤقت"
            aria-label="إلغاء المؤقت"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Stage */}
      <div className="relative z-10 max-w-lg w-full flex flex-col items-center text-center space-y-8">
        {/* Mode Pill */}


        {/* Task Title */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {task.title}
          </h1>
          {task.description && (
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Big Circular / Tabular Countdown Timer */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-zinc-900"
              strokeWidth="4"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              className={`transition-all duration-1000 ${
                isBreak ? "text-emerald-500" : "text-violet-500"
              }`}
              strokeWidth="5"
              strokeDasharray={276}
              strokeDashoffset={276 - (276 * progressPercent) / 100}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>

          <div className="flex flex-col items-center">
            <span className="text-5xl sm:text-6xl font-mono font-black tracking-wider text-white">
              {timeFormatted}
            </span>
            {Boolean(task?.isPomodoro) && (
              <span className="text-xs text-zinc-500 font-mono mt-2">
                الدورات المنجزة: {completedCycles}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <button
            type="button"
            onClick={() => (isRunning ? pause() : resume())}
            className={`p-4 max-[410px]:p-3 rounded-3xl max-[410px]:rounded-2xl font-bold shadow-xl transition-all active:scale-95 cursor-pointer shrink-0 ${
              isRunning
                ? "bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800"
                : "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/30"
            }`}
            title="إيقاف / استئناف (P)"
          >
            {isRunning ? (
              <Pause className="w-6 h-6 max-[410px]:w-5 max-[410px]:h-5" />
            ) : (
              <Play className="w-6 h-6 max-[410px]:w-5 max-[410px]:h-5 fill-current" />
            )}
          </button>

          <button
            type="button"
            onClick={handleComplete}
            className="flex items-center gap-2 max-[410px]:gap-1.5 px-6 py-4 max-[410px]:px-4 max-[410px]:py-3 rounded-3xl max-[410px]:rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm max-[410px]:text-xs shadow-xl shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            title="إتمام المهمة الآن (D)"
          >
            <CheckCircle2 className="w-5 h-5 max-[410px]:w-4 max-[410px]:h-4 shrink-0" />
            <span>إتمام المهمة</span>
          </button>

          <button
            type="button"
            onClick={resetZenPhase}
            className="p-4 max-[410px]:p-3 rounded-3xl max-[410px]:rounded-2xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors cursor-pointer shrink-0"
            title="إعادة ضبط العداد"
          >
            <RotateCcw className="w-5 h-5 max-[410px]:w-4 max-[410px]:h-4" />
          </button>
        </div>

        {/* Keyboard shortcut tips (only on large screens with physical keyboard) */}
        <div className="hidden lg:flex items-center justify-center gap-4 text-[11px] text-zinc-500 pt-4 border-t border-zinc-900 w-full">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">P</kbd>{" "}
            إيقاف/استئناف
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">D</kbd>{" "}
            إتمام
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">Esc</kbd>{" "}
            تصغير
          </span>
        </div>
      </div>

      {showInfoButton && (
        <TaskTimerInfoModal
          isOpen={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
          taskTitle={task.title}
          links={taskLinks}
          subtasks={taskSubtasks}
        />
      )}
    </div>
  );
}
