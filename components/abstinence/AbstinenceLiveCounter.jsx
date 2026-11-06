"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Flame,
  Clock,
  Calendar,
  Edit2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import { calculateAbstinenceDuration, formatArabicDateTime } from "@/lib/dates";

export default function AbstinenceLiveCounter({
  tracker,
  timezone = "Asia/Riyadh",
  onOpenRelapseModal,
  onOpenEditStartModal,
}) {
  const activeSession = tracker?.activeSession;
  const startedAt = activeSession?.startedAt;

  // Local live tick: updates every 1000ms
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!activeSession || !startedAt) {
    return (
      <div className="p-8 rounded-3xl bg-zinc-950/60 border border-zinc-800/80 text-center space-y-3">
        <p className="text-sm text-zinc-400">لا توجد جلسة امتناع نشطة لهذا الهدف.</p>
      </div>
    );
  }

  // Exact real-time duration based on true timestamps
  const duration = calculateAbstinenceDuration(startedAt, null, nowMs);

  // Target progress calculation
  const targetDays = tracker.targetDays;
  let targetProgressPercent = 0;
  let daysRemainingToTarget = 0;

  if (targetDays && targetDays > 0) {
    const targetSeconds = targetDays * 86400;
    targetProgressPercent = Math.min(
      100,
      Math.round((duration.totalSeconds / targetSeconds) * 100)
    );
    daysRemainingToTarget = Math.max(0, targetDays - duration.days);
  }

  const formattedStart = formatArabicDateTime(startedAt, timezone);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-[#14101d] to-zinc-950 border border-violet-500/30 p-6 sm:p-8 shadow-2xl space-y-6">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Header Info */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-zinc-400">جلسة الامتناع النشطة:</span>
              <h2 className="text-lg sm:text-xl font-black text-zinc-100">{tracker.name}</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-violet-400" />
                <span>بدأت في: {formattedStart.fullStr}</span>
              </span>
              <button
                type="button"
                onClick={onOpenEditStartModal}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-400 hover:text-violet-300 hover:underline transition-colors"
                title="تعديل تاريخ ووقت بداية الامتناع"
              >
                <Edit2 className="w-3 h-3" />
                <span>تعديل البداية</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Button: Relapse */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenRelapseModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/40 text-rose-300 text-xs sm:text-sm font-bold shadow-lg shadow-rose-950/30 transition-all active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-rose-400" />
            <span>تسجيل انتكاسة</span>
          </button>
        </div>
      </div>

      {/* Prominent Digital Counter Grid */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Days */}
        <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 shadow-inner">
          <span className="text-3xl sm:text-5xl font-black font-mono text-zinc-100 tracking-tight">
            {duration.days}
          </span>
          <span className="text-xs sm:text-sm font-bold text-zinc-400 mt-1">
            {duration.days === 1
              ? "يوم مكتمل"
              : duration.days === 2
              ? "يومان مكتملان"
              : duration.days <= 10
              ? "أيام مكتملة"
              : "يوم مكتمل"}
          </span>
        </div>

        {/* Hours */}
        <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 shadow-inner">
          <span className="text-3xl sm:text-5xl font-black font-mono text-violet-300 tracking-tight">
            {String(duration.hours).padStart(2, "0")}
          </span>
          <span className="text-xs sm:text-sm font-bold text-zinc-400 mt-1">ساعة</span>
        </div>

        {/* Minutes */}
        <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 shadow-inner">
          <span className="text-3xl sm:text-5xl font-black font-mono text-violet-300 tracking-tight">
            {String(duration.minutes).padStart(2, "0")}
          </span>
          <span className="text-xs sm:text-sm font-bold text-zinc-400 mt-1">دقيقة</span>
        </div>

        {/* Seconds */}
        <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 shadow-inner">
          <span className="text-3xl sm:text-5xl font-black font-mono text-rose-400 tracking-tight">
            {String(duration.seconds).padStart(2, "0")}
          </span>
          <span className="text-xs sm:text-sm font-bold text-zinc-400 mt-1">ثانية</span>
        </div>
      </div>

      {/* Text summary & Target progress bar */}
      <div className="relative z-10 space-y-3 pt-2 border-t border-zinc-800/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm gap-2">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium">إجمالي مدة الامتناع المتواصلة:</span>
            <span className="font-bold text-zinc-100">{duration.formattedArabic}</span>
          </div>

          {targetDays && (
            <div className="flex items-center gap-2 text-violet-300 font-medium">
              <Target className="w-4 h-4 text-violet-400" />
              <span>
                الهدف: {targetDays} يوماً ({targetProgressPercent}% منجز)
              </span>
            </div>
          )}
        </div>

        {targetDays && (
          <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 via-rose-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${targetProgressPercent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

