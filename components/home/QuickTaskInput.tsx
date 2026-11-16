"use client";

import { useState, useRef } from "react";
import { Plus, Clock, Flag, Calendar, MoreHorizontal, ArrowLeft } from "lucide-react";
import { soundManager } from "@/lib/audio";
import { TaskPriorityType } from "@/lib/validations/task";

interface QuickTaskInputProps {
  onAddTask: (taskData: {
    title: string;
    priority?: TaskPriorityType;
    dueDate?: string | null;
    startTime?: string | null;
    durationMinutes?: number | null;
  }) => Promise<void> | void;
  todayStr: string;
  onOpenFullModal?: () => void;
}

export default function QuickTaskInput({
  onAddTask,
  todayStr,
  onOpenFullModal,
}: QuickTaskInputProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriorityType>("MEDIUM");
  const [isScheduledForToday, setIsScheduledForToday] = useState(true);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || isSubmitting) return;

    setIsSubmitting(true);
    soundManager.playClick();

    try {
      await onAddTask({
        title: cleanTitle,
        priority,
        dueDate: isScheduledForToday ? todayStr : null,
        durationMinutes: durationMinutes || null,
      });

      setTitle("");
      // Reset options back to defaults
      setPriority("MEDIUM");
      setIsScheduledForToday(true);
      setDurationMinutes(null);
      setShowOptions(false);
      inputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-md focus-within:border-violet-500/70 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all p-2.5 sm:p-3 space-y-2.5"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="submit"
          disabled={!title.trim() || isSubmitting}
          className="flex items-center justify-center w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 disabled:hover:bg-violet-600 shadow-md shadow-violet-600/20 transition-all shrink-0 cursor-pointer"
          aria-label="إضافة مهمة سريعة"
        >
          <Plus className="w-4 h-4" />
        </button>

        <input
          id="quick-task-input"
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ما الذي عليك إنجازه اليوم؟ (اكتب واضغط Enter)..."
          maxLength={200}
          className="flex-1 bg-transparent text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
        />

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className={`p-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
              showOptions
                ? "bg-zinc-800 border-zinc-700 text-zinc-200"
                : "bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
            title="خيارات إضافية للمهمة"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {onOpenFullModal && (
            <button
              type="button"
              onClick={onOpenFullModal}
              className="px-2.5 py-1 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-white text-[11px] font-medium transition-colors hidden sm:inline-flex items-center gap-1 cursor-pointer"
            >
              <span>مهمة متقدمة</span>
              <ArrowLeft className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Fast Options Chips */}
      {showOptions && (
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60 flex-wrap text-xs animate-in fade-in duration-150">
          {/* Due Date chip */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-400">الموعد:</span>
            <button
              type="button"
              onClick={() => setIsScheduledForToday(true)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                isScheduledForToday
                  ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                  : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
              }`}
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => setIsScheduledForToday(false)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                !isScheduledForToday
                  ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                  : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
              }`}
            >
              مفتوحة (بدون موعد)
            </button>
          </div>

          <div className="w-px h-4 bg-zinc-800 mx-1 hidden sm:block" />

          {/* Priority chips */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-400">الأولوية:</span>
            {[
              { val: "LOW", label: "منخفضة" },
              { val: "MEDIUM", label: "متوسطة" },
              { val: "HIGH", label: "عالية" },
              { val: "URGENT", label: "قصوى" },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setPriority(p.val as TaskPriorityType)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  priority === p.val
                    ? p.val === "URGENT"
                      ? "bg-red-500/20 text-red-300 border border-red-500/40"
                      : p.val === "HIGH"
                      ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                      : "bg-violet-600/20 text-violet-300 border border-violet-500/40"
                    : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-zinc-800 mx-1 hidden sm:block" />

          {/* Planned Duration chips */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-400">المدة:</span>
            {[15, 25, 45, 60].map((dur) => (
              <button
                key={dur}
                type="button"
                onClick={() => setDurationMinutes(durationMinutes === dur ? null : dur)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  durationMinutes === dur
                    ? "bg-indigo-600/25 text-indigo-300 border border-indigo-500/40"
                    : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
                }`}
              >
                {dur}د
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

