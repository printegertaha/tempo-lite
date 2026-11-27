/**
 * ATHAR — Meal Builder Math, Portion Snapshots & Deterministic Suggestions
 *
 * All nutrient calculations are derived strictly from verified per-100g food records
 * or explicitly user-provided custom foods. Zero hardcoded meal macros or guessed AI values.
 */

import type { FitnessGoal, NutritionTargets } from "./calculations";
import type { FoodCatalogItem } from "./food-catalog";

export interface MealIngredientSnapshot {
  id: string;
  foodId: string;
  nameAr: string;
  nameEn: string;
  grams: number;
  preparationState: string;
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number | null;
  };
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: {
    database: string;
    fdcId?: number | string | null;
    dataType?: string | null;
    verificationStatus: "verified" | "user_provided" | "unavailable";
  };
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealSuggestion {
  id: string;
  titleAr: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snacks";
  reasonAr: string;
  ingredients: MealIngredientSnapshot[];
  totals: MacroTotals;
}

function round1(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.round(val * 10) / 10;
}

export function formatShortFoodNameAr(nameAr: string): string {
  const cleaned = String(nameAr || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(بدون جلد|طويل الحبة|قصير الحبة|بدون سمن\/زيت|بدون زيت|طازج|نيء|مسلوق|مشوي|مطبوخ)\b/g, "")
    .replace(/صدر دجاج/g, "صدر فرخة")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || String(nameAr || "").trim();
}

export function calculateIngredientMacros(
  food: Pick<FoodCatalogItem, "id" | "nameAr" | "nameEn" | "preparationState" | "per100g" | "source">,
  gramsInput: number,
  ingredientId?: string
): MealIngredientSnapshot {
  const grams = Number.isFinite(gramsInput) && gramsInput > 0 ? Math.round(gramsInput * 10) / 10 : 0;
  const factor = grams / 100;

  const cal100 = Number(food.per100g.calories) || 0;
  const pro100 = Number(food.per100g.protein) || 0;
  const carb100 = Number(food.per100g.carbs) || 0;
  const fat100 = Number(food.per100g.fat) || 0;

  return {
    id: ingredientId || `ing_${food.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    foodId: food.id,
    nameAr: food.nameAr,
    nameEn: food.nameEn,
    grams,
    preparationState: food.preparationState,
    per100g: {
      calories: cal100,
      protein: pro100,
      carbs: carb100,
      fat: fat100,
      fiber: food.per100g.fiber ?? null,
    },
    calories: Math.round(cal100 * factor),
    protein: round1(pro100 * factor),
    carbs: round1(carb100 * factor),
    fat: round1(fat100 * factor),
    source: {
      database: food.source.database,
      fdcId: food.source.fdcId ?? null,
      dataType: food.source.dataType ?? null,
      verificationStatus:
        food.source.verificationStatus === "user_provided" ? "user_provided" : "verified",
    },
  };
}

export function sumMealIngredients(ingredients: MealIngredientSnapshot[]): MacroTotals {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  for (const ing of ingredients) {
    calories += Number(ing.calories || 0);
    protein += Number(ing.protein || 0);
    carbs += Number(ing.carbs || 0);
    fat += Number(ing.fat || 0);
  }

  return {
    calories: Math.round(calories),
    protein: round1(protein),
    carbs: round1(carbs),
    fat: round1(fat),
  };
}

export function scaleMealIngredients(
  ingredients: MealIngredientSnapshot[],
  ratio: number
): MealIngredientSnapshot[] {
  if (!Array.isArray(ingredients) || !Number.isFinite(ratio) || ratio <= 0) {
    return [];
  }
  return ingredients.map((ing) =>
    calculateIngredientMacros(
      {
        id: ing.foodId,
        nameAr: ing.nameAr,
        nameEn: ing.nameEn,
        preparationState: ing.preparationState,
        per100g: ing.per100g,
        source: ing.source,
      },
      Math.max(1, Math.round(Number(ing.grams || 0) * ratio * 10) / 10),
      `ing_${ing.foodId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    )
  );
}

