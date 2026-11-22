"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { localTaskRepo, localOutboxRepo, LocalTask, LocalMutation } from "@/lib/local-db";
import { syncEngine } from "@/lib/sync/sync-engine";
import { soundManager } from "@/lib/audio";
import { addDaysToDateString, getLocalDateString } from "@/lib/dates";

// In-memory module-level cache for zero-flicker instant navigation
const memoryTaskCache = new Map<string, LocalTask[]>();

function deduplicateTasks(taskList: LocalTask[]): LocalTask[] {
  const map = new Map<string, LocalTask>();
  for (const t of taskList) {
    if (t && t.id) {
      map.set(t.id, t);
    }
  }
  return Array.from(map.values());
}

export function useLocalTasks(userId?: string, initialTasks: any[] = []) {
  const effectiveUserId = userId || "guest";
  const isGuest = effectiveUserId === "guest";

  const [tasks, setTasksState] = useState<LocalTask[]>(() => {
    const cached = memoryTaskCache.get(effectiveUserId);
    if (cached && cached.length > 0) return deduplicateTasks(cached);
    const parsedInitial = initialTasks.map((t) => ({
      ...t,
      completedAt: t.completedAt ? (typeof t.completedAt === "string" ? t.completedAt : new Date(t.completedAt).toISOString()) : null,
      clientUpdatedAt: Date.now(),
      subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
      tags: Array.isArray(t.tags) ? t.tags : [],
      version: t.version || 1,
    }));
    return deduplicateTasks(parsedInitial);
  });

  const setTasks = useCallback((action: React.SetStateAction<LocalTask[]>) => {
    setTasksState((prev) => {
      const next = typeof action === "function" ? (action as (p: LocalTask[]) => LocalTask[])(prev) : action;
      return deduplicateTasks(next);
    });
  }, []);

  const [isLoaded, setIsLoaded] = useState<boolean>(() => memoryTaskCache.has(effectiveUserId));
  const tasksRef = useRef<LocalTask[]>(tasks);

  useEffect(() => {
    tasksRef.current = tasks;
    memoryTaskCache.set(effectiveUserId, tasks);
  }, [tasks, effectiveUserId]);

  // Initialize sync engine only with authenticated userId (not guest)
  useEffect(() => {
    if (userId && userId !== "guest") {
      syncEngine.init(userId);
    }
  }, [userId]);

  // Load from IndexedDB on mount and reconcile with initial server props
  useEffect(() => {
    let isMounted = true;

    async function loadLocalData() {
      try {
        const localCached = await localTaskRepo.getAllForUser(effectiveUserId);
        const pendingMutations = isGuest ? [] : await localOutboxRepo.getPending(effectiveUserId);
        const pendingEntityIds = new Set(pendingMutations.map((m) => m.entityId));

        if (localCached.length > 0) {
          // If we have local cached data, show it immediately!
          if (isMounted) {
            setTasks(localCached);
          }
        }

        // Reconcile server initial tasks with local state:
        // Do NOT overwrite local records that have pending outbox mutations!
        if (initialTasks && initialTasks.length > 0 && !isGuest) {
          const mergedMap = new Map<string, LocalTask>();

          // Start with server tasks
          for (const s of initialTasks) {
            mergedMap.set(s.id, {
              ...s,
              completedAt: s.completedAt ? (typeof s.completedAt === "string" ? s.completedAt : new Date(s.completedAt).toISOString()) : null,
              clientUpdatedAt: Date.now(),
              subtasks: Array.isArray(s.subtasks) ? s.subtasks : [],
              tags: Array.isArray(s.tags) ? s.tags : [],
              version: s.version || 1,
            });
          }

          // Override with local tasks if pending or newer
          for (const loc of localCached) {
            if (pendingEntityIds.has(loc.id) || !mergedMap.has(loc.id)) {
              mergedMap.set(loc.id, loc);
            }
          }

          const mergedArray = Array.from(mergedMap.values()).sort(
            (a, b) => a.sortOrder - b.sortOrder
          );

          await localTaskRepo.saveBatch(mergedArray);

          if (isMounted) {
            setTasks(mergedArray);
          }
        }
      } catch (err) {
        console.warn("Failed loading from IndexedDB, falling back to server props:", err);
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    }

    loadLocalData();

    // Listen for multi-tab updates via BroadcastChannel
    const channel = new BroadcastChannel("athar_tasks_channel");
    channel.onmessage = (e) => {
      if (e.data?.type === "TASKS_CHANGED" && e.data.userId === effectiveUserId) {
        localTaskRepo.getAllForUser(effectiveUserId).then((updated) => {
          if (isMounted) setTasks(updated);
        });
      }
    };

    return () => {
      isMounted = false;
      channel.close();
    };
  }, [effectiveUserId, isGuest, initialTasks]);

  const broadcastChange = useCallback(() => {
    if (typeof window !== "undefined") {
      const channel = new BroadcastChannel("athar_tasks_channel");
      channel.postMessage({ type: "TASKS_CHANGED", userId: effectiveUserId });
      channel.close();
    }
  }, [effectiveUserId]);

  /**
   * 1. Add Task (Instant Local Execution <16ms)
   */
  const addTask = useCallback(
    async (taskData: Partial<LocalTask>) => {
      const newId = taskData.id || crypto.randomUUID();
      const nowIso = new Date().toISOString();
      const nowMs = Date.now();

      const newTask: LocalTask = {
        id: newId,
        userId: effectiveUserId,
        lifeAreaId: taskData.lifeAreaId || null,
        trackerId: taskData.trackerId || null,
        title: taskData.title?.trim() || "مهمة جديدة",
        description: taskData.description || null,
        dueDate: taskData.dueDate || getLocalDateString(),
        startTime: taskData.startTime || null,
        durationMinutes: taskData.durationMinutes || null,
        priority: taskData.priority || "MEDIUM",
        status: taskData.status || "TODO",
        completedAt: null,
        isPomodoro: Boolean(taskData.isPomodoro),
        workCycle: taskData.workCycle ?? 25,
        breakCycle: taskData.breakCycle ?? 5,
        isRecurring: Boolean(taskData.isRecurring),
        subtasks: taskData.subtasks || [],
        tags: taskData.tags || [],
        sortOrder: (tasksRef.current[tasksRef.current.length - 1]?.sortOrder ?? -1) + 1,
        version: 1,
        isArchived: false,
        archivedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        clientUpdatedAt: nowMs,
        _syncStatus: isGuest ? "synced" : "pending",
      };

      // 1. In-memory update with deduplication
      setTasks((prev) => [...prev.filter((t) => t.id !== newId), newTask]);

      // 2. Persist to local IndexedDB
      await localTaskRepo.save(newTask);

      // 3. Queue to Outbox if authenticated user
      if (!isGuest) {
        const mutation: LocalMutation = {
          mutationId: crypto.randomUUID(),
          userId: effectiveUserId,
          entityType: "task",
          entityId: newId,
          action: "create",
          payload: newTask,
          clientTimestamp: nowMs,
          version: 1,
          status: "pending",
          retryCount: 0,
        };
        await localOutboxRepo.add(mutation);
        syncEngine.scheduleSync(5000);
      }

      soundManager.playClick();
      broadcastChange();

      return newTask;
    },
    [effectiveUserId, isGuest, broadcastChange]
  );

  /**
   * 2. Update Task (Instant Local Execution)
   */
  const updateTask = useCallback(
    async (id: string, updates: Partial<LocalTask>) => {
      const nowMs = Date.now();
      let updatedTask: LocalTask | null = null;

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            updatedTask = {
              ...t,
              ...updates,
              clientUpdatedAt: nowMs,
              _syncStatus: isGuest ? "synced" : "pending",
            };
            return updatedTask;
          }
          return t;
        })
      );

      if (!updatedTask) return;

      await localTaskRepo.save(updatedTask);

      if (!isGuest) {
        const mutation: LocalMutation = {
          mutationId: crypto.randomUUID(),
          userId: effectiveUserId,
          entityType: "task",
          entityId: id,
          action: "update",
          payload: updates,
          clientTimestamp: nowMs,
          version: (updatedTask as LocalTask).version,
          status: "pending",
          retryCount: 0,
        };
        await localOutboxRepo.add(mutation);
        syncEngine.scheduleSync(5000);
      }

      broadcastChange();
    },
    [effectiveUserId, isGuest, broadcastChange]
  );

  /**
   * 3. Toggle Status (Instant Completion with Audio Feedback)
   */
  const toggleTaskStatus = useCallback(
    async (id: string) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task) return;

      const isCompleting = task.status !== "COMPLETED";
      const newStatus = isCompleting ? "COMPLETED" : "TODO";
      const completedAt = isCompleting ? new Date().toISOString() : null;

      if (isCompleting) {
        soundManager.playTaskDone();
      } else {
        soundManager.playClick();
      }

      await updateTask(id, {
        status: newStatus,
        completedAt,
      });
    },
    [updateTask]
  );

  /**
   * 4. Delete Task (Instant Local Execution)
   */
  const deleteTask = useCallback(
    async (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      await localTaskRepo.delete(id);

      if (!isGuest) {
        const mutation: LocalMutation = {
          mutationId: crypto.randomUUID(),
          userId: effectiveUserId,
          entityType: "task",
          entityId: id,
          action: "delete",
          payload: {},
          clientTimestamp: Date.now(),
          version: 1,
          status: "pending",
          retryCount: 0,
        };
        await localOutboxRepo.add(mutation);
        syncEngine.scheduleSync(5000);
      }

      soundManager.playClick();
      broadcastChange();
    },
    [effectiveUserId, isGuest, broadcastChange]
  );

  /**
   * 5. Postpone Task (Manual postponement without duplicating records)
   */
  const postponeTask = useCallback(
    async (id: string, days: number = 1, customDate?: string) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task) return;

      const baseDate = task.dueDate || getLocalDateString();
      const newDueDate = customDate || addDaysToDateString(baseDate, days);

      await updateTask(id, {
        dueDate: newDueDate,
      });
    },
    [updateTask]
  );

  /**
   * 6. Delete All Tasks (Local + Outbox)
   */
  const deleteAllTasks = useCallback(
    async () => {
      const allIds = tasksRef.current.map((t) => t.id);

      // Clear in-memory
      setTasks([]);

      // Clear IndexedDB
      await Promise.all(allIds.map((id) => localTaskRepo.delete(id)));

      // Queue delete mutations for each task
      if (!isGuest) {
        const nowMs = Date.now();
        await Promise.all(
          allIds.map((id) => {
            const mutation: LocalMutation = {
              mutationId: crypto.randomUUID(),
              userId: effectiveUserId,
              entityType: "task",
              entityId: id,
              action: "delete",
              payload: {},
              clientTimestamp: nowMs,
              version: 1,
              status: "pending",
              retryCount: 0,
            };
            return localOutboxRepo.add(mutation);
          })
        );
        syncEngine.scheduleSync(5000);
      }

      soundManager.playClick();
      broadcastChange();
    },
    [effectiveUserId, isGuest, broadcastChange]
  );

  /**
   * 7. Reorder Tasks
   */
  const reorderTasks = useCallback(
    async (orderedIds: string[]) => {
      const idMap = new Map(orderedIds.map((id, index) => [id, index]));
      const reordered = [...tasksRef.current]
        .map((t) => {
          const newOrder = idMap.get(t.id);
          return newOrder !== undefined ? { ...t, sortOrder: newOrder } : t;
        })
        .sort((a, b) => a.sortOrder - b.sortOrder);

      setTasks(reordered);
      await localTaskRepo.saveBatch(reordered);

      if (!isGuest) {
        for (const t of reordered) {
          const mutation: LocalMutation = {
            mutationId: crypto.randomUUID(),
            userId: effectiveUserId,
            entityType: "task",
            entityId: t.id,
            action: "update",
            payload: { sortOrder: t.sortOrder },
            clientTimestamp: Date.now(),
            version: t.version,
            status: "pending",
            retryCount: 0,
          };
          await localOutboxRepo.add(mutation);
        }
        syncEngine.scheduleSync(5000);
      }

      broadcastChange();
    },
    [effectiveUserId, isGuest, broadcastChange]
  );

  /**
   * 7. Refresh Tasks from IndexedDB
   */
  const refreshTasks = useCallback(async () => {
    try {
      const localCached = await localTaskRepo.getAllForUser(effectiveUserId);
      setTasks(localCached);
    } catch (err) {
      console.warn("Failed to refresh tasks from IndexedDB:", err);
    }
  }, [effectiveUserId]);

  return {
    tasks,
    isLoaded,
    addTask,
    updateTask,
    toggleTaskStatus,
    deleteTask,
    deleteAllTasks,
    postponeTask,
    reorderTasks,
    refreshTasks,
    refreshFromDb: refreshTasks,
  };
}
