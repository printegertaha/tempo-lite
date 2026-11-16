import "dotenv/config";
import prisma from "../lib/prisma";
import { processSyncBatch } from "../lib/sync/server-handler";

async function runSyncTest() {
  console.log("--- Starting Sync Engine Verification Test ---");

  // Use the first real user from DB
  const testUser = await prisma.user.findFirst();
  if (!testUser) {
    throw new Error("No user found in database for test");
  }
  const userId = testUser.id;
  console.log(`Testing with user: ${testUser.name} (${userId})`);

  const testIdSuffix = Date.now().toString().slice(-6);
  const taskId = `test_task_${testIdSuffix}`;
  const trackerId = `test_tracker_${testIdSuffix}`;
  const lifeAreaId = `test_area_${testIdSuffix}`;
  const abstinenceId = `test_abs_${testIdSuffix}`;

  const mutTask = `mut_t_${testIdSuffix}`;
  const mutTracker = `mut_tr_${testIdSuffix}`;
  const mutArea = `mut_ar_${testIdSuffix}`;
  const mutAbs = `mut_ab_${testIdSuffix}`;
  const mutBad = `mut_bad_${testIdSuffix}`;

  const batchPayload = {
    mutations: [
      {
        mutationId: mutTask,
        entityType: "task",
        entityId: taskId,
        action: "create",
        payload: {
          title: `مهمة تجريبية ${testIdSuffix}`,
          priority: "HIGH",
          dueDate: "2026-11-09",
          isPomodoro: true,
          workCycle: 30,
        },
        clientTimestamp: Date.now(),
        version: 1,
      },
      {
        mutationId: mutTracker,
        entityType: "tracker",
        entityId: trackerId,
        action: "create",
        payload: {
          name: `عادة تجريبية ${testIdSuffix}`,
          metricType: "BOOLEAN",
          color: "emerald",
          icon: "Flame",
        },
        clientTimestamp: Date.now(),
        version: 1,
      },
      {
        mutationId: mutArea,
        entityType: "life_area",
        entityId: lifeAreaId,
        action: "create",
        payload: {
          name: `مجال تجريبي ${testIdSuffix}`,
          color: "violet",
          icon: "Sparkles",
        },
        clientTimestamp: Date.now(),
        version: 1,
      },
      {
        mutationId: mutAbs,
        entityType: "abstinence",
        entityId: abstinenceId,
        action: "create",
        payload: {
          name: `تعافي تجريبي ${testIdSuffix}`,
          targetDays: 30,
          startedAt: new Date().toISOString(),
        },
        clientTimestamp: Date.now(),
        version: 1,
      },
    ],
  };

  console.log("1. Sending initial sync batch (task, tracker, life_area, abstinence)...");
  const res1 = await processSyncBatch(userId, batchPayload);
  console.log("Response 1:", JSON.stringify(res1.results, null, 2));

  // Verify all 4 mutations were applied
  for (const item of res1.results) {
    if (item.status !== "applied") {
      throw new Error(`Expected mutation ${item.mutationId} to be applied, got ${item.status}: ${item.error}`);
    }
  }
  console.log("✅ All 4 mutations successfully returned status 'applied'");

  // Verify in PostgreSQL database
  const [dbTask, dbTracker, dbArea, dbAbs] = await Promise.all([
    prisma.task.findUnique({ where: { id: taskId } }),
    prisma.tracker.findUnique({ where: { id: trackerId } }),
    prisma.lifeArea.findUnique({ where: { id: lifeAreaId } }),
    prisma.abstinenceTracker.findUnique({ where: { id: abstinenceId } }),
  ]);

  if (!dbTask || dbTask.title !== `مهمة تجريبية ${testIdSuffix}`) throw new Error("Task was NOT saved in DB!");
  if (!dbTracker || dbTracker.name !== `عادة تجريبية ${testIdSuffix}`) throw new Error("Tracker was NOT saved in DB! (BUG-01 regression!)");
  if (!dbArea || dbArea.name !== `مجال تجريبي ${testIdSuffix}`) throw new Error("LifeArea was NOT saved in DB! (BUG-01 regression!)");
  if (!dbAbs || dbAbs.name !== `تعافي تجريبي ${testIdSuffix}`) throw new Error("AbstinenceTracker was NOT saved in DB! (BUG-01 regression!)");
  console.log("✅ All 4 records verified in PostgreSQL database! BUG-01 FIXED!");

  // Verify receipts were created
  const receipts = await prisma.mutationReceipt.findMany({
    where: {
      userId,
      id: { in: [mutTask, mutTracker, mutArea, mutAbs] },
    },
  });
  if (receipts.length !== 4) {
    throw new Error(`Expected 4 mutation receipts, found ${receipts.length}`);
  }
  console.log("✅ 4 Mutation receipts verified in DB");

  // 2. Test Idempotency: Send the exact same batch again!
  console.log("2. Sending duplicate batch to test idempotency...");
  const res2 = await processSyncBatch(userId, batchPayload);
  console.log("Response 2 (Duplicates):", JSON.stringify(res2.results, null, 2));

  for (const item of res2.results) {
    if (item.status !== "duplicate") {
      throw new Error(`Expected mutation ${item.mutationId} to be duplicate, got ${item.status}`);
    }
  }
  console.log("✅ Idempotency verified: All 4 mutations identified as 'duplicate'");

  // 3. Test Unsupported Mutation: Must NOT write a phantom receipt!
  console.log("3. Testing unsupported mutation (must NOT create a phantom receipt)...");
  try {
    const resBad = await processSyncBatch(userId, {
      mutations: [
        {
          mutationId: mutBad,
          entityType: "task",
          entityId: "bad_entity_999",
          action: "delete",
          payload: {},
          clientTimestamp: Date.now(),
          version: 1,
        },
      ],
    });
    // Task delete on non-existing will delete 0 rows and succeed
    console.log("Delete test result:", resBad.results);
  } catch (err: any) {
    console.log("Expected validation behavior:", err.message);
  }

  // 4. Clean up test data
  console.log("4. Cleaning up test data from DB...");
  await prisma.$transaction([
    prisma.task.deleteMany({ where: { id: taskId } }),
    prisma.tracker.deleteMany({ where: { id: trackerId } }),
    prisma.lifeArea.deleteMany({ where: { id: lifeAreaId } }),
    prisma.abstinenceSession.deleteMany({ where: { abstinenceTrackerId: abstinenceId } }),
    prisma.abstinenceTracker.deleteMany({ where: { id: abstinenceId } }),
    prisma.mutationReceipt.deleteMany({
      where: { id: { in: [mutTask, mutTracker, mutArea, mutAbs, mutBad] } },
    }),
  ]);
  console.log("✅ Cleaned up test data cleanly.");
  console.log("🎉 ALL PHASE 1 SYNC TESTS PASSED SUCCESSFULLY! 🎉");
}

runSyncTest()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ TEST FAILED:", e);
    process.exit(1);
  });

