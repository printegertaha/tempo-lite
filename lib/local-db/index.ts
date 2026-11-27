import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { OnboardingState } from "@/lib/onboarding";

export interface LocalYouTubeMeta {
  videoId: string;
  url: string;
  title: string;
  channelName: string;
  channelUrl?: string | null;
  channelAvatar?: string | null;
  thumbnailUrl: string;
}

export interface LocalTask {
  id: string;
  userId: string;
  lifeAreaId?: string | null;
  trackerId?: string | null;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  startTime?: string | null;
  durationMinutes?: number | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  completedAt?: string | null;
  isPomodoro: boolean;
  workCycle: number;
  breakCycle: number;
  isRecurring: boolean;
  subtasks: Array<{ id: string; title: string; completed: boolean }>;
  tags: string[];
  youtubeMeta?: LocalYouTubeMeta | LocalYouTubeMeta[] | null;
  sortOrder: number;
  version: number;
  isArchived: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  clientUpdatedAt: number;
  // Sync state
  _syncStatus?: "synced" | "pending" | "conflict";
}

export type LocalEntityType =
  | "task"
  | "task_session"
  | "entity_revision"
  | "tracker"
  | "tracker_entry"
  | "daily_note"
  | "abstinence"
  | "abstinence_session"
  | "life_area"
  | "gym_workout"
  | "meal_entry"
  | "water_entry"
  | "expense_entry"
  | "prayer_record"
  | "user_settings";

export interface LocalTaskSession {
  id: string;
  userId: string;
  taskId: string;
  trackerId?: string | null;
  localDate: string;
  startedAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number | null;
  status: "completed" | "interrupted" | "cancelled" | "legacy";
  completionSource: "timer" | "checkbox" | "legacy";
  isEstimated?: boolean;
  completedCycles?: number;
  taskTitleSnapshot: string;
  taskDescriptionSnapshot?: string | null;
  subtasksSnapshot?: Array<{ id: string; title: string; completed: boolean }>;
  lifeAreaIdSnapshot?: string | null;
  lifeAreaNameSnapshot?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  clientUpdatedAt: number;
  _syncStatus?: "synced" | "pending" | "conflict";
}

export interface LocalEntityRevision {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  localDate?: string | null;
  revisionNumber: number;
  previousValues: Record<string, any>;
  newValues: Record<string, any>;
  editedBy: string;
  editedAt: string;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
  clientUpdatedAt: number;
  _syncStatus?: "synced" | "pending" | "conflict";
}

export interface LocalMutation {
  mutationId: string;
  userId: string;
  entityType: LocalEntityType;
  entityId: string;
  action: "create" | "update" | "delete";
  payload: any;
  clientTimestamp: number;
  version: number;
  baseUpdatedAt?: string | number;
  status: "pending" | "syncing" | "failed" | "permanent_error";
  retryCount: number;
  nextRetryAt?: number;
  lastError?: string;
}

export interface LocalConflictRecord {
  id: string;
  userId: string;
  entityType: LocalEntityType;
  entityId: string;
  localRecord: any;
  serverRecord: any;
  detectedAt: number;
}

export interface LocalPrayerRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  prayerKey: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
  isCompleted: boolean;
  completedAt?: string | null;
  location?: "mosque" | "home" | "work" | "other" | null;
  withSunnah?: boolean;
  notes?: string | null;
  clientUpdatedAt: number;
}

interface AtharDBSchema extends DBSchema {
  tasks: {
    key: string;
    value: LocalTask;
    indexes: {
      "by-user": string;
      "by-user-date": [string, string];
      "by-user-status": [string, string];
    };
  };
  prayer_records: {
    key: string;
    value: LocalPrayerRecord;
    indexes: {
      "by-user-date": [string, string];
      "by-user": string;
    };
  };
  trackers: {
    key: string;
    value: any;
    indexes: {
      "by-user": string;
    };
  };
  tracker_entries: {
    key: string;
    value: any;
    indexes: {
      "by-user-date": [string, string];
      "by-tracker": string;
      "by-user": string;
    };
  };
  daily_notes: {
    key: string;
    value: any;
    indexes: {
      "by-user-date": [string, string];
      "by-user": string;
    };
  };
  outbox: {
    key: string;
    value: LocalMutation;
    indexes: {
      "by-user-status": [string, string];
      "by-user": string;
    };
  };
  metadata: {
    key: string;
    value: { key: string; value: any; updatedAt: number };
  };
  abstinence_trackers: {
    key: string;
    value: any;
    indexes: {
      "by-user": string;
    };
  };
  abstinence_sessions: {
    key: string;
    value: any;
    indexes: {
      "by-user": string;
      "by-user-tracker": [string, string];
    };
  };
  gym_workouts: {
    key: string;
    value: any;
    indexes: {
      "by-user-date": [string, string];
      "by-user": string;
    };
  };
  meal_entries: {
    key: string;
    value: any;
    indexes: {
      "by-user-date": [string, string];
      "by-user": string;
    };
  };
  water_entries: {
    key: string;
    value: any;
    indexes: {
      "by-user-date": [string, string];
      "by-user": string;
    };
  };
  life_areas: {
    key: string;
    value: any;
    indexes: {
      "by-user": string;
    };
  };
  expense_entries: {
    key: string;
    value: any;
    indexes: {
      "by-user-date": [string, string];
      "by-user": string;
    };
  };
  task_sessions: {
    key: string;
    value: LocalTaskSession;
    indexes: {
      "by-user": string;
      "by-user-date": [string, string];
      "by-task": string;
    };
  };
  entity_revisions: {
    key: string;
    value: LocalEntityRevision;
    indexes: {
      "by-user": string;
      "by-user-entity": [string, string, string];
      "by-user-date": [string, string];
    };
  };
}

const DB_NAME = "athar_local_v2";
const DB_VERSION = 6;
export const MAX_OUTBOX_RETRIES = 5;

function handleStorageWriteError(err: unknown) {
  const errName = (err as any)?.name || "";
  if (errName === "QuotaExceededError" && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("athar_storage_quota_warning", {
        detail: { message: "مساحة التخزين المحلية في المتصفح ممتلئة تقريباً." },
      })
    );
  }
  throw err;
}

let dbPromise: Promise<IDBPDatabase<AtharDBSchema>> | null = null;

