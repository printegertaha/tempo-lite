"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { localTaskRepo, localOutboxRepo, LocalTask, LocalMutation } from "@/lib/local-db";
import { syncEngine } from "@/lib/sync/sync-engine";
import { soundManager } from "@/lib/audio";
import { addDaysToDateString, getLocalDateString } from "@/lib/dates";

export type TaskCacheScope = "home" | "active" | "full";

const SCOPE_RANK: Record<TaskCacheScope, number> = {
  home: 1,
  active: 2,
  full: 3,
};

// In-memory module-level cache for zero-flicker instant navigation
const memoryTaskCache = new Map<string, LocalTask[]>();
const memoryTaskScopeCache = new Map<string, TaskCacheScope>();

function deduplicateTasks(taskList: LocalTask[]): LocalTask[] {
  const map = new Map<string, LocalTask>();
  for (const t of taskList) {
    if (t && t.id) {
      map.set(t.id, t);
    }
  }
  return Array.from(map.values());
}

function normalizeServerTask(t: any): LocalTask {
  return {
    ...t,
    completedAt: t.completedAt
      ? typeof t.completedAt === "string"
        ? t.completedAt
        : new Date(t.completedAt).toISOString()
      : null,
    createdAt: t.createdAt
      ? typeof t.createdAt === "string"
        ? t.createdAt
        : new Date(t.createdAt).toISOString()
      : new Date().toISOString(),
    updatedAt: t.updatedAt
      ? typeof t.updatedAt === "string"
        ? t.updatedAt
        : new Date(t.updatedAt).toISOString()
      : new Date().toISOString(),
    archivedAt: t.archivedAt
      ? typeof t.archivedAt === "string"
        ? t.archivedAt
        : new Date(t.archivedAt).toISOString()
      : null,
    clientUpdatedAt: Date.now(),
    subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
    tags: Array.isArray(t.tags) ? t.tags : [],
    version: t.version || 1,
    _syncStatus: "synced",
  };
}

export interface UseLocalTasksOptions {
  scope?: TaskCacheScope;
  includeArchived?: boolean;
  timezone?: string;
}

