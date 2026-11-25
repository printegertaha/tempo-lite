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

export type LocalEntityType =
  | "task"
  | "tracker"
  | "tracker_entry"
  | "daily_note"
  | "abstinence"
  | "abstinence_session"
  | "life_area"
  | "gym_workout"
  | "meal_entry"
  | "expense_entry"
  | "prayer_record";

export interface LocalMutation {
  mutationId: string;
  userId: string;
  entityType: LocalEntityType;
  entityId: string;
  action: "create" | "update" | "delete";
  payload: any;
  clientTimestamp: number;
  version: number;
  status: "pending" | "syncing" | "failed" | "permanent_error";
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
export const MAX_OUTBOX_RETRIES = 5;

let dbPromise: Promise<IDBPDatabase<AtharDBSchema>> | null = null;

export function getLocalDB(): Promise<IDBPDatabase<AtharDBSchema>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is only accessible on the client."));
  }

  if (!dbPromise) {
    dbPromise = openDB<AtharDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
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

        if (!db.objectStoreNames.contains("tracker_entries")) {
          const entryStore = db.createObjectStore("tracker_entries", { keyPath: "id" });
          entryStore.createIndex("by-user-date", ["userId", "localDate"]);
          entryStore.createIndex("by-tracker", "trackerId");
        }

        if (!db.objectStoreNames.contains("daily_notes")) {
          const noteStore = db.createObjectStore("daily_notes", { keyPath: "id" });
          noteStore.createIndex("by-user-date", ["userId", "localDate"]);
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
        }
        if (!db.objectStoreNames.contains("meal_entries")) {
          const mealStore = db.createObjectStore("meal_entries", { keyPath: "id" });
          mealStore.createIndex("by-user-date", ["userId", "date"]);
        }
        if (!db.objectStoreNames.contains("expense_entries")) {
          const expenseStore = db.createObjectStore("expense_entries", { keyPath: "id" });
          expenseStore.createIndex("by-user-date", ["userId", "date"]);
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
    const db = await getLocalDB();
    await db.put("trackers", tracker);
  },

  async saveBatch(trackers: any[]): Promise<void> {
    const db = await getLocalDB();
    const tx = db.transaction("trackers", "readwrite");
    for (const t of trackers) {
      await tx.store.put(t);
    }
    await tx.done;
  },

  async delete(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("trackers", id);
  },
};

