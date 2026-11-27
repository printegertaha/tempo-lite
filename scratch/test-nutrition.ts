import assert from "node:assert/strict";
import {
  calculateDri2023AdultEer,
  calculateNutritionPlan,
  computeAgeFromBirthDate,
  computeProgressPercent,
  createEmptyNutritionProfile,
  buildMacroConsistencyCheck,
} from "../lib/nutrition/calculations";
import {
  VERIFIED_FOOD_CATALOG,
  searchFoodCatalog,
} from "../lib/nutrition/food-catalog";
import {
  calculateIngredientMacros,
  computeMealImpact,
  generateSmartMealSuggestions,
  sumMealIngredients,
} from "../lib/nutrition/meal-planner";
import {
  EMPTY_NUTRITION_LOGGED,
  filterRealMealsOnly,
  isDemoMealRecord,
  mergeBodyWeights,
  normalizeMealRecord,
  resolveTargetsForDate,
} from "../lib/nutrition/storage-helpers";
import { NUTRITION_DATA } from "../components/data/mockData";
import { coalesceMutationsWithDropped } from "../lib/sync/coalesce";
import { SyncBatchRequestSchema } from "../lib/sync/server-handler";
import { getLocalDateString as getTzLocalDateString } from "../lib/dates";

function approxEqual(actual: number, expected: number, tolerance = 0.05) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

function testCleanNewUserAndDemoCleanup() {
  console.log("1. Testing clean first-time experience & non-destructive demo cleanup...");
  assert.equal(NUTRITION_DATA.dailyTargets, null);
  assert.deepEqual(NUTRITION_DATA.meals, []);
  assert.equal(NUTRITION_DATA.todayLogged.calories, 0);
  assert.equal(NUTRITION_DATA.todayLogged.waterLiters, 0);
  assert.equal(EMPTY_NUTRITION_LOGGED.calories, 0);
  assert.equal(EMPTY_NUTRITION_LOGGED.waterMl, 0);

  // Mixed demo + real meals: demo meals stripped, real user meals preserved 100%
  const mixed = [
    { id: "m1", title: "إفطار الأبطال الصباحي", calories: 550, protein: 36 },
    { id: "m4", title: "عشاء الاستشفاء الليلي", calories: 540, protein: 40 },
    { id: "real_uuid_1", title: "صدور دجاج وأرز", calories: 480, protein: 42, carbs: 50, fat: 8, date: "2026-11-26" },
    { id: "real_uuid_2", name: "ترمس وجبنة قريش", calories: 282, protein: 42, carbs: 18, fat: 5.9, date: "2026-11-25", items: [] },
  ];
  assert.equal(isDemoMealRecord(mixed[0]), true);
  assert.equal(isDemoMealRecord(mixed[2]), false);
  const cleaned = filterRealMealsOnly(mixed);
  assert.equal(cleaned.length, 2);
  assert.equal(cleaned[0].id, "real_uuid_1");
  assert.equal(cleaned[1].id, "real_uuid_2");
  // Ensure normalized meal never crashes on .items.map()
  assert.ok(Array.isArray(normalizeMealRecord({ id: "x", title: "وجبة" }).items));
  console.log("✅ Clean first-time defaults & safe demo cleanup passed.");
}

