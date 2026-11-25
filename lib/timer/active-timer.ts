"use client";

import { soundManager } from "@/lib/audio";
import { localTaskRepo, localOutboxRepo, localEntryRepo } from "@/lib/local-db";
import { syncEngine } from "@/lib/sync/sync-engine";

export type TimerSessionStatus =
  | "running"
  | "paused"
  | "completed"
  | "cancelled"
  | "interrupted";

export type TimerMode = "stopwatch" | "zen_pomodoro";

export interface ActiveTimerSession {
  sessionId: string;
  taskId: string;
  taskTitle: string;
  taskDescription?: string | null;
  trackerId?: string | null;
  userId: string;
  mode: TimerMode;
  status: TimerSessionStatus;
  isRunning: boolean;
  startedAt: number | null;
  accumulatedSeconds: number;
  plannedDurationMinutes: number | null;
  workCycleMinutes: number;
  breakCycleMinutes: number;
  isBreak: boolean;
  phaseStartedAt: number | null;
  phaseAccumulatedSeconds: number;
  completedCycles: number;
  updatedAt: number;
}

export interface CompletedTimerRecord {
  sessionId: string;
  taskId: string;
  taskTitle: string;
  userId: string;
  status: "completed" | "cancelled" | "interrupted";
  durationSeconds: number;
  completedCycles: number;
  endedAt: string;
}

export interface CompletedDisplaySession {
  sessionId: string;
  taskId: string;
  taskTitle: string;
  userId: string;
  durationSeconds: number;
  completedCycles: number;
  endedAt: string;
}

export interface PendingInterruptRequest {
  newTask: any;
  mode: TimerMode;
}

const UNIFIED_TIMER_KEY = "athar_active_timer_unified_v1";
const LEGACY_TASK_TIMER_KEY = "athar_active_task_timer_v2";
const TIMER_HISTORY_KEY = "athar_timer_session_history_v1";
const COMPLETED_TIMER_DISPLAY_KEY = "athar_completed_timer_display_v1";

type TimerListener = (snapshot: {
  session: ActiveTimerSession | null;
  completedSession: CompletedDisplaySession | null;
  pendingInterrupt: PendingInterruptRequest | null;
  lastNotice: string | null;
}) => void;

class ActiveTimerEngine {
  private session: ActiveTimerSession | null = null;
  private completedSession: CompletedDisplaySession | null = null;
  private pendingInterrupt: PendingInterruptRequest | null = null;
  private lastNotice: string | null = null;
  private listeners: Set<TimerListener> = new Set();
  private channel: BroadcastChannel | null = null;
  private initialized = false;
  private finalizingSessionIds = new Set<string>();

  constructor() {
    if (typeof window !== "undefined") {
      this.initFromStorage();
      this.channel = new BroadcastChannel("athar_timer_channel");
      this.channel.onmessage = (e) => {
        if (e.data?.type === "TIMER_STATE_UPDATED") {
          this.session = e.data.session || null;
          if ("completedSession" in e.data) {
            this.completedSession = e.data.completedSession || null;
          }
          this.notify();
        }
      };

      window.addEventListener("storage", (e) => {
        if (e.key === UNIFIED_TIMER_KEY || e.key === COMPLETED_TIMER_DISPLAY_KEY) {
          this.loadRawSession();
          this.notify();
        }
      });

      window.addEventListener("athar_task_completed_externally", (e: Event) => {
        const taskId = (e as CustomEvent)?.detail?.taskId;
        if (taskId && this.session && this.session.taskId === taskId) {
          void this.finalizeCurrentSession("completed", false);
        }
      });

      window.addEventListener("athar_task_deleted_externally", (e: Event) => {
        const taskId = (e as CustomEvent)?.detail?.taskId;
        if (taskId && this.session && this.session.taskId === taskId) {
          void this.finalizeCurrentSession("cancelled", false);
        } else if (taskId && this.completedSession && this.completedSession.taskId === taskId) {
          this.completedSession = null;
          this.persistSession();
          this.notify();
        }
      });
    }
  }

