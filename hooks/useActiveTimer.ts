"use client";

import { useState, useEffect } from "react";
import {
  activeTimerEngine,
  ActiveTimerSession,
  CompletedDisplaySession,
  PendingInterruptRequest,
  TimerMode,
} from "@/lib/timer/active-timer";

export function useActiveTimer() {
  const [snapshot, setSnapshot] = useState<{
    session: ActiveTimerSession | null;
    completedSession: CompletedDisplaySession | null;
    pendingInterrupt: PendingInterruptRequest | null;
    lastNotice: string | null;
  }>(() => activeTimerEngine.getSnapshot());

  // Initialize to 0 during SSR/prerender so Next.js Cache Components never sees Date.now() on initial render.
  const [nowMs, setNowMs] = useState<number>(0);

  useEffect(() => {
    const unsub = activeTimerEngine.subscribe((next) => {
      setSnapshot(next);
      setNowMs(Date.now());
    });
    queueMicrotask(() => {
      setNowMs(Date.now());
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!snapshot.session?.isRunning) return;
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [snapshot.session?.isRunning]);

  const elapsedSeconds =
    nowMs > 0 ? activeTimerEngine.computeElapsedSeconds(nowMs) : 0;
  const zenState =
    nowMs > 0
      ? activeTimerEngine.computeZenState(nowMs)
      : {
          secondsRemaining: 25 * 60,
          isBreak: false,
          completedCycles: 0,
          progressPercent: 0,
        };

  return {
    session: snapshot.session,
    completedSession: snapshot.completedSession,
    pendingInterrupt: snapshot.pendingInterrupt,
    lastNotice: snapshot.lastNotice,
    elapsedSeconds,
    zenState,
    requestStart: (task: any, mode: TimerMode = "stopwatch", userId?: string) =>
      activeTimerEngine.requestStart(task, mode, userId),
    confirmInterruptAndSwitch: () => activeTimerEngine.confirmInterruptAndSwitch(),
    dismissInterrupt: () => activeTimerEngine.dismissInterrupt(),
    clearNotice: () => activeTimerEngine.clearNotice(),
    pause: () => activeTimerEngine.pause(),
    resume: () => activeTimerEngine.resume(),
    setMode: (mode: TimerMode) => activeTimerEngine.setMode(mode),
    extend: (minutes: number) => activeTimerEngine.extend(minutes),
    resetZenPhase: () => activeTimerEngine.resetZenPhase(),
    complete: () => activeTimerEngine.complete(),
    cancel: () => activeTimerEngine.cancel(),
    dismissCompleted: () => activeTimerEngine.dismissCompleted(),
  };
}
