import "dotenv/config";
import assert from "node:assert/strict";
import prisma from "../lib/prisma";
import { processSyncBatch } from "../lib/sync/server-handler";
import { coalesceMutationsWithDropped } from "../lib/sync/coalesce";
import {
  parseLocalDateTimeToUtc,
  computeTimeRange,
  getLocalDateString,
  formatArabicDateTime,
} from "../lib/dates";
import { LocalMutation } from "../lib/local-db/index";
import { TaskQueryFiltersSchema } from "../lib/validations/task";
import { activeTimerEngine } from "../lib/timer/active-timer";

function testCoalescing() {
  console.log("1. Testing coalesceMutationsWithDropped...");
  const base = {
    userId: "user-1",
    version: 1,
    status: "pending" as const,
    retryCount: 0,
  };

  // Cancel-pair: create then delete
  const cancelRes = coalesceMutationsWithDropped([
    { ...base, mutationId: "m1", entityType: "task", entityId: "t1", action: "create", payload: { title: "temp" }, clientTimestamp: 100 },
    { ...base, mutationId: "m2", entityType: "task", entityId: "t1", action: "delete", payload: {}, clientTimestamp: 200 },
  ] as LocalMutation[]);
  assert.equal(cancelRes.coalesced.length, 0);
  assert.deepEqual(cancelRes.cancelledIds, ["m1", "m2"]);

  // Create + multiple updates -> 1 create with merged payload and 3 coalescedIds
  const mergeRes = coalesceMutationsWithDropped([
    { ...base, mutationId: "c1", entityType: "task", entityId: "t2", action: "create", payload: { title: "A", priority: "LOW" }, clientTimestamp: 100 },
    { ...base, mutationId: "u1", entityType: "task", entityId: "t2", action: "update", payload: { priority: "HIGH" }, clientTimestamp: 200 },
    { ...base, mutationId: "u2", entityType: "task", entityId: "t2", action: "update", payload: { title: "B" }, clientTimestamp: 300 },
  ] as LocalMutation[]);
  assert.equal(mergeRes.coalesced.length, 1);
  assert.equal(mergeRes.coalesced[0].action, "create");
  assert.equal(mergeRes.coalesced[0].payload.title, "B");
  assert.equal(mergeRes.coalesced[0].payload.priority, "HIGH");
  assert.deepEqual(mergeRes.coalesced[0].coalescedIds, ["c1", "u1", "u2"]);

  // Update then delete -> 1 delete
  const delRes = coalesceMutationsWithDropped([
    { ...base, mutationId: "u3", entityType: "tracker", entityId: "tr1", action: "update", payload: { name: "X" }, clientTimestamp: 100 },
    { ...base, mutationId: "d1", entityType: "tracker", entityId: "tr1", action: "delete", payload: {}, clientTimestamp: 200 },
  ] as LocalMutation[]);
  assert.equal(delRes.coalesced.length, 1);
  assert.equal(delRes.coalesced[0].action, "delete");
  assert.deepEqual(delRes.coalesced[0].coalescedIds, ["u3", "d1"]);

  console.log("✅ Coalescing invariants passed.");
}

function testTimezoneMath() {
  console.log("2. Testing two-pass DST & cross-midnight timezone math...");

  // Midnight hour-0 check in Riyadh (UTC+3)
  const riyadhMidnight = parseLocalDateTimeToUtc("2026-06-15", "00:00", "Asia/Riyadh");
  assert.equal(riyadhMidnight.toISOString(), "2026-06-14T21:00:00.000Z");

  // DST Spring Forward in America/New_York (2026-03-08: 02:00 jumps to 03:00 EDT = UTC-4)
  const nySpring = parseLocalDateTimeToUtc("2026-03-08", "03:30", "America/New_York");
  assert.equal(nySpring.toISOString(), "2026-03-08T07:30:00.000Z");

  // DST Fall Back in America/New_York (2026-11-01 03:30 EST = UTC-5)
  const nyFallAfter = parseLocalDateTimeToUtc("2026-11-01", "03:30", "America/New_York");
  assert.equal(nyFallAfter.toISOString(), "2026-11-01T08:30:00.000Z");

  // Cross-midnight range in Asia/Riyadh
  const range = computeTimeRange("2026-06-15", "23:00", "01:30", "Asia/Riyadh");
  assert.equal(range.crossesMidnight, true);
  assert.equal(range.durationSeconds, 9000);
  assert.equal(range.startTime.toISOString(), "2026-06-15T20:00:00.000Z");
  assert.equal(range.endTime.toISOString(), "2026-06-15T22:30:00.000Z");

  // Local date extraction check across UTC boundary
  assert.equal(getLocalDateString(new Date("2026-06-15T22:30:00.000Z"), "Asia/Riyadh"), "2026-06-16");
  assert.equal(getLocalDateString(new Date("2026-06-15T22:30:00.000Z"), "America/New_York"), "2026-06-15");

  // formatArabicDateTime sanity check
  const fmt = formatArabicDateTime("2026-06-15T12:00:00.000Z", "Asia/Riyadh");
  assert.ok(fmt.dateStr.length > 0 && fmt.timeStr.length > 0 && fmt.fullStr.includes(fmt.dateStr));

  console.log("✅ Timezone & DST invariants passed.");
}

