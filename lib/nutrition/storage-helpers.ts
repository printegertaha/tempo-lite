/**
 * ATHAR — Nutrition Storage, Migration & Snapshot Helpers
 *
 * Ensures zero demo-data leakage for new/empty users while preserving
 * 100% of real user meals, historical target snapshots, and body weight records.
 */

import type { NutritionTargets } from "./calculations";
import type { MealIngredientSnapshot } from "./meal-planner";

export const DEMO_MEAL_IDS = new Set(["m1", "m2", "m3", "m4"]);

export const DEMO_MEAL_SIGNATURES = new Set([
  "إفطار الأبطال الصباحي::550::36",
  "غداء عالي البروتين بعد العمل::780::58",
  "وجبة ما قبل التمرين (Pre-Workout)::280::14",
  "عشاء الاستشفاء الليلي::540::40",
]);

export function isDemoMealRecord(meal: any): boolean {
  if (!meal || typeof meal !== "object") return false;
  const id = String(meal.id || "");
  if (DEMO_MEAL_IDS.has(id)) return true;

  const title = String(meal.title || meal.name || "").trim();
  const sig = `${title}::${Number(meal.calories || 0)}::${Number(meal.protein || 0)}`;
  return DEMO_MEAL_SIGNATURES.has(sig);
}

export function normalizeMealRecord(m: any) {
  const rawItems = Array.isArray(m?.items) ? m.items : [];
  const items: Array<string | MealIngredientSnapshot> = rawItems.filter(
    (it: any) => typeof it === "string" || (it && typeof it === "object")
  );
  const title = String(m?.title || m?.name || "وجبة").trim();
  const rawSnapshot =
    m?.dailyTargetsSnapshot && typeof m.dailyTargetsSnapshot === "object"
      ? m.dailyTargetsSnapshot
      : null;
  const meta =
    rawSnapshot?._meta && typeof rawSnapshot._meta === "object"
      ? rawSnapshot._meta
      : null;

  const sourcePlanId: string | null =
    typeof m?.sourcePlanId === "string" && m.sourcePlanId
      ? m.sourcePlanId
      : typeof meta?.sourcePlanId === "string" && meta.sourcePlanId
        ? meta.sourcePlanId
        : null;

  const entrySourceRaw = m?.entrySource || meta?.entrySource || null;
  const isEstimated = Boolean(
    m?.isEstimated ??
      meta?.isEstimated ??
      (items.length === 0 && Number(m?.calories || 0) > 0)
  );
  const entrySource: "verified" | "user_provided" | "estimated" | "restaurant" =
    entrySourceRaw === "restaurant" ||
    entrySourceRaw === "estimated" ||
    entrySourceRaw === "user_provided" ||
    entrySourceRaw === "verified"
      ? entrySourceRaw
      : isEstimated
        ? "estimated"
        : items.some(
              (it) =>
                typeof it === "object" &&
                it?.source?.verificationStatus === "user_provided"
            )
          ? "user_provided"
          : "verified";

  return {
    id: String(m?.id || ""),
    userId: m?.userId,
    name: title,
    title,
    mealType: String(m?.mealType || "lunch"),
    date: String(m?.date || ""),
    time: m?.time ? String(m.time) : "",
    calories: Number(m?.calories || 0),
    protein: Number(m?.protein || 0),
    carbs: Number(m?.carbs || 0),
    fat: Number(m?.fat || 0),
    notes: m?.notes ? String(m.notes) : "",
    items,
    sourcePlanId,
    isEstimated,
    entrySource,
    dailyTargetsSnapshot: rawSnapshot,
    createdAt: m?.createdAt || null,
    updatedAt: m?.updatedAt || null,
  };
}