export function sumMacroRecords(
  records: Array<Partial<MacroTotals>>
): MacroTotals {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  for (const r of Array.isArray(records) ? records : []) {
    calories += Number(r?.calories || 0);
    protein += Number(r?.protein || 0);
    carbs += Number(r?.carbs || 0);
    fat += Number(r?.fat || 0);
  }
  return {
    calories: Math.round(calories),
    protein: round1(protein),
    carbs: round1(carbs),
    fat: round1(fat),
  };
}

export function computeDailyNutritionSummary(params: {
  dailyTargets: NutritionTargets | null;
  plannedMeals: Array<Partial<MacroTotals> & { id?: string }>;
  actualMeals: Array<Partial<MacroTotals> & { id?: string; sourcePlanId?: string | null }>;
}) {
  const { dailyTargets, plannedMeals, actualMeals } = params;
  const planned = sumMacroRecords(plannedMeals);
  const actual = sumMacroRecords(actualMeals);

  const remaining = dailyTargets
    ? {
        calories: Math.round(dailyTargets.calories - actual.calories),
        protein: round1(dailyTargets.protein - actual.protein),
        carbs: round1(dailyTargets.carbs - actual.carbs),
        fat: round1(dailyTargets.fat - actual.fat),
      }
    : null;

  const planVsActualDiff = {
    calories: Math.round(actual.calories - planned.calories),
    protein: round1(actual.protein - planned.protein),
    carbs: round1(actual.carbs - planned.carbs),
    fat: round1(actual.fat - planned.fat),
  };

  const confirmedPlanIds = new Set<string>();
  for (const m of Array.isArray(actualMeals) ? actualMeals : []) {
    if (typeof m?.sourcePlanId === "string" && m.sourcePlanId) {
      confirmedPlanIds.add(m.sourcePlanId);
    }
  }

  return {
    targets: dailyTargets,
    planned,
    actual,
    remaining,
    planVsActualDiff,
    confirmedPlanIds,
  };
}

export function isPlannedMealConfirmedForDate(
  planId: string,
  actualMealsForDate: Array<{ sourcePlanId?: string | null }>
): boolean {
  if (!planId || !Array.isArray(actualMealsForDate)) return false;
  return actualMealsForDate.some((m) => m?.sourcePlanId === planId);
}

export interface PlannedMealFitResult {
  planTotalsWithCurrent: MacroTotals;
  remainingAfterMeal: MacroTotals | null;
  fitsComfortably: boolean;
  messagesAr: string[];
  proteinBoostSuggestions: Array<{
    food: FoodCatalogItem;
    grams: number;
    snapshot: MealIngredientSnapshot;
  }>;
}

const PROTEIN_BOOST_FOOD_IDS = [
  "usda_cottage_cheese_lowfat",
  "usda_greek_yogurt_lowfat",
  "usda_egg_boiled",
  "usda_chicken_breast_roasted",
];

