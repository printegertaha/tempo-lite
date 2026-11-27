"use client";

import { useState, useEffect, useRef } from "react";
import { X, Link2, ListTree, CheckCircle2, Square } from "lucide-react";
import YouTubePreviewCard, {
  type YouTubeMeta,
} from "@/components/tasks/YouTubePreviewCard";

interface SubtaskItem {
  id: string;
  title: string;
  completed?: boolean;
}

interface TaskTimerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  links: YouTubeMeta[];
  subtasks: SubtaskItem[];
}

export default function TaskTimerInfoModal({
  isOpen,
  onClose,
  taskTitle,
  links,
  subtasks,
}: TaskTimerInfoModalProps) {
  const [activeTab, setActiveTab] = useState<"links" | "subtasks">("links");
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    if (!dialog.open) {
      dialog.showModal();
    }
    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-[#0c0e17] border border-zinc-800 shadow-2xl p-5 text-zinc-100 backdrop:bg-black/75 backdrop:backdrop-blur-md"
    >
      <div className="space-y-4 text-right">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-zinc-100 truncate">
              {taskTitle}
            </h4>
            <p className="text-[11px] text-zinc-400">تفاصيل ومرفقات المهمة</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector Tabs (User chooses Links OR Subtasks, never mixed) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("links")}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "links"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>الروابط ({links.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("subtasks")}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "subtasks"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ListTree className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span>المهام الفرعية ({subtasks.length})</span>
          </button>
        </div>

        {/* Selected Section Content */}
        <div className="max-h-72 overflow-y-auto space-y-2 pr-0.5">
          {activeTab === "links" ? (
            links.map((yt) => (
              <YouTubePreviewCard key={yt.videoId || yt.url} meta={yt} compact />
            ))
          ) : (
            subtasks.map((st) => (
              <div
                key={st.id}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 text-xs"
              >
                {st.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-zinc-600 shrink-0" />
                )}
                <span
                  className={
                    st.completed
                      ? "line-through text-zinc-500"
                      : "text-zinc-200 font-medium"
                  }
                >
                  {st.title}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </dialog>
  );
}
