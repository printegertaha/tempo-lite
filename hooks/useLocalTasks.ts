"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { localTaskRepo, localOutboxRepo, LocalTask, LocalMutation } from "@/lib/local-db";
import { syncEngine } from "@/lib/sync/sync-engine";
import { soundManager } from "@/lib/audio";
import { addDaysToDateString, getLocalDateString } from "@/lib/dates";

export function useLocalTasks(userId?: string, initialTasks: any[] = []) {
  const [tasks, setTasks] = useState<LocalTask[]>(() => {
    return initialTasks.map((t) => ({
      ...t,
      clientUpdatedAt: Date.now(),
      subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
      tags: Array.isArray(t.tags) ? t.tags : [],
      version: t.version || 1,
    }));
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const tasksRef = useRef<LocalTask[]>(tasks);
  
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Initialize sync engine with active userId
  useEffect(() => {
    if (userId) {
      syncEngine.init(userId);
    }
  }, [userId]);

  // Load from IndexedDB on mount and reconcile with initial server props
  useEffect(() => {
    if (!userId) {
      setIsLoaded(true);
      return;
    }

    let isMounted = true;

    async function loadLocalData() {
      try {
        const localCached = await localTaskRepo.getAllForUser(userId!);
        const pendingMutations = await localOutboxRepo.getPending(userId!);
        const pendingEntityIds = new Set(pendingMutations.map((m) => m.entityId));

        if (localCached.length > 0) {
          // If we have local cached data, show it immediately!
          if (isMounted) {
            setTasks(localCached);
          }
        }

        // Reconcile server initial tasks with local state:
        // Do NOT overwrite local records that have pending outbox mutations!
        if (initialTasks && initialTasks.length > 0) {
          const mergedMap = new Map<string, LocalTask>();

          // Start with server tasks
          for (const s of initialTasks) {
            mergedMap.set(s.id, {
              ...s,
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
      if (e.data?.type === "TASKS_CHANGED" && e.data.userId === userId) {
        localTaskRepo.getAllForUser(userId).then((updated) => {
          if (isMounted) setTasks(updated);
        });
      }
    };

    return () => {
      isMounted = false;
      channel.close();
    };
  }, [userId, initialTasks]);

  const broadcastChange = useCallback(() => {
    if (typeof window !== "undefined") {
      const channel = new BroadcastChannel("athar_tasks_channel");
      channel.postMessage({ type: "TASKS_CHANGED", userId });
      channel.close();
    }
  }, [userId]);

  /**
   * 1. Add Task (Instant Local Execution <16ms)
   */
  const addTask = useCallback(
    async (taskData: Partial<LocalTask>) => {
      if (!userId) return null;

      const newId = taskData.id || crypto.randomUUID();
      const nowIso = new Date().toISOString();
      const nowMs = Date.now();

      const newTask: LocalTask = {
        id: newId,
        userId,
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
        _syncStatus: "pending",
      };

      // 1. In-memory update
      setTasks((prev) => [...prev, newTask]);

      // 2. Persist to local IndexedDB
      await localTaskRepo.save(newTask);

      // 3. Queue to Outbox
      const mutation: LocalMutation = {
        mutationId: crypto.randomUUID(),
        userId,
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

      soundManager.playClick();
      broadcastChange();
      syncEngine.scheduleSync(5000);

      return newTask;
    },
    [userId, broadcastChange]
  );

  /**
   * 2. Update Task (Instant Local Execution)
   */
  const updateTask = useCallback(
    async (id: string, updates: Partial<LocalTask>) => {
      if (!userId) return;

      const nowMs = Date.now();
      let updatedTask: LocalTask | null = null;

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            updatedTask = {
              ...t,
              ...updates,
              clientUpdatedAt: nowMs,
              _syncStatus: "pending",
            };
            return updatedTask;
          }
          return t;
        })
      );

      if (!updatedTask) return;

      await localTaskRepo.save(updatedTask);

      const mutation: LocalMutation = {
        mutationId: crypto.randomUUID(),
        userId,
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

      broadcastChange();
      syncEngine.scheduleSync(5000);
    },
    [userId, broadcastChange]
  );

  /**
   * 3. Toggle Status (Instant Completion with Audio Feedback)
   */
  const toggleTaskStatus = useCallback(
    async (id: string) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task || !userId) return;

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
    [userId, updateTask]
  );

  /**
   * 4. Delete Task (Instant Local Execution)
   */
  const deleteTask = useCallback(
    async (id: string) => {
      if (!userId) return;

      setTasks((prev) => prev.filter((t) => t.id !== id));
      await localTaskRepo.delete(id);

      const mutation: LocalMutation = {
        mutationId: crypto.randomUUID(),
        userId,
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

      soundManager.playClick();
      broadcastChange();
      syncEngine.scheduleSync(5000);
    },
    [userId, broadcastChange]
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
   * 6. Reorder Tasks
   */
  const reorderTasks = useCallback(
    async (orderedIds: string[]) => {
      if (!userId) return;

      const idMap = new Map(orderedIds.map((id, index) => [id, index]));
      const reordered = [...tasksRef.current]
        .map((t) => {
          const newOrder = idMap.get(t.id);
          return newOrder !== undefined ? { ...t, sortOrder: newOrder } : t;
        })
        .sort((a, b) => a.sortOrder - b.sortOrder);

      setTasks(reordered);
      await localTaskRepo.saveBatch(reordered);

      // Queue updates for changed orders
      for (const t of reordered) {
        const mutation: LocalMutation = {
          mutationId: crypto.randomUUID(),
          userId,
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

      broadcastChange();
      syncEngine.scheduleSync(5000);
    },
    [userId, broadcastChange]
  );

  return {
    tasks,
    isLoaded,
    addTask,
    updateTask,
    toggleTaskStatus,
    deleteTask,
    postponeTask,
    reorderTasks,
  };
}

