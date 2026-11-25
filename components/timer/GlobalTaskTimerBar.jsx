"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import {
  Play,
  Pause,
  CheckCircle2,
  X,
  Timer,
  Plus,
  Maximize2,
  Minimize2,
  PictureInPicture2,
  Sparkles,
} from "lucide-react";
import { useActiveTimer } from "@/hooks/useActiveTimer";
import { formatTimerDuration } from "@/lib/timer/active-timer";
import { loadBubblePrefs, saveBubblePrefs } from "@/lib/timer/bubble-physics";
import FloatingTaskBubble from "@/components/timer/FloatingTaskBubble";
import ZenFocusModal from "@/components/timer/ZenFocusModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const emptySubscribe = () => () => {};

function subscribeReducedMotion(callback) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function GlobalTaskTimerBar() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );

  const {
    session,
    completedSession,
    pendingInterrupt,
    lastNotice,
    elapsedSeconds,
    pause,
    resume,
    setMode,
    extend,
    complete,
    cancel,
    dismissCompleted,
    confirmInterruptAndSwitch,
    dismissInterrupt,
    clearNotice,
  } = useActiveTimer();

  const [isExtendingOpen, setIsExtendingOpen] = useState(false);
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);
  const [isStopwatchFullscreen, setIsStopwatchFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => loadBubblePrefs().isMinimized);
  const [isCollapsingToBubble, setIsCollapsingToBubble] = useState(false);
  const collapseTimerRef = useRef(null);

  useEffect(() => {
    if (!lastNotice) return;
    const t = setTimeout(() => clearNotice(), 4500);
    return () => clearTimeout(t);
  }, [lastNotice, clearNotice]);

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, []);

  if (!mounted) return null;

  const isZenOpen = session?.mode === "zen_pomodoro";
  const plannedSeconds = (session?.plannedDurationMinutes || 0) * 60;
  const isOvertime = plannedSeconds > 0 && elapsedSeconds > plannedSeconds;

  const handleMinimize = () => {
    if (isMinimized || isCollapsingToBubble) return;
    setIsExtendingOpen(false);
    const currentPrefs = loadBubblePrefs();
    saveBubblePrefs({ ...currentPrefs, isMinimized: true });

    if (reducedMotion) {
      setIsMinimized(true);
      return;
    }

    setIsCollapsingToBubble(true);
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = setTimeout(() => {
      setIsCollapsingToBubble(false);
      setIsMinimized(true);
    }, 180);
  };

  const handleRestore = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    setIsCollapsingToBubble(false);
    setIsMinimized(false);
    const currentPrefs = loadBubblePrefs();
    saveBubblePrefs({ ...currentPrefs, isMinimized: false });
  };

  const showActiveBar = Boolean(session && !isZenOpen);
  const showCompletedBar = Boolean(!session && completedSession);
  const hasBarOrBubble = showActiveBar || showCompletedBar;

  return (
    <>
      {/* Switch / Interruption preservation notice */}
      {lastNotice && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-950 border border-violet-500/40 text-zinc-100 shadow-2xl text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
              <span>{lastNotice}</span>
            </div>
            <button
              type="button"
              onClick={clearNotice}
              className="text-zinc-400 hover:text-white p-1"
              aria-label="إغلاق"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STATE A — ORIGINAL EXPANDED TASK BAR (Normal document flow underneath Navbar) */}
      {hasBarOrBubble && !isMinimized && (
        <div
          data-testid="expanded-task-bar"
          className={`relative z-20 w-full backdrop-blur-2xl overflow-visible transition-all ${
            reducedMotion ? "duration-100" : "duration-200"
          } ${
            isCollapsingToBubble
              ? "opacity-0 -translate-y-2 scale-[0.98] pointer-events-none"
              : "athar-timer-bar-enter opacity-100"
          } ${
            showCompletedBar
              ? "bg-[#091411]/95 border-b border-emerald-500/35 shadow-xl shadow-emerald-950/30"
              : "bg-[#090b11]/95 border-b border-violet-500/30 shadow-xl shadow-black/50"
          } px-4 py-2.5`}
        >
          {showActiveBar && session ? (
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Task Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/40 text-violet-300 shrink-0">
                  <Timer
                    className={`w-5 h-5 ${session.isRunning ? "motion-safe:animate-pulse" : ""}`}
                  />
                  {session.isRunning && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-zinc-950 motion-safe:animate-ping" />
                  )}
                </div>

                <div className="space-y-0.5 text-right min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-xs text-violet-400 font-bold uppercase tracking-wider">
                      {session.isRunning ? "المهمة الجارية الآن" : "المؤقت متوقف مؤقتاً"}
                    </span>
                    {isOvertime && (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                        +{Math.floor((elapsedSeconds - plannedSeconds) / 60)}د إضافي
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                    {session.taskTitle}
                  </h3>
                </div>
              </div>

              {/* Counter & Controls */}
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                <div
                  dir="ltr"
                  className="font-mono text-xl sm:text-2xl font-black text-white tracking-tight tabular-nums px-3 py-1 rounded-xl bg-zinc-950/80 border border-zinc-800"
                >
                  {formatTimerDuration(elapsedSeconds)}
                </div>

                <div className="flex items-center gap-1.5">
                  {session.isRunning ? (
                    <button
                      type="button"
                      onClick={pause}
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 transition-colors cursor-pointer"
                      title="إيقاف مؤقت"
                      aria-label="إيقاف المؤقت مؤقتاً"
                    >
                      <Pause className="w-4 h-4 fill-zinc-200" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={resume}
                      className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-md shadow-violet-600/30 cursor-pointer"
                      title="استئناف"
                      aria-label="استئناف المؤقت"
                    >
                      <Play className="w-4 h-4 fill-white" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => complete()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
                    title="إنجاز المهمة وتسجيل الوقت"
                    aria-label="إنجاز المهمة وتسجيل الوقت"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="hidden sm:inline">إنجاز</span>
                  </button>

                  {/* +Time Extend */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsExtendingOpen(!isExtendingOpen)}
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 transition-colors cursor-pointer"
                      title="تمديد الوقت المخطط"
                      aria-label="تمديد الوقت المخطط"
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
                            onClick={() => {
                              extend(15);
                              setIsExtendingOpen(false);
                            }}
                            className="w-full text-right px-2.5 py-1.5 rounded-lg text-zinc-200 hover:bg-zinc-800 transition-colors"
                          >
                            + 15 دقيقة
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              extend(30);
                              setIsExtendingOpen(false);
                            }}
                            className="w-full text-right px-2.5 py-1.5 rounded-lg text-zinc-200 hover:bg-zinc-800 transition-colors"
                          >
                            + 30 دقيقة
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Switch seamlessly into Zen Pomodoro Mode on SAME session */}
                  <button
                    type="button"
                    onClick={() => setMode("zen_pomodoro")}
                    className="p-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 hover:text-white transition-all cursor-pointer"
                    title="وضع التركيز العميق (Zen Mode)"
                    aria-label="وضع التركيز العميق"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>

                  {/* Fullscreen Stopwatch Mode */}
                  <button
                    type="button"
                    onClick={() => setIsStopwatchFullscreen(true)}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white transition-all cursor-pointer"
                    title="ملء الشاشة"
                    aria-label="ملء الشاشة"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>

                  {/* Minimize to Floating Physics Bubble */}
                  <button
                    type="button"
                    data-testid="minimize-task-bar"
                    onClick={handleMinimize}
                    className="p-2 rounded-xl bg-zinc-800/90 hover:bg-violet-600/25 border border-zinc-700/70 hover:border-violet-500/40 text-zinc-300 hover:text-violet-200 transition-all cursor-pointer"
                    title="تصغير إلى فقاعة عائمة"
                    aria-label="تصغير شريط المهمة إلى فقاعة عائمة"
                  >
                    <PictureInPicture2 className="w-4 h-4" />
                  </button>

                  {/* Cancel */}
                  <button
                    type="button"
                    onClick={() => setIsConfirmCancelOpen(true)}
                    className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="إلغاء المؤقت"
                    aria-label="إلغاء المؤقت"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : completedSession ? (
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Completed Task Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>

                <div className="space-y-0.5 text-right min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-xs text-emerald-400 font-bold uppercase tracking-wider">
                      تم إنجاز المهمة بنجاح
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                      مكتملة
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                    {completedSession.taskTitle}
                  </h3>
                </div>
              </div>

              {/* Recorded Duration & Controls */}
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                <div
                  dir="ltr"
                  className="font-mono text-xl sm:text-2xl font-black text-emerald-300 tracking-tight tabular-nums px-3 py-1 rounded-xl bg-zinc-950/80 border border-emerald-500/30"
                >
                  {formatTimerDuration(completedSession.durationSeconds)}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-testid="minimize-completed-bar"
                    onClick={handleMinimize}
                    className="p-2 rounded-xl bg-zinc-800/90 hover:bg-emerald-600/20 border border-zinc-700/70 hover:border-emerald-500/40 text-zinc-300 hover:text-emerald-200 transition-all cursor-pointer"
                    title="تصغير إلى فقاعة عائمة"
                    aria-label="تصغير إشعار المهمة المكتملة إلى فقاعة عائمة"
                  >
                    <PictureInPicture2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    data-testid="dismiss-completed-bar"
                    onClick={dismissCompleted}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/90 hover:bg-zinc-750 border border-zinc-700/80 text-zinc-200 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                    title="إغلاق"
                    aria-label="إغلاق إشعار المهمة المكتملة"
                  >
                    <X className="w-4 h-4" />
                    <span>إغلاق</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* STATE B — MINIMIZED FLOATING PHYSICS BUBBLE */}
      {hasBarOrBubble && isMinimized && (
        <FloatingTaskBubble
          taskTitle={session ? session.taskTitle : completedSession.taskTitle}
          elapsedSeconds={
            session ? elapsedSeconds : completedSession.durationSeconds
          }
          isRunning={Boolean(session?.isRunning)}
          isCompleted={Boolean(!session && completedSession)}
          isOvertime={Boolean(session && isOvertime)}
          reducedMotion={reducedMotion}
          formatDuration={formatTimerDuration}
          onRestore={handleRestore}
          onDismissCompleted={dismissCompleted}
        />
      )}

      {/* Fullscreen Stopwatch Focus Overlay */}
      {session && isStopwatchFullscreen && !isZenOpen && (
        <div className="fixed inset-0 z-50 bg-[#09090b] flex flex-col justify-between p-6 sm:p-12 text-zinc-100 select-none animate-in fade-in duration-200">
          <div className="flex items-center justify-between w-full max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-violet-400 font-bold text-xs sm:text-sm tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500 motion-safe:animate-ping" />
              <span>وضع التركيز العميق</span>
            </div>
            <button
              type="button"
              onClick={() => setIsStopwatchFullscreen(false)}
              className="p-3 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="تصغير"
              aria-label="تصغير وضع ملء الشاشة"
            >
              <Minimize2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-3xl mx-auto space-y-8 my-auto w-full px-4">
            <div className="space-y-3">
              <span className="inline-block px-3.5 py-1 rounded-full bg-violet-600/15 border border-violet-500/25 text-violet-300 text-xs font-semibold">
                المهمة الجارية
              </span>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-snug">
                {session.taskTitle}
              </h1>
            </div>

            <div
              dir="ltr"
              className="font-mono text-6xl sm:text-8xl md:text-9xl font-black text-white tracking-tight tabular-nums drop-shadow-2xl select-none"
            >
              {formatTimerDuration(elapsedSeconds)}
            </div>

            {isOvertime && (
              <div className="px-4 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs sm:text-sm font-bold">
                تجاوز الوقت المخطط (+{Math.floor((elapsedSeconds - plannedSeconds) / 60)} دقيقة)
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto w-full pb-4">
            {session.isRunning ? (
              <button
                type="button"
                onClick={pause}
                className="flex-1 py-3.5 px-5 rounded-2xl bg-zinc-850 hover:bg-zinc-800 text-white font-bold flex items-center justify-center gap-2 text-sm border border-zinc-750 transition-all cursor-pointer active:scale-95"
              >
                <Pause className="w-5 h-5 fill-white" />
                <span>إيقاف مؤقت</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={resume}
                className="flex-1 py-3.5 px-5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-violet-600/30 transition-all cursor-pointer active:scale-95"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>استئناف</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsStopwatchFullscreen(false);
                void complete();
              }}
              className="flex-1 py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>إنجاز</span>
            </button>

            <button
              type="button"
              onClick={() => setIsConfirmCancelOpen(true)}
              className="p-3.5 rounded-2xl bg-zinc-900 hover:bg-red-500/10 border border-zinc-800 text-zinc-400 hover:text-red-400 transition-all cursor-pointer active:scale-95"
              title="إلغاء المؤقت"
              aria-label="إلغاء المؤقت"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Unified Zen Focus Modal bound to the SAME Active Session */}
      {isZenOpen && (
        <ZenFocusModal
          isOpen={true}
          onClose={() => setMode("stopwatch")}
          task={{
            id: session.taskId,
            title: session.taskTitle,
            description: session.taskDescription,
            workCycle: session.workCycleMinutes,
            breakCycle: session.breakCycleMinutes,
          }}
        />
      )}

      {/* Confirm Cancel Timer Dialog */}
      {isConfirmCancelOpen && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setIsConfirmCancelOpen(false)}
          onConfirm={() => {
            setIsStopwatchFullscreen(false);
            setIsConfirmCancelOpen(false);
            void cancel();
          }}
          title="إلغاء المؤقت"
          description="هل أنت متأكد من إلغاء جلسة المؤقت الحالية؟ سيتم تسجيل الجلسة كملغاة."
          confirmLabel="نعم، إلغاء"
          cancelLabel="متابعة العمل"
          isDestructive={true}
        />
      )}

      {/* Unified Interrupt Switch Session Dialog (preserves previous session time!) */}
      {pendingInterrupt && session && (
        <ConfirmDialog
          isOpen={true}
          onClose={dismissInterrupt}
          onConfirm={() => void confirmInterruptAndSwitch()}
          title="تبديل المهمة النشطة"
          description={`هناك مؤقت نشط لمهمة "${session.taskTitle}" (${formatTimerDuration(
            elapsedSeconds
          )}). عند التبديل إلى "${
            pendingInterrupt.newTask.title
          }" سيتم حفظ الوقت المنقضي للمهمة الحالية ولن يضيع.`}
          confirmLabel="حفظ التوقيت والتبديل"
          cancelLabel="إبقاء المهمة الحالية"
          isDestructive={false}
        />
      )}
    </>
  );
}
