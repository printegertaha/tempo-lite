/**
 * ATHAR — Evidence-Based Nutrition & Hydration Calculation Engine
 *
 * Energy baseline: 2023 National Academies Dietary Reference Intakes (DRI)
 * for Energy — Adult (19+ years) Estimated Energy Requirement (EER) equations.
 * Macronutrients: National Academies AMDR + ISSN position stand for active/training adults.
 * Hydration: National Academies Adequate Intake (AI) for total water vs. beverage fraction.
 */

export type BiologicalSex = "male" | "female" | "prefer_not_to_say";
export type ActivityLevel = "inactive" | "low_active" | "active" | "very_active";
export type FitnessGoal = "maintain" | "lose" | "gain";
export type TrainingLevel = "none" | "recreational" | "strength_endurance";
export type TargetCalculationMode = "auto" | "manual";

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterLiters: number;
}

export interface NutritionProfile {
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  birthDate?: string | null;
  biologicalSex: BiologicalSex | null;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
  rateKgPerWeek: number; // 0 for maintain, 0.25 or 0.5 for lose, 0.2 or 0.35 for gain
  trainingLevel: TrainingLevel;
  hasMedicalRestriction: boolean;
  isPregnantOrBreastfeeding: boolean;
  hotClimate: boolean;
  mode: TargetCalculationMode;
  manualTargets?: Partial<NutritionTargets> | null;
  customMacroOverrides?: {
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
  } | null;
  waterLitersOverride?: number | null;
  weightConfirmedAt?: string | null;
  updatedAt?: string | null;
}

export interface ActivityDefinition {
  id: ActivityLevel;
  labelAr: string;
  descriptionAr: string;
  examplesAr: string;
}

export const ACTIVITY_LEVELS: ActivityDefinition[] = [
  {
    id: "inactive",
    labelAr: "قليل الحركة (Inactive)",
    descriptionAr: "نشاط يومي أساسي فقط مع جلوس معظم اليوم.",
    examplesAr: "عمل مكتبي، تنقل بالسيارة، مشي يومي خفيف أقل من ~30 دقيقة.",
  },
  {
    id: "low_active",
    labelAr: "نشاط منخفض (Low Active)",
    descriptionAr: "حركة يومية خفيفة إلى متوسطة بالإضافة للأنشطة المعتادة.",
    examplesAr: "مشي ~30–60 دقيقة يومياً أو مهام منزلية/عملية تتطلب وقوفاً وحركة.",
  },
  {
    id: "active",
    labelAr: "نشيط (Active)",
    descriptionAr: "حركة يومية ملحوظة طوال اليوم أو تمرين منتظم مع نمط حياة متحرك.",
    examplesAr: "مشي ~60–120 دقيقة يومياً أو عمل ميداني أو تمرين بدني منتظم.",
  },
  {
    id: "very_active",
    labelAr: "عالي النشاط (Very Active)",
    descriptionAr: "مجهود بدني مرتفع ومستمر طوال اليوم.",
    examplesAr: "عمل بدني شاق أو تدريب رياضي مكثف لفترات طويلة يومياً.",
  },
];

export const GOAL_OPTIONS: Array<{
  id: FitnessGoal;
  labelAr: string;
  defaultRateKgPerWeek: number;
  rates: Array<{ value: number; labelAr: string; dailyDeltaKcal: number }>;
}> = [
  {
    id: "maintain",
    labelAr: "ثبات الوزن",
    defaultRateKgPerWeek: 0,
    rates: [{ value: 0, labelAr: "ثبات الوزن (0 كجم/أسبوع)", dailyDeltaKcal: 0 }],
  },
  {
    id: "lose",
    labelAr: "نزول الوزن (عجز معتدل)",
    defaultRateKgPerWeek: 0.25,
    rates: [
      { value: 0.25, labelAr: "هادئ ومستدام (~0.25 كجم/أسبوع · −275 سعرة)", dailyDeltaKcal: -275 },
      { value: 0.5, labelAr: "معتدل (~0.5 كجم/أسبوع · −550 سعرة)", dailyDeltaKcal: -550 },
    ],
  },
  {
    id: "gain",
    labelAr: "زيادة الوزن / الكتلة (فائض محسوب)",
    defaultRateKgPerWeek: 0.2,
    rates: [
      { value: 0.2, labelAr: "نظيف وهادئ (~0.2 كجم/أسبوع · +220 سعرة)", dailyDeltaKcal: 220 },
      { value: 0.35, labelAr: "معتدل (~0.35 كجم/أسبوع · +385 سعرة)", dailyDeltaKcal: 385 },
    ],
  },
];

