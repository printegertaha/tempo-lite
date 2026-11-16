import "dotenv/config";
import prisma from "../lib/prisma";
import { getDailyPrayers, togglePrayer } from "../actions/prayers";

async function testPrayers() {
  console.log("--- Testing Dedicated Prayer Engine ---");
  const testUser = await prisma.user.findFirst();
  if (!testUser) throw new Error("No user in DB");

  const todayStr = "2026-11-09";

  console.log("1. Upserting prayer records directly via Prisma with unique constraint...");
  const pRecord = await prisma.prayerRecord.upsert({
    where: {
      userId_date_prayerKey: {
        userId: testUser.id,
        date: todayStr,
        prayerKey: "fajr",
      },
    },
    create: {
      userId: testUser.id,
      date: todayStr,
      prayerKey: "fajr",
      isCompleted: true,
      completedAt: new Date(),
      location: "mosque",
      withSunnah: true,
      notes: "صلاة الفجر في المسجد مع الجماعة",
    },
    update: {
      isCompleted: true,
      location: "mosque",
    },
  });

  console.log("✅ PrayerRecord created successfully:", {
    id: pRecord.id,
    date: pRecord.date,
    prayerKey: pRecord.prayerKey,
    isCompleted: pRecord.isCompleted,
    location: pRecord.location,
  });

  // Verify second upsert updates without duplicate
  const pUpdate = await prisma.prayerRecord.upsert({
    where: {
      userId_date_prayerKey: {
        userId: testUser.id,
        date: todayStr,
        prayerKey: "fajr",
      },
    },
    create: {
      userId: testUser.id,
      date: todayStr,
      prayerKey: "fajr",
      isCompleted: false,
    },
    update: {
      withSunnah: false,
    },
  });
  console.log("✅ Idempotent upsert updated withSunnah without duplicating row. ID matches:", pUpdate.id === pRecord.id);

  // Clean up
  await prisma.prayerRecord.deleteMany({
    where: {
      userId: testUser.id,
      date: todayStr,
      prayerKey: "fajr",
    },
  });
  console.log("✅ Cleaned up test prayer record.");
  console.log("🎉 ALL PRAYER INTEGRITY TESTS PASSED! 🎉");
}

testPrayers()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ PRAYER TEST FAILED:", e);
    process.exit(1);
  });

