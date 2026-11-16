"use client";

import { useState } from "react";
import {
  CheckCircle2,
  RotateCcw,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Copy,
  FolderCheck,
} from "lucide-react";
import { LocalTask } from "@/lib/local-db";
import Modal from "@/components/ui/Modal";
import BottomSheet from "@/components/ui/BottomSheet";
import { soundManager } from "@/lib/audio";

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "عالية",
  URGENT: "قصوى",
};

interface CompletedTasksSectionProps {
  completedTasks: LocalTask[];
  onUndoTask?: (taskId: string) => void;
  onDuplicateTask?: (task: LocalTask) => void;
  undoableTaskId?: string | null;
  undoableTaskTitle?: string | null;
  onClearUndo?: () => void;
}

export default function CompletedTasksSection({
  completedTasks,
  onUndoTask,
  onDuplicateTask,
  undoableTaskId,
  undoableTaskTitle,
  onClearUndo,
}: CompletedTasksSectionProps) {
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const count = completedTasks.length;

  const handleUndo = () => {
    if (undoableTaskId && onUndoTask) {
      onUndoTask(undoableTaskId);
      onClearUndo?.();
      soundManager.playClick();
    }
  };

  return (
    <>
      {/* 1. Fast Floating / Inline Undo Toast Notification */}
      {undoableTaskId && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-950 border border-emerald-500/40 text-white shadow-2xl shadow-emerald-950/50">
            <div className="flex items-center gap-2.5 truncate">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-xs truncate">
                تم إكمال «<span className="font-bold">{undoableTaskTitle}</span>»
              </span>
            </div>

            <button
              type="button"
              onClick={handleUndo}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-emerald-300 transition-colors shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تراجع</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Completed Tasks Bar & Counter */}
      {count > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-zinc-300">
              أنجزت <span className="font-bold text-emerald-400 font-mono">{count}</span>{" "}
              {count === 1 ? "مهمة" : count === 2 ? "مهمتان" : "مهام"} اليوم
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <FolderCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>عرض سجل المكتملات</span>
          </button>
        </div>
      )}

      {/* 3. Completed Tasks Modal / Sheet */}
      <BottomSheet
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <span>المهام المكتملة اليوم ({count})</span>
          </div>
        }
      >
        <div className="space-y-3 pt-2">
          {completedTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              لا توجد مهام مكتملة بعد في هذا اليوم
            </div>
          ) : (
            completedTasks.map((task) => {
              const completedTimeStr = task.completedAt
                ? new Date(task.completedAt).toLocaleTimeString("ar-SA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;

              return (
                <div
                  key={task.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-zinc-950/60 border border-zinc-850 text-right"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-zinc-200 line-through truncate">
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-[11px] text-zinc-500 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-zinc-500">
                      {completedTimeStr && (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-zinc-600" />
                          <span>أُنجزت الساعة {completedTimeStr}</span>
                        </span>
                      )}
                      {task.priority && (
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                          {PRIORITY_LABELS[task.priority] || task.priority}
                        </span>
                      )}
                    </div>
                  </div>

                  {onDuplicateTask && (
                    <button
                      type="button"
                      onClick={() => {
                        onDuplicateTask(task);
                        setIsHistoryModalOpen(false);
                      }}
                      className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors shrink-0"
                      title="استنساخ المهمة لإعادة تنفيذها"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </BottomSheet>
    </>
  );
}