export function getLocalDB(): Promise<IDBPDatabase<AtharDBSchema>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is only accessible on the client."));
  }

  if (!dbPromise) {
    dbPromise = openDB<AtharDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains("tasks")) {
          const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
          taskStore.createIndex("by-user", "userId");
          taskStore.createIndex("by-user-date", ["userId", "dueDate"]);
          taskStore.createIndex("by-user-status", ["userId", "status"]);
        }

        if (!db.objectStoreNames.contains("trackers")) {
          const trackerStore = db.createObjectStore("trackers", { keyPath: "id" });
          trackerStore.createIndex("by-user", "userId");
        }

        if (!db.objectStoreNames.contains("life_areas")) {
          const lifeAreaStore = db.createObjectStore("life_areas", { keyPath: "id" });
          lifeAreaStore.createIndex("by-user", "userId");
        }

        if (!db.objectStoreNames.contains("tracker_entries")) {
          const entryStore = db.createObjectStore("tracker_entries", { keyPath: "id" });
          entryStore.createIndex("by-user-date", ["userId", "localDate"]);
          entryStore.createIndex("by-tracker", "trackerId");
          entryStore.createIndex("by-user", "userId");
        } else {
          const entryStore = transaction.objectStore("tracker_entries");
          if (!entryStore.indexNames.contains("by-user" as any)) {
            entryStore.createIndex("by-user" as any, "userId");
          }
        }

        if (!db.objectStoreNames.contains("daily_notes")) {
          const noteStore = db.createObjectStore("daily_notes", { keyPath: "id" });
          noteStore.createIndex("by-user-date", ["userId", "localDate"]);
          noteStore.createIndex("by-user" as any, "userId");
        } else {
          const noteStore = transaction.objectStore("daily_notes");
          if (!noteStore.indexNames.contains("by-user" as any)) {
            noteStore.createIndex("by-user" as any, "userId");
          }
        }

        if (!db.objectStoreNames.contains("outbox")) {
          const outboxStore = db.createObjectStore("outbox", { keyPath: "mutationId" });
          outboxStore.createIndex("by-user-status", ["userId", "status"]);
          outboxStore.createIndex("by-user", "userId");
        }

        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata", { keyPath: "key" });
        }

        if (!db.objectStoreNames.contains("gym_workouts")) {
          const gymStore = db.createObjectStore("gym_workouts", { keyPath: "id" });
          gymStore.createIndex("by-user-date", ["userId", "date"]);
          gymStore.createIndex("by-user" as any, "userId");
        } else {
          const gymStore = transaction.objectStore("gym_workouts");
          if (!gymStore.indexNames.contains("by-user" as any)) {
            gymStore.createIndex("by-user" as any, "userId");
          }
        }
        if (!db.objectStoreNames.contains("meal_entries")) {
          const mealStore = db.createObjectStore("meal_entries", { keyPath: "id" });
          mealStore.createIndex("by-user-date", ["userId", "date"]);
          mealStore.createIndex("by-user" as any, "userId");
        } else {
          const mealStore = transaction.objectStore("meal_entries");
          if (!mealStore.indexNames.contains("by-user" as any)) {
            mealStore.createIndex("by-user" as any, "userId");
          }
        }
        if (!db.objectStoreNames.contains("water_entries")) {
          const waterStore = db.createObjectStore("water_entries", { keyPath: "id" });
          waterStore.createIndex("by-user-date", ["userId", "date"]);
          waterStore.createIndex("by-user", "userId");
        } else {
          const waterStore = transaction.objectStore("water_entries");
          if (!waterStore.indexNames.contains("by-user")) {
            waterStore.createIndex("by-user", "userId");
          }
        }
        if (!db.objectStoreNames.contains("expense_entries")) {
          const expenseStore = db.createObjectStore("expense_entries", { keyPath: "id" });
          expenseStore.createIndex("by-user-date", ["userId", "date"]);
          expenseStore.createIndex("by-user", "userId");
        } else {
          const expenseStore = transaction.objectStore("expense_entries");
          if (!expenseStore.indexNames.contains("by-user")) {
            expenseStore.createIndex("by-user", "userId");
          }
        }

        if (!db.objectStoreNames.contains("abstinence_trackers")) {
          const absStore = db.createObjectStore("abstinence_trackers", { keyPath: "id" });
          absStore.createIndex("by-user", "userId");
        }
        if (!db.objectStoreNames.contains("abstinence_sessions")) {
          const sessStore = db.createObjectStore("abstinence_sessions", { keyPath: "id" });
          sessStore.createIndex("by-user", "userId");
          sessStore.createIndex("by-user-tracker", ["userId", "trackerId"]);
        }

        if (!db.objectStoreNames.contains("prayer_records")) {
          const prayerStore = db.createObjectStore("prayer_records", { keyPath: "id" });
          prayerStore.createIndex("by-user", "userId");
          prayerStore.createIndex("by-user-date", ["userId", "date"]);
        }

        if (!db.objectStoreNames.contains("task_sessions")) {
          const tsStore = db.createObjectStore("task_sessions", { keyPath: "id" });
          tsStore.createIndex("by-user", "userId");
          tsStore.createIndex("by-user-date", ["userId", "localDate"]);
          tsStore.createIndex("by-task", "taskId");
        }

        if (!db.objectStoreNames.contains("entity_revisions")) {
          const revStore = db.createObjectStore("entity_revisions", { keyPath: "id" });
          revStore.createIndex("by-user", "userId");
          revStore.createIndex("by-user-entity", ["userId", "entityType", "entityId"]);
          revStore.createIndex("by-user-date", ["userId", "localDate"]);
        }
      },
    });
  }

  return dbPromise;
}

// -----------------------------------------------------------------------------
// High-Level Local Repositories
// -----------------------------------------------------------------------------

export const localTaskRepo = {
  async getById(id: string): Promise<LocalTask | undefined> {
    const db = await getLocalDB();
    return db.get("tasks", id);
  },

  async getAllForUser(userId: string, includeArchived = false): Promise<LocalTask[]> {
    const db = await getLocalDB();
    const all = await db.getAllFromIndex("tasks", "by-user", userId);
    const filtered = includeArchived ? all : all.filter((t) => !t.isArchived);
    return filtered.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },

  async getByDueDate(userId: string, dueDate: string): Promise<LocalTask[]> {
    const db = await getLocalDB();
    const tasks = await db.getAllFromIndex("tasks", "by-user-date", [userId, dueDate]);
    return tasks.filter((t) => !t.isArchived).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },

  async save(task: LocalTask): Promise<void> {
    const db = await getLocalDB();
    await db.put("tasks", task);
  },

  async saveBatch(tasks: LocalTask[]): Promise<void> {
    const db = await getLocalDB();
    const tx = db.transaction("tasks", "readwrite");
    for (const t of tasks) {
      await tx.store.put(t);
    }
    await tx.done;
  },

  async delete(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("tasks", id);
  },

  async deleteBatch(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getLocalDB();
    const tx = db.transaction("tasks", "readwrite");
    for (const id of ids) {
      await tx.store.delete(id);
    }
    await tx.done;
  },

  async clearUserTasks(userId: string): Promise<void> {
    const db = await getLocalDB();
    const tasks = await db.getAllFromIndex("tasks", "by-user", userId);
    const tx = db.transaction("tasks", "readwrite");
    for (const t of tasks) {
      await tx.store.delete(t.id);
    }
    await tx.done;
  },
};

