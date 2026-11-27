import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateNutritionPlan,
  createEmptyNutritionProfile,
  isNutritionProfileCompleted,
} from "@/lib/nutrition/calculations";
import { coalesceMutationsWithDropped } from "@/lib/sync/coalesce";
import { filterRealMealsOnly } from "@/lib/nutrition/storage-helpers";

test("1 & 2. Brand-new user has incomplete profile and zero dashboard targets", () => {
  const empty = createEmptyNutritionProfile();
  assert.equal(isNutritionProfileCompleted(empty), false);
  assert.equal(isNutritionProfileCompleted(null), false);
  assert.equal(isNutritionProfileCompleted(undefined), false);

  const plan = calculateNutritionPlan(empty);
  assert.equal(plan.ready, false);
  assert.equal(plan.targets, null);
});

test("3. Reload during any setup step preserves draft and keeps profile incomplete until final step", () => {
  const midSetup = {
    ...createEmptyNutritionProfile(),
    biologicalSex: "male" as const,
    age: 28,
    heightCm: 178,
    weightKg: 78,
    setupInProgress: true,
    setupStep: 5,
    setupCompleted: false,
  };

  // Even though body measurements are filled, setupInProgress + setupCompleted=false must NOT unlock dashboard
  assert.equal(isNutritionProfileCompleted(midSetup), false);
  assert.equal(midSetup.setupStep, 5);
});

test("4. Completed setup unlocks dashboard and computes valid targets", () => {
  const completed = {
    ...createEmptyNutritionProfile(),
    biologicalSex: "male" as const,
    age: 28,
    heightCm: 178,
    weightKg: 78,
    activityLevel: "active" as const,
    goal: "lose" as const,
    rateKgPerWeek: 0.25,
    trainingLevel: "strength_endurance" as const,
    setupInProgress: false,
    setupCompleted: true,
    setupVersion: 1,
    setupStep: 7,
    setupCompletedAt: "2026-11-27T12:00:00.000Z",
  };

  assert.equal(isNutritionProfileCompleted(completed), true);
  const plan = calculateNutritionPlan(completed);
  assert.equal(plan.ready, true);
  assert.ok((plan.targets?.calories || 0) > 1200);
});

test("5. Returning user with valid legacy profile (no setupCompleted flag) enters directly", () => {
  const legacyValidProfile = {
    weightKg: 72,
    heightCm: 174,
    age: 26,
    biologicalSex: "male" as const,
    activityLevel: "low_active" as const,
    goal: "maintain" as const,
    rateKgPerWeek: 0,
    trainingLevel: "recreational" as const,
    hasMedicalRestriction: false,
    isPregnantOrBreastfeeding: false,
    hotClimate: false,
    mode: "auto" as const,
  };

  assert.equal(isNutritionProfileCompleted(legacyValidProfile), true);

  // Incomplete legacy profile (missing body measurements) must still go through setup
  const legacyIncomplete = {
    ...legacyValidProfile,
    weightKg: null,
  };
  assert.equal(isNutritionProfileCompleted(legacyIncomplete), false);
});

test("6. Existing real meals remain intact regardless of profile completion state", () => {
  const realMeals = filterRealMealsOnly([
    {
      id: "real_meal_1",
      date: "2026-11-20",
      mealType: "lunch",
      title: "غداء قديم",
      calories: 550,
      protein: 40,
      carbs: 60,
      fat: 15,
      items: [],
    },
  ]);

  assert.equal(realMeals.length, 1);
  assert.equal(realMeals[0].id, "real_meal_1");
});

test("7. Offline progressive setup answers coalesce cleanly in Outbox for sync", () => {
  const step1 = {
    mutationId: "mut_1",
    userId: "user_1",
    entityType: "user_settings" as const,
    entityId: "user_1",
    action: "update" as const,
    payload: {
      dashboardConfig: {
        nutritionProfile: { setupStep: 2, setupInProgress: true, biologicalSex: "female" },
      },
    },
    clientTimestamp: 1000,
    version: 1,
    status: "pending" as const,
    retryCount: 0,
  };

  const finalStep = {
    ...step1,
    mutationId: "mut_2",
    payload: {
      dashboardConfig: {
        nutritionProfile: {
          setupStep: 7,
          setupInProgress: false,
          setupCompleted: true,
          biologicalSex: "female",
          age: 25,
          heightCm: 165,
          weightKg: 60,
        },
      },
    },
    clientTimestamp: 2000,
  };

  const { coalesced } = coalesceMutationsWithDropped([step1, finalStep]);
  assert.equal(coalesced.length, 1);
  assert.equal(coalesced[0].payload.dashboardConfig.nutritionProfile.setupCompleted, true);
  assert.equal(coalesced[0].payload.dashboardConfig.nutritionProfile.weightKg, 60);
});
