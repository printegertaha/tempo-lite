"use client";

import { useMemo, useState } from "react";
import FoodQuantitySelector from "@/components/nutrition/FoodQuantitySelector";
import {
  VERIFIED_FOOD_CATALOG,
  searchFoodCatalog,
} from "@/lib/nutrition/food-catalog";
import {
  calculateIngredientMacros,
  evaluatePlannedMealFit,
  formatShortFoodNameAr,
  sumMacroRecords,
  sumMealIngredients,
} from "@/lib/nutrition/meal-planner";
import {
  Apple,
  ArrowRight,
  CheckCircle2,
  Coffee,
  Moon,
  Pencil,
  Plus,
  Search,
  Sliders,
  Sparkles,
  Sun,
  Trash2,
  Utensils,
} from "lucide-react";

const MEAL_TYPE_OPTIONS = [
  {
    id: "breakfast",
    label: "الفطار",
    icon: Coffee,
    badgeClass: "text-amber-300 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "lunch",
    label: "الغداء",
    icon: Sun,
    badgeClass: "text-orange-300 bg-orange-500/10 border-orange-500/20",
  },
  {
    id: "dinner",
    label: "العشاء",
    icon: Moon,
    badgeClass: "text-indigo-300 bg-indigo-500/10 border-indigo-500/20",
  },
  {
    id: "snacks",
    label: "سناك",
    icon: Apple,
    badgeClass: "text-lime-300 bg-lime-500/10 border-lime-500/20",
  },
];

