/**
 * ATHAR — Traceable Food Composition Catalogue
 *
 * All verified items preserve exact per-100g values and source identifiers
 * from USDA FoodData Central (Foundation Foods, SR Legacy, Survey FNDDS).
 *
 * FAO/INFOODS Egyptian Food Composition Tables (National Nutrition Institute, 1996)
 * are print-only reference publications (verified at https://www.fao.org/infoods/infoods/tables-and-databases/egypt/en/)
 * and are not available as an open machine-readable dataset; composite Egyptian dishes
 * without a verified digital composition record are explicitly marked as "unavailable"
 * rather than fabricated.
 */

import { normalizeSearchText } from "@/lib/localization";

export type FoodCategoryId =
  | "legumes"
  | "dairy"
  | "eggs"
  | "poultry_meat"
  | "seafood"
  | "grains_starches"
  | "vegetables"
  | "fruits"
  | "nuts_seeds"
  | "oils_fats"
  | "egyptian_dishes"
  | "custom";

export type FoodVerificationStatus = "verified" | "unavailable" | "user_provided";

export interface FoodPortionOption {
  labelAr: string;
  labelEn: string;
  grams: number;
  sourceNote?: string;
}

export interface FoodCatalogItem {
  id: string;
  nameAr: string;
  nameEn: string;
  synonyms: string[];
  category: FoodCategoryId;
  preparationState: string;
  preparationLabelAr: string;
  ediblePortionNoteAr?: string;
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number | null;
    sodiumMg?: number | null;
  };
  portions?: FoodPortionOption[];
  source: {
    database: string;
    fdcId?: number | string | null;
    dataType?: string | null;
    publishedDate?: string | null;
    verificationStatus: FoodVerificationStatus;
    unavailableReasonAr?: string;
  };
}

export const FOOD_CATEGORIES: Array<{ id: FoodCategoryId; labelAr: string }> = [
  { id: "legumes", labelAr: "البقوليات" },
  { id: "dairy", labelAr: "الألبان ومنتجاتها" },
  { id: "eggs", labelAr: "البيض" },
  { id: "poultry_meat", labelAr: "الدواجن واللحوم" },
  { id: "seafood", labelAr: "الأسماك والمأكولات البحرية" },
  { id: "grains_starches", labelAr: "الحبوب والنشويات" },
  { id: "vegetables", labelAr: "الخضروات" },
  { id: "fruits", labelAr: "الفواكه" },
  { id: "nuts_seeds", labelAr: "المكسرات والبذور" },
  { id: "oils_fats", labelAr: "الزيوت والدهون" },
  { id: "egyptian_dishes", labelAr: "الأطعمة والوصفات المصرية الشائعة" },
  { id: "custom", labelAr: "أطعمة مخصصة (مُدخلة يدوياً)" },
];