export function evaluatePlannedMealFit(params: {
  dailyTargets: NutritionTargets | null;
  existingPlannedMeals: Array<Partial<MacroTotals> & { id?: string }>;
  currentMealTotals: MacroTotals;
  editingPlanId?: string | null;
  catalog?: FoodCatalogItem[];
}): PlannedMealFitResult {
  const {
    dailyTargets,
    existingPlannedMeals,
    currentMealTotals,
    editingPlanId = null,
    catalog = [],
  } = params;

  const otherPlanned = (existingPlannedMeals || []).filter(
    (m) => !editingPlanId || m.id !== editingPlanId
  );
  const otherTotals = sumMacroRecords(otherPlanned);

  const planTotalsWithCurrent: MacroTotals = {
    calories: Math.round(otherTotals.calories + Number(currentMealTotals.calories || 0)),
    protein: round1(otherTotals.protein + Number(currentMealTotals.protein || 0)),
    carbs: round1(otherTotals.carbs + Number(currentMealTotals.carbs || 0)),
    fat: round1(otherTotals.fat + Number(currentMealTotals.fat || 0)),
  };

  if (!dailyTargets) {
    return {
      planTotalsWithCurrent,
      remainingAfterMeal: null,
      fitsComfortably: true,
      messagesAr: [],
      proteinBoostSuggestions: [],
    };
  }

  const remainingAfterMeal: MacroTotals = {
    calories: Math.round(dailyTargets.calories - planTotalsWithCurrent.calories),
    protein: round1(dailyTargets.protein - planTotalsWithCurrent.protein),
    carbs: round1(dailyTargets.carbs - planTotalsWithCurrent.carbs),
    fat: round1(dailyTargets.fat - planTotalsWithCurrent.fat),
  };

  const remainingBeforeMealCals = dailyTargets.calories - otherTotals.calories;
  const messagesAr: string[] = [];

  if (remainingAfterMeal.calories < -100) {
    messagesAr.push(
      `الوجبة دي هتتجاوز السعرات اليومية بحوالي ${Math.abs(remainingAfterMeal.calories)} سعرة.`
    );
  } else if (
    remainingBeforeMealCals > 0 &&
    currentMealTotals.calories >= remainingBeforeMealCals * 0.7 &&
    remainingAfterMeal.calories <= 250
  ) {
    messagesAr.push("الوجبة دي هتستهلك معظم السعرات المتبقية ليك.");
  }

  if (remainingAfterMeal.protein >= 15) {
    messagesAr.push(`محتاج تزود البروتين حوالي ${Math.round(remainingAfterMeal.protein)} جم.`);
  }

  if (remainingAfterMeal.calories >= -100 && remainingAfterMeal.protein < 15) {
    messagesAr.push("الوجبة مناسبة لهدفك.");
  }

  const proteinBoostSuggestions: PlannedMealFitResult["proteinBoostSuggestions"] = [];
  if (remainingAfterMeal.protein >= 12 && remainingAfterMeal.calories >= 70 && catalog.length > 0) {
    for (const foodId of PROTEIN_BOOST_FOOD_IDS) {
      const food = catalog.find(
        (f) => f.id === foodId && f.source?.verificationStatus === "verified" && f.per100g.protein > 0
      );
      if (!food) continue;
      const targetPro = Math.min(remainingAfterMeal.protein, 25);
      const rawGrams = (targetPro / food.per100g.protein) * 100;
      const grams = Math.max(40, Math.min(200, Math.round(rawGrams / 10) * 10));
      const snapshot = calculateIngredientMacros(food, grams);
      if (snapshot.calories <= Math.max(120, remainingAfterMeal.calories + 50)) {
        proteinBoostSuggestions.push({ food, grams, snapshot });
      }
      if (proteinBoostSuggestions.length >= 3) break;
    }
  }

  return {
    planTotalsWithCurrent,
    remainingAfterMeal,
    fitsComfortably: remainingAfterMeal.calories >= -100,
    messagesAr,
    proteinBoostSuggestions,
  };
}

export function computeMealImpact(params: {
  dailyLogged: MacroTotals;
  dailyTargets: NutritionTargets | null;
  previousMeal?: MacroTotals | null;
  draftMeal: MacroTotals;
}) {
  const { dailyLogged, dailyTargets, previousMeal, draftMeal } = params;
  const prev = previousMeal || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const delta: MacroTotals = {
    calories: Math.round(draftMeal.calories - prev.calories),
    protein: round1(draftMeal.protein - prev.protein),
    carbs: round1(draftMeal.carbs - prev.carbs),
    fat: round1(draftMeal.fat - prev.fat),
  };

  const projectedLogged: MacroTotals = {
    calories: Math.max(0, Math.round(dailyLogged.calories + delta.calories)),
    protein: Math.max(0, round1(dailyLogged.protein + delta.protein)),
    carbs: Math.max(0, round1(dailyLogged.carbs + delta.carbs)),
    fat: Math.max(0, round1(dailyLogged.fat + delta.fat)),
  };

  const remaining = dailyTargets
    ? {
        calories: Math.round(dailyTargets.calories - projectedLogged.calories),
        protein: round1(dailyTargets.protein - projectedLogged.protein),
        carbs: round1(dailyTargets.carbs - projectedLogged.carbs),
        fat: round1(dailyTargets.fat - projectedLogged.fat),
      }
    : null;

  return {
    delta,
    projectedLogged,
    remaining,
  };
}

function roundGramsToTen(g: number, minG = 30, maxG = 300): number {
  const clamped = Math.max(minG, Math.min(maxG, g));
  return Math.round(clamped / 10) * 10;
}