export function buildMealSnapshotWithMeta(params: {
  targetsSnapshot: NutritionTargets | Record<string, any> | null;
  sourcePlanId?: string | null;
  isEstimated?: boolean;
  entrySource?: string | null;
}) {
  const { targetsSnapshot, sourcePlanId, isEstimated, entrySource } = params;
  const { _meta: _ignoredMeta, ...cleanBase } =
    targetsSnapshot && typeof targetsSnapshot === "object"
      ? (targetsSnapshot as Record<string, any>)
      : ({} as Record<string, any>);
  const hasTargets = Object.keys(cleanBase).length > 0;
  const hasMeta = Boolean(sourcePlanId || isEstimated || entrySource);
  if (!hasTargets && !hasMeta) return null;
  if (!hasMeta) return cleanBase;

  return {
    ...cleanBase,
    _meta: {
      ...(sourcePlanId ? { sourcePlanId } : {}),
      ...(isEstimated ? { isEstimated: true } : {}),
      ...(entrySource ? { entrySource } : {}),
    },
  };
}

export interface NutritionDayStatus {
  offPlan: boolean;
  reason?: string;
  updatedAt?: string | null;
}

export function getDayStatusForDate(
  dayStatusMap: Record<string, NutritionDayStatus> | null | undefined,
  dateStr: string
): NutritionDayStatus {
  if (!dayStatusMap || typeof dayStatusMap !== "object" || !dateStr) {
    return { offPlan: false, reason: "" };
  }
  const entry = dayStatusMap[dateStr];
  if (!entry || typeof entry !== "object") {
    return { offPlan: false, reason: "" };
  }
  return {
    offPlan: Boolean(entry.offPlan),
    reason: typeof entry.reason === "string" ? entry.reason : "",
    updatedAt: entry.updatedAt || null,
  };
}

export function filterRealMealsOnly(meals: any[]): ReturnType<typeof normalizeMealRecord>[] {
  if (!Array.isArray(meals)) return [];
  return meals.filter((m) => m && !isDemoMealRecord(m)).map(normalizeMealRecord);
}

export function mergeBodyWeights(localWeights: any[], syncedWeights: any[]): any[] {
  const map = new Map<string, any>();
  for (const w of Array.isArray(syncedWeights) ? syncedWeights : []) {
    if (w?.id && Number(w.weightKg) > 0) map.set(w.id, w);
  }
  for (const w of Array.isArray(localWeights) ? localWeights : []) {
    if (w?.id && Number(w.weightKg) > 0 && !map.has(w.id)) {
      map.set(w.id, w);
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const da = String(b?.date || "").localeCompare(String(a?.date || ""));
    if (da !== 0) return da;
    return String(b?.createdAt || "").localeCompare(String(a?.createdAt || ""));
  });
}

export function resolveTargetsForDate(params: {
  dateStr: string;
  todayStr: string;
  currentTargets: NutritionTargets | null;
  targetSnapshots: Record<string, NutritionTargets> | null | undefined;
  mealsForDate?: any[];
}): NutritionTargets | null {
  const { dateStr, todayStr, currentTargets, targetSnapshots, mealsForDate } = params;

  if (dateStr === todayStr) {
    return currentTargets;
  }

  // Historical date: prefer preserved snapshot for that date, then any meal's snapshot from that date.
  // Never invent or retroactively mutate historical dates when no snapshot existed.
  if (targetSnapshots && targetSnapshots[dateStr]) {
    return targetSnapshots[dateStr];
  }

  if (Array.isArray(mealsForDate)) {
    for (const m of mealsForDate) {
      if (m?.dailyTargetsSnapshot && typeof m.dailyTargetsSnapshot === "object") {
        const s = m.dailyTargetsSnapshot;
        if (Number(s.calories) > 0) {
          return {
            calories: Number(s.calories),
            protein: Number(s.protein || 0),
            carbs: Number(s.carbs || 0),
            fat: Number(s.fat || 0),
            waterLiters: Number(s.waterLiters || 0),
          };
        }
      }
    }
  }

  return null;
}

export const EMPTY_NUTRITION_LOGGED = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  waterMl: 0,
  waterLiters: 0,
};