  private initFromStorage() {
    if (this.initialized) return;
    this.initialized = true;
    this.loadRawSession();

    // Migrate legacy athar_active_task_timer_v2 if present and unified key absent
    if (!this.session) {
      try {
        const legacyRaw = localStorage.getItem(LEGACY_TASK_TIMER_KEY);
        if (legacyRaw) {
          const legacy = JSON.parse(legacyRaw);
          if (legacy?.taskId) {
            this.session = {
              sessionId: crypto.randomUUID(),
              taskId: legacy.taskId,
              taskTitle: legacy.taskTitle || "مهمة",
              taskDescription: null,
              trackerId: null,
              userId: "guest",
              mode: "stopwatch",
              status: legacy.isRunning ? "running" : "paused",
              isRunning: Boolean(legacy.isRunning),
              startedAt: legacy.startedAt || null,
              accumulatedSeconds: legacy.accumulatedSeconds || 0,
              plannedDurationMinutes: legacy.plannedDurationMinutes || null,
              workCycleMinutes: 25,
              breakCycleMinutes: 5,
              isBreak: false,
              phaseStartedAt: legacy.startedAt || null,
              phaseAccumulatedSeconds: legacy.accumulatedSeconds || 0,
              completedCycles: 0,
              updatedAt: Date.now(),
            };
            this.persistSession();
          }
          localStorage.removeItem(LEGACY_TASK_TIMER_KEY);
        }
      } catch {}
    }
  }

  private loadRawSession() {
    try {
      const raw = localStorage.getItem(UNIFIED_TIMER_KEY);
      if (!raw) {
        this.session = null;
      } else {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.taskId && parsed.sessionId) {
          this.session = parsed;
        } else {
          this.session = null;
        }
      }
    } catch {
      this.session = null;
    }

