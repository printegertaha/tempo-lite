"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  CheckCircle2,
  X,
  Timer,
  Plus,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { soundManager } from "@/lib/audio";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const TIMER_STORAGE_KEY = "athar_active_task_timer_v2";

export function triggerStartTaskTimer(task) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("athar_start_task_timer", { detail: task })
    );
  }
}

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TaskTimerWidget({
  onCompleteTask,
  onPostponeTask,
}) {
  const [session, setSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [isExtendingOpen, setIsExtendingOpen] = useState(false);
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [incomingInterruptTask, setIncomingInterruptTask] = useState(null);

  const intervalRef = useRef(null);
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const startTaskSession = useCallback((task) => {
    const now = Date.now();
    const newSession = {
      taskId: task.id,
      taskTitle: task.title,
      startedAt: now,
      accumulatedSeconds: 0,
      isRunning: true,
      plannedDurationMinutes: task.durationMinutes || null,
    };

    setSession(newSession);
    setElapsed(0);
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(newSession));
    soundManager.playTaskStart();
  }, []);

  // Restore saved active timer session from storage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIMER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.taskId) {
          setSession(parsed);
          const accumulated = parsed.accumulatedSeconds || 0;
          if (parsed.isRunning && parsed.startedAt) {
            const currentSession = Math.max(0, Math.floor((Date.now() - parsed.startedAt) / 1000));
            setElapsed(accumulated + currentSession);
          } else {
            setElapsed(accumulated);
          }
        }
      }
    } catch {}
  }, []);

  // Listen for custom trigger from other components
  useEffect(() => {
    const handleStartEvent = (e) => {
      const task = e.detail;
      if (!task) return;

      // Check if another task is actively running -> Interrupt Policy
      if (sessionRef.current && sessionRef.current.isRunning && sessionRef.current.taskId !== task.id) {
        soundManager.playInterrupt();
        setIncomingInterruptTask(task);
        return;
      }

      startTaskSession(task);
    };

    window.addEventListener("athar_start_task_timer", handleStartEvent);
    return () => window.removeEventListener("athar_start_task_timer", handleStartEvent);
  }, [startTaskSession]);

  // High-precision timestamp interval calculation
  useEffect(() => {
    if (session?.isRunning) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const startedAt = session.startedAt || now;
        const currentSession = Math.max(0, Math.floor((now - startedAt) / 1000));
        setElapsed((session.accumulatedSeconds || 0) + currentSession);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session]);

  const saveSession = (updated) => {
    if (!updated) {
      localStorage.removeItem(TIMER_STORAGE_KEY);
      setSession(null);
      setElapsed(0);
      setIsFocusMode(false);
    } else {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(updated));
      setSession(updated);
    }
  };

  const handlePause = () => {
    if (!session || !session.isRunning) return;
    const now = Date.now();
    const currentSession = Math.max(0, Math.floor((now - session.startedAt) / 1000));
    const newAccumulated = (session.accumulatedSeconds || 0) + currentSession;

    const updated = {
      ...session,
      isRunning: false,
      startedAt: 0,
      accumulatedSeconds: newAccumulated,
    };

    saveSession(updated);
    setElapsed(newAccumulated);
    soundManager.playClick();
  };

  const handleResume = () => {
    if (!session || session.isRunning) return;
    const now = Date.now();
    const updated = {
      ...session,
      isRunning: true,
      startedAt: now,
    };
    saveSession(updated);
    soundManager.playTaskStart();
  };

  const handleFinish = () => {
    if (!session) return;
    onCompleteTask(session.taskId);
    soundManager.playTaskDone();
    saveSession(null);
  };

  const handleCancel = () => {
    setIsConfirmCancelOpen(true);
  };

  const handleExtend = (extraMinutes) => {
    if (!session) return;
    const currentPlanned = session.plannedDurationMinutes || Math.ceil(elapsed / 60);
    const updated = {
      ...session,
      plannedDurationMinutes: currentPlanned + extraMinutes,
    };
    saveSession(updated);
    setIsExtendingOpen(false);
    soundManager.playClick();
  };

  if (!session) return null;

  const plannedSeconds = (session.plannedDurationMinutes || 0) * 60;
  const isOvertime = plannedSeconds > 0 && elapsed > plannedSeconds;

  return (
    <>
      {/* ----------------------------------------------------------------- */}
      {/* Sticky Top Active Running Task Bar (All Devices: Mobile & Desktop) */}
      {/* ----------------------------------------------------------------- */}
      <div className="sticky top-0 z-30 w-full bg-[#090b11]/95 border-b border-violet-500/30 backdrop-blur-2xl px-4 py-2.5 shadow-xl shadow-black/50 animate-in slide-in-from-top duration-200">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Right: Task Info & Live Indicator */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/40 text-violet-300 shrink-0">
              <Timer className={`w-5 h-5 ${session.isRunning ? "animate-pulse" : ""}`} />
              {session.isRunning && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-zinc-950 animate-ping" />
              )}
            </div>

            <div className="space-y-0.5 text-right min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs text-violet-400 font-bold uppercase tracking-wider">
                  المهمة الجارية الآن
                </span>
                {isOvertime && (
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                    +{Math.floor((elapsed - plannedSeconds) / 60)}د إضافي
                  </span>
                )}
              </div>

              <h3 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {session.taskTitle}
              </h3>
            </div>
          </div>

          {/* Left: Counter Display, Action Controls & Focus Mode Trigger */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            {/* Live Timer Display */}
            <div className="font-mono text-xl sm:text-2xl font-black text-white tracking-tight px-3 py-1 rounded-xl bg-zinc-950/80 border border-zinc-800">
              {formatDuration(elapsed)}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Pause / Resume */}
              {session.isRunning ? (
                <button
                  type="button"
                  onClick={handlePause}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 transition-colors cursor-pointer"
                  title="إيقاف مؤقت"
                >
                  <Pause className="w-4 h-4 fill-zinc-200" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResume}
                  className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-md shadow-violet-600/30 cursor-pointer"
                  title="استئناف"
                >
                  <Play className="w-4 h-4 fill-white" />
                </button>
              )}

              {/* Complete Task */}
              <button
                type="button"
                onClick={handleFinish}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
                title="إنجاز المهمة وتسجيل الوقت"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="hidden sm:inline">إنجاز</span>
              </button>

              {/* Extend Planned Time */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsExtendingOpen(!isExtendingOpen)}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 transition-colors cursor-pointer"
                  title="تمديد الوقت المخطط للمهمة"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {isExtendingOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsExtendingOpen(false)}
                    />
                    <div className="absolute left-0 top-full mt-2 w-36 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-1.5 z-40 space-y-1 text-xs text-right">
                      <span className="text-[10px] text-zinc-400 px-2 py-1 block">
                        تمديد الوقت:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleExtend(15)}
                        className="w-full text-right px-2.5 py-1.5 rounded-lg text-zinc-200 hover:bg-zinc-800 transition-colors"
                      >
                        + 15 دقيقة
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExtend(30)}
                        className="w-full text-right px-2.5 py-1.5 rounded-lg text-zinc-200 hover:bg-zinc-800 transition-colors"
                      >
                        + 30 دقيقة
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Dedicated Focus Mode Trigger Button */}
              <button
                type="button"
                onClick={() => setIsFocusMode(true)}
                className="p-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 hover:text-white transition-all cursor-pointer"
                title="فتح وضع التركيز الكامل (Focus Mode)"
                aria-label="وضع التركيز الكامل"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              {/* Cancel Timer Button */}
              <button
                type="button"
                onClick={handleCancel}
                className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                title="إلغاء المؤقت"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Dedicated Task "Focus Mode" Full-Screen Distraction-Free Overlay  */}
      {/* ----------------------------------------------------------------- */}
      {isFocusMode && (
        <div className="fixed inset-0 z-50 bg-[#09090b] flex flex-col justify-between p-6 sm:p-12 text-zinc-100 select-none animate-in fade-in duration-200">
          {/* Top Bar: Corner Minimize / Exit Focus Mode Icon Button */}
          <div className="flex items-center justify-between w-full max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-violet-400 font-bold text-xs sm:text-sm tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-ping" />
              <span>وضع التركيز العميق</span>
            </div>
            <button
              type="button"
              onClick={() => setIsFocusMode(false)}
              className="p-3 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="تصغير / إنهاء وضع التركيز"
              aria-label="تصغير وضع التركيز"
            >
              <Minimize2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Center Display: 1. Task Title (large, centered) + 2. Live Countdown/Stopwatch Timer */}
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-3xl mx-auto space-y-8 my-auto w-full px-4">
            <div className="space-y-3">
              <span className="inline-block px-3.5 py-1 rounded-full bg-violet-600/15 border border-violet-500/25 text-violet-300 text-xs font-semibold">
                المهمة الجارية
              </span>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-snug">
                {session.taskTitle}
              </h1>
            </div>

            {/* Live Timer Large Typography */}
            <div className="font-mono text-6xl sm:text-8xl md:text-9xl font-black text-white tracking-tight drop-shadow-2xl select-none">
              {formatDuration(elapsed)}
            </div>

            {isOvertime && (
              <div className="px-4 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs sm:text-sm font-bold animate-pulse">
                تجاوز الوقت المخطط (+{Math.floor((elapsed - plannedSeconds) / 60)} دقيقة)
              </div>
            )}
          </div>

          {/* Bottom Bar: 3. Core Task Action Buttons (Pause/Resume, Complete, +Time, Cancel) */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto w-full pb-4">
            {/* Pause / Resume */}
            {session.isRunning ? (
              <button
                type="button"
                onClick={handlePause}
                className="flex-1 py-3.5 px-5 rounded-2xl bg-zinc-850 hover:bg-zinc-800 text-white font-bold flex items-center justify-center gap-2 text-sm border border-zinc-750 transition-all cursor-pointer active:scale-95"
              >
                <Pause className="w-5 h-5 fill-white" />
                <span>إيقاف مؤقت</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResume}
                className="flex-1 py-3.5 px-5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-violet-600/30 transition-all cursor-pointer active:scale-95"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>استئناف</span>
              </button>
            )}

            {/* Complete */}
            <button
              type="button"
              onClick={() => {
                setIsFocusMode(false);
                handleFinish();
              }}
              className="flex-1 py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>إنجاز</span>
            </button>

            {/* +Time Extend */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExtendingOpen(!isExtendingOpen)}
                className="p-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition-all cursor-pointer active:scale-95"
                title="تمديد الوقت (+15د / +30د)"
              >
                <Plus className="w-5 h-5" />
              </button>
              {isExtendingOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsExtendingOpen(false)}
                  />
                  <div className="absolute left-0 bottom-full mb-2 w-36 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-1.5 z-40 space-y-1 text-xs text-right">
                    <span className="text-[10px] text-zinc-400 px-2 py-1 block">
                      تمديد الوقت:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleExtend(15)}
                      className="w-full text-right px-2.5 py-1.5 rounded-lg text-zinc-200 hover:bg-zinc-800 transition-colors"
                    >
                      + 15 دقيقة
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExtend(30)}
                      className="w-full text-right px-2.5 py-1.5 rounded-lg text-zinc-200 hover:bg-zinc-800 transition-colors"
                    >
                      + 30 دقيقة
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Cancel */}
            <button
              type="button"
              onClick={handleCancel}
              className="p-3.5 rounded-2xl bg-zinc-900 hover:bg-red-500/10 border border-zinc-800 text-zinc-400 hover:text-red-400 transition-all cursor-pointer active:scale-95"
              title="إلغاء المؤقت"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Confirm Cancel Timer Dialog */}
      {isConfirmCancelOpen && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setIsConfirmCancelOpen(false)}
          onConfirm={() => {
            saveSession(null);
            setIsConfirmCancelOpen(false);
          }}
          title="إلغاء المؤقت"
          description="هل أنت متأكد من إلغاء جلسة المؤقت الحالية دون حفظ الوقت المنقضي؟"
          confirmLabel="نعم، إلغاء"
          cancelLabel="متابعة العمل"
          isDestructive={true}
        />
      )}

      {/* Interrupt Switch Session Dialog */}
      {incomingInterruptTask && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setIncomingInterruptTask(null)}
          onConfirm={() => {
            startTaskSession(incomingInterruptTask);
            setIncomingInterruptTask(null);
          }}
          title="تبديل المهمة النشطة"
          description={`هناك مؤقت نشط بالفعل لمهمة "${session.taskTitle}". هل تريد إيقافه وبدء مؤقت جديد لمهمة "${incomingInterruptTask.title}"؟`}
          confirmLabel="بدء المؤقت الجديد"
          cancelLabel="إبقاء المهمة الحالية"
          isDestructive={false}
        />
      )}
    </>
  );
}