async function testPostgresSyncIsolation() {
  console.log("3. Testing Postgres per-mutation isolation, IDOR rejection, and timestamp fidelity...");

  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("⚠️ Skipping Postgres sync test: no user row in DB.");
    return;
  }

  const suffix = Date.now().toString().slice(-6);
  const validTaskId = `verify_task_${suffix}`;
  const validTrackerId = `verify_tracker_${suffix}`;
  const noteId = `verify_note_${suffix}`;
  const noteDate = `2099-01-${String((Number(suffix) % 28) + 1).padStart(2, "0")}`;
  const badEntryId = `verify_bad_entry_${suffix}`;
  const mutTask = `v_mut_t_${suffix}`;
  const mutBadEntry = `v_mut_bad_${suffix}`;
  const mutTracker = `v_mut_tr_${suffix}`;
  const mutNote = `v_mut_note_${suffix}`;

  try {
    const customCompletedAt = "2026-11-20T14:22:00.000Z";

    // Mix valid task, invalid FK entry (nonexistent trackerId), valid tracker (with spoofed userId in payload), and valid note with title
    const res = await processSyncBatch(user.id, {
      mutations: [
        {
          mutationId: mutTask,
          entityType: "task",
          entityId: validTaskId,
          action: "create",
          payload: {
            id: validTaskId,
            userId: "attacker_spoofed_id", // must be overridden by authenticated user.id
            title: `اختبار التحقق ${suffix}`,
            status: "COMPLETED",
            completedAt: customCompletedAt,
          },
          clientTimestamp: Date.now(),
          version: 1,
        },
        {
          mutationId: mutBadEntry,
          entityType: "tracker_entry",
          entityId: badEntryId,
          action: "create",
          payload: {
            id: badEntryId,
            trackerId: "non_existent_tracker_xyz",
            localDate: "2026-11-25",
            valueBoolean: true,
          },
          clientTimestamp: Date.now(),
          version: 1,
        },
        {
          mutationId: mutTracker,
          entityType: "tracker",
          entityId: validTrackerId,
          action: "create",
          payload: {
            id: validTrackerId,
            name: `عادة تحقق ${suffix}`,
            metricType: "BOOLEAN",
          },
          clientTimestamp: Date.now(),
          version: 1,
        },
        {
          mutationId: mutNote,
          entityType: "daily_note",
          entityId: noteId,
          action: "create",
          payload: {
            id: noteId,
            localDate: noteDate,
            title: "عنوان المذكرة المحفوظ",
            content: "محتوى تجريبي",
            mood: "great",
          },
          clientTimestamp: Date.now(),
          version: 1,
        },
      ],
    });

    const byId = new Map(res.results.map((r: any) => [r.mutationId, r]));
    assert.equal(byId.get(mutTask)?.status, "applied", "Valid task should succeed despite neighbor failure");
    assert.equal(byId.get(mutBadEntry)?.status, "error", "Invalid FK entry should return status 'error'");
    assert.equal(byId.get(mutBadEntry)?.permanent, true, "FK failure should be marked permanent");
    assert.equal(byId.get(mutTracker)?.status, "applied", "Tracker after failed mutation must NOT hit Postgres 25P02 abort!");
    assert.equal(byId.get(mutNote)?.status, "applied", "Daily note must succeed");

    // Check DB state
    const [dbTask, dbTracker, dbNote] = await Promise.all([
      prisma.task.findUnique({ where: { id: validTaskId } }),
      prisma.tracker.findUnique({ where: { id: validTrackerId } }),
      prisma.dailyNote.findUnique({
        where: { userId_localDate: { userId: user.id, localDate: noteDate } },
      }),
    ]);

    assert.ok(dbTask, "Task must exist in Postgres");
    assert.equal(dbTask.userId, user.id, "Spoofed userId in payload must NEVER override session userId");
    assert.equal(dbTask.completedAt?.toISOString(), customCompletedAt, "Client completedAt must be preserved");
    assert.ok(dbTracker, "Tracker must exist in Postgres");
    assert.ok(dbNote, "DailyNote must exist in Postgres");
    assert.equal(dbNote.title, "عنوان المذكرة المحفوظ", "DailyNote title must be persisted");

    // Re-running failed receipt check: invalid mutation must NOT have written a MutationReceipt
    const badReceipt = await prisma.mutationReceipt.findUnique({ where: { id: mutBadEntry } });
    assert.equal(badReceipt, null, "Failed mutation must NOT create a MutationReceipt");

    console.log("✅ Postgres per-mutation isolation, IDOR protection, title & completedAt fidelity passed.");
  } finally {
    await prisma.$transaction([
      prisma.task.deleteMany({ where: { id: validTaskId } }),
      prisma.tracker.deleteMany({ where: { id: validTrackerId } }),
      prisma.dailyNote.deleteMany({
        where: { userId: user.id, localDate: { startsWith: "2099-01-" } },
      }),
      prisma.mutationReceipt.deleteMany({
        where: { id: { in: [mutTask, mutBadEntry, mutTracker, mutNote] } },
      }),
    ]);
  }
}