    try {
      const rawCompleted = localStorage.getItem(COMPLETED_TIMER_DISPLAY_KEY);
      if (!rawCompleted) {
        this.completedSession = null;
      } else {
        const parsedCompleted = JSON.parse(rawCompleted);
        if (parsedCompleted && parsedCompleted.taskId && parsedCompleted.sessionId) {
          this.completedSession = parsedCompleted;
        } else {
          this.completedSession = null;
        }
      }
    } catch {
      this.completedSession = null;
    }
  }

  private persistSession() {
    if (typeof window === "undefined") return;
    try {
      if (this.session) {
        localStorage.setItem(UNIFIED_TIMER_KEY, JSON.stringify(this.session));
      } else {
        localStorage.removeItem(UNIFIED_TIMER_KEY);
      }
      if (this.completedSession) {
        localStorage.setItem(
          COMPLETED_TIMER_DISPLAY_KEY,
          JSON.stringify(this.completedSession)
        );
      } else {
        localStorage.removeItem(COMPLETED_TIMER_DISPLAY_KEY);
      }
      this.channel?.postMessage({
        type: "TIMER_STATE_UPDATED",
        session: this.session,
        completedSession: this.completedSession,
      });
    } catch {}
  }

  private notify() {
    const snap = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }

  public getSnapshot() {
    return {
      session: this.session,
      completedSession: this.completedSession,
      pendingInterrupt: this.pendingInterrupt,
      lastNotice: this.lastNotice,
    };
  }

  public getSession(): ActiveTimerSession | null {
    if (typeof window !== "undefined" && !this.initialized) {
      this.initFromStorage();
    }
    return this.session;
  }

  public subscribe(listener: TimerListener): () => void {
    if (typeof window !== "undefined" && !this.initialized) {
      this.initFromStorage();
    }
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public clearNotice() {
    this.lastNotice = null;
    this.notify();
  }

  public computeElapsedSeconds(nowMs = Date.now()): number {
    if (!this.session) return 0;
    const base = this.session.accumulatedSeconds || 0;
    if (this.session.isRunning && this.session.startedAt && !this.session.isBreak) {
      return base + Math.max(0, Math.floor((nowMs - this.session.startedAt) / 1000));
    }
    return base;
  }

  public computeZenState(nowMs = Date.now()): {
    secondsRemaining: number;
    isBreak: boolean;
    completedCycles: number;
    progressPercent: number;
  } {
    if (!this.session) {
      return { secondsRemaining: 25 * 60, isBreak: false, completedCycles: 0, progressPercent: 0 };
    }

    const workSecs = Math.max(60, (this.session.workCycleMinutes || 25) * 60);
    const breakSecs = Math.max(60, (this.session.breakCycleMinutes || 5) * 60);

    let isBreak = this.session.isBreak;
    let completedCycles = this.session.completedCycles || 0;
    let phaseElapsed = this.session.phaseAccumulatedSeconds || 0;

    if (this.session.isRunning && this.session.phaseStartedAt) {
      phaseElapsed += Math.max(0, Math.floor((nowMs - this.session.phaseStartedAt) / 1000));
    }

    // Advance across phase boundaries accurately even after refresh / tab sleep
    let currentPhaseDuration = isBreak ? breakSecs : workSecs;
    let transitioned = false;
    while (phaseElapsed >= currentPhaseDuration) {
      phaseElapsed -= currentPhaseDuration;
      transitioned = true;
      if (!isBreak) {
        completedCycles += 1;
        isBreak = true;
        currentPhaseDuration = breakSecs;
        soundManager.playBreakStart();
      } else {
        isBreak = false;
        currentPhaseDuration = workSecs;
        soundManager.playBreakEnd();
      }
    }

    if (transitioned && this.session.isRunning) {
      this.session = {
        ...this.session,
        isBreak,
        completedCycles,
        phaseAccumulatedSeconds: phaseElapsed,
        phaseStartedAt: nowMs,
        updatedAt: nowMs,
      };
      this.persistSession();
    }

    const secondsRemaining = Math.max(0, currentPhaseDuration - phaseElapsed);
    const progressPercent = Math.min(
      100,
      Math.round((phaseElapsed / currentPhaseDuration) * 100)
    );

    return { secondsRemaining, isBreak, completedCycles, progressPercent };
  }

  /**
   * Request starting a timer for `task`.
   * - If another task has an active (running or paused) session, prompts interrupt policy
   *   so existing tracked time is NEVER silently discarded.
   * - If the same task already has a session, resumes it or switches mode cleanly.
   */
  public requestStart(task: any, mode: TimerMode = "stopwatch", userId?: string) {
    if (!task?.id) return;
    const now = Date.now();

    if (this.session && this.session.taskId !== task.id) {
      soundManager.playInterrupt();
      this.pendingInterrupt = { newTask: { ...task, userId: userId || task.userId }, mode };
      this.notify();
      return;
    }

    if (this.session && this.session.taskId === task.id) {
      // Same task: switch visual mode or resume preserving all tracked elapsed time
      const currentWorkElapsed = this.computeElapsedSeconds(now);
      const currentPhaseElapsed =
        (this.session.phaseAccumulatedSeconds || 0) +
        (this.session.isRunning && this.session.phaseStartedAt
          ? Math.max(0, Math.floor((now - this.session.phaseStartedAt) / 1000))
          : 0);

      this.session = {
        ...this.session,
        mode,
        status: "running",
        isRunning: true,
        startedAt: this.session.isBreak ? null : now,
        accumulatedSeconds: currentWorkElapsed,
        phaseStartedAt: now,
        phaseAccumulatedSeconds: currentPhaseElapsed,
        updatedAt: now,
      };
      this.persistSession();
      soundManager.playTaskStart();
      this.notify();
      return;
    }

    this.startFreshSession(task, mode, userId);
  }

  private startFreshSession(task: any, mode: TimerMode, userId?: string) {
    const now = Date.now();
    this.completedSession = null;
    this.session = {
      sessionId: crypto.randomUUID(),
      taskId: task.id,
      taskTitle: task.title || "مهمة",
      taskDescription: task.description || null,
      trackerId: task.trackerId || null,
      userId: userId || task.userId || "guest",
      mode,
      status: "running",
      isRunning: true,
      startedAt: now,
      accumulatedSeconds: 0,
      plannedDurationMinutes: task.durationMinutes || null,
      workCycleMinutes: task.workCycle || 25,
      breakCycleMinutes: task.breakCycle || 5,
      isBreak: false,
      phaseStartedAt: now,
      phaseAccumulatedSeconds: 0,
      completedCycles: 0,
      updatedAt: now,
    };
    this.persistSession();
    soundManager.playTaskStart();
    this.notify();
  }

  /**
   * Confirm switching from the existing session to `pendingInterrupt.newTask`.
   * Preserves the previous task's tracked time in history before starting the new task!
   */
  public async confirmInterruptAndSwitch() {
    if (!this.pendingInterrupt) return;
    const { newTask, mode } = this.pendingInterrupt;
    const prevTitle = this.session?.taskTitle;
    const prevElapsed = this.computeElapsedSeconds();
    this.pendingInterrupt = null;

    if (this.session) {
      await this.finalizeCurrentSession("interrupted", false);
    }

    if (prevTitle && prevElapsed > 0) {
      const mins = Math.max(1, Math.round(prevElapsed / 60));
      this.lastNotice = `تم حفظ ${mins} د للمهمة «${prevTitle}» والانتقال للمهمة الجديدة`;
    }

    this.startFreshSession(newTask, mode, newTask.userId);
  }

  public dismissInterrupt() {
    this.pendingInterrupt = null;
    this.notify();
  }

  public pause() {
    if (!this.session || !this.session.isRunning) return;
    const now = Date.now();
    const totalWork = this.computeElapsedSeconds(now);
    const phaseDelta = this.session.phaseStartedAt
      ? Math.max(0, Math.floor((now - this.session.phaseStartedAt) / 1000))
      : 0;

    this.session = {
      ...this.session,
      status: "paused",
      isRunning: false,
      startedAt: null,
      accumulatedSeconds: totalWork,
      phaseStartedAt: null,
      phaseAccumulatedSeconds: (this.session.phaseAccumulatedSeconds || 0) + phaseDelta,
      updatedAt: now,
    };
    this.persistSession();
    soundManager.playClick();
    this.notify();
  }

  public resume() {
    if (!this.session || this.session.isRunning) return;
    const now = Date.now();
    this.session = {
      ...this.session,
      status: "running",
      isRunning: true,
      startedAt: this.session.isBreak ? null : now,
      phaseStartedAt: now,
      updatedAt: now,
    };
    this.persistSession();
    soundManager.playTaskStart();
    this.notify();
  }

  public setMode(mode: TimerMode) {
    if (!this.session) return;
    this.session = {
      ...this.session,
      mode,
      updatedAt: Date.now(),
    };
    this.persistSession();
    this.notify();
  }

  public extend(extraMinutes: number) {
    if (!this.session) return;
    const elapsed = this.computeElapsedSeconds();
    const currentPlanned =
      this.session.plannedDurationMinutes || Math.ceil(elapsed / 60);
    this.session = {
      ...this.session,
      plannedDurationMinutes: currentPlanned + extraMinutes,
      updatedAt: Date.now(),
    };
    this.persistSession();
    soundManager.playClick();
    this.notify();
  }

  public resetZenPhase() {
    if (!this.session) return;
    const now = Date.now();
    this.session = {
      ...this.session,
      phaseAccumulatedSeconds: 0,
      phaseStartedAt: this.session.isRunning ? now : null,
      updatedAt: now,
    };
    this.persistSession();
    soundManager.playClick();
    this.notify();
  }

  public async complete() {
    await this.finalizeCurrentSession("completed", true);
  }

  public async cancel() {
    await this.finalizeCurrentSession("cancelled", false);
  }

  public dismissCompleted() {
    if (!this.completedSession) return;
    this.completedSession = null;
    this.persistSession();
    soundManager.playClick();
    this.notify();
  }

  private recordSessionHistory(record: CompletedTimerRecord) {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(TIMER_HISTORY_KEY);
      const list: CompletedTimerRecord[] = raw ? JSON.parse(raw) : [];
      // Deduplicate by sessionId so concurrent tabs or double-clicks never create duplicate records
      if (list.some((item) => item.sessionId === record.sessionId)) return;
      const updated = [record, ...list].slice(0, 200);
      localStorage.setItem(TIMER_HISTORY_KEY, JSON.stringify(updated));
    } catch {}
  }

  private async finalizeCurrentSession(
    finalStatus: "completed" | "cancelled" | "interrupted",
    markTaskCompleted: boolean
  ) {
    const active = this.session;
    if (!active) return;

    // Prevent double finalization race across clicks or events
    if (this.finalizingSessionIds.has(active.sessionId)) return;
    this.finalizingSessionIds.add(active.sessionId);

    const now = Date.now();
    const totalSeconds = this.computeElapsedSeconds(now);

    // Clear active session immediately so UI never double-submits
    this.session = null;
    if (finalStatus === "completed") {
      this.completedSession = {
        sessionId: active.sessionId,
        taskId: active.taskId,
        taskTitle: active.taskTitle,
        userId: active.userId,
        durationSeconds: totalSeconds,
        completedCycles: active.completedCycles,
        endedAt: new Date(now).toISOString(),
      };
    } else {
      this.completedSession = null;
    }
    this.persistSession();
    this.notify();

    try {
      // Save deduplicated session history for any meaningful duration or completion
      if (totalSeconds > 0 || finalStatus === "completed") {
        this.recordSessionHistory({
          sessionId: active.sessionId,
          taskId: active.taskId,
          taskTitle: active.taskTitle,
          userId: active.userId,
          status: finalStatus,
          durationSeconds: totalSeconds,
          completedCycles: active.completedCycles,
          endedAt: new Date(now).toISOString(),
        });
      }

      // If linked to a duration/habit tracker, log focused seconds idempotently by sessionId
      if (active.trackerId && totalSeconds >= 10 && finalStatus !== "cancelled") {
        const localDate = new Date(now).toISOString().split("T")[0];
        const entry = {
          id: active.sessionId, // Idempotent key prevents duplicate session entries!
          trackerId: active.trackerId,
          userId: active.userId || "guest",
          localDate,
          occurredAt: new Date(now).toISOString(),
          valueDuration: totalSeconds,
          entryPayload: { subject: active.taskTitle },
          notes: `جلسة مؤقت (${finalStatus})`,
          trackerVersion: 1,
        };
        await localEntryRepo.save(entry).catch(() => {});
        if (active.userId && active.userId !== "guest") {
          await localOutboxRepo
            .add({
              mutationId: `timer_${active.sessionId}`,
              userId: active.userId,
              entityType: "tracker_entry",
              entityId: active.sessionId,
              action: "create",
              payload: entry,
              clientTimestamp: now,
              version: 1,
              status: "pending",
              retryCount: 0,
            })
            .catch(() => {});
          syncEngine.scheduleSync(3000);
        }
      }

      // Mark task completed in localTaskRepo + outbox when user clicks Complete
      if (markTaskCompleted) {
        soundManager.playTaskDone();
        const task = await localTaskRepo.getById(active.taskId).catch(() => null);
        if (task && task.status !== "COMPLETED") {
          const completedAt = new Date(now).toISOString();
          const updatedTask = {
            ...task,
            status: "COMPLETED" as const,
            completedAt,
            updatedAt: completedAt,
            clientUpdatedAt: now,
            _syncStatus: (task.userId === "guest" ? "synced" : "pending") as "synced" | "pending",
          };
          await localTaskRepo.save(updatedTask).catch(() => {});

          if (task.userId && task.userId !== "guest") {
            await localOutboxRepo
              .add({
                mutationId: crypto.randomUUID(),
                userId: task.userId,
                entityType: "task",
                entityId: task.id,
                action: "update",
                payload: { status: "COMPLETED", completedAt },
                clientTimestamp: now,
                version: task.version || 1,
                status: "pending",
                retryCount: 0,
              })
              .catch(() => {});
            syncEngine.scheduleSync(3000);
          }

          const ch = new BroadcastChannel("athar_tasks_channel");
          ch.postMessage({ type: "TASKS_CHANGED", userId: task.userId });
          ch.close();
          window.dispatchEvent(
            new CustomEvent("athar_tasks_updated", { detail: { userId: task.userId } })
          );
        }
      } else if (finalStatus === "cancelled") {
        soundManager.playClick();
      }
    } finally {
      this.finalizingSessionIds.delete(active.sessionId);
    }
  }
}

export function formatTimerDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const activeTimerEngine = new ActiveTimerEngine();
