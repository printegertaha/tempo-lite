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
const DB_VERSION = 3;

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

        // 8. Dedicated Abstinence & Relapse Stores
        if (!db.objectStoreNames.contains("abstinence_trackers")) {
          const absStore = db.createObjectStore("abstinence_trackers", { keyPath: "id" });
          absStore.createIndex("by-user", "userId");
        }
        if (!db.objectStoreNames.contains("abstinence_sessions")) {
          const sessStore = db.createObjectStore("abstinence_sessions", { keyPath: "id" });
          sessStore.createIndex("by-user", "userId");
          sessStore.createIndex("by-user-tracker", ["userId", "trackerId"]);
        }

        // 9. Dedicated Prayer Tracking Store
        if (!db.objectStoreNames.contains("prayer_records")) {
          const prayerStore = db.createObjectStore("prayer_records", { keyPath: "id" });
          prayerStore.createIndex("by-user", "userId");
          prayerStore.createIndex("by-user-date", ["userId", "date"]);
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

export const localPrayerRepo = {
  async getByDate(userId: string, date: string): Promise<LocalPrayerRecord[]> {
    const db = await getLocalDB();
    return db.getAllFromIndex("prayer_records", "by-user-date", [userId, date]);
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

export interface GuestDataSummary {
  hasData: boolean;
  tasksCount: number;
  prayersCount: number;
  trackersCount: number;
  abstinenceCount: number;
  entriesCount: number;
  notesCount: number;
  gymCount: number;
  mealsCount: number;
  expensesCount: number;
  totalRecords: number;
}

export const localGuestManager = {
  async getSummary(): Promise<GuestDataSummary> {
    try {
      const db = await getLocalDB();
      const [tasks, prayers, trackers, abstinence, notes, gym, meals, expenses] = await Promise.all([
        db.getAllFromIndex("tasks", "by-user", "guest"),
        db.getAllFromIndex("prayer_records", "by-user", "guest").catch(() => []),
        db.getAllFromIndex("trackers", "by-user", "guest"),
        db.getAllFromIndex("abstinence_trackers", "by-user", "guest").catch(() => []),
        db.getAll("daily_notes"),
        db.getAll("gym_workouts"),
        db.getAll("meal_entries"),
        db.getAll("expense_entries"),
      ]);

      const guestNotes = notes.filter((n: any) => n.userId === "guest");
      const guestGym = gym.filter((g: any) => g.userId === "guest");
      const guestMeals = meals.filter((m: any) => m.userId === "guest");
      const guestExpenses = expenses.filter((e: any) => e.userId === "guest");

      const total =
        tasks.length +
        prayers.length +
        trackers.length +
        abstinence.length +
        guestNotes.length +
        guestGym.length +
        guestMeals.length +
        guestExpenses.length;

      return {
        hasData: total > 0,
        tasksCount: tasks.length,
        prayersCount: prayers.length,
        trackersCount: trackers.length,
        abstinenceCount: abstinence.length,
        entriesCount: 0,
        notesCount: guestNotes.length,
        gymCount: guestGym.length,
        mealsCount: guestMeals.length,
        expensesCount: guestExpenses.length,
        totalRecords: total,
      };
    } catch {
      return {
        hasData: false,
        tasksCount: 0,
        prayersCount: 0,
        trackersCount: 0,
        abstinenceCount: 0,
        entriesCount: 0,
        notesCount: 0,
        gymCount: 0,
        mealsCount: 0,
        expensesCount: 0,
        totalRecords: 0,
      };
    }
  },

  async getAllGuestPayload(): Promise<{
    tasks: any[];
    prayers: any[];
    trackers: any[];
    abstinenceTrackers: any[];
    dailyNotes: any[];
    gymWorkouts: any[];
    mealEntries: any[];
    expenseEntries: any[];
  }> {
    const db = await getLocalDB();
    const [tasks, prayers, trackers, abstinence, notes, gym, meals, expenses] = await Promise.all([
      db.getAllFromIndex("tasks", "by-user", "guest"),
      db.getAllFromIndex("prayer_records", "by-user", "guest").catch(() => []),
      db.getAllFromIndex("trackers", "by-user", "guest"),
      db.getAllFromIndex("abstinence_trackers", "by-user", "guest").catch(() => []),
      db.getAll("daily_notes"),
      db.getAll("gym_workouts"),
      db.getAll("meal_entries"),
      db.getAll("expense_entries"),
    ]);

    return {
      tasks: tasks.filter((t) => !t.isArchived),
      prayers,
      trackers,
      abstinenceTrackers: abstinence,
      dailyNotes: notes.filter((n: any) => n.userId === "guest"),
      gymWorkouts: gym.filter((g: any) => g.userId === "guest"),
      mealEntries: meals.filter((m: any) => m.userId === "guest"),
      expenseEntries: expenses.filter((e: any) => e.userId === "guest"),
    };
  },

  async clearGuestData(): Promise<void> {
    const db = await getLocalDB();
    // 1. Clear tasks
    const guestTasks = await db.getAllFromIndex("tasks", "by-user", "guest");
    const taskTx = db.transaction("tasks", "readwrite");
    for (const t of guestTasks) {
      await taskTx.store.delete(t.id);
    }
    await taskTx.done;

    // 2. Clear prayers
    try {
      const guestPrayers = await db.getAllFromIndex("prayer_records", "by-user", "guest");
      const prayerTx = db.transaction("prayer_records", "readwrite");
      for (const p of guestPrayers) {
        await prayerTx.store.delete(p.id);
      }
      await prayerTx.done;
    } catch {}

    // 3. Clear trackers
    const guestTrackers = await db.getAllFromIndex("trackers", "by-user", "guest");
    const trackerTx = db.transaction("trackers", "readwrite");
    for (const t of guestTrackers) {
      await trackerTx.store.delete(t.id);
    }
    await trackerTx.done;

    // 4. Clear abstinence trackers
    try {
      const guestAbs = await db.getAllFromIndex("abstinence_trackers", "by-user", "guest");
      const absTx = db.transaction("abstinence_trackers", "readwrite");
      for (const a of guestAbs) {
        await absTx.store.delete(a.id);
      }
      await absTx.done;
    } catch {}

    // 5. Clear notes
    const notes = await db.getAll("daily_notes");
    const notesTx = db.transaction("daily_notes", "readwrite");
    for (const n of notes) {
      if ((n as any).userId === "guest") {
        await notesTx.store.delete((n as any).id || (n as any).localDate);
      }
    }
    await notesTx.done;

    // 6. Clear gym workouts
    const gym = await db.getAll("gym_workouts");
    const gymTx = db.transaction("gym_workouts", "readwrite");
    for (const g of gym) {
      if ((g as any).userId === "guest") {
        await gymTx.store.delete((g as any).id);
      }
    }
    await gymTx.done;

    // 7. Clear meals
    const meals = await db.getAll("meal_entries");
    const mealTx = db.transaction("meal_entries", "readwrite");
    for (const m of meals) {
      if ((m as any).userId === "guest") {
        await mealTx.store.delete((m as any).id);
      }
    }
    await mealTx.done;

    // 8. Clear expenses
    const expenses = await db.getAll("expense_entries");
    const expTx = db.transaction("expense_entries", "readwrite");
    for (const e of expenses) {
      if ((e as any).userId === "guest") {
        await expTx.store.delete((e as any).id);
      }
    }
    await expTx.done;
  },
};