export interface NutritionCalculationBreakdown {
  ready: boolean;
  mode: TargetCalculationMode;
  eligibility: {
    eligibleForAutoEer: boolean;
    reasonCode:
      | "OK"
      | "INCOMPLETE_PROFILE"
      | "UNDER_19"
      | "SEX_UNDISCLOSED"
      | "SPECIAL_CONDITION"
      | "MANUAL_MODE";
    messageAr: string;
  };
  targets: NutritionTargets | null;
  maintenanceEerKcal: number | null;
  goalDeltaKcal: number;
  safetyFloorApplied: boolean;
  proteinGramsPerKg: number | null;
  macroEnergyCheck: {
    proteinKcal: number;
    carbsKcal: number;
    fatKcal: number;
    totalFromMacrosKcal: number;
    proteinPct: number;
    carbsPct: number;
    fatPct: number;
    conflicts: string[];
  } | null;
  hydrationDetails: {
    totalWaterAiReferenceLiters: number | null;
    beverageFractionBaseLiters: number | null;
    activityAdjustmentLiters: number;
    climateAdjustmentLiters: number;
    recommendedBeverageLiters: number | null;
    noteAr: string;
  };
  methodologyNotesAr: string[];
  limitationsAr: string[];
}

export function createEmptyNutritionProfile(): NutritionProfile {
  return {
    weightKg: null,
    heightCm: null,
    age: null,
    birthDate: null,
    biologicalSex: null,
    activityLevel: "low_active",
    goal: "maintain",
    rateKgPerWeek: 0,
    trainingLevel: "none",
    hasMedicalRestriction: false,
    isPregnantOrBreastfeeding: false,
    hotClimate: false,
    mode: "auto",
    manualTargets: null,
    customMacroOverrides: null,
    waterLitersOverride: null,
    weightConfirmedAt: null,
    updatedAt: null,
  };
}

export function computeAgeFromBirthDate(birthDate?: string | null, referenceDate = new Date()): number | null {
  if (!birthDate) return null;
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return null;
  let age = referenceDate.getFullYear() - parsed.getFullYear();
  const monthDiff = referenceDate.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < parsed.getDate())) {
    age--;
  }
  return age >= 0 && age <= 120 ? age : null;
}

export function resolveProfileAge(profile: Partial<NutritionProfile> | null | undefined): number | null {
  if (!profile) return null;
  if (profile.birthDate) {
    const derived = computeAgeFromBirthDate(profile.birthDate);
    if (derived !== null) return derived;
  }
  const n = Number(profile.age);
  return Number.isFinite(n) && n > 0 && n <= 120 ? Math.floor(n) : null;
}

export function roundToNearestTen(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value / 10) * 10;
}

/**
 * 2023 National Academies DRI Adult (19+) EER equations (kcal/day).
 * Reference: National Academies of Sciences, Engineering, and Medicine (2023),
 * Dietary Reference Intakes for Energy.
 *
 * @param sex "male" | "female"
 * @param activityLevel "inactive" | "low_active" | "active" | "very_active"
 * @param age Age in years (>= 19)
 * @param heightCm Height in cm
 * @param weightKg Weight in kg
 */
