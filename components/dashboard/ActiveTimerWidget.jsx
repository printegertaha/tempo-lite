"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  CheckCircle2,
  X,
  Clock,
  Sparkles,
  Loader2,
  Timer,
} from "lucide-react";
import { logDurationSession } from "@/actions/entries";

function formatSeconds(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ActiveTimerWidget({
  durationTrackers = [],
  dailyEntries = [],
  selectedDate,
  onSessionLogged,
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [selectedTrackerId, setSelectedTrackerId] = useState("");
  const [subject, setSubject] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const intervalRef = useRef(null);

  // Initialize selectedTrackerId if durationTrackers exist
  useEffect(() => {
    if (!selectedTrackerId && durationTrackers.length > 0) {
      setSelectedTrackerId(durationTrackers[0].id);
    }
  }, [durationTrackers, selectedTrackerId]);

  // Timer interval
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  // Compute total duration logged today across all duration entries
  const totalCompletedDurationSeconds = dailyEntries.reduce(
    (acc, e) => acc + (e.valueDuration || 0),
    0
  );

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleFinish = async () => {
    if (elapsed < 10) {
      if (!confirm("مدة الجلسة قصيرة جداً (أقل من 10 ثوانٍ)، هل تريد حفظها؟")) {
        setIsRunning(false);
        setElapsed(0);
        return;
      }
    }

    setIsSaving(true);
    setIsRunning(false);

    try {
      if (selectedTrackerId) {
        await logDurationSession({
          trackerId: selectedTrackerId,
          durationSeconds: elapsed,
          localDate: selectedDate,
          subject: subject.trim() || undefined,
        });
      }
      setElapsed(0);
      setSubject("");
      if (onSessionLogged) {
        onSessionLogged();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (confirm("هل أنت متأكد من إلغاء هذه الجلسة دون حفظ؟")) {
      setIsRunning(false);
      setElapsed(0);
    }
  };

  const activeTracker = durationTrackers.find((t) => t.id === selectedTrackerId);

  // If no timer is active or running, show only the launch button
  if (!isRunning && elapsed === 0) {
    return (
      <div className="flex items-center justify-start">
        <button
          type="button"
          onClick={handleStart}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-zinc-950/70 hover:bg-zinc-900 border border-zinc-800/80 hover:border-violet-500/40 text-zinc-200 hover:text-white text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95 group cursor-pointer"
        >
          <span className="w-7 h-7 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition-all shadow-inner">
            <Play className="w-3.5 h-3.5 fill-current" />
          </span>
          <span>بدء جلسة تركيز حر</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border transition-all p-4 ${
        isRunning
          ? "bg-violet-950/20 border-violet-500/40 shadow-xl shadow-violet-950/20"
          : "bg-zinc-950/60 border-zinc-800/80"
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Tracker Picker & Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
              isRunning
                ? "bg-violet-500 text-white animate-pulse"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400"
            }`}
          >
            <Timer className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {durationTrackers.length > 0 ? (
                <select
                  value={selectedTrackerId}
                  onChange={(e) => setSelectedTrackerId(e.target.value)}
                  disabled={isRunning}
                  className="bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:border-violet-500"
                >
                  {durationTrackers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-bold text-zinc-200">جلسة تركيز حر</span>
              )}

              {isRunning && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 font-semibold animate-pulse">
                  جارية الآن
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="الموضوع أو المهمة (اختياري)..."
                className="text-[11px] bg-transparent text-zinc-300 placeholder-zinc-500 focus:outline-none border-b border-transparent focus:border-zinc-700 w-36 sm:w-48"
              />
            </div>
          </div>
        </div>

        {/* Center: Digital Time Display */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-right">
            <div className="font-mono text-2xl font-black text-zinc-100 tracking-wider">
              {formatSeconds(elapsed)}
            </div>
            <div className="text-[10px] text-zinc-500">
              إجمالي اليوم: {formatSeconds(totalCompletedDurationSeconds)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isRunning ? (
              <button
                type="button"
                onClick={handleStart}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/20 transition-all active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{elapsed > 0 ? "استئناف" : "بدء الجلسة"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all active:scale-95"
              >
                <Pause className="w-3.5 h-3.5 fill-amber-300" />
                <span>إيقاف مؤقت</span>
              </button>
            )}

            {elapsed > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all active:scale-95"
                  title="إنهاء وحفظ الجلسة"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>حفظ</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors"
                  title="إلغاء المؤقت"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

