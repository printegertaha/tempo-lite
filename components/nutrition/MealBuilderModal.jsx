"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import TimePickerField from "@/components/ui/TimePickerField";
import {
  FOOD_CATEGORIES,
  VERIFIED_FOOD_CATALOG,
  searchFoodCatalog,
} from "@/lib/nutrition/food-catalog";
import {
  calculateIngredientMacros,
  computeMealImpact,
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
} from "lucide-react";

const MEAL_CATEGORIES = [
  { id: "breakfast", label: "إفطار الصباح", icon: Coffee },
  { id: "lunch", label: "وجبة الغداء", icon: Sun },
  { id: "dinner", label: "وجبة العشاء", icon: Moon },
  { id: "snacks", label: "سناكس ووجبات خفيفة", icon: Apple },
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

  // Direct manual override mode (opt-in only, starts empty — never hardcoded 650/45/70/15)
  const [manualTotalsMode, setManualTotalsMode] = useState(false);
  const [manualMacros, setManualMacros] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  // Food search & selection state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
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
        ? initialMeal.items.filter((it) => it && typeof it === "object" && it.foodId)
        : [];
      setIngredients(structuredIngs);

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
    } else {
      setMealType("lunch");
      setTitle("");
      setTime(getDefaultClockTime());
      setNotes("");
      setIngredients([]);
      setManualTotalsMode(false);
      setManualMacros({ calories: "", protein: "", carbs: "", fat: "" });
    }
    setSelectedFood(null);
    setGramsInput("100");
    setSearchQuery("");
    setUsdaStatusMsg("");
    setSaveAsFavorite(false);
    setShowCustomFoodForm(false);
  }, [isOpen, initialMeal]);

  const combinedCatalog = useMemo(() => {
    const map = new Map();
    for (const f of VERIFIED_FOOD_CATALOG) map.set(f.id, f);
    for (const f of customFoods) if (f?.id) map.set(f.id, f);
    for (const f of cachedUsdaFoods) if (f?.id && !map.has(f.id)) map.set(f.id, f);
    for (const f of remoteFoods) if (f?.id && !map.has(f.id)) map.set(f.id, f);
    return Array.from(map.values());
  }, [customFoods, cachedUsdaFoods, remoteFoods]);

  const filteredFoods = useMemo(
    () => searchFoodCatalog(combinedCatalog, searchQuery, selectedCategory).slice(0, 30),
    [combinedCatalog, searchQuery, selectedCategory]
  );

  const ingredientTotals = useMemo(() => sumMealIngredients(ingredients), [ingredients]);

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
        dailyLogged: dailyLogged || { calories: 0, protein: 0, carbs: 0, fat: 0 },
        dailyTargets,
        previousMeal: previousMealTotals,
        draftMeal: draftTotals,
      }),
    [dailyLogged, dailyTargets, previousMealTotals, draftTotals]
  );

  const selectedFoodPreview = useMemo(() => {
    if (!selectedFood || selectedFood.source.verificationStatus === "unavailable") return null;
    const g = Number(gramsInput);
    if (!Number.isFinite(g) || g <= 0) return null;
    return calculateIngredientMacros(selectedFood, g);
  }, [selectedFood, gramsInput]);

  const handleUsdaSearch = async () => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setUsdaStatusMsg("اكتب كلمتين أو حرفين باللغة الإنجليزية للبحث في USDA FoodData Central.");
      return;
    }
    setIsSearchingUsda(true);
    setUsdaStatusMsg("");
    try {
      const res = await fetch(`/api/nutrition/foods/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setUsdaStatusMsg(json.error || "تعذر البحث في USDA حالياً؛ يمكنك الاعتماد على القائمة المحلية.");
        return;
      }
      const items = Array.isArray(json.items) ? json.items : [];
      setRemoteFoods(items);
      if (items.length > 0) {
        const mergedCache = [...items, ...cachedUsdaFoods].filter(
          (item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx
        );
        setCachedUsdaFoods(mergedCache);
        void localSyncMetaRepo.saveCachedNutritionFoods(mergedCache).catch(() => {});
        setUsdaStatusMsg(`تم العثور على ${items.length} صنف موثق من ${json.sourceNote} وحفظها محلياً.`);
      } else {
        setUsdaStatusMsg("لم تُسفر عملية البحث في USDA عن نتائج مطابقة.");
      }
    } catch {
      setUsdaStatusMsg("لا يوجد اتصال بالإنترنت حالياً — يتم البحث من القائمة المحلية والمخبأة.");
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
          ing.id
        );
      })
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
      preparationLabelAr: customFoodDraft.preparationLabelAr.trim() || "مُدخل يدوياً",
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
        ? ingredients.map((i) => i.nameAr.split(" (")[0]).slice(0, 3).join(" + ")
        : categoryLabel);

    const mealObject = {
      ...(initialMeal?.id ? { id: initialMeal.id } : {}),
      name: resolvedTitle,
      title: resolvedTitle,
      mealType,
      time: time || getDefaultClockTime(),
      calories: draftTotals.calories,
      protein: draftTotals.protein,
      carbs: draftTotals.carbs,
      fat: draftTotals.fat,
      items: manualTotalsMode ? [] : ingredients,
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
      maxWidth="2xl"
      title={
        mode === "edit"
          ? "تعديل الوجبة وحساب الفرق اليومي"
          : mode === "plan"
            ? "بناء وجبة في خطتك الغذائية"
            : "بناء وتسجيل وجبة غذائية"
      }
      description="اختر الأطعمة الموثقة بالجرام من قاعدة البيانات أو أضف طعاماً مخصصاً"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right max-h-[76vh] overflow-y-auto pl-1">
        {/* Meal Category */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MEAL_CATEGORIES.map((c) => {
            const isSelected = mealType === c.id;
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setMealType(c.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-teal-500/20 border-teal-500/50 text-teal-200"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{c.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Title & Time */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label htmlFor="mb-title" className="block text-xs font-semibold text-zinc-300 mb-1">
              اسم الوجبة (اختياري — يُشتق تلقائياً من المكونات)
            </label>
            <input
              id="mb-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: فطار بالبيض والجبنة القريش والترمس"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
            />
          </div>
          <div>
            <label htmlFor="mb-time" className="block text-xs font-semibold text-zinc-300 mb-1">
              توقيت الوجبة
            </label>
            <TimePickerField
              id="mb-time"
              value={time}
              onChange={(t) => setTime(t)}
              title="تحديد توقيت الوجبة"
              className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
            />
          </div>
        </div>

        {/* Food Database Picker */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5" />
              <span>البحث في قاعدة البيانات الغذائية الموثقة (USDA)</span>
            </span>
            <button
              type="button"
              onClick={() => setShowCustomFoodForm((v) => !v)}
              className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showCustomFoodForm ? "إغلاق نموذج الطعام المخصص" : "إضافة طعام مخصص"}</span>
            </button>
          </div>

          {showCustomFoodForm && (
            <div className="p-3 rounded-xl bg-zinc-950 border border-cyan-500/30 space-y-2.5">
              <p className="text-[11px] text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>تُوسَم الأطعمة المخصصة كـ «بيانات مُدخلة من المستخدم — غير موثّقة علمياً». قيم لكل 100 جم:</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="اسم الطعام بالعربية أو الإنجليزية"
                  value={customFoodDraft.nameAr}
                  onChange={(e) => setCustomFoodDraft((p) => ({ ...p, nameAr: e.target.value }))}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                />
                <input
                  type="text"
                  placeholder="الحالة (مثال: مطبوخ منزلياً / جاهز)"
                  value={customFoodDraft.preparationLabelAr}
                  onChange={(e) =>
                    setCustomFoodDraft((p) => ({ ...p, preparationLabelAr: e.target.value }))
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="سعرات/100جم"
                  value={customFoodDraft.calories}
                  onChange={(e) => setCustomFoodDraft((p) => ({ ...p, calories: e.target.value }))}
                  className="px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="بروتين/100جم"
                  value={customFoodDraft.protein}
                  onChange={(e) => setCustomFoodDraft((p) => ({ ...p, protein: e.target.value }))}
                  className="px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="كارب/100جم"
                  value={customFoodDraft.carbs}
                  onChange={(e) => setCustomFoodDraft((p) => ({ ...p, carbs: e.target.value }))}
                  className="px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="دهون/100جم"
                  value={customFoodDraft.fat}
                  onChange={(e) => setCustomFoodDraft((p) => ({ ...p, fat: e.target.value }))}
                  className="px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateCustomFood}
                disabled={!customFoodDraft.nameAr.trim()}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                حفظ واختيار الطعام المخصص
              </button>
            </div>
          )}

          {/* Search Bar + USDA Online Query */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالعربية أو الإنجليزية (مثال: ترمس، جبنة قريش، بيض، chicken breast)..."
                className="w-full pr-9 pl-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-100"
              />
            </div>
            <button
              type="button"
              onClick={handleUsdaSearch}
              disabled={isSearchingUsda}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-200 shrink-0 cursor-pointer"
              title="البحث الحي عبر الخادم في USDA FoodData Central"
            >
              {isSearchingUsda ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-teal-400" />
              )}
              <span className="hidden sm:inline">USDA بحث حي</span>
            </button>
          </div>

          {usdaStatusMsg && (
            <p className="text-[11px] text-zinc-400 bg-zinc-950/70 px-3 py-1.5 rounded-lg border border-zinc-800">
              {usdaStatusMsg}
            </p>
          )}

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                  : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
              }`}
            >
              الكل
            </button>
            {FOOD_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                    : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
                }`}
              >
                {cat.labelAr}
              </button>
            ))}
          </div>

          {/* Search Results */}
          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5">
            {filteredFoods.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3 text-center">
                لا توجد نتائج مطابقة محلياً. جرّب «USDA بحث حي» بالإنجليزية أو أضف طعاماً مخصصاً.
              </p>
            ) : (
              filteredFoods.map((food) => {
                const isUnavailable = food.source.verificationStatus === "unavailable";
                const isUserProvided = food.source.verificationStatus === "user_provided";
                const isSelected = selectedFood?.id === food.id;
                return (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => {
                      setSelectedFood(food);
                      setGramsInput(food.portions?.[0]?.grams ? String(food.portions[0].grams) : "100");
                    }}
                    className={`w-full text-right p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-teal-500/15 border-teal-500/50"
                        : "bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-zinc-100 truncate">{food.nameAr}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                            {food.preparationLabelAr}
                          </span>
                          {isUnavailable ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              بيانات رقمية غير متاحة
                            </span>
                          ) : isUserProvided ? (
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              مُدخل يدوياً (غير موثق)
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                              {food.source.dataType || "USDA"} #{food.source.fdcId}
                            </span>
                          )}
                        </div>
                      </div>

                      {!isUnavailable && (
                        <div className="text-[11px] font-mono text-zinc-300 shrink-0 text-left">
                          <div className="font-bold text-amber-400">{food.per100g.calories} kcal</div>
                          <div className="text-[10px] text-zinc-400">
                            P:{food.per100g.protein} · C:{food.per100g.carbs} · F:{food.per100g.fat} /100g
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Selected Food Detail + Gram Selector */}
          {selectedFood && (
            <div className="p-3 rounded-xl bg-[#0c151c] border border-teal-500/30 space-y-2.5">
              {selectedFood.source.verificationStatus === "unavailable" ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{selectedFood.nameAr} — غير متاح كقيمة موثقة موحدة</p>
                      <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                        {selectedFood.source.unavailableReasonAr}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomFoodDraft((p) => ({ ...p, nameAr: selectedFood.nameAr }));
                      setShowCustomFoodForm(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600/20 border border-cyan-500/40 text-cyan-200 text-xs font-bold cursor-pointer"
                  >
                    إدخال قيم مخصصة لهذا الطبق (مُعلّم كمُدخل يدوي)
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-bold text-zinc-100">{selectedFood.nameAr}</div>
                      <div className="text-[10px] text-zinc-400">
                        المصدر: {selectedFood.source.database}
                        {selectedFood.source.fdcId ? ` · FDC ID: ${selectedFood.source.fdcId}` : ""}
                        {selectedFood.source.dataType ? ` (${selectedFood.source.dataType})` : ""}
                      </div>
                      {selectedFood.ediblePortionNoteAr && (
                        <div className="text-[10px] text-teal-300/90 mt-0.5 flex items-center gap-1">
                          <Info className="w-3 h-3 shrink-0" />
                          <span>{selectedFood.ediblePortionNoteAr}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor="mb-grams" className="text-xs font-bold text-zinc-300">
                      الكمية (جم):
                    </label>
                    <input
                      id="mb-grams"
                      type="number"
                      min="1"
                      max="3000"
                      step="1"
                      value={gramsInput}
                      onChange={(e) => setGramsInput(e.target.value)}
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-teal-500/40 text-xs text-zinc-100 font-mono"
                    />
                    {[50, 100, 150, 200].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGramsInput(String(g))}
                        className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[11px] font-mono text-zinc-300 hover:border-teal-500/40 cursor-pointer"
                      >
                        {g}g
                      </button>
                    ))}
                    {selectedFood.portions?.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setGramsInput(String(p.grams))}
                        className="px-2 py-1 rounded-lg bg-teal-500/15 border border-teal-500/30 text-[11px] text-teal-200 cursor-pointer"
                      >
                        {p.labelAr}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddIngredient}
                      disabled={!selectedFoodPreview}
                      className="mr-auto flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة للوجبة</span>
                    </button>
                  </div>

                  {selectedFoodPreview && (
                    <div className="text-[11px] font-mono text-zinc-300 flex flex-wrap gap-3 pt-1 border-t border-zinc-800/80">
                      <span>السعرات: <b className="text-amber-400">{selectedFoodPreview.calories} kcal</b></span>
                      <span>بروتين: <b className="text-emerald-400">{selectedFoodPreview.protein}g</b></span>
                      <span>كارب: <b className="text-cyan-400">{selectedFoodPreview.carbs}g</b></span>
                      <span>دهون: <b className="text-orange-400">{selectedFoodPreview.fat}g</b></span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Selected Ingredients List */}
        {ingredients.length > 0 && !manualTotalsMode && (
          <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-2">
            <div className="text-xs font-bold text-zinc-200">مكونات الوجبة ({ingredients.length})</div>
            <div className="space-y-2">
              {ingredients.map((ing) => (
                <div
                  key={ing.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-zinc-100 truncate">{ing.nameAr}</div>
                    <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                      {ing.calories} kcal · P:{ing.protein}g · C:{ing.carbs}g · F:{ing.fat}g
                      {ing.source?.fdcId ? ` · #${ing.source.fdcId}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min="1"
                      max="3000"
                      value={ing.grams}
                      onChange={(e) => handleUpdateIngredientGrams(ing.id, e.target.value)}
                      className="w-20 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                      aria-label={`وزن ${ing.nameAr} بالجرام`}
                    />
                    <span className="text-[11px] text-zinc-400">جم</span>
                    <button
                      type="button"
                      onClick={() => setIngredients((prev) => prev.filter((x) => x.id !== ing.id))}
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

        {/* Opt-in Direct Macro Override */}
        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-[11px] text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={manualTotalsMode}
              onChange={(e) => setManualTotalsMode(e.target.checked)}
              className="accent-teal-500"
            />
            <span>إدخال إجمالي السعرات والماكروز يدوياً مباشرة (بدون قائمة مكونات)</span>
          </label>

          {manualTotalsMode && (
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">السعرات (kcal)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={manualMacros.calories}
                  onChange={(e) => setManualMacros((p) => ({ ...p, calories: e.target.value }))}
                  placeholder="0"
                  className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">بروتين (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={manualMacros.protein}
                  onChange={(e) => setManualMacros((p) => ({ ...p, protein: e.target.value }))}
                  placeholder="0"
                  className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">كارب (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={manualMacros.carbs}
                  onChange={(e) => setManualMacros((p) => ({ ...p, carbs: e.target.value }))}
                  placeholder="0"
                  className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">دهون (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={manualMacros.fat}
                  onChange={(e) => setManualMacros((p) => ({ ...p, fat: e.target.value }))}
                  placeholder="0"
                  className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Live Totals + Daily Remaining / Edit Delta Impact */}
        <div className="p-3.5 rounded-2xl bg-[#0c151c] border border-teal-500/30 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-teal-300">إجمالي هذه الوجبة</span>
            <span className="font-mono text-zinc-100">
              <b className="text-amber-400">{draftTotals.calories} kcal</b> · P:{" "}
              <b className="text-emerald-400">{draftTotals.protein}g</b> · C:{" "}
              <b className="text-cyan-400">{draftTotals.carbs}g</b> · F:{" "}
              <b className="text-orange-400">{draftTotals.fat}g</b>
            </span>
          </div>

          {mode === "edit" && previousMealTotals && (
            <div className="text-[11px] font-mono text-zinc-400">
              الفرق عن الوجبة السابقة:{" "}
              <span className={impact.delta.calories >= 0 ? "text-amber-300" : "text-emerald-300"}>
                {impact.delta.calories >= 0 ? `+${impact.delta.calories}` : impact.delta.calories} kcal
              </span>{" "}
              · بروتين:{" "}
              <span>
                {impact.delta.protein >= 0 ? `+${impact.delta.protein}` : impact.delta.protein}g
              </span>
            </div>
          )}

          {impact.remaining && (
            <div className="text-[11px] text-zinc-300 pt-1 border-t border-zinc-800/80">
              {impact.remaining.protein > 0
                ? `بعد هذه الوجبة: باقي لك ${impact.remaining.protein}g بروتين و${impact.remaining.calories} سعرة للوصول لهدفك اليومي.`
                : `بعد هذه الوجبة: إجمالي السعرات المتوقع ${impact.projectedLogged.calories} / ${dailyTargets.calories} kcal (متبقي ${impact.remaining.calories} kcal).`}
            </div>
          )}
        </div>

        {/* Notes + Favorite Toggle */}
        <div className="space-y-2">
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
              <span>حفظ هذه التركيبة في الوجبات المفضلة لإعادة استخدامها لاحقاً</span>
            </label>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={!manualTotalsMode && ingredients.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-teal-600/30 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {mode === "edit" ? "حفظ التعديلات" : mode === "plan" ? "حفظ في الخطة" : "حفظ الوجبة"}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