export function calculateDri2023AdultEer(params: {
  sex: "male" | "female";
  activityLevel: ActivityLevel;
  age: number;
  heightCm: number;
  weightKg: number;
}): number {
  const { sex, activityLevel, age, heightCm, weightKg } = params;
  if (
    !Number.isFinite(age) ||
    !Number.isFinite(heightCm) ||
    !Number.isFinite(weightKg) ||
    age < 19 ||
    heightCm <= 0 ||
    weightKg <= 0
  ) {
    return 0;
  }

  if (sex === "male") {
    switch (activityLevel) {
      case "inactive":
        return 753.07 - 10.83 * age + 6.5 * heightCm + 14.1 * weightKg;
      case "low_active":
        return 581.47 - 10.83 * age + 8.3 * heightCm + 14.94 * weightKg;
      case "active":
        return 1004.82 - 10.83 * age + 6.52 * heightCm + 15.91 * weightKg;
      case "very_active":
        return -517.88 - 10.83 * age + 15.61 * heightCm + 19.11 * weightKg;
    }
  } else {
    switch (activityLevel) {
      case "inactive":
        return 584.9 - 7.01 * age + 5.72 * heightCm + 11.71 * weightKg;
      case "low_active":
        return 575.77 - 7.01 * age + 6.6 * heightCm + 12.14 * weightKg;
      case "active":
        return 710.25 - 7.01 * age + 6.54 * heightCm + 12.34 * weightKg;
      case "very_active":
        return 511.83 - 7.01 * age + 9.07 * heightCm + 12.56 * weightKg;
    }
  }
}

export function calculateHydrationRecommendation(params: {
  biologicalSex: BiologicalSex | null;
  activityLevel: ActivityLevel;
  hotClimate: boolean;
  waterLitersOverride?: number | null;
}) {
  const { biologicalSex, activityLevel, hotClimate, waterLitersOverride } = params;

  const totalAi =
    biologicalSex === "male" ? 3.7 : biologicalSex === "female" ? 2.7 : null;
  const beverageBase =
    biologicalSex === "male" ? 3.0 : biologicalSex === "female" ? 2.2 : 2.5;

  const activityAdj =
    activityLevel === "very_active" ? 0.5 : activityLevel === "active" ? 0.25 : 0;
  const climateAdj = hotClimate ? 0.35 : 0;

  const recommended = Math.round((beverageBase + activityAdj + climateAdj) * 10) / 10;
  const override = Number(waterLitersOverride);
  const effective =
    Number.isFinite(override) && override >= 0.5 && override <= 8
      ? Math.round(override * 10) / 10
      : recommended;

  return {
    totalWaterAiReferenceLiters: totalAi,
    beverageFractionBaseLiters: beverageBase,
    activityAdjustmentLiters: activityAdj,
    climateAdjustmentLiters: climateAdj,
    recommendedBeverageLiters: effective,
    noteAr:
      "مرجع الأكاديميات الوطنية (AI) للماء الكلي هو 3.7 لتر للرجال و2.7 لتر للنساء يومياً شاملاً الماء من الطعام والمشروبات (~3.0 لتر و~2.2 لتر من المشروبات). يختلف الاحتياج الفعلي باختلاف النشاط والحرارة وحالة الفرد.",
  };
}

export function buildMacroConsistencyCheck(
  targets: Pick<NutritionTargets, "calories" | "protein" | "carbs" | "fat">
) {
  const proteinKcal = Math.round(targets.protein * 4);
  const carbsKcal = Math.round(targets.carbs * 4);
  const fatKcal = Math.round(targets.fat * 9);
  const totalFromMacrosKcal = proteinKcal + carbsKcal + fatKcal;

  const denom = targets.calories > 0 ? targets.calories : Math.max(1, totalFromMacrosKcal);
  const proteinPct = Math.round((proteinKcal / denom) * 100);
  const carbsPct = Math.round((carbsKcal / denom) * 100);
  const fatPct = Math.round((fatKcal / denom) * 100);

  const conflicts: string[] = [];
  const kcalDiff = totalFromMacrosKcal - targets.calories;
  if (targets.calories > 0 && Math.abs(kcalDiff) > 50) {
    conflicts.push(
      `مجموع سعرات الماكروز (${totalFromMacrosKcal} kcal) يختلف عن السعرات المستهدفة (${targets.calories} kcal) بمقدار ${Math.abs(kcalDiff)} سعرة.`
    );
  }
  if (proteinPct < 10 || proteinPct > 35) {
    conflicts.push(`نسبة البروتين (${proteinPct}%) خارج النطاق المرجعي للبالغين (AMDR: 10%–35%).`);
  }
  if (carbsPct < 45 || carbsPct > 65) {
    conflicts.push(`نسبة الكاربوهيدرات (${carbsPct}%) خارج النطاق المرجعي للبالغين (AMDR: 45%–65%).`);
  }
  if (fatPct < 20 || fatPct > 35) {
    conflicts.push(`نسبة الدهون (${fatPct}%) خارج النطاق المرجعي للبالغين (AMDR: 20%–35%).`);
  }

  return {
    proteinKcal,
    carbsKcal,
    fatKcal,
    totalFromMacrosKcal,
    proteinPct,
    carbsPct,
    fatPct,
    conflicts,
  };
}

