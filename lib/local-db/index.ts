import { openDB, DBSchema, IDBPDatabase } from "idb";

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

export interface LocalMutation {
  mutationId: string;
  userId: string;
  entityType: "task" | "tracker" | "tracker_entry" | "daily_note" | "abstinence" | "life_area" | "gym_workout" | "meal_entry" | "expense_entry";
  entityId: string;
  action: "create" | "update" | "delete";
  payload: any;
  clientTimestamp: number;
  version: number;
  status: "pending" | "syncing" | "failed";
  retryCount: number;
  lastError?: string;
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
    };
  };
  daily_notes: {
    key: string;
    value: any;
    indexes: {
      "by-user-date": [string, string];
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
  gym_workouts: {
    key: string;
    value: any;
    indexes: {
      "by-user-date": [string, string];
    };
  };
  meal_entries: {
    key: string;
    value: any;
    indexes: {
      "by-user-date": [string, string];
    };
  };
  expense_entries: {
    key: string;
    value: any;
    indexes: {
      "by-user-date": [string, string];
    };
  };
}

const DB_NAME = "athar_local_v2";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AtharDBSchema>> | null = null;

export function getLocalDB(): Promise<IDBPDatabase<AtharDBSchema>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is only accessible on the client."));
  }

  if (!dbPromise) {
    dbPromise = openDB<AtharDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 1. Tasks Store
        if (!db.objectStoreNames.contains("tasks")) {
          const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
          taskStore.createIndex("by-user", "userId");
          taskStore.createIndex("by-user-date", ["userId", "dueDate"]);
          taskStore.createIndex("by-user-status", ["userId", "status"]);
        }

        // 2. Trackers Store
        if (!db.objectStoreNames.contains("trackers")) {
          const trackerStore = db.createObjectStore("trackers", { keyPath: "id" });
          trackerStore.createIndex("by-user", "userId");
        }

        // 3. Tracker Entries Store
        if (!db.objectStoreNames.contains("tracker_entries")) {
          const entryStore = db.createObjectStore("tracker_entries", { keyPath: "id" });
          entryStore.createIndex("by-user-date", ["userId", "localDate"]);
          entryStore.createIndex("by-tracker", "trackerId");
        }

        // 4. Daily Notes Store
        if (!db.objectStoreNames.contains("daily_notes")) {
          const noteStore = db.createObjectStore("daily_notes", { keyPath: "id" });
          noteStore.createIndex("by-user-date", ["userId", "localDate"]);
        }

        // 5. Outbox Store
        if (!db.objectStoreNames.contains("outbox")) {
          const outboxStore = db.createObjectStore("outbox", { keyPath: "mutationId" });
          outboxStore.createIndex("by-user-status", ["userId", "status"]);
          outboxStore.createIndex("by-user", "userId");
        }

        // 6. Metadata Store
        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata", { keyPath: "key" });
        }

        // 7. Domain Stores (Gym, Meals, Expenses)
        if (!db.objectStoreNames.contains("gym_workouts")) {
          const gymStore = db.createObjectStore("gym_workouts", { keyPath: "id" });
          gymStore.createIndex("by-user-date", ["userId", "date"]);
        }
        if (!db.objectStoreNames.contains("meal_entries")) {
          const mealStore = db.createObjectStore("meal_entries", { keyPath: "id" });
          mealStore.createIndex("by-user-date", ["userId", "date"]);
        }
        if (!db.objectStoreNames.contains("expense_entries")) {
          const expenseStore = db.createObjectStore("expense_entries", { keyPath: "id" });
          expenseStore.createIndex("by-user-date", ["userId", "date"]);
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

  async getAllForUser(userId: string): Promise<LocalTask[]> {
    const db = await getLocalDB();
    const all = await db.getAllFromIndex("tasks", "by-user", userId);
    return all.filter((t) => !t.isArchived).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getByDueDate(userId: string, dueDate: string): Promise<LocalTask[]> {
    const db = await getLocalDB();
    const tasks = await db.getAllFromIndex("tasks", "by-user-date", [userId, dueDate]);
    return tasks.filter((t) => !t.isArchived).sort((a, b) => a.sortOrder - b.sortOrder);
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

export const localOutboxRepo = {
  async add(mutation: LocalMutation): Promise<void> {
    const db = await getLocalDB();
    await db.put("outbox", mutation);
  },

  async getPending(userId: string): Promise<LocalMutation[]> {
    const db = await getLocalDB();
    const mutations = await db.getAllFromIndex("outbox", "by-user", userId);
    return mutations
      .filter((m) => m.status === "pending" || m.status === "failed")
      .sort((a, b) => a.clientTimestamp - b.clientTimestamp);
  },

  async updateStatus(
    mutationId: string,
    status: "pending" | "syncing" | "failed",
    error?: string
  ): Promise<void> {
    const db = await getLocalDB();
    const m = await db.get("outbox", mutationId);
    if (m) {
      m.status = status;
      if (error) {
        m.lastError = error;
        m.retryCount = (m.retryCount || 0) + 1;
      }
      await db.put("outbox", m);
    }
  },

  async remove(mutationId: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("outbox", mutationId);
  },

  async removeBatch(mutationIds: string[]): Promise<void> {
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
    return all.filter((m) => m.status === "pending" || m.status === "syncing").length;
  },
};

export const localMetadataRepo = {
  async get(key: string): Promise<any> {
    const db = await getLocalDB();
    const item = await db.get("metadata", key);
    return item?.value;
  },

  async set(key: string, value: any): Promise<void> {
    const db = await getLocalDB();
    await db.put("metadata", { key, value, updatedAt: Date.now() });
  },
};