export const localEntryRepo = {
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
    const all = await db.getAll("tracker_entries");
    return all.filter((e) => e.userId === userId);
  },

  async save(entry: any): Promise<void> {
    const db = await getLocalDB();
    await db.put("tracker_entries", entry);
  },

  async saveBatch(entries: any[]): Promise<void> {
    const db = await getLocalDB();
    const tx = db.transaction("tracker_entries", "readwrite");
    for (const e of entries) {
      await tx.store.put(e);
    }
    await tx.done;
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
    const all = await db.getAll("daily_notes");
    return all.filter((n) => n.userId === userId);
  },

  async save(note: any): Promise<void> {
    const db = await getLocalDB();
    await db.put("daily_notes", note);
  },

  async delete(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("daily_notes", id);
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
      .filter(
        (m) =>
          m.status === "pending" ||
          (m.status === "failed" && (m.retryCount || 0) < MAX_OUTBOX_RETRIES)
      )
      .sort((a, b) => a.clientTimestamp - b.clientTimestamp);
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

  async resetFailedForRetry(userId: string): Promise<number> {
    const db = await getLocalDB();
    const all = await db.getAllFromIndex("outbox", "by-user", userId);
    const tx = db.transaction("outbox", "readwrite");
    let count = 0;
    for (const m of all) {
      if (m.status === "failed" || m.status === "permanent_error") {
        m.status = "pending";
        m.retryCount = 0;
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
    const db = await getLocalDB();
    await db.put("metadata", { key, value, updatedAt: Date.now() });
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
    const all = await db.getAll("gym_workouts");
    return all.filter((g) => g.userId === userId);
  },
  async saveGymWorkout(workout: any): Promise<void> {
    const db = await getLocalDB();
    await db.put("gym_workouts", workout);
  },
  async deleteGymWorkout(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("gym_workouts", id);
  },

  async getMealEntries(userId: string): Promise<any[]> {
    const db = await getLocalDB();
    const all = await db.getAll("meal_entries");
    return all.filter((m) => m.userId === userId);
  },
  async saveMealEntry(meal: any): Promise<void> {
    const db = await getLocalDB();
    await db.put("meal_entries", meal);
  },
  async deleteMealEntry(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("meal_entries", id);
  },

  async getExpenseEntries(userId: string): Promise<any[]> {
    const db = await getLocalDB();
    const all = await db.getAll("expense_entries");
    return all.filter((e) => e.userId === userId);
  },
  async saveExpenseEntry(expense: any): Promise<void> {
    const db = await getLocalDB();
    await db.put("expense_entries", expense);
  },
  async deleteExpenseEntry(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.delete("expense_entries", id);
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
          // Only include transactions with titles & amounts; skip untouched mock IDs 101-106 if user hasn't modified, or import safely with deterministic ID
          if (tx && tx.title && Number(tx.amount) > 0 && Number(tx.id) > 1000) {
            expenseEntries.push({
              id: `ls_exp_${tx.id}`,
              userId: "guest",
              date: tx.date || new Date().toISOString().split("T")[0],
              title: tx.title,
              amount: Number(tx.amount),
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
        for (const m of parsed.meals) {
          if (m && (m.title || m.name) && String(m.id || "").startsWith("m_")) {
            mealEntries.push({
              id: `ls_meal_${m.id}`,
              userId: "guest",
              date: m.date || new Date().toISOString().split("T")[0],
              mealType: m.mealType || "lunch",
              title: m.title || m.name,
              calories: Number(m.calories) || 0,
              protein: Number(m.protein) || 0,
              carbs: Number(m.carbs) || 0,
              fat: Number(m.fat) || 0,
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

  return { gymWorkouts, mealEntries, expenseEntries, quranSurahs };
}

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
      const [tasks, prayers, trackers, entries, abstinence, notes, gym, meals, expenses] =
        await Promise.all([
          db.getAllFromIndex("tasks", "by-user", "guest"),
          db.getAllFromIndex("prayer_records", "by-user", "guest").catch(() => []),
          db.getAllFromIndex("trackers", "by-user", "guest"),
          db.getAll("tracker_entries").catch(() => []),
          db.getAllFromIndex("abstinence_trackers", "by-user", "guest").catch(() => []),
          db.getAll("daily_notes"),
          db.getAll("gym_workouts"),
          db.getAll("meal_entries"),
          db.getAll("expense_entries"),
        ]);

      const guestEntries = entries.filter((e: any) => e.userId === "guest");
      const guestNotes = notes.filter((n: any) => n.userId === "guest");
      const idbGym = gym.filter((g: any) => g.userId === "guest");
      const idbMeals = meals.filter((m: any) => m.userId === "guest");
      const idbExpenses = expenses.filter((e: any) => e.userId === "guest");

      const legacy = readLegacyLocalStorageGuestData();
      const gymCount = idbGym.length + legacy.gymWorkouts.length;
      const mealsCount = idbMeals.length + legacy.mealEntries.length;
      const expensesCount = idbExpenses.length + legacy.expenseEntries.length;

      const total =
        tasks.length +
        prayers.length +
        trackers.length +
        guestEntries.length +
        abstinence.length +
        guestNotes.length +
        gymCount +
        mealsCount +
        expensesCount;

      return {
        hasData: total > 0,
        tasksCount: tasks.length,
        prayersCount: prayers.length,
        trackersCount: trackers.length,
        abstinenceCount: abstinence.length,
        entriesCount: guestEntries.length,
        notesCount: guestNotes.length,
        gymCount,
        mealsCount,
        expensesCount,
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
    trackerEntries: any[];
    abstinenceTrackers: any[];
    abstinenceSessions: any[];
    dailyNotes: any[];
    gymWorkouts: any[];
    mealEntries: any[];
    expenseEntries: any[];
  }> {
    const db = await getLocalDB();
    const [tasks, prayers, trackers, entries, abstinence, absSessions, notes, gym, meals, expenses] =
      await Promise.all([
        db.getAllFromIndex("tasks", "by-user", "guest"),
        db.getAllFromIndex("prayer_records", "by-user", "guest").catch(() => []),
        db.getAllFromIndex("trackers", "by-user", "guest"),
        db.getAll("tracker_entries").catch(() => []),
        db.getAllFromIndex("abstinence_trackers", "by-user", "guest").catch(() => []),
        db.getAllFromIndex("abstinence_sessions", "by-user", "guest").catch(() => []),
        db.getAll("daily_notes"),
        db.getAll("gym_workouts"),
        db.getAll("meal_entries"),
        db.getAll("expense_entries"),
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
      expenseEntries: mergeById(
        expenses.filter((e: any) => e.userId === "guest"),
        legacy.expenseEntries
      ),
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