const STANDARD_LIMITATIONS_AR = [
  "معادلات DRI 2023 مطوّرة أساساً على بيانات سكانية من الولايات المتحدة وكندا، وتُقدّم كتقدير إحصائي أولي وليس قياساً فسيولوجياً دقيقاً لكل فرد.",
  "لا تُطبّق معادلات البالغين لمن هم دون 19 عاماً، ولا تُطبّق تلقائياً أثناء الحمل أو الرضاعة أو مع الحالات الطبية الخاصة.",
  "أهداف السوائل التقديرية تمثّل السوائل والمشروبات القابلة للتعديل وليست إلزاماً طبياً، وتزداد الحاجة مع الحر والتعرق.",
];

export function calculateNutritionPlan(
  rawProfile: Partial<NutritionProfile> | null | undefined
): NutritionCalculationBreakdown {
  const profile: NutritionProfile = {
    ...createEmptyNutritionProfile(),
    ...(rawProfile || {}),
  };

  const hydrationDetails = calculateHydrationRecommendation({
    biologicalSex: profile.biologicalSex,
    activityLevel: profile.activityLevel,
    hotClimate: Boolean(profile.hotClimate),
    waterLitersOverride: profile.waterLitersOverride,
  });

  // Manual mode check
  if (profile.mode === "manual") {
    const mt = profile.manualTargets;
    const cal = Number(mt?.calories);
    const pro = Number(mt?.protein);
    const carb = Number(mt?.carbs);
    const fat = Number(mt?.fat);
    const water = Number(mt?.waterLiters ?? hydrationDetails.recommendedBeverageLiters);

    const hasValidManual =
      Number.isFinite(cal) &&
      cal > 0 &&
      Number.isFinite(pro) &&
      pro >= 0 &&
      Number.isFinite(carb) &&
      carb >= 0 &&
      Number.isFinite(fat) &&
      fat >= 0 &&
      Number.isFinite(water) &&
      water > 0;

    if (!hasValidManual) {
      return {
        ready: false,
        mode: "manual",
        eligibility: {
          eligibleForAutoEer: false,
          reasonCode: "MANUAL_MODE",
          messageAr: "الوضع اليدوي مُفعّل — يرجى إدخال أهدافك اليومية للسعرات والماكروز والماء.",
        },
        targets: null,
        maintenanceEerKcal: null,
        goalDeltaKcal: 0,
        safetyFloorApplied: false,
        proteinGramsPerKg: null,
        macroEnergyCheck: null,
        hydrationDetails,
        methodologyNotesAr: [
          "أنت تستخدم أهدافاً يدوية مخصّصة بالكامل حسب خطتك أو توصية المختص.",
        ],
        limitationsAr: STANDARD_LIMITATIONS_AR,
      };
    }

    const manualTargets: NutritionTargets = {
      calories: Math.round(cal),
      protein: Math.round(pro),
      carbs: Math.round(carb),
      fat: Math.round(fat),
      waterLiters: Math.round(water * 10) / 10,
    };

    return {
      ready: true,
      mode: "manual",
      eligibility: {
        eligibleForAutoEer: false,
        reasonCode: "MANUAL_MODE",
        messageAr: "تُستخدم الأهداف اليدوية المُدخلة من قِبلك.",
      },
      targets: manualTargets,
      maintenanceEerKcal: null,
      goalDeltaKcal: 0,
      safetyFloorApplied: false,
      proteinGramsPerKg:
        profile.weightKg && profile.weightKg > 0
          ? Math.round((manualTargets.protein / profile.weightKg) * 100) / 100
          : null,
      macroEnergyCheck: buildMacroConsistencyCheck(manualTargets),
      hydrationDetails,
      methodologyNotesAr: [
        "الأهداف اليومية الحالية محددة يدوياً بواسطتك بدلاً من الحساب التلقائي.",
      ],
      limitationsAr: STANDARD_LIMITATIONS_AR,
    };
  }

  // Check auto eligibility
  const age = resolveProfileAge(profile);
  const weightKg = Number(profile.weightKg);
  const heightCm = Number(profile.heightCm);

  if (profile.isPregnantOrBreastfeeding || profile.hasMedicalRestriction) {
    return {
      ready: false,
      mode: "auto",
      eligibility: {
        eligibleForAutoEer: false,
        reasonCode: "SPECIAL_CONDITION",
        messageAr:
          "في حالات الحمل أو الرضاعة أو الظروف الصحية الخاصة لا تُطبَّق المعادلات العامة تلقائياً. يمكنك إدخال الأهداف الموصى بها من طبيبك في الوضع اليدوي.",
      },
      targets: null,
      maintenanceEerKcal: null,
      goalDeltaKcal: 0,
      safetyFloorApplied: false,
      proteinGramsPerKg: null,
      macroEnergyCheck: null,
      hydrationDetails,
      methodologyNotesAr: [],
      limitationsAr: STANDARD_LIMITATIONS_AR,
    };
  }

  if (profile.biologicalSex === "prefer_not_to_say") {
    return {
      ready: false,
      mode: "auto",
      eligibility: {
        eligibleForAutoEer: false,
        reasonCode: "SEX_UNDISCLOSED",
        messageAr:
          "تتطلب معادلات DRI 2023 تحديد الفئة الفسيولوجية للحساب التلقائي؛ يمكنك التبديل للوضع اليدوي لتحديد أهدافك مباشرة دون إدخالها.",
      },
      targets: null,
      maintenanceEerKcal: null,
      goalDeltaKcal: 0,
      safetyFloorApplied: false,
      proteinGramsPerKg: null,
      macroEnergyCheck: null,
      hydrationDetails,
      methodologyNotesAr: [],
      limitationsAr: STANDARD_LIMITATIONS_AR,
    };
  }

  if (
    !profile.biologicalSex ||
    !Number.isFinite(weightKg) ||
    weightKg <= 0 ||
    !Number.isFinite(heightCm) ||
    heightCm <= 0 ||
    age === null
  ) {
    return {
      ready: false,
      mode: "auto",
      eligibility: {
        eligibleForAutoEer: false,
        reasonCode: "INCOMPLETE_PROFILE",
        messageAr:
          "أكمل بياناتك الجسدية (الوزن، الطول، العمر، الفئة الحسابية، ومستوى النشاط) لحساب احتياجك التقديري، أو اختر الوضع اليدوي.",
      },
      targets: null,
      maintenanceEerKcal: null,
      goalDeltaKcal: 0,
      safetyFloorApplied: false,
      proteinGramsPerKg: null,
      macroEnergyCheck: null,
      hydrationDetails,
      methodologyNotesAr: [],
      limitationsAr: STANDARD_LIMITATIONS_AR,
    };
  }

  if (age < 19) {
    return {
      ready: false,
      mode: "auto",
      eligibility: {
        eligibleForAutoEer: false,
        reasonCode: "UNDER_19",
        messageAr:
          "معادلات البالغين (DRI 2023) مخصصة للأعمار 19 عاماً فأكثر فقط. يُرجى استخدام الوضع اليدوي أو استشارة مختص التغذية.",
      },
      targets: null,
      maintenanceEerKcal: null,
      goalDeltaKcal: 0,
      safetyFloorApplied: false,
      proteinGramsPerKg: null,
      macroEnergyCheck: null,
      hydrationDetails,
      methodologyNotesAr: [],
      limitationsAr: STANDARD_LIMITATIONS_AR,
    };
  }

  // 1. Maintenance EER (DRI 2023)
  const rawEer = calculateDri2023AdultEer({
    sex: profile.biologicalSex,
    activityLevel: profile.activityLevel || "low_active",
    age,
    heightCm,
    weightKg,
  });
  const maintenanceEerKcal = roundToNearestTen(rawEer);

  // 2. Conservative goal delta (~7700 kcal per kg body weight change -> 1100 kcal/day per 1 kg/week)
  let requestedRate = Number(profile.rateKgPerWeek);
  let goalDeltaKcal = 0;
  if (profile.goal === "lose") {
    const validLoseRates = [0.25, 0.5];
    if (!validLoseRates.includes(requestedRate)) requestedRate = 0.25;
    goalDeltaKcal = -Math.round((requestedRate * 7700) / 7);
    // Cap deficit at most 25% of maintenance EER to prevent aggressive deficits
    const maxConservativeDeficit = -Math.round(maintenanceEerKcal * 0.25);
    if (goalDeltaKcal < maxConservativeDeficit) {
      goalDeltaKcal = maxConservativeDeficit;
    }
  } else if (profile.goal === "gain") {
    const validGainRates = [0.2, 0.35];
    if (!validGainRates.includes(requestedRate)) requestedRate = 0.2;
    goalDeltaKcal = Math.round((requestedRate * 7700) / 7);
  }

  const safetyFloorKcal = profile.biologicalSex === "male" ? 1500 : 1200;
  const rawTargetCalories = maintenanceEerKcal + goalDeltaKcal;
  const safetyFloorApplied =
    profile.goal === "lose" && rawTargetCalories < safetyFloorKcal;
  const calorieTarget = roundToNearestTen(
    safetyFloorApplied ? safetyFloorKcal : Math.max(1000, rawTargetCalories)
  );

  // 3. Protein g/kg (RDA 0.8 baseline vs ISSN 1.4-2.0 for exercising individuals)
  let proteinPerKg = 0.8;
  if (profile.trainingLevel === "strength_endurance") {
    proteinPerKg = profile.goal === "lose" ? 1.8 : 1.6;
  } else if (profile.trainingLevel === "recreational") {
    proteinPerKg = profile.goal === "lose" ? 1.4 : 1.2;
  } else {
    proteinPerKg = profile.goal === "lose" ? 1.0 : 0.8;
  }

  // Clamp protein within AMDR 10% - 35% of daily energy
  const minProteinAmdr = Math.ceil((calorieTarget * 0.1) / 4);
  const maxProteinAmdr = Math.floor((calorieTarget * 0.35) / 4);
  let proteinGrams = Math.round(weightKg * proteinPerKg);
  proteinGrams = Math.max(minProteinAmdr, Math.min(maxProteinAmdr, proteinGrams));

  // 4. Fat & Carbs within National Academies AMDR (Fat 20-35%, Carbs 45-65%)
  const minFatGrams = Math.ceil((calorieTarget * 0.2) / 9);
  const maxFatGrams = Math.floor((calorieTarget * 0.35) / 9);
  const minCarbGrams = Math.ceil((calorieTarget * 0.45) / 4);
  const maxCarbGrams = Math.floor((calorieTarget * 0.65) / 4);

  let fatGrams = Math.round((calorieTarget * 0.25) / 9);
  fatGrams = Math.max(minFatGrams, Math.min(maxFatGrams, fatGrams));

  let remainingKcal = calorieTarget - proteinGrams * 4 - fatGrams * 9;
  let carbsGrams = Math.round(remainingKcal / 4);

  // Rebalance fat within AMDR [20%, 35%] if carbs fall outside [45%, 65%]
  if (carbsGrams < minCarbGrams) {
    const neededKcal = minCarbGrams * 4;
    const availableNonProtein = calorieTarget - proteinGrams * 4;
    const targetFatKcal = Math.max(minFatGrams * 9, availableNonProtein - neededKcal);
    fatGrams = Math.max(minFatGrams, Math.min(maxFatGrams, Math.round(targetFatKcal / 9)));
    carbsGrams = Math.max(0, Math.round((calorieTarget - proteinGrams * 4 - fatGrams * 9) / 4));
  } else if (carbsGrams > maxCarbGrams) {
    const availableNonProtein = calorieTarget - proteinGrams * 4;
    const targetFatKcal = Math.min(maxFatGrams * 9, availableNonProtein - maxCarbGrams * 4);
    fatGrams = Math.max(minFatGrams, Math.min(maxFatGrams, Math.round(targetFatKcal / 9)));
    carbsGrams = Math.max(0, Math.round((calorieTarget - proteinGrams * 4 - fatGrams * 9) / 4));
  }

  // Apply user custom macro overrides if provided
  const overrides = profile.customMacroOverrides;
  if (overrides) {
    if (overrides.protein !== undefined && overrides.protein !== null && Number.isFinite(Number(overrides.protein))) {
      proteinGrams = Math.max(0, Math.round(Number(overrides.protein)));
    }
    if (overrides.fat !== undefined && overrides.fat !== null && Number.isFinite(Number(overrides.fat))) {
      fatGrams = Math.max(0, Math.round(Number(overrides.fat)));
    }
    if (overrides.carbs !== undefined && overrides.carbs !== null && Number.isFinite(Number(overrides.carbs))) {
      carbsGrams = Math.max(0, Math.round(Number(overrides.carbs)));
    }
  }

  const targets: NutritionTargets = {
    calories: calorieTarget,
    protein: proteinGrams,
    carbs: carbsGrams,
    fat: fatGrams,
    waterLiters: hydrationDetails.recommendedBeverageLiters ?? 2.5,
  };

  const macroEnergyCheck = buildMacroConsistencyCheck(targets);
  const actualProteinPerKg = Math.round((proteinGrams / weightKg) * 100) / 100;

  const methodologyNotesAr = [
    `1. الطاقة التقديرية للمحافظة على الوزن (EER — DRI 2023): ${maintenanceEerKcal} سعرة/يوم بناءً على العمر (${age} سنة)، الطول (${heightCm} سم)، الوزن (${weightKg} كجم)، الفئة الحسابية، ومستوى النشاط اليومي العام.`,
    goalDeltaKcal === 0
      ? `2. هدف السعرات (ثبات الوزن): ${calorieTarget} سعرة/يوم.`
      : `2. هدف السعرات (${profile.goal === "lose" ? "نزول هادئ" : "زيادة محسوبة"}): تعديل ${goalDeltaKcal > 0 ? `+${goalDeltaKcal}` : goalDeltaKcal} سعرة/يوم -> ${calorieTarget} سعرة/يوم${safetyFloorApplied ? ` (تم تطبيق الحد الأدنى الآمن ${safetyFloorKcal} سعرة/يوم)` : ""}.`,
    `3. البروتين: ${actualProteinPerKg} جم/كجم (${proteinGrams} جم · ${macroEnergyCheck.proteinPct}% من الطاقة) وفق توصية RDA للبالغين (0.8 جم/كجم) ونطاق ISSN للرياضيين (1.4–2.0 جم/كجم) ضمن AMDR (10%–35%).`,
    `4. الدهون (${fatGrams} جم · ${macroEnergyCheck.fatPct}% · AMDR 20%–35%) والكاربوهيدرات (${carbsGrams} جم · ${macroEnergyCheck.carbsPct}% · AMDR 45%–65%) متوازنة حسابياً مع إجمالي السعرات (4/4/9 سعرة/جم).`,
    `5. السوائل: نقطة بداية تقديرية ${targets.waterLiters} لتر مشروبات يومياً استناداً إلى مرجع AI للأكاديميات الوطنية (مع احتساب ~20% إضافية عادةً من رطوبة الطعام).`,
  ];

  return {
    ready: true,
    mode: "auto",
    eligibility: {
      eligibleForAutoEer: true,
      reasonCode: "OK",
      messageAr: "تم احتساب أهدافك بناءً على بياناتك الجسدية ومستوى نشاطك.",
    },
    targets,
    maintenanceEerKcal,
    goalDeltaKcal,
    safetyFloorApplied,
    proteinGramsPerKg: actualProteinPerKg,
    macroEnergyCheck,
    hydrationDetails,
    methodologyNotesAr,
    limitationsAr: STANDARD_LIMITATIONS_AR,
  };
}

/**
 * Safely compute progress percentage with division-by-zero protection.
 */
export function computeProgressPercent(logged: number, target: number | null | undefined): number {
  const t = Number(target);
  const l = Number(logged);
  if (!Number.isFinite(t) || t <= 0 || !Number.isFinite(l) || l <= 0) return 0;
  return Math.min(100, Math.round((l / t) * 100));
}