export const localLifeAreaRepo = {
  async getAllForUser(userId: string, includeArchived = false): Promise<any[]> {
    const db = await getLocalDB();
    const all = await db.getAllFromIndex("life_areas", "by-user", userId);
    const filtered = includeArchived ? all : all.filter((a) => !a.isArchived);
    return filtered.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },

  async getById(id: string): Promise<any | undefined> {
    const db = await getLocalDB();
    return db.get("life_areas", id);
  },

  async save(area: any): Promise<void> {
    try {
      const db = await getLocalDB();
      await db.put("life_areas", area);
    } catch (err) {
      handleStorageWriteError(err);
    }
  },

  async saveBatch(areas: any[]): Promise<void> {
    if (areas.length === 0) return;
    try {
      const db = await getLocalDB();
      const tx = db.transaction("life_areas", "readwrite");
      for (const a of areas) {
        await tx.store.put(a);
      }
      await tx.done;
    } catch (err) {
      handleStorageWriteError(err);
    }
  },

  async delete(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("life_areas", id);
  },

  async deleteBatch(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getLocalDB();
    const tx = db.transaction("life_areas", "readwrite");
    for (const id of ids) {
      await tx.store.delete(id);
    }
    await tx.done;
  },
};

export const localTrackerRepo = {
  async getAllForUser(userId: string, includeArchived = false): Promise<any[]> {
    const db = await getLocalDB();
    const all = await db.getAllFromIndex("trackers", "by-user", userId);
    const filtered = includeArchived ? all : all.filter((t) => !t.isArchived);
    return filtered.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },

  async getById(id: string): Promise<any | undefined> {
    const db = await getLocalDB();
    return db.get("trackers", id);
  },

  async save(tracker: any): Promise<void> {
    try {
      const db = await getLocalDB();
      await db.put("trackers", tracker);
    } catch (err) {
      handleStorageWriteError(err);
    }
  },

  async saveBatch(trackers: any[]): Promise<void> {
    if (trackers.length === 0) return;
    try {
      const db = await getLocalDB();
      const tx = db.transaction("trackers", "readwrite");
      for (const t of trackers) {
        await tx.store.put(t);
      }
      await tx.done;
    } catch (err) {
      handleStorageWriteError(err);
    }
  },

  async delete(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("trackers", id);
  },

  async deleteBatch(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getLocalDB();
    const tx = db.transaction("trackers", "readwrite");
    for (const id of ids) {
      await tx.store.delete(id);
    }
    await tx.done;
  },
};

export const localEntryRepo = {
  async getById(id: string): Promise<any | undefined> {
    const db = await getLocalDB();
    return db.get("tracker_entries", id);
  },

  async getByDate(userId: string, localDate: string): Promise<any[]> {
    const db = await getLocalDB();
    const rows = await db.getAllFromIndex("tracker_entries", "by-user-date", [userId, localDate]);
    return rows.sort(
      (a, b) => new Date(a.occurredAt || 0).getTime() - new Date(b.occurredAt || 0).getTime()
    );
  },

  async getByTrackerAndDate(userId: string, trackerId: string, localDate: string): Promise<any[]> {
    const dayEntries = await this.getByDate(userId, localDate);
    return dayEntries.filter((e) => e.trackerId === trackerId);
  },

  async getByTracker(userId: string, trackerId: string): Promise<any[]> {
    const db = await getLocalDB();
    const rows = await db.getAllFromIndex("tracker_entries", "by-tracker", trackerId);
    return rows
      .filter((e) => e.userId === userId)
      .sort((a, b) => new Date(a.occurredAt || 0).getTime() - new Date(b.occurredAt || 0).getTime());
  },

  async getAllForUser(userId: string): Promise<any[]> {
    const db = await getLocalDB();
    try {
      return await db.getAllFromIndex("tracker_entries", "by-user" as any, userId);
    } catch {
      const all = await db.getAll("tracker_entries");
      return all.filter((e) => e.userId === userId);
    }
  },

  async save(entry: any): Promise<void> {
    try {
      const db = await getLocalDB();
      await db.put("tracker_entries", entry);
    } catch (err) {
      handleStorageWriteError(err);
    }
  },

  async saveBatch(entries: any[]): Promise<void> {
    if (entries.length === 0) return;
    try {
      const db = await getLocalDB();
      const tx = db.transaction("tracker_entries", "readwrite");
      for (const e of entries) {
        await tx.store.put(e);
      }
      await tx.done;
    } catch (err) {
      handleStorageWriteError(err);
    }
  },

  async delete(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("tracker_entries", id);
  },

  async deleteByTracker(userId: string, trackerId: string): Promise<void> {
    const entries = await this.getByTracker(userId, trackerId);
    if (entries.length === 0) return;
    const db = await getLocalDB();
    const tx = db.transaction("tracker_entries", "readwrite");
    for (const e of entries) {
      await tx.store.delete(e.id);
    }
    await tx.done;
  },
};

