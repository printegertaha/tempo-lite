"use client";

import { useEffect, useRef } from "react";
import { Timer, Minus, Plus } from "lucide-react";

const MAX_DURATION_MINUTES = 10080; // 7 days

export function formatDurationReadableAr(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(Number(totalMinutes || 0)));
  if (safe === 0) return "0 دقيقة";

  const days = Math.floor(safe / 1440);
  const hours = Math.floor((safe % 1440) / 60);
  const mins = safe % 60;

  const parts: string[] = [];
  if (days > 0) {
    parts.push(days === 1 ? "يوم" : days === 2 ? "يومان" : `${days} أيام`);
  }
  if (hours > 0) {
    parts.push(hours === 1 ? "ساعة" : hours === 2 ? "ساعتان" : `${hours} ساعات`);
  }
  if (mins > 0) {
    parts.push(mins === 1 ? "دقيقة" : mins === 2 ? "دقيقتان" : `${mins} دقيقة`);
  }
  return parts.join(" و ");
}

interface DurationStepperProps {
  value: number;
  onChange: (minutes: number) => void;
}

export default function DurationStepper({ value, onChange }: DurationStepperProps) {
  const current = Math.max(1, Math.min(MAX_DURATION_MINUTES, Math.round(Number(value || 60))));
  const currentRef = useRef(current);
  currentRef.current = current;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didRepeatRef = useRef(false);

  const stopHold = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
  };

  useEffect(() => stopHold, []);

  const applyDelta = (delta: number) => {
    const next = Math.max(1, Math.min(MAX_DURATION_MINUTES, currentRef.current + delta));
    currentRef.current = next;
    onChangeRef.current(next);
  };

  const startHold = (direction: 1 | -1) => {
    stopHold();
    didRepeatRef.current = false;

    holdTimeoutRef.current = setTimeout(() => {
      didRepeatRef.current = true;
      applyDelta(direction * 1);
      repeatIntervalRef.current = setInterval(() => {
        applyDelta(direction * 1);
      }, 65);
    }, 320);
  };

  const handleRelease = (direction: 1 | -1, wasClick: boolean) => {
    const repeated = didRepeatRef.current;
    stopHold();
    if (wasClick && !repeated) {
      applyDelta(direction * 5);
    }
    didRepeatRef.current = false;
  };

  return (
    <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs max-[400px]:text-[11px] max-[360px]:text-[10px] font-medium text-zinc-300 flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <Timer className="w-3.5 h-3.5 text-violet-400 max-[420px]:hidden shrink-0" />
          <span>هتاخد وقت قد إيه؟</span>
        </label>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => applyDelta(1)}
            disabled={current >= MAX_DURATION_MINUTES}
            className="px-2 py-0.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono font-bold text-violet-300 disabled:opacity-40 transition-colors cursor-pointer active:scale-95"
            aria-label="زيادة دقيقة واحدة"
            title="زيادة دقيقة واحدة"
          >
            +1
          </button>
          <button
            type="button"
            onClick={() => applyDelta(-1)}
            disabled={current <= 1}
            className="px-2 py-0.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono font-bold text-zinc-300 disabled:opacity-40 transition-colors cursor-pointer active:scale-95"
            aria-label="إنقاص دقيقة واحدة"
            title="إنقاص دقيقة واحدة"
          >
            -1
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 select-none">
        <button
          type="button"
          onPointerDown={() => startHold(1)}
          onPointerUp={() => handleRelease(1, true)}
          onPointerCancel={() => stopHold()}
          onPointerLeave={() => stopHold()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              applyDelta(5);
            }
          }}
          disabled={current >= MAX_DURATION_MINUTES}
          className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-zinc-200 disabled:opacity-40 cursor-pointer touch-none transition-transform"
          aria-label="زيادة المدة"
          title="ضغطة: +5 دقائق | استمرار الضغط: +1 دقيقة"
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="text-center flex-1 min-w-0">
          <span className="text-sm font-extrabold text-violet-300 block truncate">
            {formatDurationReadableAr(current)}
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            ({current} دقيقة)
          </span>
        </div>

        <button
          type="button"
          onPointerDown={() => startHold(-1)}
          onPointerUp={() => handleRelease(-1, true)}
          onPointerCancel={() => stopHold()}
          onPointerLeave={() => stopHold()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              applyDelta(-5);
            }
          }}
          disabled={current <= 1}
          className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-zinc-200 disabled:opacity-40 cursor-pointer touch-none transition-transform"
          aria-label="إنقاص المدة"
          title="ضغطة: -5 دقائق | استمرار الضغط: -1 دقيقة"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
