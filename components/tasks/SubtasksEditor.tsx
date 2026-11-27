"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, GripVertical, X } from "lucide-react";

export interface SubtaskItem {
  id: string;
  title: string;
  completed: boolean;
}

interface SubtasksEditorProps {
  subtasks: SubtaskItem[];
  onChange: (next: SubtaskItem[]) => void;
}

export default function SubtasksEditor({ subtasks, onChange }: SubtasksEditorProps) {
  const [draftTitle, setDraftTitle] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const hasText = draftTitle.trim().length > 0;

  const handleAdd = () => {
    const clean = draftTitle.trim();
    if (!clean) return;
    const nextItem: SubtaskItem = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: clean,
      completed: false,
    };
    onChange([...(Array.isArray(subtasks) ? subtasks : []), nextItem]);
    setDraftTitle("");
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    } else {
      inputRef.current?.focus();
    }
  };

  const handleToggle = (id: string) => {
    onChange(
      subtasks.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleDelete = (id: string) => {
    onChange(subtasks.filter((s) => s.id !== id));
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= subtasks.length) return;
    const next = [...subtasks];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
  };

  const handleDrop = (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...subtasks];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    onChange(next);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-zinc-200">المهام الفرعية</span>
        <span className="font-mono text-zinc-400">{subtasks.length}</span>
      </div>

      {/* Input with glowing Checkmark on far left */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="أضف مهمة فرعية (مثال: قاعدة لامي)..."
          className="w-full pr-3.5 pl-10 py-2.5 rounded-xl bg-zinc-950/70 border border-zinc-700/80 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!hasText}
          aria-label="إضافة مهمة فرعية"
          className={`absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
            hasText
              ? "bg-emerald-500/25 hover:bg-emerald-500/40 border-emerald-400/60 text-emerald-300 shadow-sm shadow-emerald-500/25 cursor-pointer"
              : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500 opacity-50 cursor-not-allowed"
          }`}
        >
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>

      {/* Subtasks List (Title only, drag & arrow reorder) */}
      {subtasks.length > 0 && (
        <div className="space-y-1.5 max-h-44 overflow-y-auto pt-1">
          {subtasks.map((st, idx) => {
            const isDragging = dragIndex === idx;
            const isDragOver = dragOverIndex === idx && dragIndex !== idx;
            return (
              <div
                key={st.id}
                draggable
                onDragStart={(e) => {
                  setDragIndex(idx);
                  if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(idx));
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverIndex !== idx) setDragOverIndex(idx);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(idx);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
                className={`flex items-center justify-between gap-2 py-1.5 px-2 rounded-xl border text-xs transition-all ${
                  isDragging
                    ? "opacity-50 bg-zinc-900 border-zinc-700"
                    : isDragOver
                      ? "bg-teal-500/10 border-teal-500/40"
                      : "bg-transparent border-transparent hover:bg-zinc-950/50"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing shrink-0"
                    title="اسحب لإعادة الترتيب"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </span>
                  <span
                    onClick={() => handleToggle(st.id)}
                    className={`truncate cursor-pointer select-none ${
                      st.completed ? "line-through text-zinc-500" : "text-zinc-200"
                    }`}
                  >
                    {st.title}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMove(idx, "up")}
                    disabled={idx === 0}
                    aria-label="تحريك لأعلى"
                    className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-25 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(idx, "down")}
                    disabled={idx === subtasks.length - 1}
                    aria-label="تحريك لأسفل"
                    className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-25 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(st.id)}
                    aria-label="حذف المهمة الفرعية"
                    className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