async function testTaskScopesAndTimerEngine() {
  console.log("4. Testing TaskQueryFiltersSchema scopes and ActiveTimerEngine state machine...");

  const homeQ = TaskQueryFiltersSchema.parse({ view: "home", pageSize: 500 });
  const fullQ = TaskQueryFiltersSchema.parse({ view: "full", pageSize: 500 });
  assert.equal(homeQ.view, "home");
  assert.equal(homeQ.pageSize, 500);
  assert.equal(fullQ.view, "full");

  // Minimal browser-storage shim for testing ActiveTimerEngine transitions
  const store = new Map<string, string>();
  const prevWindow = (globalThis as any).window;
  const prevLocalStorage = (globalThis as any).localStorage;
  const listeners = new Map<string, Set<Function>>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
  };
  (globalThis as any).window = {
    addEventListener: (ev: string, fn: Function) => {
      const s = listeners.get(ev) || new Set();
      s.add(fn);
      listeners.set(ev, s);
    },
    removeEventListener: (ev: string, fn: Function) => {
      listeners.get(ev)?.delete(fn);
    },
    dispatchEvent: () => true,
  };

  try {
    activeTimerEngine.requestStart({ id: "task_A", title: "Task A", workCycle: 25, breakCycle: 5 }, "stopwatch", "guest");
    const s1 = activeTimerEngine.getSession();
    assert.ok(s1, "Session A must start");
    assert.equal(s1?.taskId, "task_A");
    assert.equal(s1?.status, "running");

    // Request starting Task B while Task A is active -> must trigger pendingInterrupt, NOT overwrite silently
    activeTimerEngine.requestStart({ id: "task_B", title: "Task B" }, "zen_pomodoro", "guest");
    const snapInterrupt = activeTimerEngine.getSnapshot();
    assert.equal(snapInterrupt.session?.taskId, "task_A", "Task A must remain active until user confirms switch");
    assert.equal(snapInterrupt.pendingInterrupt?.newTask?.id, "task_B", "Pending interrupt must hold Task B");

    // Confirm switch -> Task A recorded as interrupted in history, Task B becomes running in zen_pomodoro
    await activeTimerEngine.confirmInterruptAndSwitch();
    const s2 = activeTimerEngine.getSession();
    assert.equal(s2?.taskId, "task_B");
    assert.equal(s2?.mode, "zen_pomodoro");
    assert.equal(s2?.status, "running");

    // Pause then cancel cleanup
    activeTimerEngine.pause();
    assert.equal(activeTimerEngine.getSession()?.status, "paused");
    await activeTimerEngine.cancel();
    assert.equal(activeTimerEngine.getSession(), null);

    console.log("✅ TaskQuerySchema & ActiveTimerEngine transitions passed.");
  } finally {
    (globalThis as any).window = prevWindow;
    (globalThis as any).localStorage = prevLocalStorage;
  }
}

async function main() {
  testCoalescing();
  testTimezoneMath();
  await testPostgresSyncIsolation();
  await testTaskScopesAndTimerEngine();
  console.log("\n🎉 ALL COMPREHENSIVE VERIFICATION CHECKS PASSED!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ VERIFICATION FAILED:", err);
    process.exit(1);
  });
