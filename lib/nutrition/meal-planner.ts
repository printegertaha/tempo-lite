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
            ? `${proteinFood.nameAr} مع ${ings[1].nameAr}`
            : `وجبة غنية بالبروتين: ${proteinFood.nameAr}`,
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