export const VERIFIED_FOOD_CATALOG: FoodCatalogItem[] = [
  // 1. البقوليات (Legumes)
  {
    id: "usda_lupins_boiled",
    nameAr: "ترمس مسلوق (بذور ناضجة، مملحة)",
    nameEn: "Lupins, mature seeds, cooked, boiled, with salt",
    synonyms: ["ترمس", "ترمس مسلوق", "lupin", "lupins", "lupini", "termis"],
    category: "legumes",
    preparationState: "boiled",
    preparationLabelAr: "مطبوخ / مسلوق",
    ediblePortionNoteAr: "الجزء المأكول بعد السلق والتمليح (وزن صافٍ).",
    per100g: { calories: 116, protein: 15.6, carbs: 9.29, fat: 2.92, fiber: 2.8, sodiumMg: 240 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 173804,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_fava_beans_boiled",
    nameAr: "فول مدمس / فول مسلوق (بذور ناضجة، مملحة)",
    nameEn: "Broadbeans (fava beans), mature seeds, cooked, boiled, with salt",
    synonyms: ["فول", "فول مدمس", "فول مسلوق", "fava", "broadbeans", "foul", "ful"],
    category: "legumes",
    preparationState: "boiled",
    preparationLabelAr: "مطبوخ / مسلوق",
    ediblePortionNoteAr: "الحبوب المسلوقة دون زيت مضاف.",
    per100g: { calories: 110, protein: 7.6, carbs: 19.6, fat: 0.4, fiber: 5.4, sodiumMg: 241 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 173798,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_lentils_boiled_unsalted",
    nameAr: "عدس مسلوق (بدون ملح)",
    nameEn: "Lentils, mature seeds, cooked, boiled, without salt",
    synonyms: ["عدس", "عدس مسلوق", "عدس مطبوخ", "lentils", "cooked lentils"],
    category: "legumes",
    preparationState: "boiled",
    preparationLabelAr: "مطبوخ / مسلوق (بدون ملح)",
    per100g: { calories: 116, protein: 9.0, carbs: 20.1, fat: 0.4, fiber: 7.9, sodiumMg: 2 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 172421,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_lentils_raw",
    nameAr: "عدس جاف / نيء (غير مطبوخ)",
    nameEn: "Lentils, raw",
    synonyms: ["عدس جاف", "عدس نيء", "lentils raw", "dry lentils"],
    category: "legumes",
    preparationState: "raw_dry",
    preparationLabelAr: "جاف / غير مطبوخ",
    per100g: { calories: 352, protein: 24.6, carbs: 63.4, fat: 1.06, fiber: 10.7, sodiumMg: 6 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 172420,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_chickpeas_boiled",
    nameAr: "حمص مسلوق (مملح)",
    nameEn: "Chickpeas (garbanzo beans), mature seeds, cooked, boiled, with salt",
    synonyms: ["حمص", "حمص الشام", "بليلة حمص", "chickpeas", "garbanzo", "hommos"],
    category: "legumes",
    preparationState: "boiled",
    preparationLabelAr: "مطبوخ / مسلوق",
    per100g: { calories: 164, protein: 8.86, carbs: 27.4, fat: 2.59, fiber: 7.6, sodiumMg: 243 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 173799,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },

  // 2. الألبان ومنتجاتها (Dairy)
  {
    id: "usda_cottage_cheese_lowfat",
    nameAr: "جبنة قريش قليلة الدسم (1% دهن)",
    nameEn: "Cheese, cottage, lowfat, 1% milkfat",
    synonyms: ["جبنة قريش", "جبن قريش", "قريش", "cottage cheese", "areesh"],
    category: "dairy",
    preparationState: "ready",
    preparationLabelAr: "طازجة / جاهزة للأكل",
    ediblePortionNoteAr: "الجبنة القريش المصرية القليلة الدسم تُقارب مرجعياً Cottage Cheese 1%، وقد يختلف الصوديوم حسب المصنع.",
    per100g: { calories: 72, protein: 12.4, carbs: 2.72, fat: 1.02, fiber: 0, sodiumMg: 406 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 173417,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_greek_yogurt_lowfat",
    nameAr: "زبادي يوناني سادة قليل الدسم",
    nameEn: "Yogurt, Greek, plain, lowfat",
    synonyms: ["زبادي يوناني", "يوناني", "greek yogurt", "yogurt"],
    category: "dairy",
    preparationState: "ready",
    preparationLabelAr: "طازج / جاهز",
    per100g: { calories: 73, protein: 9.95, carbs: 3.94, fat: 1.92, fiber: 0, sodiumMg: 34 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 170903,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_yogurt_plain_whole",
    nameAr: "زبادي سادة كامل الدسم",
    nameEn: "Yogurt, plain, whole milk",
    synonyms: ["زبادي", "زبادي بلدي", "روب", "yogurt", "plain yogurt"],
    category: "dairy",
    preparationState: "ready",
    preparationLabelAr: "طازج / جاهز",
    per100g: { calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 170886,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_whole_milk",
    nameAr: "لبن / حليب كامل الدسم (3.25%)",
    nameEn: "Milk, whole, 3.25% milkfat, with added vitamin D",
    synonyms: ["لبن", "حليب", "حليب كامل الدسم", "milk", "whole milk"],
    category: "dairy",
    preparationState: "ready",
    preparationLabelAr: "سائل / جاهز للشرب",
    per100g: { calories: 61, protein: 3.27, carbs: 4.63, fat: 3.2, fiber: 0 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 746782,
      dataType: "Foundation",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_feta_cheese",
    nameAr: "جبنة بيضاء / فيتا",
    nameEn: "Cheese, feta",
    synonyms: ["جبنة بيضاء", "جبنة فيتا", "فيتا", "جبن", "feta", "cheese"],
    category: "dairy",
    preparationState: "ready",
    preparationLabelAr: "جاهزة للأكل",
    per100g: { calories: 265, protein: 14.2, carbs: 3.88, fat: 21.5, fiber: 0, sodiumMg: 1140 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 173420,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },

  // 3. البيض (Eggs)
  {
    id: "usda_egg_whole_raw",
    nameAr: "بيضة كاملة نيئة (بدون قشر)",
    nameEn: "Egg, whole, raw, fresh",
    synonyms: ["بيض", "بيضة", "بيض نيء", "egg", "eggs", "raw egg"],
    category: "eggs",
    preparationState: "raw",
    preparationLabelAr: "نيء (الجزء المأكول بدون قشر)",
    ediblePortionNoteAr: "الوزن محسوب للجزء المأكول بعد إزالة القشر (~50 جم للبيضة الكبيرة).",
    per100g: { calories: 143, protein: 12.6, carbs: 0.72, fat: 9.51, fiber: 0, sodiumMg: 142 },
    portions: [
      { labelAr: "1 بيضة كبيرة (~50 جم)", labelEn: "1 large egg (50g)", grams: 50, sourceNote: "USDA SR Legacy standard large egg edible portion" },
    ],
    source: {
      database: "USDA FoodData Central",
      fdcId: 171287,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_egg_hard_boiled",
    nameAr: "بيض مسلوق كامل (بدون قشر)",
    nameEn: "Egg, whole, cooked, hard-boiled",
    synonyms: ["بيض مسلوق", "بيضة مسلوقة", "boiled egg", "hard boiled egg"],
    category: "eggs",
    preparationState: "boiled",
    preparationLabelAr: "مسلوق بالكامل (بدون قشر)",
    ediblePortionNoteAr: "الوزن محسوب للجزء المأكول بعد التقشير (~50 جم للبيضة الكبيرة).",
    per100g: { calories: 155, protein: 12.6, carbs: 1.12, fat: 10.61, fiber: 0 },
    portions: [
      { labelAr: "1 بيضة مسلوقة (~50 جم)", labelEn: "1 large boiled egg (50g)", grams: 50, sourceNote: "USDA SR Legacy standard large egg edible portion" },
    ],
    source: {
      database: "USDA FoodData Central",
      fdcId: 173424,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },

  // 4. الدواجن واللحوم (Poultry & Meat)
  {
    id: "usda_chicken_breast_raw",
    nameAr: "صدر دجاج بدون جلد وعظم (نيء)",
    nameEn: "Chicken, broilers or fryers, breast, skinless, boneless, meat only, raw",
    synonyms: ["صدور دجاج نيئة", "صدر فراخ ني", "بانيه ني", "chicken breast raw"],
    category: "poultry_meat",
    preparationState: "raw",
    preparationLabelAr: "نيء (بدون جلد وعظم)",
    ediblePortionNoteAr: "اللحم الصافي فقط قبل الطهي (يفقد ~20-25% وزن ماء عند الشوي).",
    per100g: { calories: 120, protein: 22.5, carbs: 0, fat: 2.62, fiber: 0 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 171077,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_chicken_breast_roasted",
    nameAr: "صدر دجاج مشوي بدون جلد (مطبوخ)",
    nameEn: "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
    synonyms: ["صدور دجاج مشوية", "صدر دجاج مطبوخ", "فراخ مشوية", "chicken breast cooked", "roasted chicken"],
    category: "poultry_meat",
    preparationState: "cooked_roasted_skinless",
    preparationLabelAr: "مطبوخ / مشوي بدون جلد",
    ediblePortionNoteAr: "الوزن بعد الطهي وبدون جلد أو عظم.",
    per100g: { calories: 165, protein: 31.02, carbs: 0, fat: 3.57, fiber: 0 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 171477,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_chicken_thigh_skin_on_roasted",
    nameAr: "ورك دجاج بالجلد مشوي (مطبوخ)",
    nameEn: "Chicken, broilers or fryers, thigh, meat and skin, cooked, roasted",
    synonyms: ["ورك دجاج بالجلد", "أوراك فراخ", "chicken thigh skin on"],
    category: "poultry_meat",
    preparationState: "cooked_roasted_skin_on",
    preparationLabelAr: "مطبوخ / مشوي مع الجلد",
    ediblePortionNoteAr: "يشمل اللحم والجلد بدون العظم.",
    per100g: { calories: 232, protein: 23.3, carbs: 0, fat: 14.7, fiber: 0 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 173625,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_chicken_thigh_skinless_roasted",
    nameAr: "ورك دجاج بدون جلد مشوي (مطبوخ)",
    nameEn: "Chicken, broilers or fryers, thigh, meat only, cooked, roasted",
    synonyms: ["ورك دجاج بدون جلد", "فخذ دجاج", "chicken thigh skinless"],
    category: "poultry_meat",
    preparationState: "cooked_roasted_skinless",
    preparationLabelAr: "مطبوخ / مشوي بدون جلد",
    per100g: { calories: 179, protein: 24.8, carbs: 0, fat: 8.15, fiber: 0 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 172388,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_ground_beef_90_raw",
    nameAr: "لحم بقري مفروم قليل الدهن 90% (نيء)",
    nameEn: "Beef, ground, 90% lean meat / 10% fat, raw",
    synonyms: ["لحم مفروم ني", "لحمة مفرومة", "ground beef raw"],
    category: "poultry_meat",
    preparationState: "raw",
    preparationLabelAr: "نيء (90% صافي / 10% دهن)",
    per100g: { calories: 176, protein: 20.0, carbs: 0, fat: 10.0, fiber: 0 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 174030,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_ground_beef_90_cooked",
    nameAr: "لحم بقري مفروم قليل الدهن 90% (مطبوخ)",
    nameEn: "Beef, ground, 90% lean meat / 10% fat, cooked, pan-browned",
    synonyms: ["لحم مفروم مطبوخ", "لحمة مفرومة معصجة", "ground beef cooked"],
    category: "poultry_meat",
    preparationState: "cooked",
    preparationLabelAr: "مطبوخ بدون زيت مضاف",
    per100g: { calories: 214, protein: 25.8, carbs: 0, fat: 11.75, fiber: 0 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 171790,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },

  // 5. الأسماك والمأكولات البحرية (Seafood)
  {
    id: "usda_tuna_fresh_raw",
    nameAr: "تونة طازجة صفراء الزعنفة (نيئة)",
    nameEn: "Fish, tuna, fresh, yellowfin, raw",
    synonyms: ["تونة طازجة", "سمك تونة", "tuna raw", "yellowfin tuna"],
    category: "seafood",
    preparationState: "raw",
    preparationLabelAr: "نيئة / طازجة",
    per100g: { calories: 109, protein: 24.4, carbs: 0, fat: 0.49, fiber: 0 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 175159,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_salmon_cooked",
    nameAr: "سلمون أطلسي مطبوخ (شوي جاف)",
    nameEn: "Fish, salmon, Atlantic, farmed, cooked, dry heat",
    synonyms: ["سلمون", "سمك سلمون", "salmon", "cooked salmon"],
    category: "seafood",
    preparationState: "cooked_dry_heat",
    preparationLabelAr: "مطبوخ (مشوي)",
    per100g: { calories: 206, protein: 22.1, carbs: 0, fat: 12.35, fiber: 0 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 175168,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_tilapia_cooked",
    nameAr: "سمك بلطي مطبوخ (شوي جاف)",
    nameEn: "Fish, tilapia, cooked, dry heat",
    synonyms: ["بلطي", "سمك بلطي", "فيليه بلطي", "tilapia"],
    category: "seafood",
    preparationState: "cooked_dry_heat",
    preparationLabelAr: "مطبوخ / مشوي (فيليه صافٍ بدون عظم)",
    per100g: { calories: 128, protein: 26.15, carbs: 0, fat: 2.65, fiber: 0 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 175177,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_shrimp_cooked",
    nameAr: "جمبري / روبيان مطبوخ (مقشّر)",
    nameEn: "Crustaceans, shrimp, cooked",
    synonyms: ["جمبري", "روبيان", "shrimp", "prawns"],
    category: "seafood",
    preparationState: "cooked",
    preparationLabelAr: "مطبوخ (مقشّر — الجزء المأكول)",
    per100g: { calories: 99, protein: 24.0, carbs: 0.2, fat: 0.28, fiber: 0 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 175180,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },

  // 6. الحبوب والنشويات (Grains & Starches)
  {
    id: "usda_white_rice_cooked",
    nameAr: "أرز أبيض طويل الحبة مطبوخ (بدون سمن/زيت)",
    nameEn: "Rice, white, long-grain, regular, enriched, cooked",
    synonyms: ["رز", "أرز", "أرز أبيض", "أرز مطبوخ", "white rice", "cooked rice"],
    category: "grains_starches",
    preparationState: "cooked",
    preparationLabelAr: "مطبوخ بالماء فقط",
    per100g: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.28, fiber: 0.4 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 168878,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_white_rice_raw",
    nameAr: "أرز أبيض طويل الحبة جاف / نيء",
    nameEn: "Rice, white, long-grain, regular, raw",
    synonyms: ["أرز نيء", "أرز جاف", "رز ني", "raw rice", "dry rice"],
    category: "grains_starches",
    preparationState: "raw_dry",
    preparationLabelAr: "جاف / قبل الطهي",
    per100g: { calories: 365, protein: 7.13, carbs: 80.0, fat: 0.66, fiber: 1.3 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 168877,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_brown_rice_cooked",
    nameAr: "أرز بني طويل الحبة مطبوخ",
    nameEn: "Rice, brown, long-grain, cooked",
    synonyms: ["أرز بني", "أرز بسمتي بني", "brown rice"],
    category: "grains_starches",
    preparationState: "cooked",
    preparationLabelAr: "مطبوخ",
    per100g: { calories: 123, protein: 2.7, carbs: 25.6, fat: 1.0, fiber: 1.6 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 169704,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_oats_dry",
    nameAr: "شوفان كامل الحبة جاف (غير مطبوخ)",
    nameEn: "Cereals, oats, regular and quick, not fortified, dry",
    synonyms: ["شوفان", "oats", "oatmeal", "rolled oats"],
    category: "grains_starches",
    preparationState: "raw_dry",
    preparationLabelAr: "جاف (وزن قبل الطهي)",
    per100g: { calories: 379, protein: 13.2, carbs: 67.7, fat: 6.5, fiber: 10.1 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 173904,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_pita_whole_wheat",
    nameAr: "خبز بيتا / عيش حبوب كاملة (أسمر)",
    nameEn: "Bread, pita, whole-wheat",
    synonyms: ["عيش بلدي", "خبز أسمر", "بيتا قمح كامل", "whole wheat pita", "baladi bread"],
    category: "grains_starches",
    preparationState: "baked",
    preparationLabelAr: "مخبوز جاهز",
    ediblePortionNoteAr: "يُستخدم كمرجع تقريبي لخبز القمح الكامل؛ وزن الرغيف البلدي يختلف محلياً لذا يُفضّل إدخال الوزن بالجرام.",
    per100g: { calories: 262, protein: 9.8, carbs: 55.9, fat: 1.7, fiber: 6.1 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 174916,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_pita_white",
    nameAr: "خبز بيتا / عيش أبيض (شامي)",
    nameEn: "Bread, pita, white, enriched",
    synonyms: ["عيش شامي", "خبز أبيض", "بيتا أبيض", "white pita", "bread"],
    category: "grains_starches",
    preparationState: "baked",
    preparationLabelAr: "مخبوز جاهز",
    per100g: { calories: 275, protein: 9.1, carbs: 55.7, fat: 1.2, fiber: 2.2 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 174915,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_pasta_cooked",
    nameAr: "مكرونة مسلوقة (بدون صلصة أو زيت)",
    nameEn: "Pasta, cooked, unenriched, without added salt",
    synonyms: ["مكرونة مسلوقة", "معكرونة", "باستا", "pasta cooked"],
    category: "grains_starches",
    preparationState: "cooked",
    preparationLabelAr: "مسلوقة",
    per100g: { calories: 160, protein: 5.8, carbs: 30.9, fat: 0.93, fiber: 1.8 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 168928,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_pasta_whole_wheat_dry",
    nameAr: "مكرونة قمح كامل جافة (قبل السلق)",
    nameEn: "Pasta, whole-wheat, dry",
    synonyms: ["مكرونة جافة", "مكرونة قمح كامل", "pasta dry"],
    category: "grains_starches",
    preparationState: "raw_dry",
    preparationLabelAr: "جافة (قبل السلق)",
    per100g: { calories: 352, protein: 13.9, carbs: 73.4, fat: 2.93, fiber: 9.2 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 169738,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_potato_boiled",
    nameAr: "بطاطس مسلوقة (بدون قشر وبدون زيت)",
    nameEn: "Potatoes, boiled, cooked in skin, flesh, without salt",
    synonyms: ["بطاطس", "بطاطس مسلوقة", "بطاطا", "potato", "boiled potato"],
    category: "grains_starches",
    preparationState: "boiled",
    preparationLabelAr: "مسلوقة",
    per100g: { calories: 87, protein: 1.86, carbs: 20.13, fat: 0.1, fiber: 1.8 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 170438,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },

  // 7. الخضروات (Vegetables)
  {
    id: "usda_tomato_raw",
    nameAr: "طماطم طازجة (نيئة)",
    nameEn: "Tomatoes, red, ripe, raw",
    synonyms: ["طماطم", "بندورة", "قوطة", "tomato", "tomatoes"],
    category: "vegetables",
    preparationState: "raw",
    preparationLabelAr: "طازجة",
    per100g: { calories: 18, protein: 0.88, carbs: 3.89, fat: 0.2, fiber: 1.2 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 170457,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_cucumber_raw",
    nameAr: "خيار طازج بالقشر",
    nameEn: "Cucumber, with peel, raw",
    synonyms: ["خيار", "سلطة", "cucumber"],
    category: "vegetables",
    preparationState: "raw",
    preparationLabelAr: "طازج",
    per100g: { calories: 15, protein: 0.65, carbs: 3.63, fat: 0.11, fiber: 0.5 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 168409,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_spinach_raw",
    nameAr: "سبانخ طازجة (نيئة)",
    nameEn: "Spinach, raw",
    synonyms: ["سبانخ", "جرجير وسبانخ", "spinach"],
    category: "vegetables",
    preparationState: "raw",
    preparationLabelAr: "طازجة",
    per100g: { calories: 23, protein: 2.9, carbs: 3.63, fat: 0.39, fiber: 2.2 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 168462,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_broccoli_raw",
    nameAr: "بروكلي طازج (نيء)",
    nameEn: "Broccoli, raw",
    synonyms: ["بروكلي", "broccoli"],
    category: "vegetables",
    preparationState: "raw",
    preparationLabelAr: "طازج",
    per100g: { calories: 34, protein: 2.82, carbs: 6.64, fat: 0.37, fiber: 2.6 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 170379,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },

  // 8. الفواكه (Fruits)
  {
    id: "usda_banana_raw",
    nameAr: "موز طازج (بدون قشر)",
    nameEn: "Bananas, raw",
    synonyms: ["موز", "موزة", "banana", "bananas"],
    category: "fruits",
    preparationState: "raw",
    preparationLabelAr: "طازج (الجزء المأكول)",
    per100g: { calories: 89, protein: 1.09, carbs: 22.84, fat: 0.33, fiber: 2.6 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 173944,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_apple_raw",
    nameAr: "تفاح طازج بالقشر",
    nameEn: "Apples, raw, with skin",
    synonyms: ["تفاح", "تفاحة", "apple", "apples"],
    category: "fruits",
    preparationState: "raw",
    preparationLabelAr: "طازج بالقشر",
    per100g: { calories: 52, protein: 0.26, carbs: 13.81, fat: 0.17, fiber: 2.4 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 171688,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_orange_raw",
    nameAr: "برتقال طازج (بدون قشر)",
    nameEn: "Oranges, raw, all commercial varieties",
    synonyms: ["برتقال", "orange", "oranges"],
    category: "fruits",
    preparationState: "raw",
    preparationLabelAr: "طازج (الجزء المأكول)",
    per100g: { calories: 47, protein: 0.94, carbs: 11.8, fat: 0.12, fiber: 2.4 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 169097,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_dates_medjool",
    nameAr: "تمر مجدول (بدون نوى)",
    nameEn: "Dates, medjool",
    synonyms: ["تمر", "بلح", "تمر مجدول", "dates", "medjool"],
    category: "fruits",
    preparationState: "raw",
    preparationLabelAr: "مجفف طبيعياً (بدون نوى)",
    per100g: { calories: 277, protein: 1.81, carbs: 75.03, fat: 0.15, fiber: 6.7 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 168191,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_strawberries_raw",
    nameAr: "فراولة طازجة",
    nameEn: "Strawberries, raw",
    synonyms: ["فراولة", "strawberries"],
    category: "fruits",
    preparationState: "raw",
    preparationLabelAr: "طازجة",
    per100g: { calories: 32, protein: 0.67, carbs: 7.68, fat: 0.3, fiber: 2.0 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 167762,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_watermelon_raw",
    nameAr: "بطيخ أحمر طازج (اللب بدون قشر)",
    nameEn: "Watermelon, raw",
    synonyms: ["بطيخ", "حبحب", "watermelon"],
    category: "fruits",
    preparationState: "raw",
    preparationLabelAr: "طازج (اللب المأكول)",
    per100g: { calories: 30, protein: 0.61, carbs: 7.55, fat: 0.15, fiber: 0.4 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 167765,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },

  // 9. المكسرات والبذور (Nuts & Seeds)
  {
    id: "usda_almonds_raw",
    nameAr: "لوز نيء (غير مملح)",
    nameEn: "Nuts, almonds",
    synonyms: ["لوز", "مكسرات", "almonds"],
    category: "nuts_seeds",
    preparationState: "raw",
    preparationLabelAr: "نيء / غير محمص",
    per100g: { calories: 579, protein: 21.15, carbs: 21.55, fat: 49.93, fiber: 12.5 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 170567,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_walnuts_raw",
    nameAr: "عين جمل / جوز نيء",
    nameEn: "Nuts, walnuts, english",
    synonyms: ["عين جمل", "جوز", "walnuts"],
    category: "nuts_seeds",
    preparationState: "raw",
    preparationLabelAr: "نيء",
    per100g: { calories: 654, protein: 15.23, carbs: 13.71, fat: 65.21, fiber: 6.7 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 170187,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_peanut_butter_smooth",
    nameAr: "زبدة فول سوداني ناعمة (بدون ملح)",
    nameEn: "Peanut butter, smooth style, without salt",
    synonyms: ["زبدة فول سوداني", "فول سوداني", "peanut butter"],
    category: "nuts_seeds",
    preparationState: "prepared",
    preparationLabelAr: "جاهزة",
    per100g: { calories: 598, protein: 22.2, carbs: 22.3, fat: 51.4, fiber: 5.0 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 172470,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_chia_seeds",
    nameAr: "بذور الشيا الجافة",
    nameEn: "Seeds, chia seeds, dried",
    synonyms: ["شيا", "بذور الشيا", "chia", "chia seeds"],
    category: "nuts_seeds",
    preparationState: "raw_dry",
    preparationLabelAr: "بذور جافة",
    per100g: { calories: 486, protein: 16.5, carbs: 42.1, fat: 30.7, fiber: 34.4 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 170554,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_tahini",
    nameAr: "طحينة سمسم (من سمسم محمص)",
    nameEn: "Seeds, sesame butter, tahini, from roasted and toasted kernels",
    synonyms: ["طحينة", "سمسم", "سلطة طحينة", "tahini", "sesame butter"],
    category: "nuts_seeds",
    preparationState: "prepared",
    preparationLabelAr: "طحينة خام (سمسم مطحون)",
    per100g: { calories: 595, protein: 17.0, carbs: 21.2, fat: 53.8, fiber: 9.3 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 170189,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },

  // 10. الزيوت والدهون (Oils & Fats)
  {
    id: "usda_olive_oil",
    nameAr: "زيت زيتون",
    nameEn: "Oil, olive, salad or cooking",
    synonyms: ["زيت زيتون", "زيت", "olive oil"],
    category: "oils_fats",
    preparationState: "ready",
    preparationLabelAr: "زيت نقي 100%",
    per100g: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 171413,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "usda_butter_salted",
    nameAr: "زبدة طبيعية مملحة",
    nameEn: "Butter, salted",
    synonyms: ["زبدة", "سمن", "butter"],
    category: "oils_fats",
    preparationState: "ready",
    preparationLabelAr: "جاهزة",
    per100g: { calories: 717, protein: 0.85, carbs: 0.06, fat: 81.1, fiber: 0 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 173410,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },

  // 11. الأطعمة والوصفات المصرية الشائعة (Egyptian Foods — Verified vs Unavailable)
  {
    id: "usda_hummus_commercial",
    nameAr: "حمص بالطحينة (جاهز)",
    nameEn: "Hummus, commercial",
    synonyms: ["حمص بالطحينة", "متبل حمص", "hummus"],
    category: "egyptian_dishes",
    preparationState: "prepared",
    preparationLabelAr: "جاهز (بالطحينة والزيت)",
    per100g: { calories: 237, protein: 7.78, carbs: 14.9, fat: 17.1, fiber: 6.0 },
    source: {
      database: "USDA FoodData Central",
      fdcId: 174289,
      dataType: "SR Legacy",
      publishedDate: "2019-04-01",
      verificationStatus: "verified",
    },
  },
  {
    id: "egypt_koshary_unavailable",
    nameAr: "كشري مصري (طبق مركّب)",
    nameEn: "Egyptian Koshary (composite dish)",
    synonyms: ["كشري", "كشري مصري", "koshary", "koshari"],
    category: "egyptian_dishes",
    preparationState: "composite",
    preparationLabelAr: "وصفة مركبة (تختلف نسبها حسب التحضير)",
    per100g: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    source: {
      database: "FAO/INFOODS Egypt 1996 (Print-only)",
      verificationStatus: "unavailable",
      unavailableReasonAr:
        "جداول المعهد القومي للتغذية المصرية (1996) في FAO/INFOODS ورقية غير متاحة كقاعدة بيانات رقمية مفتوحة، ونسب الأرز والمكرونة والعدس والزيت في الكشري تختلف بشدة. يمكنك بناء الكشري بدقة من مكوناته الموثقة (أرز مطبوخ + مكرونة مسلوقة + عدس مسلوق + حمص مسلوق + زيت) أو إضافته كطعام مخصص.",
    },
  },
  {
    id: "egypt_taameya_unavailable",
    nameAr: "طعمية مصرية / فلافل بالفول",
    nameEn: "Egyptian Taameya (fava-bean falafel)",
    synonyms: ["طعمية", "فلافل", "taameya", "falafel"],
    category: "egyptian_dishes",
    preparationState: "fried_composite",
    preparationLabelAr: "مقلية / وصفة مصرية مركبة",
    per100g: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    source: {
      database: "FAO/INFOODS Egypt 1996 (Print-only)",
      verificationStatus: "unavailable",
      unavailableReasonAr:
        "الطعمية المصرية تُحضّر أساساً من الفول المدشوش وتختلف نسبة امتصاص الزيت فيها عن الفلافل الحمصية في USDA (Falafel). أضفها كطعام مخصص بقيم الملصق/تقديرك أو ابحث في USDA عند الرغبة في مقارنة الفلافل بالحمص.",
    },
  },
  {
    id: "egypt_molokhia_unavailable",
    nameAr: "ملوخية مطبوخة",
    nameEn: "Molokhia (Jew's mallow stew)",
    synonyms: ["ملوخية", "molokhia", "mulukhiyah"],
    category: "egyptian_dishes",
    preparationState: "cooked_stew",
    preparationLabelAr: "وصفة مطبوخة بالمرق والثوم والسمن",
    per100g: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    source: {
      database: "FAO/INFOODS Egypt 1996 (Print-only)",
      verificationStatus: "unavailable",
      unavailableReasonAr:
        "لا يتوفر سجل رقمي مفتوح ومُتحقَّق منه للملوخية المطبوخة بسبب عدم توفر جداول مصر الرقمية (1996 ورقية فقط) واختلاف كمية السمن والمرق. يمكنك تسجيلها كطعام مخصص بقيمك.",
    },
  },
  {
    id: "egypt_mahshi_unavailable",
    nameAr: "محشي مشكل (كوسة / باذنجان / ورق عنب)",
    nameEn: "Egyptian Mahshi (stuffed vegetables)",
    synonyms: ["محشي", "ورق عنب", "محشي كوسة", "mahshi"],
    category: "egyptian_dishes",
    preparationState: "cooked_composite",
    preparationLabelAr: "وصفة مركبة",
    per100g: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    source: {
      database: "FAO/INFOODS Egypt 1996 (Print-only)",
      verificationStatus: "unavailable",
      unavailableReasonAr:
        "تختلف السعرات والدهون بدرجة كبيرة حسب نسبة الأرز والزيت/السمن. لا توجد بيانات رقمية موثقة موحدة متاحة؛ يُنصح بإدخال مكوناته أو حفظه كوصفة مخصصة.",
    },
  },
];

export function searchFoodCatalog(
  items: FoodCatalogItem[],
  query: string,
  category: FoodCategoryId | "all" = "all"
): FoodCatalogItem[] {
  const normQ = normalizeSearchText(query);
  return items.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    if (!normQ) return true;
    const haystack = normalizeSearchText(
      [
        item.nameAr,
        item.nameEn,
        item.preparationLabelAr,
        item.preparationState,
        ...item.synonyms,
      ].join(" ")
    );
    return normQ
      .split(/\s+/)
      .filter(Boolean)
      .every((token) => haystack.includes(token));
  });
}