function testDri2023EnergyAndMacros() {
  console.log("2. Testing DRI 2023 EER equations, goals, AMDR macros, and edge cases...");

  // Independently verified hand-calculated male (active, age 30, 178 cm, 78 kg):
  // 1004.82 - (10.83*30) + (6.52*178) + (15.91*78)
  // = 1004.82 - 324.90 + 1160.56 + 1240.98 = 3081.46 kcal
  const maleActiveEer = calculateDri2023AdultEer({
    sex: "male",
    activityLevel: "active",
    age: 30,
    heightCm: 178,
    weightKg: 78,
  });
  approxEqual(maleActiveEer, 3081.46, 0.01);

  // Independently verified hand-calculated female (low_active, age 28, 165 cm, 62 kg):
  // 575.77 - (7.01*28) + (6.60*165) + (12.14*62)
  // = 575.77 - 196.28 + 1089.00 + 752.68 = 2221.17 kcal
  const femaleLowActiveEer = calculateDri2023AdultEer({
    sex: "female",
    activityLevel: "low_active",
    age: 28,
    heightCm: 165,
    weightKg: 62,
  });
  approxEqual(femaleLowActiveEer, 2221.17, 0.01);

  // Check all 8 sex x activity branches return finite positive values for normal adult
  for (const sex of ["male", "female"] as const) {
    for (const activityLevel of ["inactive", "low_active", "active", "very_active"] as const) {
      const val = calculateDri2023AdultEer({ sex, activityLevel, age: 30, heightCm: 175, weightKg: 75 });
      assert.ok(Number.isFinite(val) && val > 1000, `Unexpected EER for ${sex}/${activityLevel}: ${val}`);
    }
  }

  // Empty profile should NOT invent targets
  const emptyPlan = calculateNutritionPlan(createEmptyNutritionProfile());
  assert.equal(emptyPlan.ready, false);
  assert.equal(emptyPlan.targets, null);
  assert.equal(emptyPlan.eligibility.reasonCode, "INCOMPLETE_PROFILE");

  // Under 19 guard
  const teenPlan = calculateNutritionPlan({
    weightKg: 65,
    heightCm: 170,
    age: 17,
    biologicalSex: "male",
    activityLevel: "active",
    mode: "auto",
  });
  assert.equal(teenPlan.ready, false);
  assert.equal(teenPlan.eligibility.reasonCode, "UNDER_19");

  // Pregnancy / medical guard
  const specialPlan = calculateNutritionPlan({
    weightKg: 65,
    heightCm: 165,
    age: 29,
    biologicalSex: "female",
    activityLevel: "low_active",
    isPregnantOrBreastfeeding: true,
    mode: "auto",
  });
  assert.equal(specialPlan.ready, false);
  assert.equal(specialPlan.eligibility.reasonCode, "SPECIAL_CONDITION");

  // Complete adult plan: lose 0.5 kg/week (-550 kcal), strength training
  const fullPlan = calculateNutritionPlan({
    weightKg: 78,
    heightCm: 178,
    age: 30,
    biologicalSex: "male",
    activityLevel: "active",
    goal: "lose",
    rateKgPerWeek: 0.5,
    trainingLevel: "strength_endurance",
    mode: "auto",
  });
  assert.equal(fullPlan.ready, true);
  assert.equal(fullPlan.maintenanceEerKcal, 3080);
  assert.equal(fullPlan.goalDeltaKcal, -550);
  assert.equal(fullPlan.targets!.calories, 2530);
  assert.ok(fullPlan.targets!.protein >= 100 && fullPlan.targets!.protein <= 200);
  assert.equal(fullPlan.macroEnergyCheck!.conflicts.length, 0);
  // Macro kcal consistency check
  const macroKcal =
    fullPlan.targets!.protein * 4 + fullPlan.targets!.carbs * 4 + fullPlan.targets!.fat * 9;
  assert.ok(Math.abs(macroKcal - fullPlan.targets!.calories) <= 12);

  // Macro conflict detection when user overrides inconsistently
  const conflictCheck = buildMacroConsistencyCheck({
    calories: 2000,
    protein: 250, // 1000 kcal (50% > 35% AMDR)
    carbs: 200, // 800 kcal
    fat: 80, // 720 kcal -> total 2520 kcal != 2000 kcal
  });
  assert.ok(conflictCheck.conflicts.length >= 2);

  // Birthdate age calculation
  assert.equal(computeAgeFromBirthDate("1996-05-01", new Date("2026-11-26")), 30);

  // Division by zero & invalid progress protection
  assert.equal(computeProgressPercent(500, 0), 0);
  assert.equal(computeProgressPercent(500, null), 0);
  assert.equal(computeProgressPercent(0, 2400), 0);
  assert.equal(computeProgressPercent(3000, 2400), 100);

  console.log("✅ DRI 2023 EER, macros, guards & rounding passed.");
}