/**
 * Deterministic meal recommendations calculated purely from verified catalog items
 * and the user's remaining calories/macros.
 */
export function generateSmartMealSuggestions(params: {
  dailyLogged: MacroTotals;
  dailyTargets: NutritionTargets | null;
  goal: FitnessGoal;
  catalog: FoodCatalogItem[];
  excludeIds?: string[];
  vegetarianOnly?: boolean;
}): MealSuggestion[] {
  const { dailyLogged, dailyTargets, catalog, excludeIds = [], vegetarianOnly = false } = params;
  if (!dailyTargets) return [];

  const remaining = {
    calories: dailyTargets.calories - dailyLogged.calories,
    protein: dailyTargets.protein - dailyLogged.protein,
    carbs: dailyTargets.carbs - dailyLogged.carbs,
    fat: dailyTargets.fat - dailyLogged.fat,
  };

  const verifiedPool = catalog.filter(
    (item) =>
      item.source.verificationStatus === "verified" &&
      item.per100g.calories > 0 &&
      !excludeIds.includes(item.id) &&
      (!vegetarianOnly || !["poultry_meat", "seafood"].includes(item.category))
  );

  const byId = (id: string) => verifiedPool.find((f) => f.id === id);
  const suggestions: MealSuggestion[] = [];

  if (remaining.calories <= 80) {
    const cucumber = byId("usda_cucumber_raw");
    const tomato = byId("usda_tomato_raw");
    if (cucumber && tomato) {
      const ings = [
        calculateIngredientMacros(cucumber, 150),
        calculateIngredientMacros(tomato, 120),
      ];
      suggestions.push({
        id: "sug_light_veg",
        titleAr: "سلطة خضروات خفيفة ومنعشة",
        mealType: "snacks",
        reasonAr:
          remaining.calories <= 0
            ? "اقتربت أو وصلت لهدف السعرات اليومي؛ هذا الخيار قليل السعرات وغني بالماء والألياف دون تجاوز كبير."
            : `متبقي ${Math.round(remaining.calories)} سعرة فقط، لذا هذه الإضافة خفيفة ومنخفضة الطاقة.`,
        ingredients: ings,
        totals: sumMealIngredients(ings),
      });
    }
    return suggestions;
  }

  // 1. High protein gap with available calories
  if (remaining.protein >= 18) {
    const chicken = !vegetarianOnly ? byId("usda_chicken_breast_roasted") : null;
    const cottage = byId("usda_cottage_cheese_lowfat");
    const lupins = byId("usda_lupins_boiled");
    const proteinFood = chicken || cottage || lupins;

    if (proteinFood && proteinFood.per100g.protein > 0) {
      const targetProFromFood = Math.min(remaining.protein * 0.75, 42);
      let grams = roundGramsToTen((targetProFromFood / proteinFood.per100g.protein) * 100, 80, 250);
      // Ensure it fits within remaining calories
      const maxGramsForCal = Math.floor((remaining.calories * 0.85 / proteinFood.per100g.calories) * 100);
      if (maxGramsForCal >= 60) {
        grams = Math.min(grams, roundGramsToTen(maxGramsForCal, 60, 250));
      }

      const ings: MealIngredientSnapshot[] = [calculateIngredientMacros(proteinFood, grams)];

      // Add a complementary carb if both carb and calorie room remain
      const proteinCal = ings[0].calories;
      const calAfterPro = remaining.calories - proteinCal;
      const rice = byId("usda_white_rice_cooked");
      const bread = byId("usda_pita_whole_wheat");
      const carbFood = remaining.carbs >= 25 && calAfterPro >= 140 ? rice || bread : null;
      if (carbFood && carbFood.per100g.carbs > 0) {
        const maxCarbG = Math.floor(((calAfterPro * 0.8) / carbFood.per100g.calories) * 100);
        const carbGrams = Math.min(
          roundGramsToTen((Math.min(remaining.carbs * 0.5, 40) / carbFood.per100g.carbs) * 100, 50, 200),
          roundGramsToTen(maxCarbG, 40, 200)
        );
        if (carbGrams >= 40) {
          ings.push(calculateIngredientMacros(carbFood, carbGrams));
        }
      }

      const totals = sumMealIngredients(ings);
      suggestions.push({
        id: "sug_protein_gap",
        titleAr:
          ings.length > 1
            ? `${formatShortFoodNameAr(ings[1].nameAr)} و${formatShortFoodNameAr(proteinFood.nameAr)}`
            : formatShortFoodNameAr(proteinFood.nameAr),
        mealType: "lunch",
        reasonAr: `اختيار مناسب لأنك تحتاج لزيادة البروتين (متبقي ${round1(remaining.protein)} جم) ولديك مساحة سعرات (${Math.round(remaining.calories)} سعرة)، مع بقاء الدهون منخفضة.`,
        ingredients: ings,
        totals,
      });
    }
  }

  // 2. Quick Egyptian plant-protein & dairy combo (boiled lupins + cottage cheese)
  const lupins = byId("usda_lupins_boiled");
  const cottage = byId("usda_cottage_cheese_lowfat");
  if (lupins && cottage && remaining.protein >= 12 && remaining.calories >= 180) {
    const lupinG = remaining.calories >= 300 ? 150 : 100;
    const cottageG = remaining.calories >= 300 ? 120 : 100;
    const ings = [
      calculateIngredientMacros(lupins, lupinG),
      calculateIngredientMacros(cottage, cottageG),
    ];
    const totals = sumMealIngredients(ings);
    if (totals.calories <= remaining.calories + 40) {
      suggestions.push({
        id: "sug_egyptian_protein_snack",
        titleAr: "ترمس مسلوق مع جبنة قريش",
        mealType: "snacks",
        reasonAr: `يغطي ${totals.protein} جم بروتين و${totals.carbs} جم كاربوهيدرات بـ ${totals.calories} سعرة فقط من أصل ${Math.round(remaining.calories)} سعرة متبقية.`,
        ingredients: ings,
        totals,
      });
    }
  }

  // 3. Carb & Energy boost when carbs have room and fat is near cap
  if (remaining.carbs >= 25 && remaining.calories >= 150) {
    const oats = byId("usda_oats_dry");
    const banana = byId("usda_banana_raw");
    const yogurt = byId("usda_greek_yogurt_lowfat");
    if (oats && banana && yogurt) {
      const oatsG = remaining.calories >= 350 ? 50 : 35;
      const bananaG = 100;
      const yogurtG = remaining.protein >= 10 ? 150 : 100;
      const ings = [
        calculateIngredientMacros(yogurt, yogurtG),
        calculateIngredientMacros(oats, oatsG),
        calculateIngredientMacros(banana, bananaG),
      ];
      const totals = sumMealIngredients(ings);
      if (totals.calories <= remaining.calories + 50) {
        suggestions.push({
          id: "sug_carb_energy",
          titleAr: "زبادي يوناني بالشوفان والموز",
          mealType: "breakfast",
          reasonAr: `يمدك بـ ${totals.carbs} جم كاربوهيدرات و${totals.protein} جم بروتين لتعويض المتبقي (${round1(remaining.carbs)} جم كارب متبقية).`,
          ingredients: ings,
          totals,
        });
      }
    }
  }

  // 4. Healthy fats when fat & calorie room remain
  if (remaining.fat >= 12 && remaining.calories >= 180 && suggestions.length < 3) {
    const almonds = byId("usda_almonds_raw");
    const apple = byId("usda_apple_raw");
    if (almonds && apple) {
      const almondG = roundGramsToTen(Math.min(30, (remaining.fat * 0.6 / almonds.per100g.fat) * 100), 15, 35);
      const ings = [
        calculateIngredientMacros(almonds, almondG),
        calculateIngredientMacros(apple, 150),
      ];
      const totals = sumMealIngredients(ings);
      if (totals.calories <= remaining.calories + 30) {
        suggestions.push({
          id: "sug_healthy_fat_snack",
          titleAr: "لوز نيء مع تفاح طازج",
          mealType: "snacks",
          reasonAr: `سناك متوازن يضيف ${totals.fat} جم دهون صحية وألياف في حدود السعرات المتبقية (${Math.round(remaining.calories)} سعرة).`,
          ingredients: ings,
          totals,
        });
      }
    }
  }

  return suggestions.slice(0, 3);
}
