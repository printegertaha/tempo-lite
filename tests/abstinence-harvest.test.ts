import assert from "node:assert/strict";
import test from "node:test";
import {
  computeAbstinenceAchievementsForDate,
  formatAbstinenceRevealText,
} from "@/lib/abstinence/harvest";

test("excludes sessions under 24 hours and includes >= 24h milestones on the target day", () => {
  const trackers = [
    { id: "t1", name: "التدخين" },
    { id: "t2", name: "السوشيال ميديا" },
    { id: "t3", name: "السكر" },
  ];

  // Start at 2026-11-26T10:00:00Z
  const sessions = [
    { id: "s1", abstinenceTrackerId: "t1", startedAt: "2026-11-26T10:00:00Z", endedAt: null },
    { id: "s2", abstinenceTrackerId: "t2", startedAt: "2026-11-26T10:00:00Z", endedAt: null },
    // Under 24h at 2026-11-27T12:00:00Z (started 2026-11-27T08:00:00Z)
    { id: "s3", abstinenceTrackerId: "t3", startedAt: "2026-11-27T08:00:00Z", endedAt: null },
  ];

  const nowMs = new Date("2026-11-27T12:00:00Z").getTime();

  // Day 1 (start day): no 24h milestone yet
  const day1 = computeAbstinenceAchievementsForDate({
    trackers,
    sessions,
    selectedDate: "2026-11-26",
    timezone: "UTC",
    nowMs,
  });
  assert.equal(day1.length, 0);

  // Day 2: t1 and t2 crossed 24h, t3 has not
  const day2 = computeAbstinenceAchievementsForDate({
    trackers,
    sessions,
    selectedDate: "2026-11-27",
    timezone: "UTC",
    nowMs,
  });
  assert.equal(day2.length, 2);
  assert.equal(day2[0].encryptedText, "رئتك بقت أفضل");
  assert.equal(day2[0].revealedText, "امتنعت عن التدخين");
  assert.equal(day2[1].encryptedText, "مخك بقى أفضل");
  assert.equal(day2[1].revealedText, "امتنعت عن السوشيال ميديا");
  assert.notEqual(day2[0].encryptedText, day2[1].encryptedText);
});

test("excludes relapses that happened before reaching 24 hours", () => {
  const trackers = [{ id: "t1", name: "التدخين" }];
  const sessions = [
    {
      id: "s1",
      abstinenceTrackerId: "t1",
      startedAt: "2026-11-26T10:00:00Z",
      endedAt: "2026-11-26T18:00:00Z",
    },
  ];

  const res = computeAbstinenceAchievementsForDate({
    trackers,
    sessions,
    selectedDate: "2026-11-26",
    timezone: "UTC",
    nowMs: new Date("2026-11-27T12:00:00Z").getTime(),
  });
  assert.equal(res.length, 0);
});

test("formatAbstinenceRevealText normalizes prefix", () => {
  assert.equal(formatAbstinenceRevealText("التدخين"), "امتنعت عن التدخين");
  assert.equal(formatAbstinenceRevealText("امتنعت عن السهر"), "امتنعت عن السهر");
});
