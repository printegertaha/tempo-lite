import test from "node:test";
import assert from "node:assert/strict";
import { VERIFIED_FOOD_CATALOG } from "@/lib/nutrition/food-catalog";
import {
  calculateIngredientMacros,
  computeDailyNutritionSummary,
  computeMealImpact,
  isPlannedMealConfirmedForDate,
  scaleMealIngredients,
  sumMealIngredients,
} from "@/lib/nutrition/meal-planner";
import {
  EMPTY_NUTRITION_LOGGED,
  buildMealSnapshotWithMeta,
  filterRealMealsOnly,
  getDayStatusForDate,
  normalizeMealRecord,
  resolveTargetsForDate,
} from "@/lib/nutrition/storage-helpers";

function getFood(id: string) {
  const item = VERIFIED_FOOD_CATALOG.find((f) => f.id === id);
  assert.ok(item, `Expected verified food ${id} in catalog`);
  return item;
}

test("1. New user with no meal plan or food records starts completely empty", () => {
  const summary = computeDailyNutritionSummary({
    dailyTargets: null,
    plannedMeals: [],
    actualMeals: filterRealMealsOnly([]),
  });

  assert.deepEqual(EMPTY_NUTRITION_LOGGED, {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    waterMl: 0,
    waterLiters: 0,
  });
  assert.deepEqual(summary.planned, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  assert.deepEqual(summary.actual, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  assert.equal(summary.remaining, null);
  assert.equal(summary.confirmedPlanIds.size, 0);
});

test("2. Creating a reusable meal plan calculates exact macros from verified foods in grams", () => {
  const oats = getFood("usda_oats_dry");
  const yogurt = getFood("usda_greek_yogurt_lowfat");
  const banana = getFood("usda_banana_raw");

  const ings = [
    calculateIngredientMacros(oats, 50),
    calculateIngredientMacros(yogurt, 150),
    calculateIngredientMacros(banana, 100),
  ];
  const totals = sumMealIngredients(ings);

  const plannedBreakfast = {
    id: "plan_breakfast_1",
    mealType: "breakfast",
    title: "فطار شوفان وزبادي وموز",
    items: ings,
    ...totals,
  };

  assert.ok(plannedBreakfast.calories > 0);
  assert.ok(plannedBreakfast.protein > 0);
  assert.equal(plannedBreakfast.items.length, 3);
  assert.equal(plannedBreakfast.items[0].source.verificationStatus, "verified");
});

test("3. Starting a new day with planned meals but zero actual consumption counts 0 consumed", () => {
  const chicken = getFood("usda_chicken_breast_roasted");
  const rice = getFood("usda_white_rice_cooked");
  const lunchIngs = [
    calculateIngredientMacros(chicken, 150),
    calculateIngredientMacros(rice, 150),
  ];
  const lunchTotals = sumMealIngredients(lunchIngs);

  const plannedMeals = [
    { id: "plan_lunch_1", mealType: "lunch", title: "غداء الدجاج والأرز", items: lunchIngs, ...lunchTotals },
  ];

  const summary = computeDailyNutritionSummary({
    dailyTargets: { calories: 2200, protein: 160, carbs: 240, fat: 65, waterLiters: 2.8 },
    plannedMeals,
    actualMeals: [],
  });

  assert.equal(summary.planned.calories, lunchTotals.calories);
  assert.equal(summary.actual.calories, 0);
  assert.equal(summary.actual.protein, 0);
  assert.equal(summary.remaining?.calories, 2200);
  assert.equal(summary.confirmedPlanIds.size, 0);
});

test("4. Confirming a planned meal creates actual record and blocks duplicate confirmation", () => {
  const chicken = getFood("usda_chicken_breast_roasted");
  const ing = calculateIngredientMacros(chicken, 200);
  const totals = sumMealIngredients([ing]);
  const plan = {
    id: "plan_lunch_confirm",
    mealType: "lunch",
    title: "صدر دجاج مشوي",
    items: [ing],
    ...totals,
  };

  const dayMeals: ReturnType<typeof normalizeMealRecord>[] = [];
  assert.equal(isPlannedMealConfirmedForDate(plan.id, dayMeals), false);

  const snapshot = buildMealSnapshotWithMeta({
    targetsSnapshot: { calories: 2000, protein: 150, carbs: 200, fat: 60, waterLiters: 2.5 },
    sourcePlanId: plan.id,
    isEstimated: false,
    entrySource: "verified",
  });

  const confirmedRecord = normalizeMealRecord({
    id: "meal_actual_1",
    userId: "user_1",
    date: "2026-11-27",
    mealType: plan.mealType,
    title: plan.title,
    items: plan.items,
    ...totals,
    sourcePlanId: plan.id,
    dailyTargetsSnapshot: snapshot,
  });

  dayMeals.push(confirmedRecord);
  assert.equal(isPlannedMealConfirmedForDate(plan.id, dayMeals), true);

  const summary = computeDailyNutritionSummary({
    dailyTargets: { calories: 2000, protein: 150, carbs: 200, fat: 60, waterLiters: 2.5 },
    plannedMeals: [plan],
    actualMeals: dayMeals,
  });

  assert.equal(summary.actual.calories, totals.calories);
  assert.equal(summary.confirmedPlanIds.has(plan.id), true);
  assert.equal(summary.planVsActualDiff.calories, 0);
});

test("5. Eating only part of a planned meal scales quantities and logs only consumed portion", () => {
  const oats = getFood("usda_oats_dry");
  const baseIngs = [calculateIngredientMacros(oats, 100)];
  const baseTotals = sumMealIngredients(baseIngs);

  const halfIngs = scaleMealIngredients(baseIngs, 0.5);
  const halfTotals = sumMealIngredients(halfIngs);

  assert.equal(halfIngs[0].grams, 50);
  assert.equal(halfTotals.calories, Math.round(baseTotals.calories * 0.5));

  const summary = computeDailyNutritionSummary({
    dailyTargets: null,
    plannedMeals: [{ id: "plan_oats", ...baseTotals }],
    actualMeals: [
      normalizeMealRecord({
        id: "meal_half",
        date: "2026-11-27",
        mealType: "breakfast",
        title: "نصف وجبة شوفان",
        items: halfIngs,
        sourcePlanId: "plan_oats",
        ...halfTotals,
      }),
    ],
  });

  assert.equal(summary.actual.calories, halfTotals.calories);
  assert.ok(summary.planVsActualDiff.calories < 0);
});

test("6. Adding multiple unplanned snacks sums all snacks into actual totals", () => {
  const almonds = getFood("usda_almonds_raw");
  const apple = getFood("usda_apple_raw");

  const snack1Ing = calculateIngredientMacros(almonds, 25);
  const snack2Ing = calculateIngredientMacros(apple, 150);

  const snack1 = normalizeMealRecord({
    id: "snack_1",
    date: "2026-11-27",
    mealType: "snacks",
    title: "لوز",
    items: [snack1Ing],
    ...sumMealIngredients([snack1Ing]),
  });
  const snack2 = normalizeMealRecord({
    id: "snack_2",
    date: "2026-11-27",
    mealType: "snacks",
    title: "تفاح",
    items: [snack2Ing],
    ...sumMealIngredients([snack2Ing]),
  });

  const summary = computeDailyNutritionSummary({
    dailyTargets: null,
    plannedMeals: [],
    actualMeals: [snack1, snack2],
  });

  assert.equal(summary.actual.calories, snack1.calories + snack2.calories);
});

test("7. Recording a restaurant meal on a travel day preserves plan and marks meal as estimated", () => {
  const dayStatusMap = {
    "2026-11-27": { offPlan: true, reason: "سفر", updatedAt: "2026-11-27T10:00:00.000Z" },
  };
  const status = getDayStatusForDate(dayStatusMap, "2026-11-27");
  assert.equal(status.offPlan, true);
  assert.equal(status.reason, "سفر");

  const restaurantMeal = normalizeMealRecord({
    id: "meal_rest_1",
    date: "2026-11-27",
    mealType: "dinner",
    title: "وجبة مطعم في السفر",
    calories: 720,
    protein: 38,
    carbs: 65,
    fat: 32,
    items: [],
    isEstimated: true,
    entrySource: "restaurant",
  });

  assert.equal(restaurantMeal.isEstimated, true);
  assert.equal(restaurantMeal.entrySource, "restaurant");
  assert.equal(restaurantMeal.calories, 720);
});

test("8 & 9. Editing and deleting actual meals immediately recalculates daily totals and remaining macros", () => {
  const targets = { calories: 2000, protein: 150, carbs: 200, fat: 65, waterLiters: 2.5 };
  const m1 = normalizeMealRecord({
    id: "m_edit_1",
    date: "2026-11-27",
    mealType: "lunch",
    title: "وجبة",
    calories: 600,
    protein: 45,
    carbs: 60,
    fat: 18,
  });

  const impact = computeMealImpact({
    dailyLogged: { calories: 600, protein: 45, carbs: 60, fat: 18 },
    dailyTargets: targets,
    previousMeal: { calories: 600, protein: 45, carbs: 60, fat: 18 },
    draftMeal: { calories: 450, protein: 35, carbs: 45, fat: 12 },
  });

  assert.equal(impact.delta.calories, -150);
  assert.equal(impact.projectedLogged.calories, 450);
  assert.equal(impact.remaining?.calories, 1550);

  const afterDelete = computeDailyNutritionSummary({
    dailyTargets: targets,
    plannedMeals: [],
    actualMeals: [],
  });
  assert.equal(afterDelete.actual.calories, 0);
  assert.equal(afterDelete.remaining?.calories, 2000);
});

test("10. Sync snapshot round-trip preserves sourcePlanId, isEstimated, entrySource, and targets", () => {
  const targets = { calories: 2100, protein: 155, carbs: 210, fat: 68, waterLiters: 2.6 };
  const snapshot = buildMealSnapshotWithMeta({
    targetsSnapshot: targets,
    sourcePlanId: "plan_99",
    isEstimated: true,
    entrySource: "restaurant",
  });

  // Simulate Postgres MealEntry row returned from /api/sync/pull (without dedicated columns)
  const pulledRow = {
    id: "meal_sync_1",
    userId: "user_1",
    date: "2026-11-27",
    mealType: "dinner",
    title: "عشاء مطعم",
    calories: 680,
    protein: 35,
    carbs: 60,
    fat: 30,
    items: [],
    dailyTargetsSnapshot: snapshot,
  };

  const normalized = normalizeMealRecord(pulledRow);
  assert.equal(normalized.sourcePlanId, "plan_99");
  assert.equal(normalized.isEstimated, true);
  assert.equal(normalized.entrySource, "restaurant");

  const resolvedHistTargets = resolveTargetsForDate({
    dateStr: "2026-11-20",
    todayStr: "2026-11-27",
    currentTargets: { calories: 1800, protein: 140, carbs: 180, fat: 55, waterLiters: 2.2 },
    targetSnapshots: {},
    mealsForDate: [normalized],
  });
  assert.equal(resolvedHistTargets?.calories, 2100);
});

test("11. Historical actual consumption remains independent of later changes to meal templates", () => {
  const chicken = getFood("usda_chicken_breast_roasted");
  const planIng = calculateIngredientMacros(chicken, 150);
  const planTotals = sumMealIngredients([planIng]);

  // User confirms planned meal on historical date 2026-11-20
  const historicalMeal = normalizeMealRecord({
    id: "hist_meal_1",
    date: "2026-11-20",
    mealType: "lunch",
    title: "غداء 150 جم دجاج",
    items: [{ ...planIng }],
    sourcePlanId: "plan_chicken",
    ...planTotals,
  });

  // Later, user edits the template to 250g or deletes it completely
  const updatedPlanIng = calculateIngredientMacros(chicken, 250);
  const updatedPlanTotals = sumMealIngredients([updatedPlanIng]);
  assert.notEqual(updatedPlanTotals.calories, historicalMeal.calories);

  // Historical meal still has its original 150g snapshot and original calories
  assert.equal((historicalMeal.items[0] as any).grams, 150);
  assert.equal(historicalMeal.calories, planTotals.calories);
});

test("12. Editing an estimated meal to verified strips stale _meta without losing targetsSnapshot", () => {
  const targets = { calories: 2100, protein: 155, carbs: 210, fat: 68, waterLiters: 2.6 };
  const initialSnapshot = buildMealSnapshotWithMeta({
    targetsSnapshot: targets,
    sourcePlanId: null,
    isEstimated: true,
    entrySource: "restaurant",
  });

  const updatedSnapshot = buildMealSnapshotWithMeta({
    targetsSnapshot: initialSnapshot,
    sourcePlanId: null,
    isEstimated: false,
    entrySource: null,
  });

  assert.equal((updatedSnapshot as any)?._meta, undefined);
  assert.equal((updatedSnapshot as any)?.calories, 2100);

  const normalized = normalizeMealRecord({
    id: "meal_switched_1",
    date: "2026-11-27",
    mealType: "lunch",
    title: "صدر دجاج مشوي",
    calories: 330,
    protein: 62,
    carbs: 0,
    fat: 7,
    items: [calculateIngredientMacros(getFood("usda_chicken_breast_roasted"), 200)],
    dailyTargetsSnapshot: updatedSnapshot,
  });

  assert.equal(normalized.isEstimated, false);
  assert.equal(normalized.entrySource, "verified");
});