export default function InteractiveDietBuilder({
  dailyTargets,
  nutritionPlans = [],
  customFoods = [],
  dietDraft = null,
  onSaveDietDraft,
  onSavePlans,
  onSwitchExperience,
  onEditProfile,
}) {
  const [step, setStep] = useState(() => (dietDraft?.mealType ? 2 : 1));
  const [mealType, setMealType] = useState(() => dietDraft?.mealType || null);
  const [editingPlanId, setEditingPlanId] = useState(
    () => dietDraft?.editingPlanId || null,
  );
  const [title, setTitle] = useState(() => dietDraft?.title || "");
  const [ingredients, setIngredients] = useState(() =>
    Array.isArray(dietDraft?.ingredients) ? dietDraft.ingredients : [],
  );

  // Food search state (progressive disclosure)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState(null);
  const [gramsInput, setGramsInput] = useState("100");

  const combinedCatalog = useMemo(() => {
    const map = new Map();
    for (const f of VERIFIED_FOOD_CATALOG) map.set(f.id, f);
    for (const f of customFoods || []) if (f?.id) map.set(f.id, f);
    return Array.from(map.values());
  }, [customFoods]);

  const filteredFoods = useMemo(
    () => searchFoodCatalog(combinedCatalog, searchQuery, "all").slice(0, 20),
    [combinedCatalog, searchQuery],
  );

  const currentTotals = useMemo(
    () => sumMealIngredients(ingredients),
    [ingredients],
  );
  const fullPlanTotals = useMemo(
    () => sumMacroRecords(nutritionPlans),
    [nutritionPlans],
  );

  const fit = useMemo(
    () =>
      evaluatePlannedMealFit({
        dailyTargets,
        existingPlannedMeals: nutritionPlans,
        currentMealTotals: currentTotals,
        editingPlanId,
        catalog: combinedCatalog,
      }),
    [
      dailyTargets,
      nutritionPlans,
      currentTotals,
      editingPlanId,
      combinedCatalog,
    ],
  );

  const selectedFoodPreview = useMemo(() => {
    if (
      !selectedFood ||
      selectedFood.source?.verificationStatus === "unavailable"
    )
      return null;
    const g = Number(gramsInput);
    if (!Number.isFinite(g) || g <= 0) return null;
    return calculateIngredientMacros(selectedFood, g);
  }, [selectedFood, gramsInput]);

  const persistBuilderDraft = (patch) => {
    const next = {
      mealType,
      editingPlanId,
      title,
      ingredients,
      ...patch,
    };
    void onSaveDietDraft?.(next);
  };

  const handleSelectMealType = (typeId) => {
    setMealType(typeId);
    setStep(2);
    persistBuilderDraft({ mealType: typeId });
  };

  const handleAddSelectedFood = () => {
    if (!selectedFoodPreview) return;
    const nextIngs = [...ingredients, selectedFoodPreview];
    setIngredients(nextIngs);
    setSelectedFood(null);
    setGramsInput("100");
    persistBuilderDraft({ ingredients: nextIngs });
  };

  const handleAddProteinSuggestion = (snapshot) => {
    const nextIngs = [...ingredients, snapshot];
    setIngredients(nextIngs);
    persistBuilderDraft({ ingredients: nextIngs });
  };

  const handleUpdateGrams = (ingId, nextRaw) => {
    const g = Number(nextRaw);
    const nextIngs = ingredients.map((ing) => {
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
    });
    setIngredients(nextIngs);
    persistBuilderDraft({ ingredients: nextIngs });
  };

  const handleRemoveIngredient = (ingId) => {
    const nextIngs = ingredients.filter((x) => x.id !== ingId);
    setIngredients(nextIngs);
    persistBuilderDraft({ ingredients: nextIngs });
  };

  const handleSaveMealToPlan = async () => {
    if (ingredients.length === 0 || !mealType) return;
    const typeLabel =
      MEAL_TYPE_OPTIONS.find((m) => m.id === mealType)?.label || "وجبة";
    const resolvedTitle =
      title.trim() ||
      ingredients
        .map((i) => formatShortFoodNameAr(i.nameAr))
        .slice(0, 3)
        .join(" و") ||
      typeLabel;

    const mealObj = {
      id: editingPlanId || `plan_${Date.now()}`,
      name: resolvedTitle,
      title: resolvedTitle,
      mealType,
      calories: currentTotals.calories,
      protein: currentTotals.protein,
      carbs: currentTotals.carbs,
      fat: currentTotals.fat,
      items: ingredients,
    };

    const nextPlans = editingPlanId
      ? nutritionPlans.map((p) => (p.id === editingPlanId ? mealObj : p))
      : [mealObj, ...nutritionPlans];

    await onSavePlans?.(nextPlans);
    setStep(1);
    setMealType(null);
    setEditingPlanId(null);
    setTitle("");
    setIngredients([]);
    setSelectedFood(null);
    void onSaveDietDraft?.(null);
  };

  const handleEditExistingPlanMeal = (p) => {
    const structuredIngs = Array.isArray(p.items)
      ? p.items.filter((it) => it && typeof it === "object" && it.foodId)
      : [];
    setEditingPlanId(p.id);
    setMealType(p.mealType || "lunch");
    setTitle(p.title || p.name || "");
    setIngredients(structuredIngs);
    setStep(2);
    persistBuilderDraft({
      editingPlanId: p.id,
      mealType: p.mealType || "lunch",
      title: p.title || p.name || "",
      ingredients: structuredIngs,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Bar: Daily Plan Summary vs Targets */}
      <div className="p-5 rounded-3xl bg-[#0c0e17]/95 border border-zinc-800/90 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-600/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-zinc-100">
                تظبيط نظامك الغذائي
              </h1>
              <p className="text-xs text-zinc-400">
                ابنِ وجباتك من أطعمة حقيقية — الخطة لا تُحسب كأكل فعلي إلا لما
                تأكدها.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onEditProfile}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-teal-400" />
              <span>تعديل أهدافي</span>
            </button>
            <button
              type="button"
              onClick={() => onSwitchExperience?.("full_tracking")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/25 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>متابعة أكلي اليوم</span>
            </button>
          </div>
        </div>

        {/* Plan vs Targets Compact Strip */}
        {dailyTargets && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-zinc-800/80 text-xs font-mono">
            <div className="px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400 font-sans">السعرات</span>
              <span>
                <b className="text-amber-400">{fullPlanTotals.calories}</b>
                <span className="text-zinc-500">
                  {" "}
                  / {dailyTargets.calories}
                </span>
              </span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400 font-sans">بروتين (ب)</span>
              <span>
                <b className="text-emerald-400">{fullPlanTotals.protein}</b>
                <span className="text-zinc-500">
                  {" "}
                  / {dailyTargets.protein}جم
                </span>
              </span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400 font-sans">كارب (ك)</span>
              <span>
                <b className="text-cyan-400">{fullPlanTotals.carbs}</b>
                <span className="text-zinc-500"> / {dailyTargets.carbs}جم</span>
              </span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400 font-sans">دهون (د)</span>
              <span>
                <b className="text-orange-400">{fullPlanTotals.fat}</b>
                <span className="text-zinc-500"> / {dailyTargets.fat}جم</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Guided Builder Card */}
      <div className="p-6 rounded-3xl bg-[#0c0e17]/95 border border-zinc-800/90 shadow-xl space-y-5">
        {step === 1 ? (
          <div className="space-y-4 text-center py-4">
            <h2 className="text-xl font-black text-zinc-100">
              هنظبط وجبة إيه؟
            </h2>
            <p className="text-xs text-zinc-400">
              اختر الوجبة عشان تبدأ تضيف مكوناتها بالجرام.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2">
              {MEAL_TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectMealType(opt.id)}
                    className="flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-teal-500/50 transition-all cursor-pointer"
                  >
                    <Icon className="w-6 h-6 text-teal-400" />
                    <span className="text-sm font-bold text-zinc-100">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Step 2 Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setEditingPlanId(null);
                    setMealType(null);
                    setIngredients([]);
                    setTitle("");
                    void onSaveDietDraft?.(null);
                  }}
                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  aria-label="الرجوع لاختيار الوجبة"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <h2 className="text-base font-black text-zinc-100">
                  {editingPlanId ? "تعديل " : "تظبيط "}
                  {MEAL_TYPE_OPTIONS.find((m) => m.id === mealType)?.label ||
                    "الوجبة"}
                </h2>
              </div>

              {ingredients.length > 0 && (
                <div className="text-xs font-mono text-zinc-300">
                  <b className="text-amber-400">
                    {currentTotals.calories} kcal
                  </b>{" "}
                  · ب:{" "}
                  <b className="text-emerald-400">{currentTotals.protein}</b> ·
                  ك: <b className="text-cyan-400">{currentTotals.carbs}</b> · د:{" "}
                  <b className="text-orange-400">{currentTotals.fat}</b>
                </div>
              )}
            </div>

            {/* Clean Searchable Food Picker */}
            <div className="space-y-3">
              {!selectedFood ? (
                <>
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث عن أكل (مثال: بيض، جبنة قريش، صدر فرخة، أرز، شوفان)..."
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-100"
                    />
                  </div>

                  {/* Food Results List (Search-first) */}
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
                    {searchQuery.trim().length === 0 ? (
                      <p className="text-xs text-zinc-500 py-4 text-center">
                        اكتب اسم الطعام في البحث أعلاه لعرض النتائج المطابقة.
                      </p>
                    ) : filteredFoods.filter(
                        (f) => f.source?.verificationStatus !== "unavailable",
                      ).length === 0 ? (
                      <p className="text-xs text-zinc-500 py-4 text-center">
                        لا توجد نتائج مطابقة للبحث.
                      </p>
                    ) : (
                      filteredFoods
                        .filter(
                          (f) => f.source?.verificationStatus !== "unavailable",
                        )
                        .map((food) => (
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
                            className="w-full text-right p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 bg-zinc-950/70 border-zinc-800/80 hover:border-teal-500/40"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-zinc-100 truncate">
                                {formatShortFoodNameAr(food.nameAr)}
                              </div>
                              <div className="text-[10px] text-zinc-400">
                                {food.preparationLabelAr}
                              </div>
                            </div>
                            <div className="text-[11px] font-mono text-zinc-300 shrink-0 text-left">
                              <span className="font-bold text-amber-400">
                                {food.per100g.calories} kcal
                              </span>
                              <span className="text-zinc-500 mr-1.5">
                                / 100جم
                              </span>
                            </div>
                          </button>
                        ))
                    )}
                  </div>
                </>
              ) : (
                <FoodQuantitySelector
                  food={selectedFood}
                  gramsInput={gramsInput}
                  setGramsInput={setGramsInput}
                  preview={selectedFoodPreview}
                  onAdd={handleAddSelectedFood}
                  onCancel={() => setSelectedFood(null)}
                />
              )}
            </div>

            {/* Added Ingredients (Inline Adjustable) */}
            {ingredients.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div className="text-xs font-bold text-zinc-200">
                  مكونات الوجبة ({ingredients.length})
                </div>
                <div className="space-y-2">
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
                            handleUpdateGrams(ing.id, e.target.value)
                          }
                          className="w-20 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-100"
                          aria-label={`وزن ${ing.nameAr} بالجرام`}
                        />
                        <span className="text-[11px] text-zinc-400">جم</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(ing.id)}
                          className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                          aria-label="حذف المكون"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live Fit & Remaining Feedback */}
                {dailyTargets && fit.remainingAfterMeal && (
                  <div className="p-3.5 rounded-2xl bg-[#0c151c] border border-teal-500/30 space-y-2.5 text-xs">
                    <div className="space-y-1">
                      {fit.messagesAr.map((msg, idx) => (
                        <div
                          key={idx}
                          className="font-bold text-teal-200 flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          <span>{msg}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] font-mono text-zinc-400 flex flex-wrap gap-3">
                      <span>
                        متبقي من هدف اليوم:{" "}
                        <b
                          className={
                            fit.remainingAfterMeal.calories >= 0
                              ? "text-zinc-200"
                              : "text-amber-400"
                          }
                        >
                          {fit.remainingAfterMeal.calories} kcal
                        </b>
                      </span>
                      <span>
                        · ب:{" "}
                        <b className="text-emerald-400">
                          {fit.remainingAfterMeal.protein} جم
                        </b>
                      </span>
                      <span>
                        · ك:{" "}
                        <b className="text-cyan-400">
                          {fit.remainingAfterMeal.carbs} جم
                        </b>
                      </span>
                      <span>
                        · د:{" "}
                        <b className="text-orange-400">
                          {fit.remainingAfterMeal.fat} جم
                        </b>
                      </span>
                    </div>

                    {fit.proteinBoostSuggestions.length > 0 && (
                      <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                        <div className="text-[11px] text-zinc-400">
                          اقتراحات سريعة لرفع البروتين:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {fit.proteinBoostSuggestions.map((sug) => (
                            <button
                              key={sug.food.id}
                              type="button"
                              onClick={() =>
                                handleAddProteinSuggestion(sug.snapshot)
                              }
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold cursor-pointer"
                            >
                              + {sug.grams} جم{" "}
                              {formatShortFoodNameAr(sug.food.nameAr)} (
                              {sug.snapshot.protein}جم ب)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Optional Title + Save Meal Button */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      persistBuilderDraft({ title: e.target.value });
                    }}
                    placeholder="اسم للوجبة (اختياري — يُشتق تلقائياً)"
                    className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={handleSaveMealToPlan}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/30 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {editingPlanId ? "حفظ التعديل" : "حفظ في نظامي الغذائي"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Saved Plan Meals List (Editable anytime, separate from actual logs) */}
      {nutritionPlans.length > 0 && (
        <div className="p-5 rounded-3xl bg-[#0c0e17]/95 border border-zinc-800/90 space-y-3">
          <h3 className="text-sm font-bold text-zinc-200">
            وجبات نظامك الغذائي ({nutritionPlans.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {nutritionPlans.map((p) => {
              const meta =
                MEAL_TYPE_OPTIONS.find((m) => m.id === p.mealType) ||
                MEAL_TYPE_OPTIONS[1];
              return (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                      <span className="text-xs font-bold text-zinc-100 truncate">
                        {p.title || p.name}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 mt-1">
                      {p.calories} kcal · ب:{p.protein} · ك:{p.carbs} · د:
                      {p.fat}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditExistingPlanMeal(p)}
                      className="p-1.5 text-zinc-400 hover:text-teal-300 cursor-pointer"
                      aria-label="تعديل الوجبة"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void onSavePlans?.(
                          nutritionPlans.filter((x) => x.id !== p.id),
                        )
                      }
                      className="p-1.5 text-zinc-400 hover:text-rose-400 cursor-pointer"
                      aria-label="حذف الوجبة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