function testFoodCatalogAndMealMath() {
  console.log("3. Testing food catalog search (AR/EN, raw vs cooked, unavailable) & gram math...");

  // Arabic & English search
  assert.ok(searchFoodCatalog(VERIFIED_FOOD_CATALOG, "ترمس").some((f) => f.id === "usda_lupins_boiled"));
  assert.ok(searchFoodCatalog(VERIFIED_FOOD_CATALOG, "جبنة قريش").some((f) => f.id === "usda_cottage_cheese_lowfat"));
  assert.ok(searchFoodCatalog(VERIFIED_FOOD_CATALOG, "chicken breast").length >= 2);

  // Raw vs cooked chicken breast distinction
  const rawChicken = VERIFIED_FOOD_CATALOG.find((f) => f.id === "usda_chicken_breast_raw")!;
  const cookedChicken = VERIFIED_FOOD_CATALOG.find((f) => f.id === "usda_chicken_breast_roasted")!;
  assert.notEqual(rawChicken.per100g.calories, cookedChicken.per100g.calories);
  assert.notEqual(rawChicken.source.fdcId, cookedChicken.source.fdcId);

  // Unavailable composite Egyptian dish never has invented macros
  const koshary = VERIFIED_FOOD_CATALOG.find((f) => f.id === "egypt_koshary_unavailable")!;
  assert.equal(koshary.source.verificationStatus, "unavailable");
  assert.equal(koshary.per100g.calories, 0);

  // Prompt example workflow: 200g boiled lupins + 150g cottage cheese + 2 large eggs (100g hard-boiled)
  const lupins = VERIFIED_FOOD_CATALOG.find((f) => f.id === "usda_lupins_boiled")!;
  const cottage = VERIFIED_FOOD_CATALOG.find((f) => f.id === "usda_cottage_cheese_lowfat")!;
  const egg = VERIFIED_FOOD_CATALOG.find((f) => f.id === "usda_egg_hard_boiled")!;

  const ing1 = calculateIngredientMacros(lupins, 200); // 232 kcal, 31.2 P, 18.6 C, 5.8 F
  const ing2 = calculateIngredientMacros(cottage, 150); // 108 kcal, 18.6 P, 4.1 C, 1.5 F
  const ing3 = calculateIngredientMacros(egg, 100); // 155 kcal, 12.6 P, 1.1 C, 10.6 F

  assert.equal(ing1.calories, 232);
  approxEqual(ing1.protein, 31.2, 0.1);
  assert.equal(ing2.calories, 108);
  approxEqual(ing2.protein, 18.6, 0.1);
  assert.equal(ing3.calories, 155);

  const totals = sumMealIngredients([ing1, ing2, ing3]);
  assert.equal(totals.calories, 495);
  approxEqual(totals.protein, 62.4, 0.1);

  // Edit meal impact & remaining macros
  const impact = computeMealImpact({
    dailyLogged: { calories: 1200, protein: 90, carbs: 140, fat: 35 },
    dailyTargets: { calories: 2200, protein: 160, carbs: 240, fat: 60, waterLiters: 3.0 },
    previousMeal: { calories: 400, protein: 35, carbs: 40, fat: 10 },
    draftMeal: totals,
  });
  assert.equal(impact.delta.calories, 95);
  assert.equal(impact.projectedLogged.calories, 1295);
  assert.equal(impact.remaining!.calories, 905);
  approxEqual(impact.remaining!.protein, 42.6, 0.1);

  // Smart suggestions derived strictly from verified catalog
  const suggestions = generateSmartMealSuggestions({
    dailyLogged: { calories: 1400, protein: 80, carbs: 150, fat: 40 },
    dailyTargets: { calories: 2200, protein: 160, carbs: 240, fat: 65, waterLiters: 3.0 },
    goal: "maintain",
    catalog: VERIFIED_FOOD_CATALOG,
  });
  assert.ok(suggestions.length >= 1);
  for (const s of suggestions) {
    assert.ok(s.reasonAr.length > 0);
    for (const i of s.ingredients) {
      assert.equal(i.source.verificationStatus, "verified");
      assert.ok(i.grams > 0);
    }
  }

  console.log("✅ Food catalog, gram math, edit impact & suggestions passed.");
}

