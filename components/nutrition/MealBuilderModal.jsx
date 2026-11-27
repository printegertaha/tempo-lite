"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import TimePickerField from "@/components/ui/TimePickerField";
import HorizontalFormCarousel from "@/components/ui/HorizontalFormCarousel";
import FoodQuantitySelector from "@/components/nutrition/FoodQuantitySelector";
import {
  VERIFIED_FOOD_CATALOG,
  searchFoodCatalog,
} from "@/lib/nutrition/food-catalog";
import {
  calculateIngredientMacros,
  computeMealImpact,
  formatShortFoodNameAr,
  scaleMealIngredients,
  sumMealIngredients,
} from "@/lib/nutrition/meal-planner";
import { localSyncMetaRepo } from "@/lib/local-db";
import {
  Utensils,
  Search,
  Plus,
  Trash2,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Coffee,
  Sun,
  Moon,
  Apple,
  Loader2,
  Bookmark,
  Info,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

const MEAL_CATEGORIES = [
  { id: "breakfast", label: "إفطار", icon: Coffee },
  { id: "lunch", label: "غداء", icon: Sun },
  { id: "dinner", label: "عشاء", icon: Moon },
  { id: "snacks", label: "سناك", icon: Apple },
];

const CAROUSEL_SECTIONS = [
  { id: "basics", title: "١. نوع الوجبة والتوقيت" },
  { id: "foods", title: "٢. اختيار الأطعمة بالجرام" },
  { id: "review", title: "٣. المراجعة والتفاصيل والحفظ" },
];

function getDefaultClockTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export default function MealBuilderModal({
  isOpen,
  onClose,
  mode = "log", // "log" | "edit" | "plan"
  initialMeal = null,
  dailyLogged,
  dailyTargets,
  customFoods = [],
  onSaveCustomFood,
  onSubmitMeal,
  onSaveFavorite,
}) {
  const [mealType, setMealType] = useState("lunch");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("13:00");
  const [notes, setNotes] = useState("");
  const [ingredients, setIngredients] = useState([]);
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);

  const [jumpToSlide, setJumpToSlide] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Direct manual override mode (opt-in only)
  const [manualTotalsMode, setManualTotalsMode] = useState(false);
  const [isRestaurantEstimate, setIsRestaurantEstimate] = useState(false);
  const [basePlanIngredients, setBasePlanIngredients] = useState([]);
  const [manualMacros, setManualMacros] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  // Food search & selection state
  const [searchQuery, setSearchQuery] = useState("");
  const [cachedUsdaFoods, setCachedUsdaFoods] = useState([]);
  const [remoteFoods, setRemoteFoods] = useState([]);
  const [isSearchingUsda, setIsSearchingUsda] = useState(false);
  const [usdaStatusMsg, setUsdaStatusMsg] = useState("");
  const [selectedFood, setSelectedFood] = useState(null);
  const [gramsInput, setGramsInput] = useState("100");

  // Custom user-defined food drawer
  const [showCustomFoodForm, setShowCustomFoodForm] = useState(false);
  const [customFoodDraft, setCustomFoodDraft] = useState({
    nameAr: "",
    preparationLabelAr: "حسب الملصق / تحضير منزلي",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  useEffect(() => {
    if (!isOpen) return;
    localSyncMetaRepo
      .getCachedNutritionFoods()
      .then((rows) => setCachedUsdaFoods(Array.isArray(rows) ? rows : []))
      .catch(() => {});

    if (initialMeal) {
      setMealType(initialMeal.mealType || "lunch");
      setTitle(initialMeal.title || initialMeal.name || "");
      setTime(initialMeal.time || getDefaultClockTime());
      setNotes(initialMeal.notes || "");

      const structuredIngs = Array.isArray(initialMeal.items)
        ? initialMeal.items.filter(
            (it) => it && typeof it === "object" && it.foodId,
          )
        : [];
      setIngredients(structuredIngs);
      setBasePlanIngredients(initialMeal.sourcePlanId ? structuredIngs : []);
      setIsRestaurantEstimate(initialMeal.entrySource === "restaurant");

      if (structuredIngs.length === 0 && Number(initialMeal.calories) > 0) {
        setManualTotalsMode(true);
        setManualMacros({
          calories: String(initialMeal.calories || 0),
          protein: String(initialMeal.protein || 0),
          carbs: String(initialMeal.carbs || 0),
          fat: String(initialMeal.fat || 0),
        });
      } else {
        setManualTotalsMode(false);
        setManualMacros({ calories: "", protein: "", carbs: "", fat: "" });
      }

      if (mode === "edit" || initialMeal.sourcePlanId) {
        setJumpToSlide({ index: 2, nonce: Date.now() });
      } else if (initialMeal.mealType) {
        setJumpToSlide({ index: 1, nonce: Date.now() });
      }
    } else {
      setMealType("lunch");
      setTitle("");
      setTime(getDefaultClockTime());
      setNotes("");
      setIngredients([]);
      setBasePlanIngredients([]);
      setIsRestaurantEstimate(false);
      setManualTotalsMode(false);
      setManualMacros({ calories: "", protein: "", carbs: "", fat: "" });
      setJumpToSlide(null);
    }
    setSelectedFood(null);
    setGramsInput("100");
    setSearchQuery("");
    setUsdaStatusMsg("");
    setSaveAsFavorite(false);
    setShowCustomFoodForm(false);
  }, [isOpen, initialMeal, mode]);

  const combinedCatalog = useMemo(() => {
    const map = new Map();
    for (const f of VERIFIED_FOOD_CATALOG) map.set(f.id, f);
    for (const f of customFoods) if (f?.id) map.set(f.id, f);
    for (const f of cachedUsdaFoods)
      if (f?.id && !map.has(f.id)) map.set(f.id, f);
    for (const f of remoteFoods) if (f?.id && !map.has(f.id)) map.set(f.id, f);
    return Array.from(map.values());
  }, [customFoods, cachedUsdaFoods, remoteFoods]);

  const filteredFoods = useMemo(
    () => searchFoodCatalog(combinedCatalog, searchQuery, "all").slice(0, 30),
    [combinedCatalog, searchQuery],
  );

  const ingredientTotals = useMemo(
    () => sumMealIngredients(ingredients),
    [ingredients],
  );

  const draftTotals = useMemo(() => {
    if (manualTotalsMode) {
      return {
        calories: Math.max(0, Math.round(Number(manualMacros.calories || 0))),
        protein: Math.max(0, Number(manualMacros.protein || 0)),
        carbs: Math.max(0, Number(manualMacros.carbs || 0)),
        fat: Math.max(0, Number(manualMacros.fat || 0)),
      };
    }
    return ingredientTotals;
  }, [manualTotalsMode, manualMacros, ingredientTotals]);

  const previousMealTotals = useMemo(() => {
    if (mode !== "edit" || !initialMeal) return null;
    return {
      calories: Number(initialMeal.calories || 0),
      protein: Number(initialMeal.protein || 0),
      carbs: Number(initialMeal.carbs || 0),
      fat: Number(initialMeal.fat || 0),
    };
  }, [mode, initialMeal]);

  const impact = useMemo(
    () =>
      computeMealImpact({
        dailyLogged: dailyLogged || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
        dailyTargets,
        previousMeal: previousMealTotals,
        draftMeal: draftTotals,
      }),
    [dailyLogged, dailyTargets, previousMealTotals, draftTotals],
  );

  const selectedFoodPreview = useMemo(() => {
    if (
      !selectedFood ||
      selectedFood.source.verificationStatus === "unavailable"
    )
      return null;
    const g = Number(gramsInput);
    if (!Number.isFinite(g) || g <= 0) return null;
    return calculateIngredientMacros(selectedFood, g);
  }, [selectedFood, gramsInput]);

  const handleUsdaSearch = async () => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setUsdaStatusMsg(
        "اكتب كلمتين أو حرفين باللغة الإنجليزية للبحث الإلكتروني.",
      );
      return;
    }
    setIsSearchingUsda(true);
    setUsdaStatusMsg("");
    try {
      const res = await fetch(
        `/api/nutrition/foods/search?q=${encodeURIComponent(q)}`,
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setUsdaStatusMsg(
          json.error ||
            "تعذر البحث الإلكتروني حالياً؛ يمكنك الاعتماد على القائمة المحلية.",
        );
        return;
      }
      const items = Array.isArray(json.items) ? json.items : [];
      setRemoteFoods(items);
      if (items.length > 0) {
        const mergedCache = [...items, ...cachedUsdaFoods].filter(
          (item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx,
        );
        setCachedUsdaFoods(mergedCache);
        void localSyncMetaRepo
          .saveCachedNutritionFoods(mergedCache)
          .catch(() => {});
        setUsdaStatusMsg(`تم العثور على ${items.length} صنف وحفظها محلياً.`);
      } else {
        setUsdaStatusMsg("لم تُسفر عملية البحث عن نتائج مطابقة.");
      }
    } catch {
      setUsdaStatusMsg(
        "لا يوجد اتصال بالإنترنت حالياً — يتم البحث من القائمة المحلية.",
      );
    } finally {
      setIsSearchingUsda(false);
    }
  };

  const handleAddIngredient = () => {
    if (!selectedFoodPreview || selectedFoodPreview.grams <= 0) return;
    setIngredients((prev) => [...prev, selectedFoodPreview]);
    setManualTotalsMode(false);
    setSelectedFood(null);
    setGramsInput("100");
  };

  const handleUpdateIngredientGrams = (ingId, nextGramsRaw) => {
    const g = Number(nextGramsRaw);
    setIngredients((prev) =>
      prev.map((ing) => {
        if (ing.id !== ingId) return ing;
        const safeG = Number.isFinite(g) && g >= 0 ? g : 0;
        return calculateIngredientMacros(
          {
            id: ing.foodId,
            nameAr: ing.nameAr,
            nameEn: ing.nameEn,
            preparationState: ing.preparationState,
            per100g: ing.per100g,
            source: ing.source,
          },
          safeG,
          ing.id,
        );
      }),
    );
  };

  const handleCreateCustomFood = async (e) => {
    e.preventDefault();
    const nameAr = customFoodDraft.nameAr.trim();
    if (!nameAr) return;
    const item = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      nameAr,
      nameEn: nameAr,
      synonyms: [nameAr],
      category: "custom",
      preparationState: "user_defined",
      preparationLabelAr:
        customFoodDraft.preparationLabelAr.trim() || "مُدخل يدوياً",
      per100g: {
        calories: Math.max(0, Number(customFoodDraft.calories || 0)),
        protein: Math.max(0, Number(customFoodDraft.protein || 0)),
        carbs: Math.max(0, Number(customFoodDraft.carbs || 0)),
        fat: Math.max(0, Number(customFoodDraft.fat || 0)),
      },
      source: {
        database: "مُدخل بواسطة المستخدم (غير موثق علمياً)",
        verificationStatus: "user_provided",
      },
    };

    const nextCustom = [item, ...customFoods];
    await onSaveCustomFood?.(nextCustom);
    setCustomFoodDraft({
      nameAr: "",
      preparationLabelAr: "حسب الملصق / تحضير منزلي",
      calories: "",
      protein: "",
      carbs: "",
      fat: "",
    });
    setShowCustomFoodForm(false);
    setSelectedFood(item);
    setGramsInput("100");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!manualTotalsMode && ingredients.length === 0) return;

    const categoryLabel =
      MEAL_CATEGORIES.find((c) => c.id === mealType)?.label || "وجبة";
    const resolvedTitle =
      title.trim() ||
      (ingredients.length > 0
        ? ingredients
            .map((i) => formatShortFoodNameAr(i.nameAr))
            .slice(0, 3)
            .join(" و")
        : categoryLabel);

    const mealObject = {
      ...(initialMeal?.id ? { id: initialMeal.id } : {}),
      ...(mode !== "plan" && initialMeal?.sourcePlanId
        ? { sourcePlanId: initialMeal.sourcePlanId }
        : {}),
      name: resolvedTitle,
      title: resolvedTitle,
      mealType,
      time: time || getDefaultClockTime(),
      calories: draftTotals.calories,
      protein: draftTotals.protein,
      carbs: draftTotals.carbs,
      fat: draftTotals.fat,
      items: manualTotalsMode ? [] : ingredients,
      isEstimated: manualTotalsMode,
      ...(manualTotalsMode
        ? { entrySource: isRestaurantEstimate ? "restaurant" : "estimated" }
        : {}),
      notes: notes.trim(),
    };

    onSubmitMeal(mealObject);
    if (saveAsFavorite && onSaveFavorite) {
      onSaveFavorite({
        ...mealObject,
        id: `fav_${Date.now()}`,
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="wide"
      title={
        mode === "edit"
          ? "تعديل الوجبة"
          : mode === "plan"
            ? "بناء وجبة في خطتك"
            : "بناء وتسجيل وجبة غذائية"
      }
      description="اسحب أفقياً أو تنقّل بين الأقسام لتسجيل الوجبة بسهولة"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-right">
        <HorizontalFormCarousel
          sections={CAROUSEL_SECTIONS}
          resetKey={`${isOpen}-${initialMeal?.id || "new"}`}
          jumpToSlide={jumpToSlide}
          onSlideChange={setCurrentSlide}
        >
          {/* Slide 1: Meal Type, Title & Time */}
          <div className="space-y-5 p-1">
            <div className="space-y-2">
              <span className="block text-sm font-bold text-zinc-200">
                نوع الوجبة
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {MEAL_CATEGORIES.map((c) => {
                  const isSelected = mealType === c.id;
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setMealType(c.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border text-sm font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-teal-500/20 border-teal-500/50 text-teal-200"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="mb-title"
                  className="block text-sm font-semibold text-zinc-300 mb-1.5"
                >
                  اسم الوجبة (اختياري)
                </label>
                <input
                  id="mb-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="يُشتق تلقائياً من المكونات"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-zinc-100"
                />
              </div>
              <div>
                <label
                  htmlFor="mb-time"
                  className="block text-sm font-semibold text-zinc-300 mb-1.5"
                >
                  التوقيت
                </label>
                <TimePickerField
                  id="mb-time"
                  value={time}
                  onChange={(t) => setTime(t)}
                  title="تحديد توقيت الوجبة"
                  className="w-full px-3.5 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-zinc-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setManualTotalsMode(true);
                  setJumpToSlide({ index: 2, nonce: Date.now() });
                }}
                className="text-xs font-bold text-amber-300 hover:text-amber-200 cursor-pointer"
              >
                وجبة مطعم أو إدخال أرقام مباشرة؟
              </button>
            </div>
          </div>

          {/* Slide 2: Food Search & Grams Picker */}
          <div className="space-y-4 p-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-teal-300 flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                <span>قاعدة البيانات الغذائية</span>
              </span>
              <button
                type="button"
                onClick={() => setShowCustomFoodForm((v) => !v)}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{showCustomFoodForm ? "الرجوع للبحث" : "طعام مخصص"}</span>
              </button>
            </div>

            {showCustomFoodForm ? (
              <div className="p-3 rounded-xl bg-zinc-950 border border-cyan-500/30 space-y-2.5">
                <p className="text-[11px] text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>أدخل القيم لكل 100 جم (مُعرّف كمُدخل يدوي):</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="اسم الطعام"
                    value={customFoodDraft.nameAr}
                    onChange={(e) =>
                      setCustomFoodDraft((p) => ({
                        ...p,
                        nameAr: e.target.value,
                      }))
                    }
                    className="px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                  />
                  <input
                    type="text"
                    placeholder="الحالة (مثال: مطبوخ / جاهز)"
                    value={customFoodDraft.preparationLabelAr}
                    onChange={(e) =>
                      setCustomFoodDraft((p) => ({
                        ...p,
                        preparationLabelAr: e.target.value,
                      }))
                    }
                    className="px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="سعرات"
                    value={customFoodDraft.calories}
                    onChange={(e) =>
                      setCustomFoodDraft((p) => ({
                        ...p,
                        calories: e.target.value,
                      }))
                    }
                    className="px-2 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="ب (جم)"
                    value={customFoodDraft.protein}
                    onChange={(e) =>
                      setCustomFoodDraft((p) => ({
                        ...p,
                        protein: e.target.value,
                      }))
                    }
                    className="px-2 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="ك (جم)"
                    value={customFoodDraft.carbs}
                    onChange={(e) =>
                      setCustomFoodDraft((p) => ({
                        ...p,
                        carbs: e.target.value,
                      }))
                    }
                    className="px-2 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="د (جم)"
                    value={customFoodDraft.fat}
                    onChange={(e) =>
                      setCustomFoodDraft((p) => ({ ...p, fat: e.target.value }))
                    }
                    className="px-2 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateCustomFood}
                  disabled={!customFoodDraft.nameAr.trim()}
                  className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  حفظ واختيار الطعام
                </button>
              </div>
            ) : !selectedFood ? (
              <>
                <div className="flex gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث (ترمس، جبنة قريش، بيض، أرز، دجاج)..."
                      className="w-full pr-10 pl-4 py-3 rounded-xl bg-zinc-950 border border-zinc-700 text-sm text-zinc-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUsdaSearch}
                    disabled={isSearchingUsda}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs sm:text-sm font-bold text-zinc-200 shrink-0 cursor-pointer"
                  >
                    {isSearchingUsda ? (
                      <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                    ) : (
                      <Globe className="w-4 h-4 text-teal-400" />
                    )}
                    <span className="hidden sm:inline">بحث إلكتروني</span>
                  </button>
                </div>

                {usdaStatusMsg && (
                  <p className="text-[11px] text-zinc-400 bg-zinc-950/70 px-3 py-1.5 rounded-lg border border-zinc-800">
                    {usdaStatusMsg}
                  </p>
                )}

                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-0.5">
                  {searchQuery.trim().length === 0 ? (
                    <p className="text-xs text-zinc-500 py-4 text-center">
                      اكتب اسم الطعام في خانة البحث أعلاه لعرض النتائج المطابقة.
                    </p>
                  ) : filteredFoods.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-3 text-center">
                      لا توجد نتائج مطابقة. جرّب البحث الإلكتروني أو أضف طعاماً
                      مخصصاً.
                    </p>
                  ) : (
                    filteredFoods.map((food) => {
                      const isUnavailable =
                        food.source.verificationStatus === "unavailable";
                      const isUserProvided =
                        food.source.verificationStatus === "user_provided";
                      return (
                        <button
                          key={food.id}
                          type="button"
                          onClick={() => {
                            setSelectedFood(food);
                            setGramsInput(
                              food.portions?.[0]?.grams
                                ? String(food.portions[0].grams)
                                : "100",
                            );
                          }}
                          className="w-full text-right p-2.5 rounded-xl border transition-all cursor-pointer bg-zinc-950/70 border-zinc-800/80 hover:border-teal-500/40"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-zinc-100 truncate">
                                {formatShortFoodNameAr(food.nameAr)}
                              </div>
                              <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                                <span>{food.preparationLabelAr}</span>
                                {isUserProvided && (
                                  <span className="text-cyan-300">
                                    · مُدخل يدوياً
                                  </span>
                                )}
                              </div>
                            </div>
                            {!isUnavailable && (
                              <div className="text-[11px] font-mono text-amber-400 font-bold shrink-0">
                                {food.per100g.calories} kcal/100جم
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            ) : selectedFood.source.verificationStatus === "unavailable" ? (
              <div className="p-4 rounded-2xl bg-[#0c151c] border border-teal-500/35 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-amber-200">
                    {selectedFood.nameAr} — غير متاح كقيمة موحدة
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedFood(null)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold cursor-pointer"
                  >
                    إلغاء والعودة للبحث
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomFoodDraft((p) => ({
                      ...p,
                      nameAr: selectedFood.nameAr,
                    }));
                    setShowCustomFoodForm(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600/20 border border-cyan-500/40 text-cyan-200 text-xs font-bold cursor-pointer"
                >
                  إدخال قيم مخصصة لهذا الطبق
                </button>
              </div>
            ) : (
              <FoodQuantitySelector
                food={selectedFood}
                gramsInput={gramsInput}
                setGramsInput={setGramsInput}
                preview={selectedFoodPreview}
                onAdd={handleAddIngredient}
                onCancel={() => setSelectedFood(null)}
              />
            )}

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
              <span className="text-zinc-400">
                المكونات المضافة:{" "}
                <b className="text-teal-300 font-mono">{ingredients.length}</b>
              </span>
              <button
                type="button"
                onClick={() => setJumpToSlide({ index: 2, nonce: Date.now() })}
                className="inline-flex items-center gap-1 text-teal-300 hover:text-teal-200 font-bold cursor-pointer"
              >
                <span>المراجعة والحفظ</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Slide 3: Review Ingredients / Manual Estimate & Save Details */}
          <div className="space-y-3.5">
            {ingredients.length > 0 && !manualTotalsMode && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-zinc-200">
                    مكونات الوجبة ({ingredients.length})
                  </span>
                  {basePlanIngredients.length > 0 && mode === "log" && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-zinc-400">
                        نسبة التناول:
                      </span>
                      {[0.5, 0.75, 1].map((ratio) => (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() =>
                            setIngredients(
                              scaleMealIngredients(basePlanIngredients, ratio),
                            )
                          }
                          className="px-2 py-0.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-[11px] font-mono font-bold text-teal-300 cursor-pointer"
                        >
                          {Math.round(ratio * 100)}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {ingredients.map((ing) => (
                    <div
                      key={ing.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-zinc-100 truncate">
                          {formatShortFoodNameAr(ing.nameAr)}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400">
                          {ing.calories} kcal · ب:{ing.protein} · ك:{ing.carbs}{" "}
                          · د:{ing.fat}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          min="1"
                          max="3000"
                          value={ing.grams}
                          onChange={(e) =>
                            handleUpdateIngredientGrams(ing.id, e.target.value)
                          }
                          className="w-18 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                          aria-label={`وزن ${ing.nameAr} بالجرام`}
                        />
                        <span className="text-[11px] text-zinc-400">جم</span>
                        <button
                          type="button"
                          onClick={() =>
                            setIngredients((prev) =>
                              prev.filter((x) => x.id !== ing.id),
                            )
                          }
                          className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                          aria-label={`حذف ${ing.nameAr}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Manual / Restaurant Mode */}
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualTotalsMode}
                  onChange={(e) => setManualTotalsMode(e.target.checked)}
                  className="accent-teal-500"
                />
                <span>إدخال السعرات والماكروز مباشرة (بدون قائمة مكونات)</span>
              </label>

              {manualTotalsMode && (
                <div className="space-y-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/25">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-amber-300 font-semibold">
                      تُوسَم هذه الوجبة كـ «تقدير تقريبي».
                    </span>
                    <label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRestaurantEstimate}
                        onChange={(e) =>
                          setIsRestaurantEstimate(e.target.checked)
                        }
                        className="accent-amber-500"
                      />
                      <span>وجبة مطعم / تيك أواي</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        السعرات
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={manualMacros.calories}
                        onChange={(e) =>
                          setManualMacros((p) => ({
                            ...p,
                            calories: e.target.value,
                          }))
                        }
                        placeholder="0"
                        className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        ب (جم)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        required
                        value={manualMacros.protein}
                        onChange={(e) =>
                          setManualMacros((p) => ({
                            ...p,
                            protein: e.target.value,
                          }))
                        }
                        placeholder="0"
                        className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        ك (جم)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        required
                        value={manualMacros.carbs}
                        onChange={(e) =>
                          setManualMacros((p) => ({
                            ...p,
                            carbs: e.target.value,
                          }))
                        }
                        placeholder="0"
                        className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        د (جم)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        required
                        value={manualMacros.fat}
                        onChange={(e) =>
                          setManualMacros((p) => ({
                            ...p,
                            fat: e.target.value,
                          }))
                        }
                        placeholder="0"
                        className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {impact.remaining && (
              <div className="p-2.5 rounded-xl bg-[#0c151c] border border-teal-500/25 text-[11px] text-zinc-300">
                بعد هذه الوجبة: متبقي{" "}
                <b className="font-mono text-amber-300">
                  {impact.remaining.calories} kcal
                </b>{" "}
                · ب:{" "}
                <b className="font-mono text-emerald-400">
                  {impact.remaining.protein} جم
                </b>
              </div>
            )}

            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية (اختياري)"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
            />

            {mode !== "plan" && onSaveFavorite && (
              <label className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAsFavorite}
                  onChange={(e) => setSaveAsFavorite(e.target.checked)}
                  className="accent-teal-500"
                />
                <Bookmark className="w-3.5 h-3.5 text-teal-400" />
                <span>حفظ في الوجبات المفضلة لإعادة استخدامها لاحقاً</span>
              </label>
            )}
          </div>
        </HorizontalFormCarousel>

        {/* Sticky Live Summary & Submit Footer */}
        <div className="sticky -bottom-5 sm:-bottom-6 z-20 -mx-5 sm:-mx-7 px-5 sm:px-7 py-3.5 bg-[#0c0e17]/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800">
          <div className="text-sm font-mono text-zinc-200">
            <b className="text-amber-400">{draftTotals.calories} kcal</b> · ب:{" "}
            <b className="text-emerald-400">{draftTotals.protein}</b> · ك:{" "}
            <b className="text-cyan-400">{draftTotals.carbs}</b> · د:{" "}
            <b className="text-orange-400">{draftTotals.fat}</b>
          </div>

          <div className="flex items-center gap-2.5 mr-auto">
            {currentSlide > 0 ? (
              <button
                type="button"
                onClick={() =>
                  setJumpToSlide({ index: currentSlide - 1, nonce: Date.now() })
                }
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-sm font-semibold text-zinc-200 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>السابق</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                إلغاء
              </button>
            )}

            {currentSlide < CAROUSEL_SECTIONS.length - 1 ? (
              <button
                type="button"
                onClick={() =>
                  setJumpToSlide({ index: currentSlide + 1, nonce: Date.now() })
                }
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold shadow-md shadow-teal-600/30 cursor-pointer"
              >
                <span>التالي</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!manualTotalsMode && ingredients.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-teal-600/30 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {mode === "edit"
                    ? "حفظ التعديلات"
                    : mode === "plan"
                      ? "حفظ في الخطة"
                      : "حفظ الوجبة"}
                </span>
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
