"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  CheckCircle2,
  X,
  Clock,
  Sparkles,
  Plus,
  AlertCircle,
  Timer,
  ArrowRightLeft,
  Calendar,
} from "lucide-react";
import { soundManager } from "@/lib/audio";
import { LocalTask } from "@/lib/local-db";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const TIMER_STORAGE_KEY = "athar_active_task_timer_v2";

export interface ActiveTaskSession {
  taskId: string;
  taskTitle: string;
  startedAt: number; // UTC timestamp ms
  accumulatedSeconds: number;
  isRunning: boolean;
  plannedDurationMinutes?: number | null;
}

interface TaskTimerWidgetProps {
  onCompleteTask: (taskId: string) => void;
  onPostponeTask?: (taskId: string, days?: number) => void;
}

function formatDuration(totalSeconds: number): string {
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
}: TaskTimerWidgetProps) {
  const [session, setSession] = useState<ActiveTaskSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isExtendingOpen, setIsExtendingOpen] = useState(false);
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);
  const [incomingInterruptTask, setIncomingInterruptTask] = useState<LocalTask | null>(null);
  const intervalRef = useRef<any>(null);
  const sessionRef = useRef<ActiveTaskSession | null>(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const startTaskSession = useCallback((task: LocalTask) => {
    const now = Date.now();
    const newSession: ActiveTaskSession = {
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
          // eslint-disable-next-line react-hooks/set-state-in-effect
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
    const handleStartEvent = (e: any) => {
      const task: LocalTask = e.detail;
      if (!task) return;

      // Check if another task is actively running -> Interrupt Policy
      if (sessionRef.current && sessionRef.current.isRunning && sessionRef.current.taskId !== task.id) {
        soundManager.playInterrupt();
        setIncomingInterruptTask(task);
        return;
      }

      startTaskSession(task);
    };

    window.addEventListener("athar_start_task_timer", handleStartEvent as any);
    return () => window.removeEventListener("athar_start_task_timer", handleStartEvent as any);
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

  const saveSession = (updated: ActiveTaskSession | null) => {
    if (!updated) {
      localStorage.removeItem(TIMER_STORAGE_KEY);
      setSession(null);
      setElapsed(0);
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

    const updated: ActiveTaskSession = {
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
    const updated: ActiveTaskSession = {
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

  const handleExtend = (extraMinutes: number) => {
    if (!session) return;
    const currentPlanned = session.plannedDurationMinutes || Math.ceil(elapsed / 60);
    const updated: ActiveTaskSession = {
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
    <div className="w-full p-4 rounded-3xl bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-zinc-900 border border-violet-500/30 shadow-xl backdrop-blur-xl animate-in slide-in-from-top duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Task Info & Live Counter */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/40 text-violet-300 shrink-0">
            <Timer className={`w-6 h-6 ${session.isRunning ? "animate-pulse" : ""}`} />
            {session.isRunning && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-950 animate-ping" />
            )}
          </div>

          <div className="space-y-0.5 text-right">
            <div className="flex items-center gap-2">
              <span className="text-xs text-violet-400 font-bold uppercase tracking-wider">
                المهمة الجارية الآن
              </span>
              {isOvertime && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  تجاوز الوقت المخطط (+{Math.floor((elapsed - plannedSeconds) / 60)}د)
                </span>
              )}
            </div>

            <h3 className="text-sm sm:text-base font-extrabold text-white truncate max-w-xs sm:max-w-md">
              {session.taskTitle}
            </h3>
          </div>
        </div>

        {/* Counter Display & Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          {/* Big Time Display */}
          <div className="font-mono text-2xl sm:text-3xl font-black text-white tracking-tight px-3 py-1 rounded-2xl bg-zinc-950/80 border border-zinc-800">
            {formatDuration(elapsed)}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {session.isRunning ? (
              <button
                type="button"
                onClick={handlePause}
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
                title="إيقاف مؤقت"
              >
                <Pause className="w-4 h-4 fill-zinc-200" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResume}
                className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-md shadow-violet-600/30 cursor-pointer"
                title="استئناف"
              >
                <Play className="w-4 h-4 fill-white" />
              </button>
            )}

            <button
              type="button"
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
              title="إنجاز المهمة وتسجيل الوقت"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden sm:inline">إنجاز</span>
            </button>

            {/* Extend Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExtendingOpen(!isExtendingOpen)}
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                title="تمديد الوقت المخطط للمهمة"
              >
                <Plus className="w-4 h-4" />
              </button>

              {isExtendingOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsExtendingOpen(false)} />
                  <div className="absolute left-0 bottom-full mb-2 w-36 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-1.5 z-40 space-y-1 text-xs text-right">
                    <span className="text-[10px] text-zinc-400 px-2 py-1 block">تمديد الوقت:</span>
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

            <button
              type="button"
              onClick={handleCancel}
              className="p-2.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="إلغاء المؤقت"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Interrupt Policy Modal */}
      {incomingInterruptTask && (
        <Modal
          isOpen={true}
          onClose={() => setIncomingInterruptTask(null)}
          title="بدء مؤقت مهمة جديدة"
          maxWidth="md"
        >
          <div className="space-y-4 text-right">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-medium text-amber-200">يوجد مؤقت يعمل حالياً:</p>
                <p className="text-zinc-100 mt-0.5 font-bold">«{session?.taskTitle}»</p>
                <p className="text-zinc-400 mt-1">
                  تريد بدء: <span className="text-emerald-400 font-medium">«{incomingInterruptTask.title}»</span>
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (session) onCompleteTask(session.taskId);
                  startTaskSession(incomingInterruptTask);
                  setIncomingInterruptTask(null);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-all cursor-pointer font-medium text-xs"
              >
                <span>إنهاء المهمة الحالية والبدء في الجديدة</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  handleExtend(15);
                  if (onPostponeTask) onPostponeTask(incomingInterruptTask.id, 1);
                  setIncomingInterruptTask(null);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 hover:bg-zinc-800 transition-all cursor-pointer font-medium text-xs"
              >
                <span>تمديد الحالية (+15 دقيقة) وتأجيل الجديدة</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  startTaskSession(incomingInterruptTask);
                  setIncomingInterruptTask(null);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-850/60 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-all cursor-pointer text-xs"
              >
                <span>استبدال المؤقت فقط دون إكمال الحالية</span>
                <ArrowRightLeft className="w-4 h-4 text-zinc-400" />
              </button>

              <button
                type="button"
                onClick={() => setIncomingInterruptTask(null)}
                className="w-full p-2.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all cursor-pointer text-xs"
              >
                إلغاء والاحتفاظ بالمؤقت الحالي
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Cancel Dialog */}
      <ConfirmDialog
        isOpen={isConfirmCancelOpen}
        onClose={() => setIsConfirmCancelOpen(false)}
        onConfirm={() => {
          saveSession(null);
          soundManager.playClick();
          setIsConfirmCancelOpen(false);
        }}
        title="إلغاء مؤقت المهمة"
        description="هل أنت متأكد من إلغاء مؤقت المهمة الحالية دون إكمالها؟ لن يُحفظ أي وقت."
        confirmLabel="إلغاء المؤقت"
        cancelLabel="تراجع"
        isDestructive={true}
      />
    </div>
  );
}

export function triggerStartTaskTimer(task: LocalTask) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("athar_start_task_timer", {
        detail: task,
      })
    );
  }
}