function testHistoricalSnapshotsWeightAndSyncContracts() {
  console.log("4. Testing historical snapshots, weight merge, timezone reset & sync contracts...");

  // Historical date keeps its preserved target snapshot even if today's targets change
  const yesterdayTargets = { calories: 2100, protein: 140, carbs: 220, fat: 65, waterLiters: 2.8 };
  const todayTargets = { calories: 2500, protein: 170, carbs: 280, fat: 70, waterLiters: 3.2 };

  const resolvedYesterday = resolveTargetsForDate({
    dateStr: "2026-11-25",
    todayStr: "2026-11-26",
    currentTargets: todayTargets,
    targetSnapshots: { "2026-11-25": yesterdayTargets, "2026-11-26": todayTargets },
  });
  assert.deepEqual(resolvedYesterday, yesterdayTargets);

  // Body weight merge across Gym & Nutrition
  const mergedWeights = mergeBodyWeights(
    [{ id: "bw_1", weightKg: 78, date: "2026-11-26", createdAt: "2026-11-26T10:00:00Z" }],
    [{ id: "bw_2", weightKg: 79, date: "2026-11-20", createdAt: "2026-11-20T10:00:00Z" }]
  );
  assert.equal(mergedWeights.length, 2);
  assert.equal(mergedWeights[0].id, "bw_1");

  // Timezone local date boundary check
  const utcInstant = new Date("2026-11-26T22:30:00.000Z"); // 00:30 next day in Cairo (UTC+2)
  assert.equal(getTzLocalDateString(utcInstant, "Africa/Cairo"), "2026-11-27");
  assert.equal(getTzLocalDateString(utcInstant, "UTC"), "2026-11-26");

  // Sync schema validates water_entry and updated meal_entry mutations
  const validBatch = SyncBatchRequestSchema.safeParse({
    mutations: [
      {
        mutationId: "mut_w1",
        entityType: "water_entry",
        entityId: "w_1",
        action: "create",
        payload: { date: "2026-11-26", amountMl: 250, source: "nutrition" },
        clientTimestamp: Date.now(),
        version: 1,
      },
      {
        mutationId: "mut_m1",
        entityType: "meal_entry",
        entityId: "meal_1",
        action: "update",
        payload: { title: "وجبة محدثة", time: "14:00", calories: 495, items: [] },
        clientTimestamp: Date.now(),
        version: 1,
      },
    ],
  });
  assert.equal(validBatch.success, true);

  // Offline create -> update -> coalesce into single create
  const coalesced = coalesceMutationsWithDropped([
    {
      mutationId: "c1",
      userId: "u1",
      entityType: "water_entry",
      entityId: "w_temp",
      action: "create",
      payload: { date: "2026-11-26", amountMl: 250 },
      clientTimestamp: 1000,
      version: 1,
      status: "pending",
      retryCount: 0,
    },
    {
      mutationId: "u1",
      userId: "u1",
      entityType: "water_entry",
      entityId: "w_temp",
      action: "update",
      payload: { amountMl: 500 },
      clientTimestamp: 2000,
      version: 1,
      status: "pending",
      retryCount: 0,
    },
  ]);
  assert.equal(coalesced.coalesced.length, 1);
  assert.equal(coalesced.coalesced[0].payload.amountMl, 500);

  console.log("✅ Historical snapshots, body weight merge, TZ boundary & sync contracts passed.");
}

testCleanNewUserAndDemoCleanup();
testDri2023EnergyAndMacros();
testFoodCatalogAndMealMath();
testHistoricalSnapshotsWeightAndSyncContracts();
console.log("\n🎉 ALL NUTRITION & HYDRATION TESTS PASSED!");