export const localAbstinenceRepo = {
  async getAllTrackers(userId: string): Promise<any[]> {
    const db = await getLocalDB();
    const all = await db.getAllFromIndex("abstinence_trackers", "by-user", userId);
    return all.filter((t) => !t.isArchived);
  },

  async getTracker(id: string): Promise<any | undefined> {
    const db = await getLocalDB();
    return db.get("abstinence_trackers", id);
  },

  async saveTracker(tracker: any): Promise<void> {
    const db = await getLocalDB();
    await db.put("abstinence_trackers", tracker);
  },

  async deleteTracker(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("abstinence_trackers", id);
  },

  async getSessionsForTracker(userId: string, trackerId: string): Promise<any[]> {
    const db = await getLocalDB();
    const rows = await db.getAllFromIndex("abstinence_sessions", "by-user-tracker", [userId, trackerId]);
    return rows.sort(
      (a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime()
    );
  },

  async getAllSessions(userId: string): Promise<any[]> {
    const db = await getLocalDB();
    return db.getAllFromIndex("abstinence_sessions", "by-user", userId);
  },

  async saveSession(session: any): Promise<void> {
    const db = await getLocalDB();
    await db.put("abstinence_sessions", session);
  },

  async deleteSessionsForTracker(userId: string, trackerId: string): Promise<void> {
    const rows = await this.getSessionsForTracker(userId, trackerId);
    if (rows.length === 0) return;
    const db = await getLocalDB();
    const tx = db.transaction("abstinence_sessions", "readwrite");
    for (const s of rows) {
      await tx.store.delete(s.id);
    }
    await tx.done;
  },
};

export const localNoteRepo = {
  async getByDate(userId: string, localDate: string): Promise<any | undefined> {
    const db = await getLocalDB();
    const matches = await db.getAllFromIndex("daily_notes", "by-user-date", [userId, localDate]);
    return matches[0];
  },

  async getAllForUser(userId: string): Promise<any[]> {
    const db = await getLocalDB();
    try {
      return await db.getAllFromIndex("daily_notes", "by-user" as any, userId);
    } catch {
      const all = await db.getAll("daily_notes");
      return all.filter((n) => n.userId === userId);
    }
  },

  async save(note: any): Promise<void> {
    try {
      const db = await getLocalDB();
      await db.put("daily_notes", note);
    } catch (err) {
      handleStorageWriteError(err);
    }
  },

  async saveBatch(notes: any[]): Promise<void> {
    if (notes.length === 0) return;
    try {
      const db = await getLocalDB();
      const tx = db.transaction("daily_notes", "readwrite");
      for (const n of notes) await tx.store.put(n);
      await tx.done;
    } catch (err) {
      handleStorageWriteError(err);
    }
  },

  async delete(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("daily_notes", id);
  },
};

export const localOutboxRepo = {
  async add(mutation: LocalMutation): Promise<void> {
    try {
      const db = await getLocalDB();
      await db.put("outbox", mutation);
    } catch (err) {
      handleStorageWriteError(err);
    }
  },

  async getPending(userId: string, respectBackoff = false): Promise<LocalMutation[]> {
    const db = await getLocalDB();
    const mutations = await db.getAllFromIndex("outbox", "by-user", userId);
    const now = Date.now();
    return mutations
      .filter((m) => {
        const isEligible =
          m.status === "pending" ||
          (m.status === "failed" && (m.retryCount || 0) < MAX_OUTBOX_RETRIES);
        if (!isEligible) return false;
        if (respectBackoff && m.nextRetryAt && m.nextRetryAt > now) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.clientTimestamp - b.clientTimestamp);
  },

  async recoverStaleSyncing(userId: string): Promise<void> {
    const db = await getLocalDB();
    const all = await db.getAllFromIndex("outbox", "by-user", userId);
    const stale = all.filter((m) => m.status === "syncing");
    if (stale.length === 0) return;
    const tx = db.transaction("outbox", "readwrite");
    for (const m of stale) {
      m.status = "pending";
      await tx.store.put(m);
    }
    await tx.done;
  },

  async getFailed(userId: string): Promise<LocalMutation[]> {
    const db = await getLocalDB();
    const mutations = await db.getAllFromIndex("outbox", "by-user", userId);
    return mutations.filter(
      (m) =>
        m.status === "permanent_error" ||
        (m.status === "failed" && (m.retryCount || 0) >= MAX_OUTBOX_RETRIES)
    );
  },

  async updateStatus(
    mutationId: string,
    status: "pending" | "syncing" | "failed" | "permanent_error",
    error?: string,
    nextRetryAt?: number
  ): Promise<void> {
    const db = await getLocalDB();
    const m = await db.get("outbox", mutationId);
    if (m) {
      m.status = status;
      if (error) {
        m.lastError = error;
        m.retryCount = (m.retryCount || 0) + 1;
      }
      if (nextRetryAt !== undefined) {
        m.nextRetryAt = nextRetryAt;
      } else if (status === "pending") {
        delete m.nextRetryAt;
      }
      await db.put("outbox", m);
    }
  },

  async resetFailedForRetry(userId: string): Promise<number> {
    const db = await getLocalDB();
    const all = await db.getAllFromIndex("outbox", "by-user", userId);
    const tx = db.transaction("outbox", "readwrite");
    let count = 0;
    for (const m of all) {
      if (m.status === "failed" || m.status === "permanent_error") {
        m.status = "pending";
        m.retryCount = 0;
        delete m.nextRetryAt;
        delete m.lastError;
        await tx.store.put(m);
        count++;
      }
    }
    await tx.done;
    return count;
  },

  async remove(mutationId: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("outbox", mutationId);
  },

  async removeBatch(mutationIds: string[]): Promise<void> {
    if (mutationIds.length === 0) return;
    const db = await getLocalDB();
    const tx = db.transaction("outbox", "readwrite");
    for (const id of mutationIds) {
      await tx.store.delete(id);
    }
    await tx.done;
  },

  async countPending(userId: string): Promise<number> {
    const db = await getLocalDB();
    const all = await db.getAllFromIndex("outbox", "by-user", userId);
    return all.filter(
      (m) =>
        m.status === "pending" ||
        m.status === "syncing" ||
        (m.status === "failed" && (m.retryCount || 0) < MAX_OUTBOX_RETRIES)
    ).length;
  },

  async countFailed(userId: string): Promise<number> {
    const db = await getLocalDB();
    const all = await db.getAllFromIndex("outbox", "by-user", userId);
    return all.filter(
      (m) =>
        m.status === "permanent_error" ||
        (m.status === "failed" && (m.retryCount || 0) >= MAX_OUTBOX_RETRIES)
    ).length;
  },
};

export const localMetadataRepo = {
  async get(key: string): Promise<any> {
    const db = await getLocalDB();
    const item = await db.get("metadata", key);
    return item?.value;
  },

  async set(key: string, value: any): Promise<void> {
    try {
      const db = await getLocalDB();
      await db.put("metadata", { key, value, updatedAt: Date.now() });
    } catch (err) {
      handleStorageWriteError(err);
    }
  },

  async delete(key: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("metadata", key);
  },
};

export const localSyncMetaRepo = {
  async getCursor(userId: string): Promise<number | null> {
    const val = await localMetadataRepo.get(`lastSyncCursor:${userId}`);
    return typeof val === "number" ? val : null;
  },

  async setCursor(userId: string, timestamp: number): Promise<void> {
    await localMetadataRepo.set(`lastSyncCursor:${userId}`, timestamp);
  },

  async getConflicts(userId: string): Promise<LocalConflictRecord[]> {
    const val = await localMetadataRepo.get(`conflicts:${userId}`);
    return Array.isArray(val) ? val : [];
  },

  async addConflict(record: LocalConflictRecord): Promise<void> {
    const existing = await this.getConflicts(record.userId);
    const filtered = existing.filter(
      (c) => !(c.entityType === record.entityType && c.entityId === record.entityId)
    );
    filtered.push(record);
    await localMetadataRepo.set(`conflicts:${record.userId}`, filtered);
  },

  async removeConflict(userId: string, conflictId: string): Promise<void> {
    const existing = await this.getConflicts(userId);
    await localMetadataRepo.set(
      `conflicts:${userId}`,
      existing.filter((c) => c.id !== conflictId)
    );
  },

  async getLastAuthAccount(): Promise<{
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null> {
    const val = await localMetadataRepo.get("last_authenticated_account");
    return val && typeof val === "object" && val.id ? val : null;
  },

  async setLastAuthAccount(account: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null): Promise<void> {
    if (!account) {
      await localMetadataRepo.delete("last_authenticated_account");
      return;
    }
    // Store ONLY non-secret public identity descriptor for offline IDB namespace routing
    await localMetadataRepo.set("last_authenticated_account", {
      id: account.id,
      name: account.name || null,
      email: account.email || null,
      image: account.image || null,
      cachedAt: Date.now(),
    });
  },

  async getUserSettings(userId: string): Promise<any | null> {
    const val = await localMetadataRepo.get(`user_settings:${userId}`);
    return val || null;
  },

  async saveUserSettings(userId: string, settings: any): Promise<void> {
    await localMetadataRepo.set(`user_settings:${userId}`, settings);
  },

  async getBodyWeights(userId: string): Promise<any[]> {
    const val = await localMetadataRepo.get(`body_weights:${userId}`);
    return Array.isArray(val) ? val : [];
  },

  async saveBodyWeights(userId: string, weights: any[]): Promise<void> {
    await localMetadataRepo.set(`body_weights:${userId}`, weights);
  },

  async getCachedNutritionFoods(): Promise<any[]> {
    const val = await localMetadataRepo.get("nutrition_food_cache_v1");
    return Array.isArray(val) ? val : [];
  },

  async saveCachedNutritionFoods(foods: any[]): Promise<void> {
    await localMetadataRepo.set("nutrition_food_cache_v1", foods.slice(0, 250));
  },

  async getCustomFoods(userId: string): Promise<any[]> {
    const val = await localMetadataRepo.get(`custom_foods:${userId}`);
    return Array.isArray(val) ? val : [];
  },

  async saveCustomFoods(userId: string, foods: any[]): Promise<void> {
    await localMetadataRepo.set(`custom_foods:${userId}`, foods);
  },
};

export const localPrayerRepo = {
  async getByDate(userId: string, date: string): Promise<LocalPrayerRecord[]> {
    const db = await getLocalDB();
    return db.getAllFromIndex("prayer_records", "by-user-date", [userId, date]);
  },

  async getAllForUser(userId: string): Promise<LocalPrayerRecord[]> {
    const db = await getLocalDB();
    return db.getAllFromIndex("prayer_records", "by-user", userId);
  },

  async getById(id: string): Promise<LocalPrayerRecord | undefined> {
    const db = await getLocalDB();
    return db.get("prayer_records", id);
  },

  async save(record: LocalPrayerRecord): Promise<void> {
    const db = await getLocalDB();
    await db.put("prayer_records", record);
  },

  async saveBatch(records: LocalPrayerRecord[]): Promise<void> {
    const db = await getLocalDB();
    const tx = db.transaction("prayer_records", "readwrite");
    for (const r of records) {
      await tx.store.put(r);
    }
    await tx.done;
  },

  async delete(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("prayer_records", id);
  },
};

export const localDomainRepo = {
  async getGymWorkouts(userId: string): Promise<any[]> {
    const db = await getLocalDB();
    try {
      return await db.getAllFromIndex("gym_workouts", "by-user" as any, userId);
    } catch {
      const all = await db.getAll("gym_workouts");
      return all.filter((g) => g.userId === userId);
    }
  },
  async saveGymWorkout(workout: any): Promise<void> {
    try {
      const db = await getLocalDB();
      await db.put("gym_workouts", workout);
    } catch (err) {
      handleStorageWriteError(err);
    }
  },
  async saveGymBatch(workouts: any[]): Promise<void> {
    if (workouts.length === 0) return;
    try {
      const db = await getLocalDB();
      const tx = db.transaction("gym_workouts", "readwrite");
      for (const w of workouts) await tx.store.put(w);
      await tx.done;
    } catch (err) {
      handleStorageWriteError(err);
    }
  },
  async deleteGymWorkout(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("gym_workouts", id);
  },

  async getMealEntries(userId: string): Promise<any[]> {
    const db = await getLocalDB();
    try {
      return await db.getAllFromIndex("meal_entries", "by-user" as any, userId);
    } catch {
      const all = await db.getAll("meal_entries");
      return all.filter((m) => m.userId === userId);
    }
  },
  async saveMealEntry(meal: any): Promise<void> {
    try {
      const db = await getLocalDB();
      await db.put("meal_entries", meal);
    } catch (err) {
      handleStorageWriteError(err);
    }
  },
  async saveMealBatch(meals: any[]): Promise<void> {
    if (meals.length === 0) return;
    try {
      const db = await getLocalDB();
      const tx = db.transaction("meal_entries", "readwrite");
      for (const m of meals) await tx.store.put(m);
      await tx.done;
    } catch (err) {
      handleStorageWriteError(err);
    }
  },
  async deleteMealEntry(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("meal_entries", id);
  },

  async getWaterEntries(userId: string): Promise<any[]> {
    const db = await getLocalDB();
    try {
      return await db.getAllFromIndex("water_entries", "by-user", userId);
    } catch {
      const all = await db.getAll("water_entries");
      return all.filter((w) => w.userId === userId);
    }
  },
  async saveWaterEntry(entry: any): Promise<void> {
    try {
      const db = await getLocalDB();
      await db.put("water_entries", entry);
    } catch (err) {
      handleStorageWriteError(err);
    }
  },
  async saveWaterBatch(entries: any[]): Promise<void> {
    if (entries.length === 0) return;
    try {
      const db = await getLocalDB();
      const tx = db.transaction("water_entries", "readwrite");
      for (const w of entries) await tx.store.put(w);
      await tx.done;
    } catch (err) {
      handleStorageWriteError(err);
    }
  },
  async deleteWaterEntry(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("water_entries", id);
  },

  async getExpenseEntries(userId: string): Promise<any[]> {
    const db = await getLocalDB();
    try {
      return await db.getAllFromIndex("expense_entries", "by-user", userId);
    } catch {
      const all = await db.getAll("expense_entries");
      return all.filter((e) => e.userId === userId);
    }
  },
  async saveExpenseEntry(expense: any): Promise<void> {
    try {
      const db = await getLocalDB();
      await db.put("expense_entries", expense);
    } catch (err) {
      handleStorageWriteError(err);
    }
  },
  async saveExpenseBatch(expenses: any[]): Promise<void> {
    if (expenses.length === 0) return;
    try {
      const db = await getLocalDB();
      const tx = db.transaction("expense_entries", "readwrite");
      for (const e of expenses) await tx.store.put(e);
      await tx.done;
    } catch (err) {
      handleStorageWriteError(err);
    }
  },
  async deleteExpenseEntry(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("expense_entries", id);
  },
};

export const localTaskSessionRepo = {
  async getById(id: string): Promise<LocalTaskSession | undefined> {
    const db = await getLocalDB();
    return db.get("task_sessions", id);
  },

  async getAllForUser(userId: string): Promise<LocalTaskSession[]> {
    const db = await getLocalDB();
    const rows = await db.getAllFromIndex("task_sessions", "by-user", userId);
    return rows.sort((a, b) => {
      const aTime = new Date(a.endedAt || a.startedAt || a.createdAt).getTime();
      const bTime = new Date(b.endedAt || b.startedAt || b.createdAt).getTime();
      return bTime - aTime;
    });
  },

  async getByDate(userId: string, localDate: string): Promise<LocalTaskSession[]> {
    const db = await getLocalDB();
    const rows = await db.getAllFromIndex("task_sessions", "by-user-date", [userId, localDate]);
    return rows.sort((a, b) => {
      const aTime = new Date(a.endedAt || a.startedAt || a.createdAt).getTime();
      const bTime = new Date(b.endedAt || b.startedAt || b.createdAt).getTime();
      return bTime - aTime;
    });
  },

  async getByTask(userId: string, taskId: string): Promise<LocalTaskSession[]> {
    const db = await getLocalDB();
    const rows = await db.getAllFromIndex("task_sessions", "by-task", taskId);
    return rows.filter((r) => r.userId === userId);
  },

  async save(session: LocalTaskSession): Promise<void> {
    try {
      const db = await getLocalDB();
      await db.put("task_sessions", session);
    } catch (err) {
      handleStorageWriteError(err);
    }
  },

  async saveBatch(sessions: LocalTaskSession[]): Promise<void> {
    if (sessions.length === 0) return;
    try {
      const db = await getLocalDB();
      const tx = db.transaction("task_sessions", "readwrite");
      for (const s of sessions) await tx.store.put(s);
      await tx.done;
    } catch (err) {
      handleStorageWriteError(err);
    }
  },

  async delete(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("task_sessions", id);
  },

  async deleteBatch(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getLocalDB();
    const tx = db.transaction("task_sessions", "readwrite");
    for (const id of ids) await tx.store.delete(id);
    await tx.done;
  },

  async deleteByTaskId(userId: string, taskId: string): Promise<string[]> {
    const rows = await this.getByTask(userId, taskId);
    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
      await this.deleteBatch(ids);
    }
    return ids;
  },
};

export const localRevisionRepo = {
  async getById(id: string): Promise<LocalEntityRevision | undefined> {
    const db = await getLocalDB();
    return db.get("entity_revisions", id);
  },

  async getAllForUser(userId: string): Promise<LocalEntityRevision[]> {
    const db = await getLocalDB();
    const rows = await db.getAllFromIndex("entity_revisions", "by-user", userId);
    return rows.sort((a, b) => new Date(b.editedAt).getTime() - new Date(a.editedAt).getTime());
  },

  async getByEntity(
    userId: string,
    entityType: string,
    entityId: string
  ): Promise<LocalEntityRevision[]> {
    const db = await getLocalDB();
    const rows = await db.getAllFromIndex("entity_revisions", "by-user-entity", [
      userId,
      entityType,
      entityId,
    ]);
    return rows.sort((a, b) => a.revisionNumber - b.revisionNumber);
  },

  async getByDate(userId: string, localDate: string): Promise<LocalEntityRevision[]> {
    const db = await getLocalDB();
    return db.getAllFromIndex("entity_revisions", "by-user-date", [userId, localDate]);
  },

  async save(revision: LocalEntityRevision): Promise<void> {
    try {
      const db = await getLocalDB();
      await db.put("entity_revisions", revision);
    } catch (err) {
      handleStorageWriteError(err);
    }
  },

  async saveBatch(revisions: LocalEntityRevision[]): Promise<void> {
    if (revisions.length === 0) return;
    try {
      const db = await getLocalDB();
      const tx = db.transaction("entity_revisions", "readwrite");
      for (const r of revisions) await tx.store.put(r);
      await tx.done;
    } catch (err) {
      handleStorageWriteError(err);
    }
  },

  async delete(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("entity_revisions", id);
  },

  async deleteByEntity(userId: string, entityType: string, entityId: string): Promise<string[]> {
    const rows = await this.getByEntity(userId, entityType, entityId);
    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
      const db = await getLocalDB();
      const tx = db.transaction("entity_revisions", "readwrite");
      for (const id of ids) await tx.store.delete(id);
      await tx.done;
    }
    return ids;
  },

  async deleteBatch(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getLocalDB();
    const tx = db.transaction("entity_revisions", "readwrite");
    for (const id of ids) await tx.store.delete(id);
    await tx.done;
  },
};

export const localOnboardingRepo = {
  async get(ownerKey: string = "guest"): Promise<OnboardingState | null> {
    const val = await localMetadataRepo.get(`onboarding_state:${ownerKey}`);
    if (val && typeof val === "object") {
      return val as OnboardingState;
    }
    if (typeof window !== "undefined") {
      try {
        const ls = localStorage.getItem(`athar_onboarding_state:${ownerKey}`);
        if (ls) {
          const parsed = JSON.parse(ls) as OnboardingState;
          await localMetadataRepo.set(`onboarding_state:${ownerKey}`, parsed).catch(() => {});
          return parsed;
        }
      } catch {}
    }
    return null;
  },

  async save(state: OnboardingState): Promise<void> {
    const key = state.ownerKey || "guest";
    const nextState: OnboardingState = {
      ...state,
      ownerKey: key,
      updatedAt: new Date().toISOString(),
    };
    await localMetadataRepo.set(`onboarding_state:${key}`, nextState);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`athar_onboarding_state:${key}`, JSON.stringify(nextState));
      } catch {}
    }
  },

  async hasLegacyGuestActivity(): Promise<boolean> {
    try {
      const summary = await localGuestManager.getSummary();
      if (summary.hasData) return true;
      if (typeof window !== "undefined") {
        const legacyTimerRaw = localStorage.getItem("athar_timer_session_history_v1");
        if (legacyTimerRaw) {
          const arr = JSON.parse(legacyTimerRaw);
          if (Array.isArray(arr) && arr.length > 0) return true;
        }
        const quranRaw = localStorage.getItem("athar_quran_memorization_v1");
        if (quranRaw) {
          const arr = JSON.parse(quranRaw);
          if (Array.isArray(arr) && arr.length > 0) return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  },
};

/**
 * Helper to clear ALL IndexedDB stores for local reset
 */
export async function clearAllLocalIndexedDB(): Promise<void> {
  const db = await getLocalDB();
  const storeNames = Array.from(db.objectStoreNames);
  const tx = db.transaction(storeNames as any, "readwrite");
  for (const name of storeNames) {
    await (tx as any).objectStore(name).clear();
  }
  await tx.done;
}

/**
 * Safely extract legacy localStorage guest records (expenses, meals, gym)
 * without overwriting or discarding them until cloud import succeeds.
 */
function readLegacyLocalStorageGuestData() {
  if (typeof window === "undefined") {
    return { gymWorkouts: [], mealEntries: [], expenseEntries: [], quranSurahs: [] };
  }

  const gymWorkouts: any[] = [];
  const mealEntries: any[] = [];
  const expenseEntries: any[] = [];
  let quranSurahs: number[] = [];

  try {
    const rawExpenses = localStorage.getItem("athar_expenses");
    if (rawExpenses) {
      const parsed = JSON.parse(rawExpenses);
      if (Array.isArray(parsed?.transactions)) {
        for (const tx of parsed.transactions) {
          const numericId = Number(tx?.id);
          const isLegacySeed = Number.isInteger(numericId) && numericId >= 101 && numericId <= 106;
          if (!isLegacySeed && tx && tx.title && Number(tx.amount) > 0) {
            expenseEntries.push({
              id: typeof tx.id === "string" && tx.id.length > 0 ? tx.id : `ls_exp_${tx.id}`,
              userId: "guest",
              date: tx.date || new Date().toISOString().split("T")[0],
              title: tx.title,
              amount: Number(tx.amount),
              currency: tx.currency || "EGP",
              type: tx.type === "income" ? "income" : "expense",
              category: tx.category || "عام",
              notes: tx.notes || null,
            });
          }
        }
      }
    }
  } catch {}

  try {
    const rawNutrition = localStorage.getItem("athar_nutrition");
    if (rawNutrition) {
      const parsed = JSON.parse(rawNutrition);
      if (Array.isArray(parsed?.meals)) {
        const DEMO_IDS = new Set(["m1", "m2", "m3", "m4"]);
        for (const m of parsed.meals) {
          if (m && (m.title || m.name) && !DEMO_IDS.has(String(m.id || "")) && String(m.id || "").startsWith("m_")) {
            mealEntries.push({
              id: `ls_meal_${m.id}`,
              userId: "guest",
              date: m.date || new Date().toISOString().split("T")[0],
              time: m.time || null,
              mealType: m.mealType || "lunch",
              title: m.title || m.name,
              calories: Number(m.calories) || 0,
              protein: Number(m.protein) || 0,
              carbs: Number(m.carbs) || 0,
              fat: Number(m.fat) || 0,
              items: Array.isArray(m.items) ? m.items : [],
              dailyTargetsSnapshot: m.dailyTargetsSnapshot || null,
              notes: m.notes || null,
            });
          }
        }
      }
    }
  } catch {}

  try {
    const rawState = localStorage.getItem("athar_state_v1");
    if (rawState) {
      const parsed = JSON.parse(rawState);
      if (parsed?.recordsByDate && typeof parsed.recordsByDate === "object") {
        for (const [dateKey, dayData] of Object.entries<any>(parsed.recordsByDate)) {
          if (Array.isArray(dayData?.gymSessions)) {
            for (const g of dayData.gymSessions) {
              gymWorkouts.push({
                id: `ls_gym_${g.id || `${dateKey}_${g.workoutType}`}`,
                userId: "guest",
                date: dateKey,
                title: g.workoutType || g.gymName || "جلسة تمرين",
                durationMinutes: Number(g.durationMinutes) || 60,
                muscleGroup: g.muscleGroup || null,
                exercises: Array.isArray(g.exercises) ? g.exercises : [],
                notes: g.notes || null,
              });
            }
          }
        }
      }
    }
  } catch {}

  try {
    const rawQuran = localStorage.getItem("athar_quran_memorization_v1");
    if (rawQuran) {
      const parsed = JSON.parse(rawQuran);
      if (Array.isArray(parsed)) quranSurahs = parsed;
    }
  } catch {}

  let preferences: any = null;
  try {
    const rawSettings = localStorage.getItem("athar_user_settings");
    if (rawSettings) {
      preferences = JSON.parse(rawSettings);
    }
  } catch {}

  return { gymWorkouts, mealEntries, expenseEntries, quranSurahs, preferences };
}

export interface GuestDataSummary {
  hasData: boolean;
  tasksCount: number;
  taskSessionsCount: number;
  revisionsCount: number;
  prayersCount: number;
  trackersCount: number;
  abstinenceCount: number;
  entriesCount: number;
  notesCount: number;
  gymCount: number;
  mealsCount: number;
  waterCount: number;
  expensesCount: number;
  totalRecords: number;
}

export const localGuestManager = {
  async getSummary(): Promise<GuestDataSummary> {
    try {
      const db = await getLocalDB();
      const [tasks, taskSessions, revisions, prayers, trackers, entries, abstinence, notes, gym, meals, waters, expenses] =
        await Promise.all([
          db.getAllFromIndex("tasks", "by-user", "guest"),
          db.getAllFromIndex("task_sessions", "by-user", "guest").catch(() => []),
          db.getAllFromIndex("entity_revisions", "by-user", "guest").catch(() => []),
          db.getAllFromIndex("prayer_records", "by-user", "guest").catch(() => []),
          db.getAllFromIndex("trackers", "by-user", "guest"),
          db.getAll("tracker_entries").catch(() => []),
          db.getAllFromIndex("abstinence_trackers", "by-user", "guest").catch(() => []),
          db.getAll("daily_notes"),
          db.getAll("gym_workouts"),
          db.getAll("meal_entries"),
          db.getAll("water_entries").catch(() => []),
          db.getAll("expense_entries"),
        ]);

      const guestEntries = entries.filter((e: any) => e.userId === "guest");
      const guestNotes = notes.filter((n: any) => n.userId === "guest");
      const idbGym = gym.filter((g: any) => g.userId === "guest");
      const idbMeals = meals.filter((m: any) => m.userId === "guest");
      const idbWaters = waters.filter((w: any) => w.userId === "guest");
      const idbExpenses = expenses.filter((e: any) => e.userId === "guest");

      const legacy = readLegacyLocalStorageGuestData();
      const gymCount = idbGym.length + legacy.gymWorkouts.length;
      const mealsCount = idbMeals.length + legacy.mealEntries.length;
      const waterCount = idbWaters.length;
      const expensesCount = idbExpenses.length + legacy.expenseEntries.length;

      const total =
        tasks.length +
        taskSessions.length +
        revisions.length +
        prayers.length +
        trackers.length +
        guestEntries.length +
        abstinence.length +
        guestNotes.length +
        gymCount +
        mealsCount +
        waterCount +
        expensesCount;

      return {
        hasData: total > 0,
        tasksCount: tasks.length,
        taskSessionsCount: taskSessions.length,
        revisionsCount: revisions.length,
        prayersCount: prayers.length,
        trackersCount: trackers.length,
        abstinenceCount: abstinence.length,
        entriesCount: guestEntries.length,
        notesCount: guestNotes.length,
        gymCount,
        mealsCount,
        waterCount,
        expensesCount,
        totalRecords: total,
      };
    } catch {
      return {
        hasData: false,
        tasksCount: 0,
        taskSessionsCount: 0,
        revisionsCount: 0,
        prayersCount: 0,
        trackersCount: 0,
        abstinenceCount: 0,
        entriesCount: 0,
        notesCount: 0,
        gymCount: 0,
        mealsCount: 0,
        waterCount: 0,
        expensesCount: 0,
        totalRecords: 0,
      };
    }
  },

  async getAllGuestPayload(): Promise<{
    tasks: any[];
    taskSessions: any[];
    entityRevisions: any[];
    prayers: any[];
    trackers: any[];
    trackerEntries: any[];
    abstinenceTrackers: any[];
    abstinenceSessions: any[];
    dailyNotes: any[];
    gymWorkouts: any[];
    mealEntries: any[];
    waterEntries: any[];
    expenseEntries: any[];
    preferences?: any;
    onboarding?: OnboardingState | null;
  }> {
    const db = await getLocalDB();
    const [tasks, taskSessions, entityRevisions, prayers, trackers, entries, abstinence, absSessions, notes, gym, meals, waters, expenses, onboarding] =
      await Promise.all([
        db.getAllFromIndex("tasks", "by-user", "guest"),
        db.getAllFromIndex("task_sessions", "by-user", "guest").catch(() => []),
        db.getAllFromIndex("entity_revisions", "by-user", "guest").catch(() => []),
        db.getAllFromIndex("prayer_records", "by-user", "guest").catch(() => []),
        db.getAllFromIndex("trackers", "by-user", "guest"),
        db.getAll("tracker_entries").catch(() => []),
        db.getAllFromIndex("abstinence_trackers", "by-user", "guest").catch(() => []),
        db.getAllFromIndex("abstinence_sessions", "by-user", "guest").catch(() => []),
        db.getAll("daily_notes"),
        db.getAll("gym_workouts"),
        db.getAll("meal_entries"),
        db.getAll("water_entries").catch(() => []),
        db.getAll("expense_entries"),
        localOnboardingRepo.get("guest").catch(() => null),
      ]);

    const legacy = readLegacyLocalStorageGuestData();

    const mergeById = (idbRows: any[], lsRows: any[]) => {
      const map = new Map<string, any>();
      for (const r of idbRows) map.set(r.id, r);
      for (const r of lsRows) {
        if (!map.has(r.id)) map.set(r.id, r);
      }
      return Array.from(map.values());
    };

    return {
      tasks: tasks.filter((t) => !t.isArchived),
      taskSessions,
      entityRevisions,
      prayers,
      trackers,
      trackerEntries: entries.filter((e: any) => e.userId === "guest"),
      abstinenceTrackers: abstinence,
      abstinenceSessions: absSessions,
      dailyNotes: notes.filter((n: any) => n.userId === "guest"),
      gymWorkouts: mergeById(
        gym.filter((g: any) => g.userId === "guest"),
        legacy.gymWorkouts
      ),
      mealEntries: mergeById(
        meals.filter((m: any) => m.userId === "guest"),
        legacy.mealEntries
      ),
      waterEntries: waters.filter((w: any) => w.userId === "guest"),
      expenseEntries: mergeById(
        expenses.filter((e: any) => e.userId === "guest"),
        legacy.expenseEntries
      ),
      preferences: legacy.preferences || null,
      onboarding: onboarding || null,
    };
  },

  async clearGuestData(): Promise<void> {
    const db = await getLocalDB();
    const guestTasks = await db.getAllFromIndex("tasks", "by-user", "guest");
    const taskTx = db.transaction("tasks", "readwrite");
    for (const t of guestTasks) {
      await taskTx.store.delete(t.id);
    }
    await taskTx.done;

    try {
      const guestPrayers = await db.getAllFromIndex("prayer_records", "by-user", "guest");
      const prayerTx = db.transaction("prayer_records", "readwrite");
      for (const p of guestPrayers) {
        await prayerTx.store.delete(p.id);
      }
      await prayerTx.done;
    } catch {}

    const guestTrackers = await db.getAllFromIndex("trackers", "by-user", "guest");
    const trackerTx = db.transaction("trackers", "readwrite");
    for (const t of guestTrackers) {
      await trackerTx.store.delete(t.id);
    }
    await trackerTx.done;

    try {
      const allEntries = await db.getAll("tracker_entries");
      const entryTx = db.transaction("tracker_entries", "readwrite");
      for (const e of allEntries) {
        if ((e as any).userId === "guest") {
          await entryTx.store.delete((e as any).id);
        }
      }
      await entryTx.done;
    } catch {}

    try {
      const guestAbs = await db.getAllFromIndex("abstinence_trackers", "by-user", "guest");
      const absTx = db.transaction("abstinence_trackers", "readwrite");
      for (const a of guestAbs) {
        await absTx.store.delete(a.id);
      }
      await absTx.done;

      const guestSessions = await db.getAllFromIndex("abstinence_sessions", "by-user", "guest");
      const sessTx = db.transaction("abstinence_sessions", "readwrite");
      for (const s of guestSessions) {
        await sessTx.store.delete(s.id);
      }
      await sessTx.done;
    } catch {}

    const notes = await db.getAll("daily_notes");
    const notesTx = db.transaction("daily_notes", "readwrite");
    for (const n of notes) {
      if ((n as any).userId === "guest") {
        await notesTx.store.delete((n as any).id || (n as any).localDate);
      }
    }
    await notesTx.done;

    const gym = await db.getAll("gym_workouts");
    const gymTx = db.transaction("gym_workouts", "readwrite");
    for (const g of gym) {
      if ((g as any).userId === "guest") {
        await gymTx.store.delete((g as any).id);
      }
    }
    await gymTx.done;

    const meals = await db.getAll("meal_entries");
    const mealTx = db.transaction("meal_entries", "readwrite");
    for (const m of meals) {
      if ((m as any).userId === "guest") {
        await mealTx.store.delete((m as any).id);
      }
    }
    await mealTx.done;

    try {
      const waters = await db.getAll("water_entries");
      const waterTx = db.transaction("water_entries", "readwrite");
      for (const w of waters) {
        if ((w as any).userId === "guest") {
          await waterTx.store.delete((w as any).id);
        }
      }
      await waterTx.done;
    } catch {}

    const expenses = await db.getAll("expense_entries");
    const expTx = db.transaction("expense_entries", "readwrite");
    for (const e of expenses) {
      if ((e as any).userId === "guest") {
        await expTx.store.delete((e as any).id);
      }
    }
    await expTx.done;

    try {
      const guestTaskSessions = await db.getAllFromIndex("task_sessions", "by-user", "guest");
      const tsTx = db.transaction("task_sessions", "readwrite");
      for (const s of guestTaskSessions) {
        await tsTx.store.delete(s.id);
      }
      await tsTx.done;
    } catch {}

    try {
      const guestRevs = await db.getAllFromIndex("entity_revisions", "by-user", "guest");
      const revTx = db.transaction("entity_revisions", "readwrite");
      for (const r of guestRevs) {
        await revTx.store.delete(r.id);
      }
      await revTx.done;
    } catch {}
  },
};