export function useLocalTasks(
  userId?: string,
  initialTasks?: any[],
  options: UseLocalTasksOptions = {}
) {
  const effectiveUserId = userId || "guest";
  const isGuest = effectiveUserId === "guest";
  const scope: TaskCacheScope = options.scope || "home";
  const includeArchived = options.includeArchived ?? scope === "full";
  const timezone = options.timezone || "Asia/Riyadh";

  const [tasks, setTasksState] = useState<LocalTask[]>(() => {
    const cached = memoryTaskCache.get(effectiveUserId);
    const cachedScope = memoryTaskScopeCache.get(effectiveUserId);
    if (cached && cached.length > 0 && cachedScope && SCOPE_RANK[cachedScope] >= SCOPE_RANK[scope]) {
      return deduplicateTasks(includeArchived ? cached : cached.filter((t) => !t.isArchived));
    }
    if (Array.isArray(initialTasks) && initialTasks.length > 0) {
      return deduplicateTasks(initialTasks.map(normalizeServerTask));
    }
    if (cached && cached.length > 0) {
      return deduplicateTasks(includeArchived ? cached : cached.filter((t) => !t.isArchived));
    }
    return [];
  });

  const setTasks = useCallback((action: React.SetStateAction<LocalTask[]>) => {
    setTasksState((prev) => {
      const next =
        typeof action === "function"
          ? (action as (p: LocalTask[]) => LocalTask[])(prev)
          : action;
      return deduplicateTasks(next);
    });
  }, []);

  const [isLoaded, setIsLoaded] = useState<boolean>(() => {
    const cachedScope = memoryTaskScopeCache.get(effectiveUserId);
    return Boolean(
      memoryTaskCache.has(effectiveUserId) &&
        cachedScope &&
        SCOPE_RANK[cachedScope] >= SCOPE_RANK[scope]
    );
  });
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

  // Load from IndexedDB on mount and reconcile with authoritative server initialTasks
  useEffect(() => {
    let isMounted = true;

    async function loadLocalData() {
      try {
        const localAll = await localTaskRepo.getAllForUser(effectiveUserId, true);
        const pendingMutations = isGuest
          ? []
          : await localOutboxRepo.getPending(effectiveUserId);
        const pendingEntityIds = new Set(pendingMutations.map((m) => m.entityId));
        const pendingDeleteIds = new Set(
          pendingMutations.filter((m) => m.action === "delete").map((m) => m.entityId)
        );

        const filterVisible = (list: LocalTask[]) =>
          includeArchived ? list : list.filter((t) => !t.isArchived);

        if (localAll.length > 0 && isMounted) {
          setTasks(filterVisible(localAll));
        }

        // Reconcile server initialTasks for authenticated users (even when empty!)
        if (!isGuest && Array.isArray(initialTasks)) {
          const mergedMap = new Map<string, LocalTask>();
          const serverIdSet = new Set<string>();

          // 1. Authoritative server tasks (unless deleted locally pending sync)
          for (const s of initialTasks) {
            if (!s?.id) continue;
            serverIdSet.add(s.id);
            if (!pendingDeleteIds.has(s.id)) {
              mergedMap.set(s.id, normalizeServerTask(s));
            }
          }

          // 2. Preserve local tasks with pending mutations OR out-of-scope synced records when scope !== "full"
          const staleSyncedIdsToDelete: string[] = [];
          for (const loc of localAll) {
            if (pendingDeleteIds.has(loc.id)) {
              continue;
            }
            if (pendingEntityIds.has(loc.id)) {
              mergedMap.set(loc.id, loc);
              continue;
            }
            if (!serverIdSet.has(loc.id)) {
              if (scope === "full") {
                // Full scope fetched all tasks; missing synced item was deleted on another device
                staleSyncedIdsToDelete.push(loc.id);
              } else if (scope === "active") {
                // Active scope fetched all non-archived; keep archived tasks locally, prune deleted active
                if (loc.isArchived) {
                  mergedMap.set(loc.id, loc);
                } else {
                  staleSyncedIdsToDelete.push(loc.id);
                }
              } else {
                // Home scope fetched all non-archived active + today's completed;
                // Keep historical completed/archived records, prune deleted active tasks
                if (loc.isArchived || loc.status === "COMPLETED") {
                  mergedMap.set(loc.id, loc);
                } else {
                  staleSyncedIdsToDelete.push(loc.id);
                }
              }
            }
          }

          if (staleSyncedIdsToDelete.length > 0) {
            await localTaskRepo.deleteBatch(staleSyncedIdsToDelete);
          }

          const mergedArray = Array.from(mergedMap.values()).sort(
            (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
          );

          if (mergedArray.length > 0) {
            await localTaskRepo.saveBatch(mergedArray);
          }

          const prevScope = memoryTaskScopeCache.get(effectiveUserId);
          if (!prevScope || SCOPE_RANK[scope] >= SCOPE_RANK[prevScope]) {
            memoryTaskScopeCache.set(effectiveUserId, scope);
          }

          if (isMounted) {
            setTasks(filterVisible(mergedArray));
          }
        } else if (isGuest) {
          memoryTaskScopeCache.set(effectiveUserId, "full");
        }
      } catch (err) {
        console.warn("Failed loading from IndexedDB, falling back to server props:", err);
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    }

    loadLocalData();

    // Listen for multi-tab or cross-component updates via BroadcastChannel
    const channel = new BroadcastChannel("athar_tasks_channel");
    channel.onmessage = (e) => {
      if (e.data?.type === "TASKS_CHANGED" && e.data.userId === effectiveUserId) {
        localTaskRepo.getAllForUser(effectiveUserId, includeArchived).then((updated) => {
          if (isMounted) setTasks(updated);
        });
      }
    };

    const handleLocalRefresh = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail?.userId || detail.userId === effectiveUserId) {
        localTaskRepo.getAllForUser(effectiveUserId, includeArchived).then((updated) => {
          if (isMounted) setTasks(updated);
        });
      }
    };
    window.addEventListener("athar_tasks_updated", handleLocalRefresh);

    return () => {
      isMounted = false;
      channel.close();
      window.removeEventListener("athar_tasks_updated", handleLocalRefresh);
    };
  }, [effectiveUserId, isGuest, initialTasks, scope, includeArchived, setTasks]);

  const broadcastChange = useCallback(() => {
    if (typeof window !== "undefined") {
      const channel = new BroadcastChannel("athar_tasks_channel");
      channel.postMessage({ type: "TASKS_CHANGED", userId: effectiveUserId });
      channel.close();
      window.dispatchEvent(
        new CustomEvent("athar_tasks_updated", { detail: { userId: effectiveUserId } })
      );
    }
  }, [effectiveUserId]);

  /**
   * 1. Add Task (Instant Local Execution <16ms)
   * Preserves explicit `dueDate: null` for unscheduled Open Tasks!
   */
  const addTask = useCallback(
    async (taskData: Partial<LocalTask>) => {
      const newId = taskData.id || crypto.randomUUID();
      const nowIso = new Date().toISOString();
      const nowMs = Date.now();

      const resolvedDueDate =
        taskData.dueDate !== undefined ? taskData.dueDate : getLocalDateString(new Date(), timezone);

      const newTask: LocalTask = {
        id: newId,
        userId: effectiveUserId,
        lifeAreaId: taskData.lifeAreaId || null,
        trackerId: taskData.trackerId || null,
        title: taskData.title?.trim() || "مهمة جديدة",
        description: taskData.description || null,
        dueDate: resolvedDueDate,
        startTime: taskData.startTime || null,
        durationMinutes: taskData.durationMinutes || null,
        priority: taskData.priority || "MEDIUM",
        status: taskData.status || "TODO",
        completedAt: taskData.status === "COMPLETED" ? nowIso : null,
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

      setTasks((prev) => [...prev.filter((t) => t.id !== newId), newTask]);
      await localTaskRepo.save(newTask);

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
    [effectiveUserId, isGuest, timezone, broadcastChange, setTasks]
  );

  /**
   * 2. Update Task (Instant Local Execution)
   */
  const updateTask = useCallback(
    async (id: string, updates: Partial<LocalTask>) => {
      const nowMs = Date.now();
      const current = tasksRef.current.find((t) => t.id === id) || (await localTaskRepo.getById(id));
      if (!current) return;

      const updatedTask: LocalTask = {
        ...current,
        ...updates,
        updatedAt: new Date(nowMs).toISOString(),
        clientUpdatedAt: nowMs,
        _syncStatus: isGuest ? "synced" : "pending",
      };

      setTasks((prev) => {
        if (updatedTask.isArchived && !includeArchived) {
          return prev.filter((t) => t.id !== id);
        }
        const exists = prev.some((t) => t.id === id);
        if (!exists) return [...prev, updatedTask];
        return prev.map((t) => (t.id === id ? updatedTask : t));
      });

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
          version: updatedTask.version,
          status: "pending",
          retryCount: 0,
        };
        await localOutboxRepo.add(mutation);
        syncEngine.scheduleSync(5000);
      }

      broadcastChange();
    },
    [effectiveUserId, isGuest, includeArchived, broadcastChange, setTasks]
  );

  /**
   * 3. Toggle Status (Instant Completion with Audio Feedback)
   */
  const toggleTaskStatus = useCallback(
    async (id: string) => {
      const task = tasksRef.current.find((t) => t.id === id) || (await localTaskRepo.getById(id));
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

      if (typeof window !== "undefined" && isCompleting) {
        window.dispatchEvent(
          new CustomEvent("athar_task_completed_externally", { detail: { taskId: id } })
        );
      }
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

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("athar_task_deleted_externally", { detail: { taskId: id } })
        );
      }

      soundManager.playClick();
      broadcastChange();
    },
    [effectiveUserId, isGuest, broadcastChange, setTasks]
  );

  /**
   * 5. Postpone Task (Manual postponement without duplicating records)
   */
  const postponeTask = useCallback(
    async (id: string, days: number = 1, customDate?: string) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task) return;

      const todayStr = getLocalDateString(new Date(), timezone);
      const baseDate = task.dueDate && task.dueDate >= todayStr ? task.dueDate : todayStr;
      const newDueDate = customDate || addDaysToDateString(baseDate, days);

      await updateTask(id, {
        dueDate: newDueDate,
      });
    },
    [updateTask, timezone]
  );

  /**
   * 6. Delete All Tasks (Local + Outbox)
   */
  const deleteAllTasks = useCallback(async () => {
    const allLocal = await localTaskRepo.getAllForUser(effectiveUserId, true);
    const allIds = allLocal.map((t) => t.id);

    setTasks([]);
    await localTaskRepo.deleteBatch(allIds);

    if (!isGuest && allIds.length > 0) {
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
  }, [effectiveUserId, isGuest, broadcastChange, setTasks]);

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
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      setTasks(reordered);
      await localTaskRepo.saveBatch(reordered);

      if (!isGuest) {
        const nowMs = Date.now();
        for (const t of reordered) {
          if (!idMap.has(t.id)) continue;
          const mutation: LocalMutation = {
            mutationId: crypto.randomUUID(),
            userId: effectiveUserId,
            entityType: "task",
            entityId: t.id,
            action: "update",
            payload: { sortOrder: t.sortOrder },
            clientTimestamp: nowMs,
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
    [effectiveUserId, isGuest, broadcastChange, setTasks]
  );

  /**
   * 8. Refresh Tasks from IndexedDB
   */
  const refreshTasks = useCallback(async () => {
    try {
      const localCached = await localTaskRepo.getAllForUser(effectiveUserId, includeArchived);
      setTasks(localCached);
    } catch (err) {
      console.warn("Failed to refresh tasks from IndexedDB:", err);
    }
  }, [effectiveUserId, includeArchived, setTasks]);

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
