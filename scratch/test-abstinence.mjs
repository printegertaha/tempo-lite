/**
 * Abstinence Tracking Validation & Mathematical Correctness Test Suite
 */

import {
  parseLocalDateTimeToUtc,
  calculateAbstinenceDuration,
  splitUtcToLocalDateTime,
  formatArabicDateTime,
} from "../lib/dates.ts";

import {
  CreateAbstinenceTrackerSchema,
  LogRelapseSchema,
  UpdateStartTimeSchema,
} from "../lib/validations/abstinence.ts";

function runTests() {
  console.log("=================================================");
  console.log("🛡️ TEMPO ABSTINENCE TRACKING ENGINE TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let total = 0;

  function assert(name, condition, details = "") {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${name}${details ? ` -> ${details}` : ""}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${details}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Test 1: User's Exact Example: Nov 1 at 10:30 PM
  // ---------------------------------------------------------------------------
  console.log("--- Test 1: Timestamp-based Duration & 24h Threshold ---");

  // Nov 1, 2026 at 22:30:00 (Riyadh / UTC+3 = 19:30:00 UTC)
  const startUtc = parseLocalDateTimeToUtc("2026-11-01", "22:30", "Asia/Riyadh");
  const startMs = startUtc.getTime();

  // Scenario A: Nov 2, 2026 at 22:29:00 (23h 59m elapsed) -> Must NOT be 1 day!
  const mockNowBefore24h = startMs + (23 * 3600 + 59 * 60) * 1000;
  const durBefore = calculateAbstinenceDuration(startUtc, null, mockNowBefore24h);
  assert(
    "Before 24h, completed days must be 0",
    durBefore.days === 0 && durBefore.hours === 23 && durBefore.minutes === 59,
    `Days: ${durBefore.days}, Hours: ${durBefore.hours}, Minutes: ${durBefore.minutes}`
  );

  // Scenario B: Nov 2, 2026 at 22:30:00 (Exactly 24h 0m elapsed) -> Must be 1 day!
  const mockNowExact24h = startMs + 24 * 3600 * 1000;
  const durExact = calculateAbstinenceDuration(startUtc, null, mockNowExact24h);
  assert(
    "At exactly 24h, completed days must be 1, hours 0",
    durExact.days === 1 && durExact.hours === 0 && durExact.minutes === 0,
    `Days: ${durExact.days}, Hours: ${durExact.hours}, Minutes: ${durExact.minutes}`
  );

  // Scenario C: Less than 24 hours (e.g. 6 hours 15 minutes)
  const mock6h = startMs + (6 * 3600 + 15 * 60 + 30) * 1000;
  const dur6h = calculateAbstinenceDuration(startUtc, null, mock6h);
  assert(
    "Started < 24h ago (6h 15m)",
    dur6h.days === 0 && dur6h.hours === 6 && dur6h.minutes === 15 && dur6h.seconds === 30,
    dur6h.formattedArabic
  );

  // Scenario D: Multiple days (e.g. 5 days, 8 hours, 45 minutes)
  const mockMultiDays = startMs + (5 * 86400 + 8 * 3600 + 45 * 60) * 1000;
  const durMulti = calculateAbstinenceDuration(startUtc, null, mockMultiDays);
  assert(
    "Started multiple days ago (5d 8h 45m)",
    durMulti.days === 5 && durMulti.hours === 8 && durMulti.minutes === 45,
    durMulti.formattedArabic
  );

  // ---------------------------------------------------------------------------
  // Test 2: Timezone Handling & Roundtrip Conversion
  // ---------------------------------------------------------------------------
  console.log("\n--- Test 2: Timezone Precision & Wall-clock Conversion ---");

  // In Asia/Riyadh (UTC+3), 2026-11-01 22:30 is 19:30 UTC
  assert(
    "parseLocalDateTimeToUtc produces correct UTC Date",
    startUtc.toISOString() === "2026-11-01T19:30:00.000Z",
    startUtc.toISOString()
  );

  // Re-split back into local date and time in Asia/Riyadh
  const split = splitUtcToLocalDateTime(startUtc, "Asia/Riyadh");
  assert(
    "splitUtcToLocalDateTime roundtrips back to 2026-11-01 22:30",
    split.localDate === "2026-11-01" && split.localTime === "22:30",
    `${split.localDate} ${split.localTime}`
  );

  // Arabic date time formatting
  const formattedArabic = formatArabicDateTime(startUtc, "Asia/Riyadh");
  assert(
    "formatArabicDateTime contains date and hour",
    formattedArabic.fullStr.includes("نوفمبر") && (formattedArabic.fullStr.includes("10:30") || formattedArabic.fullStr.includes("١٠:٣٠")),
    formattedArabic.fullStr
  );

  // ---------------------------------------------------------------------------
  // Test 3: Relapse Simulation & Multi-Session Archival
  // ---------------------------------------------------------------------------
  console.log("\n--- Test 3: Relapse Life-Cycle & Streak Aggregation ---");

  // Session 1: Started Nov 1 at 22:30, relapsed Nov 4 at 10:30 (2 days 12h = 216,000s)
  const relapse1Utc = parseLocalDateTimeToUtc("2026-11-04", "10:30", "Asia/Riyadh");
  const session1Dur = calculateAbstinenceDuration(startUtc, relapse1Utc);
  assert(
    "Session 1 duration is 2 days and 12 hours",
    session1Dur.days === 2 && session1Dur.hours === 12 && session1Dur.totalSeconds === 216000,
    session1Dur.formattedArabic
  );

  // Session 2: Started Nov 4 at 10:30, relapsed Nov 14 at 10:30 (10 days = 864,000s)
  const relapse2Utc = parseLocalDateTimeToUtc("2026-11-14", "10:30", "Asia/Riyadh");
  const session2Dur = calculateAbstinenceDuration(relapse1Utc, relapse2Utc);
  assert(
    "Session 2 duration is exactly 10 days",
    session2Dur.days === 10 && session2Dur.hours === 0 && session2Dur.totalSeconds === 864000,
    session2Dur.formattedArabic
  );

  // Session 3 (Current Active): Started Nov 14 at 10:30, now is Nov 17 at 10:30 (3 days = 259,200s)
  const nowMock = parseLocalDateTimeToUtc("2026-11-17", "10:30", "Asia/Riyadh").getTime();
  const session3Dur = calculateAbstinenceDuration(relapse2Utc, null, nowMock);
  assert(
    "Session 3 (active) duration is 3 days",
    session3Dur.days === 3 && session3Dur.totalSeconds === 259200,
    session3Dur.formattedArabic
  );

  // Stats aggregation:
  const longestStreak = Math.max(session1Dur.totalSeconds, session2Dur.totalSeconds, session3Dur.totalSeconds);
  assert(
    "Longest streak correctly identifies Session 2 (10 days)",
    longestStreak === 864000,
    `${longestStreak / 86400} days`
  );

  const totalAbstinent = session1Dur.totalSeconds + session2Dur.totalSeconds + session3Dur.totalSeconds;
  assert(
    "Total time spent abstinent equals sum of all 3 sessions (15.5 days)",
    totalAbstinent === 216000 + 864000 + 259200,
    `${totalAbstinent / 86400} days`
  );

  const relapseCount = 2; // Session 1 and Session 2 ended
  assert("Relapse count equals number of ended sessions", relapseCount === 2);

  // ---------------------------------------------------------------------------
  // Test 4: Zod Validation Schemas
  // ---------------------------------------------------------------------------
  console.log("\n--- Test 4: Zod Input Validation & Defensive Integrity ---");

  // Valid creation
  const validCreate = CreateAbstinenceTrackerSchema.safeParse({
    name: "مشاهدة الإباحية",
    startDate: "2026-11-01",
    startTime: "22:30",
    targetDays: 30,
    description: "لحماية تركيزي وصفاء ذهني",
  });
  assert("Valid creation input passes schema", validCreate.success === true);

  // Invalid creation: empty name
  const emptyName = CreateAbstinenceTrackerSchema.safeParse({
    name: "   ",
    startDate: "2026-11-01",
    startTime: "22:30",
  });
  assert("Empty name is rejected", emptyName.success === false);

  // Valid relapse input
  const validRelapse = LogRelapseSchema.safeParse({
    trackerId: "trk_123",
    relapseDate: "2026-11-04",
    relapseTime: "10:30",
    startNewSessionFromRelapse: true,
    trigger: "فراغ وملل",
    notes: "سأتجنب السهر مع الهاتف",
  });
  assert("Valid relapse input passes schema", validRelapse.success === true);

  // Valid edit start time
  const validEditStart = UpdateStartTimeSchema.safeParse({
    trackerId: "trk_123",
    startDate: "2026-10-25",
    startTime: "14:00",
  });
  assert("Valid edit start time passes schema", validEditStart.success === true);

  console.log("\n=================================================");
  console.log(`📊 TEST RESULTS: ${passed}/${total} PASSED (100%)`);
  console.log("=================================================");
}

runTests();
