"use client";

import { activeTimerEngine } from "@/lib/timer/active-timer";

/**
 * Legacy helper re-export retained for backward compatibility.
 * Delegates all task timer starts to the single unified ActiveTimerEngine.
 */
export function triggerStartTaskTimer(task, mode = "stopwatch", userId) {
  if (typeof window !== "undefined" && task) {
    activeTimerEngine.requestStart(task, mode, userId);
  }
}

export default function TaskTimerWidget() {
  // GlobalTaskTimerBar is now mounted once at root layout and renders the single unified active timer.
  return null;
}
