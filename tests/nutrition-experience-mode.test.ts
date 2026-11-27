import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateNutritionPlan,
  createEmptyNutritionProfile,
  isNutritionProfileCompleted,
  resolveNutritionExperienceMode,
} from "@/lib/nutrition/calculations";
import { coalesceMutationsWithDropped } from "@/lib/sync/coalesce";
import { filterRealMealsOnly } from "@/lib/nutrition/storage-helpers";
import { VERIFIED_FOOD_CATALOG } from "@/lib/nutrition/food-catalog";
import {
  calculateIngredientMacros,
  evaluatePlannedMealFit,
  sumMealIngredients,
} from "@/lib/nutrition/meal-planner";

test("1. New user completing profile sees pending_choice then chooses calculator_only", () => {
  const completedProfile = {
    ...createEmptyNutritionProfile(),
    biologicalSex: "male" as const,
    age: 27,
    heightCm: 175,
    weightKg: 75,
    activityLevel: "active" as const,
    goal: "maintain" as const,
    setupCompleted: true,
    setupInProgress: false,
  };

  assert.equal(isNutritionProfileCompleted(completedProfile), true);
  const plan = calculateNutritionPlan(completedProfile);
  assert.equal(plan.ready, true);
  assert.ok((plan.targets?.calories || 0) > 1500);

  // Immediately after profile completion: pending_choice
  assert.equal(
    resolveNutritionExperienceMode({
      explicitMode: null,
      hasExistingMeals: false,
      hasExistingPlans: false,
    }),
    "pending_choice"
  );

  // User picks Option A: "عايز أعرف احتياجي بس"
  assert.equal(
    resolveNutritionExperienceMode({
      explicitMode: "calculator_only",
      hasExistingMeals: false,
      hasExistingPlans: false,
    }),
    "calculator_only"
  );
});

test("2. New user activating complete nutrition tracking gets full_tracking", () => {
  assert.equal(
    resolveNutritionExperienceMode({
      explicitMode: "full_tracking",
      hasExistingMeals: false,
      hasExistingPlans: false,
    }),
    "full_tracking"
  );
});

test("3 & 4. Switching between calculator_only and full_tracking preserves meals and plans", () => {
  const savedMeals = filterRealMealsOnly([
    {
      id: "meal_keep_1",
      date: "2026-11-27",
      mealType: "lunch",
      title: "وجبة محفوظة",
      calories: 500,
      protein: 40,
      carbs: 50,
      fat: 14,
      items: [],
    },
  ]);
  const savedPlans = [{ id: "plan_keep_1", mealType: "breakfast", title: "خطة فطار", calories: 400 }];

  // Switch from calculator_only -> full_tracking
  const toFull = resolveNutritionExperienceMode({
    explicitMode: "full_tracking",
    hasExistingMeals: savedMeals.length > 0,
    hasExistingPlans: savedPlans.length > 0,
  });
  assert.equal(toFull, "full_tracking");

  // Switch back to calculator_only: explicitMode wins, existing meals/plans are NOT deleted
  const backToCalc = resolveNutritionExperienceMode({
    explicitMode: "calculator_only",
    hasExistingMeals: savedMeals.length > 0,
    hasExistingPlans: savedPlans.length > 0,
  });
  assert.equal(backToCalc, "calculator_only");
  assert.equal(savedMeals.length, 1);
  assert.equal(savedPlans.length, 1);
});

test("5. Existing users with saved meals or plans retain direct access to full_tracking", () => {
  assert.equal(
    resolveNutritionExperienceMode({
      explicitMode: undefined,
      hasExistingMeals: true,
      hasExistingPlans: false,
    }),
    "full_tracking"
  );

  assert.equal(
    resolveNutritionExperienceMode({
      explicitMode: undefined,
      hasExistingMeals: false,
      hasExistingPlans: true,
    }),
    "full_tracking"
  );
});

test("6. Offline preference switch coalesces in Outbox for cross-device sync", () => {
  const m1 = {
    mutationId: "exp_1",
    userId: "user_1",
    entityType: "user_settings" as const,
    entityId: "user_1",
    action: "update" as const,
    payload: { dashboardConfig: { nutritionExperienceMode: "calculator_only" } },
    clientTimestamp: 1000,
    version: 1,
    status: "pending" as const,
    retryCount: 0,
  };
  const m2 = {
    ...m1,
    mutationId: "exp_2",
    payload: { dashboardConfig: { nutritionExperienceMode: "full_tracking" } },
    clientTimestamp: 2000,
  };

  const { coalesced } = coalesceMutationsWithDropped([m1, m2]);
  assert.equal(coalesced.length, 1);
  assert.equal(coalesced[0].payload.dashboardConfig.nutritionExperienceMode, "full_tracking");
});

test("7. Diet builder mode & evaluatePlannedMealFit compute remaining macros and verified protein boosts", () => {
  assert.equal(
    resolveNutritionExperienceMode({
      explicitMode: "diet_builder",
      hasExistingMeals: false,
      hasExistingPlans: false,
    }),
    "diet_builder"
  );

  const rice = VERIFIED_FOOD_CATALOG.find((f) => f.id === "usda_white_rice_cooked");
  assert.ok(rice);
  const riceIng = calculateIngredientMacros(rice, 200);
  const mealTotals = sumMealIngredients([riceIng]);

  const fit = evaluatePlannedMealFit({
    dailyTargets: { calories: 2000, protein: 150, carbs: 220, fat: 60, waterLiters: 2.5 },
    existingPlannedMeals: [],
    currentMealTotals: mealTotals,
    catalog: VERIFIED_FOOD_CATALOG,
  });

  assert.equal(fit.fitsComfortably, true);
  assert.ok((fit.remainingAfterMeal?.protein || 0) > 100);
  assert.ok(fit.messagesAr.some((m) => m.includes("محتاج تزود البروتين")));
  assert.ok(fit.proteinBoostSuggestions.length > 0);
  assert.equal(fit.proteinBoostSuggestions[0].snapshot.source.verificationStatus, "verified");
});
