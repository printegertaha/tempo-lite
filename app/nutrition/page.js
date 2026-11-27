"use client";

import { useMemo, useState } from "react";
import { useAthar } from "@/components/context/AtharContext";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DatePickerField from "@/components/ui/DatePickerField";
import NutritionProfileModal from "@/components/nutrition/NutritionProfileModal";
import MealBuilderModal from "@/components/nutrition/MealBuilderModal";
import { computeProgressPercent } from "@/lib/nutrition/calculations";
import { VERIFIED_FOOD_CATALOG } from "@/lib/nutrition/food-catalog";
import { generateSmartMealSuggestions } from "@/lib/nutrition/meal-planner";
import {
  Droplets,
  Utensils,
  Plus,
  Trash2,
  Pencil,
  Sliders,
  Info,
  ChevronDown,
  ChevronUp,
  Calendar,
  Sparkles,
  Bookmark,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const MEAL_TYPE_META = {
  breakfast: { label: "إفطار", badgeClass: "text-amber-300 bg-amber-500/10 border-amber-500/20" },
  lunch: { label: "غداء", badgeClass: "text-orange-300 bg-orange-500/10 border-orange-500/20" },
  dinner: { label: "عشاء", badgeClass: "text-indigo-300 bg-indigo-500/10 border-indigo-500/20" },
  snacks: { label: "سناك", badgeClass: "text-lime-300 bg-lime-500/10 border-lime-500/20" },
};

export default function NutritionPage() {
  const {
    nutritionData,
    gymData,
    selectedDate,
    setSelectedDate,
    addWater,
    addWaterMl,
    updateWaterEntry,
    deleteWaterEntry,
    addMeal,
    updateMeal,
    deleteMeal,
    saveNutritionProfile,
    saveNutritionPlans,
    saveFavoriteMeals,
    saveCustomFoods,
  } = useAthar();

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [mealModalState, setMealModalState] = useState({
    isOpen: false,
    mode: "log", // "log" | "edit" | "plan"
    initialMeal: null,
  });
  const [confirmDeleteMealId, setConfirmDeleteMealId] = useState(null);
  const [activeTab, setActiveTab] = useState("log"); // "log" | "plan" | "suggestions"
  const [showMethodology, setShowMethodology] = useState(false);
  const [showWaterLog, setShowWaterLog] = useState(false);
  const [customWaterMl, setCustomWaterMl] = useState("");
  const [editingWaterId, setEditingWaterId] = useState(null);
  const [editingWaterMl, setEditingWaterMl] = useState("");
  const [vegetarianSuggestions, setVegetarianSuggestions] = useState(false);

  const {
    activeDate,
    todayDate,
    dailyTargets,
    todayLogged,
    meals,
    waterEntries,
    breakdown,
    profile,
    nutritionPlans,
    favoriteMeals,
    customFoods,
  } = nutritionData;

  const isToday = activeDate === todayDate;
  const latestGymWeight = Array.isArray(gymData?.bodyWeights) ? gymData.bodyWeights[0] || null : null;

  const calPercent = computeProgressPercent(todayLogged.calories, dailyTargets?.calories);
  const proPercent = computeProgressPercent(todayLogged.protein, dailyTargets?.protein);
  const carbPercent = computeProgressPercent(todayLogged.carbs, dailyTargets?.carbs);
  const fatPercent = computeProgressPercent(todayLogged.fat, dailyTargets?.fat);
  const waterPercent = computeProgressPercent(todayLogged.waterLiters, dailyTargets?.waterLiters);

  const planTotals = useMemo(() => {
    return (nutritionPlans || []).reduce(
      (acc, m) => ({
        calories: acc.calories + Number(m.calories || 0),
        protein: Math.round((acc.protein + Number(m.protein || 0)) * 10) / 10,
        carbs: Math.round((acc.carbs + Number(m.carbs || 0)) * 10) / 10,
        fat: Math.round((acc.fat + Number(m.fat || 0)) * 10) / 10,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [nutritionPlans]);

  const smartSuggestions = useMemo(
    () =>
      generateSmartMealSuggestions({
        dailyLogged: todayLogged,
        dailyTargets,
        goal: profile?.goal || "maintain",
        catalog: [...VERIFIED_FOOD_CATALOG, ...(customFoods || [])],
        vegetarianOnly: vegetarianSuggestions,
      }),
    [todayLogged, dailyTargets, profile?.goal, customFoods, vegetarianSuggestions]
  );

  const handleAddCustomWater = (e) => {
    e.preventDefault();
    const ml = Math.round(Number(customWaterMl));
    if (!Number.isFinite(ml) || ml <= 0) return;
    addWaterMl(ml, activeDate, "nutrition");
    setCustomWaterMl("");
  };

  const handleSaveEditedWater = (id) => {
    const ml = Math.round(Number(editingWaterMl));
    if (Number.isFinite(ml) && ml > 0) {
      updateWaterEntry(id, ml);
    }
    setEditingWaterId(null);
    setEditingWaterMl("");
  };

  const handleMealModalSubmit = (mealObj) => {
    if (mealModalState.mode === "edit" && mealObj.id) {
      updateMeal(mealObj.id, mealObj);
    } else if (mealModalState.mode === "plan") {
      const nextPlan = mealObj.id
        ? nutritionPlans.map((p) => (p.id === mealObj.id ? mealObj : p))
        : [{ ...mealObj, id: `plan_${Date.now()}` }, ...nutritionPlans];
      void saveNutritionPlans(nextPlan);
    } else {
      addMeal({ ...mealObj, date: activeDate });
    }
  };

  const handleSaveFavorite = (favMeal) => {
    const nextFavs = [favMeal, ...(favoriteMeals || [])].slice(0, 30);
    void saveFavoriteMeals(nextFavs);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Page Header (Preserved Design) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-600/10 border border-teal-500/20 text-teal-400">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100">سجل التغذية وترطيب الجسم</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-500/15 text-teal-300 border border-teal-500/25">
                {isToday ? "اليوم" : activeDate}
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-1">
              توثيق وجبات الإفطار والغداء والعشاء والسناكس بمكونات موثقة وحساب شخصي للسعرات وشرب الماء
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DatePickerField
            value={activeDate}
            maxDate={todayDate}
            onChange={(d) => setSelectedDate(d || todayDate)}
            title="اختيار تاريخ السجل"
            ariaLabel="اختيار تاريخ السجل"
            className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 min-w-[130px]"
          />

          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold transition-all cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-teal-400" />
            <span>{breakdown.ready ? "ملفي الغذائي" : "إعداد الملف الغذائي"}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setMealModalState({ isOpen: true, mode: "log", initialMeal: null })
            }
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل وجبة جديدة</span>
          </button>
        </div>
      </div>

      {/* Incomplete Profile Setup Prompt OR Expandable Calculation Methodology */}
      {!dailyTargets ? (
        <div className="p-5 rounded-3xl bg-[#0c0e17]/90 border border-teal-500/30 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-zinc-100">
                {isToday
                  ? "أكمل ملفك الغذائي لحساب أهدافك الشخصية"
                  : `لا توجد أهداف محفوظة ليوم ${activeDate}`}
              </h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {isToday
                  ? breakdown.eligibility.messageAr
                  : "يحتفظ أثر بلقطة الأهداف لكل يوم على حدة ولا يفرض أهداف اليوم بأثر رجعي على الأيام السابقة."}
              </p>
            </div>
          </div>
          {isToday && (
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shrink-0 cursor-pointer"
            >
              إعداد الأهداف الآن
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-[#0c0e17]/70 border border-zinc-800/80 px-5 py-3">
          <button
            type="button"
            aria-expanded={showMethodology}
            onClick={() => setShowMethodology((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-teal-300 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-400" />
              <span>كيف تُحسب أهدافي؟ (معادلات DRI 2023 وAMDR وحدود التقدير)</span>
            </span>
            {showMethodology ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showMethodology && (
            <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2 text-xs text-zinc-400 leading-relaxed">
              {breakdown.methodologyNotesAr.map((line, i) => (
                <p key={i} className="text-zinc-300">{line}</p>
              ))}
              {breakdown.macroEnergyCheck?.conflicts?.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1">
                  {breakdown.macroEnergyCheck.conflicts.map((c, idx) => (
                    <p key={idx}>{c}</p>
                  ))}
                </div>
              )}
              <div className="pt-2 text-[11px] text-zinc-500 space-y-1">
                {breakdown.limitationsAr.map((lim, i) => (
                  <p key={i}>• {lim}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Hydration Water Gauge Banner (Preserved Design + Custom ml & History Drawer) */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c151c] to-[#0c0e17] border border-teal-500/30 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-teal-500/15 border-2 border-teal-400 text-teal-300 shrink-0">
              <Droplets className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-100">مستوى شرب الماء {isToday ? "اليوم" : activeDate}</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-500/20 text-teal-300">
                  {dailyTargets?.waterLiters ? `${waterPercent}%` : "—"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                شربت <span className="font-mono text-teal-300 font-bold">{todayLogged.waterLiters} لتر</span>{" "}
                <span className="font-mono text-zinc-500">({todayLogged.waterMl} مل)</span>{" "}
                {dailyTargets?.waterLiters
                  ? `من أصل نقطة البداية التقديرية (${dailyTargets.waterLiters} لتر مشروبات)`
                  : "— أكمل ملفك لتحديد نقطة البداية"}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {breakdown.hydrationDetails.noteAr}
              </p>
            </div>
          </div>

          {/* Quick add water buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => addWater(0.25, activeDate)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+250 مل (كوب)</span>
            </button>
            <button
              type="button"
              onClick={() => addWater(0.5, activeDate)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-200 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+500 مل (قارورة)</span>
            </button>
            <form onSubmit={handleAddCustomWater} className="flex items-center gap-1.5">
              <input
                type="number"
                min="10"
                max="5000"
                step="10"
                value={customWaterMl}
                onChange={(e) => setCustomWaterMl(e.target.value)}
                placeholder="مخصص مل"
                className="w-24 px-2.5 py-2.5 rounded-xl bg-zinc-950/80 border border-teal-500/30 text-xs font-mono text-zinc-100"
                aria-label="كمية ماء مخصصة بالمليلتر"
              />
              <button
                type="submit"
                className="px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-200 cursor-pointer"
              >
                إضافة
              </button>
            </form>
          </div>
        </div>

        {/* Collapsible Water Entries Log (Edit/Delete individual fluid records) */}
        {waterEntries.length > 0 && (
          <div className="pt-3 border-t border-teal-500/15">
            <button
              type="button"
              onClick={() => setShowWaterLog((v) => !v)}
              className="text-[11px] font-bold text-teal-300 hover:text-teal-200 flex items-center gap-1.5 cursor-pointer"
            >
              <span>سجلات الماء لهذا اليوم ({waterEntries.length})</span>
              {showWaterLog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showWaterLog && (
              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {waterEntries.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs"
                  >
                    {editingWaterId === w.id ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="number"
                          min="10"
                          max="5000"
                          value={editingWaterMl}
                          onChange={(e) => setEditingWaterMl(e.target.value)}
                          className="w-20 px-2 py-1 rounded bg-zinc-900 border border-teal-500/40 text-xs font-mono text-zinc-100"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditedWater(w.id)}
                          className="text-teal-300 font-bold cursor-pointer"
                        >
                          حفظ
                        </button>
                      </div>
                    ) : (
                      <div>
                        <span className="font-mono font-bold text-teal-300">{w.amountMl} مل</span>
                        <span className="text-[10px] text-zinc-500 mr-2">
                          {w.source === "habit_water" ? "من عادة الماء" : "توثيق التغذية"}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWaterId(w.id);
                          setEditingWaterMl(String(w.amountMl));
                        }}
                        className="p-1 text-zinc-400 hover:text-teal-300 cursor-pointer"
                        aria-label="تعديل كمية الماء"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteWaterEntry(w.id)}
                        className="p-1 text-zinc-400 hover:text-rose-400 cursor-pointer"
                        aria-label="حذف سجل الماء"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Calories & Macros 4 Progress Cards (Preserved Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Calories */}
        <div className="p-5 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-lg">
          <span className="text-xs text-zinc-400 font-medium">إجمالي السعرات الحرارية</span>
          <div className="flex items-baseline justify-between my-2">
            <span className="text-2xl font-black font-mono text-zinc-100">{todayLogged.calories}</span>
            <span className="text-xs font-mono text-zinc-500">
              {dailyTargets ? `من ${dailyTargets.calories} kcal` : "بدون هدف محدد"}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${calPercent}%` }} />
          </div>
          {dailyTargets && (
            <p className="text-[11px] font-mono text-zinc-500 mt-2">
              {dailyTargets.calories - todayLogged.calories >= 0
                ? `متبقي ${dailyTargets.calories - todayLogged.calories} kcal`
                : `تجاوز بـ ${todayLogged.calories - dailyTargets.calories} kcal`}
            </p>
          )}
        </div>

        {/* Protein */}
        <div className="p-5 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-lg">
          <span className="text-xs text-zinc-400 font-medium">البروتين (لبناء واستشفاء العضلات)</span>
          <div className="flex items-baseline justify-between my-2">
            <span className="text-2xl font-black font-mono text-emerald-400">{todayLogged.protein} جم</span>
            <span className="text-xs font-mono text-zinc-500">
              {dailyTargets ? `من ${dailyTargets.protein} جم` : "بدون هدف محدد"}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${proPercent}%` }} />
          </div>
          {dailyTargets && (
            <p className="text-[11px] font-mono text-zinc-500 mt-2">
              {dailyTargets.protein - todayLogged.protein >= 0
                ? `متبقي ${(dailyTargets.protein - todayLogged.protein).toFixed(1).replace(/\.0$/, "")} جم`
                : `تجاوز بـ ${(todayLogged.protein - dailyTargets.protein).toFixed(1).replace(/\.0$/, "")} جم`}
            </p>
          )}
        </div>

        {/* Carbs */}
        <div className="p-5 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-lg">
          <span className="text-xs text-zinc-400 font-medium">الكاربوهيدرات (طاقة العمل والتمرين)</span>
          <div className="flex items-baseline justify-between my-2">
            <span className="text-2xl font-black font-mono text-cyan-400">{todayLogged.carbs} جم</span>
            <span className="text-xs font-mono text-zinc-500">
              {dailyTargets ? `من ${dailyTargets.carbs} جم` : "بدون هدف محدد"}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${carbPercent}%` }} />
          </div>
          {dailyTargets && (
            <p className="text-[11px] font-mono text-zinc-500 mt-2">
              {dailyTargets.carbs - todayLogged.carbs >= 0
                ? `متبقي ${(dailyTargets.carbs - todayLogged.carbs).toFixed(1).replace(/\.0$/, "")} جم`
                : `تجاوز بـ ${(todayLogged.carbs - dailyTargets.carbs).toFixed(1).replace(/\.0$/, "")} جم`}
            </p>
          )}
        </div>

        {/* Fat */}
        <div className="p-5 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-lg">
          <span className="text-xs text-zinc-400 font-medium">الدهون الصحية (الهرمونات)</span>
          <div className="flex items-baseline justify-between my-2">
            <span className="text-2xl font-black font-mono text-orange-400">{todayLogged.fat} جم</span>
            <span className="text-xs font-mono text-zinc-500">
              {dailyTargets ? `من ${dailyTargets.fat} جم` : "بدون هدف محدد"}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${fatPercent}%` }} />
          </div>
          {dailyTargets && (
            <p className="text-[11px] font-mono text-zinc-500 mt-2">
              {dailyTargets.fat - todayLogged.fat >= 0
                ? `متبقي ${(dailyTargets.fat - todayLogged.fat).toFixed(1).replace(/\.0$/, "")} جم`
                : `تجاوز بـ ${(todayLogged.fat - dailyTargets.fat).toFixed(1).replace(/\.0$/, "")} جم`}
            </p>
          )}
        </div>
      </div>

      {/* 4. Daily Meal Log Section + Diet Plan + Smart Suggestions (Preserved Container & Meal Cards) */}
      <div className="p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-zinc-100">سجل الوجبات اليومية (إفطار، غداء، عشاء، سناكس)</h3>
            <p className="text-xs text-zinc-400 mt-0.5">توزيع الأطعمة والماكروز وساعات الأكل على مدار اليوم</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div role="tablist" aria-label="أقسام التغذية" className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
              {[
                { id: "log", label: `سجل اليوم (${meals.length})` },
                { id: "plan", label: `خطة الوجبات (${nutritionPlans.length})` },
                { id: "suggestions", label: "اقتراحات ذكية" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === t.id
                      ? "bg-teal-600 text-white shadow"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab 1: Logged Meals for Active Date */}
        <div role="tabpanel" hidden={activeTab !== "log"}>
          {meals.length === 0 ? (
            <div className="p-8 rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center space-y-3">
              <Utensils className="w-8 h-8 text-teal-400/70 mx-auto" />
              <div>
                <p className="text-sm font-bold text-zinc-200">
                  لا توجد وجبات مسجلة ليوم {isToday ? "اليوم" : activeDate}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  ابدأ بتسجيل وجبتك الأولى من الأطعمة الموثقة، أو استخدم «خطة الوجبات» أو «الاقتراحات الذكية».
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setMealModalState({ isOpen: true, mode: "log", initialMeal: null })
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تسجيل أول وجبة</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {meals.map((meal) => {
                const itemsList = Array.isArray(meal.items) ? meal.items : [];
                const mt = MEAL_TYPE_META[meal.mealType] || MEAL_TYPE_META.lunch;
                return (
                  <div key={meal.id} className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {meal.time && (
                            <span className="text-xs font-mono font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 shrink-0">
                              {meal.time}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${mt.badgeClass}`}>
                            {mt.label}
                          </span>
                          <h4 className="text-sm font-bold text-zinc-100 truncate">{meal.name || meal.title}</h4>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-zinc-800 text-zinc-200">
                            {meal.calories} kcal
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setMealModalState({ isOpen: true, mode: "edit", initialMeal: meal })
                            }
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-teal-300 hover:bg-zinc-800 cursor-pointer"
                            aria-label={`تعديل ${meal.name || meal.title}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteMealId(meal.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 cursor-pointer"
                            aria-label={`حذف ${meal.name || meal.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {itemsList.length > 0 && (
                        <ul className="text-xs text-zinc-300 space-y-1 my-3 pr-2 list-disc list-inside">
                          {itemsList.map((item, idx) =>
                            typeof item === "string" ? (
                              <li key={idx}>{item}</li>
                            ) : (
                              <li key={item.id || idx} className="flex flex-wrap items-center justify-between gap-1">
                                <span>
                                  {item.nameAr} — <b className="font-mono text-teal-300">{item.grams} جم</b>
                                </span>
                                <span className="text-[10px] font-mono text-zinc-500">
                                  {item.calories} kcal · {item.source?.verificationStatus === "user_provided" ? "مُدخل يدوياً" : item.source?.fdcId ? `USDA #${item.source.fdcId}` : ""}
                                </span>
                              </li>
                            )
                          )}
                        </ul>
                      )}

                      {meal.notes && (
                        <p className="text-[11px] text-zinc-400 italic mb-2">
                          ملاحظة: {meal.notes}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-zinc-850 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                      <span>بروتين: <b className="text-emerald-400">{meal.protein}g</b></span>
                      <span>كارب: <b className="text-cyan-400">{meal.carbs}g</b></span>
                      <span>دهون: <b className="text-orange-400">{meal.fat}g</b></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tab 2: Personal Diet Plan Builder & Favorites */}
        <div role="tabpanel" hidden={activeTab !== "plan"} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-xs space-y-1">
              <div className="font-bold text-zinc-100">مقارنة خطتك اليومية بالهدف والاستهلاك الفعلي</div>
              <div className="font-mono text-zinc-400 flex flex-wrap gap-3">
                <span>المخطط: <b className="text-amber-400">{planTotals.calories} kcal</b> · P:{planTotals.protein}g · C:{planTotals.carbs}g · F:{planTotals.fat}g</span>
                {dailyTargets && (
                  <span>المستهدف: <b className="text-teal-300">{dailyTargets.calories} kcal</b> · P:{dailyTargets.protein}g</span>
                )}
                <span>المسجل اليوم: <b className="text-emerald-400">{todayLogged.calories} kcal</b></span>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setMealModalState({ isOpen: true, mode: "plan", initialMeal: null })
              }
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة وجبة للخطة</span>
            </button>
          </div>

          {nutritionPlans.length === 0 ? (
            <p className="text-xs text-zinc-400 text-center py-4">
              لم تضف وجبات في خطتك الشخصية بعد. يمكنك بناء قوالب للإفطار والغداء والعشاء والسناكس بحرية وتعديلها في أي وقت.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nutritionPlans.map((p) => {
                const mt = MEAL_TYPE_META[p.mealType] || MEAL_TYPE_META.lunch;
                return (
                  <div key={p.id} className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${mt.badgeClass}`}>
                          {mt.label}
                        </span>
                        <h4 className="text-sm font-bold text-zinc-100 truncate">{p.title || p.name}</h4>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-400">{p.calories} kcal</span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 flex gap-3">
                      <span>P: <b className="text-emerald-400">{p.protein}g</b></span>
                      <span>C: <b className="text-cyan-400">{p.carbs}g</b></span>
                      <span>F: <b className="text-orange-400">{p.fat}g</b></span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={() =>
                          addMeal({
                            ...p,
                            id: undefined,
                            date: activeDate,
                          })
                        }
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-bold cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تسجيل كوجبة اليوم</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setMealModalState({ isOpen: true, mode: "plan", initialMeal: p })
                          }
                          className="p-1.5 text-zinc-400 hover:text-teal-300 cursor-pointer"
                          aria-label="تعديل وجبة الخطة"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void saveNutritionPlans(nutritionPlans.filter((x) => x.id !== p.id))
                          }
                          className="p-1.5 text-zinc-400 hover:text-rose-400 cursor-pointer"
                          aria-label="حذف وجبة الخطة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Favorite Meal Templates */}
          {favoriteMeals.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-teal-400" />
                <span>الوجبات المفضلة (إعادة استخدام سريعة)</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {favoriteMeals.map((fav) => (
                  <div
                    key={fav.id}
                    className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-zinc-100 truncate">{fav.title || fav.name}</div>
                      <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                        {fav.calories} kcal · P:{fav.protein}g · C:{fav.carbs}g · F:{fav.fat}g
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => addMeal({ ...fav, id: undefined, date: activeDate })}
                        className="px-2.5 py-1 rounded-lg bg-teal-600/20 border border-teal-500/30 text-teal-300 text-[11px] font-bold cursor-pointer"
                      >
                        تسجيل
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void saveFavoriteMeals(favoriteMeals.filter((x) => x.id !== fav.id))
                        }
                        className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                        aria-label="إزالة من المفضلة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tab 3: Deterministic Smart Suggestions */}
        <div role="tabpanel" hidden={activeTab !== "suggestions"} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>
                اقتراحات محسوبة رياضياً من الأطعمة الموثقة فقط لسد الفجوة المتبقية من أهدافك (دون أي أرقام تخمينية).
              </span>
            </p>
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={vegetarianSuggestions}
                onChange={(e) => setVegetarianSuggestions(e.target.checked)}
                className="accent-teal-500"
              />
              <span>بدائل نباتية / ألبان فقط</span>
            </label>
          </div>

          {!dailyTargets ? (
            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-400">
              أكمل ملفك الغذائي أولاً حتى نتمكن من حساب السعرات والماكروز المتبقية واقتراح كميات دقيقة بالجرام.
            </div>
          ) : smartSuggestions.length === 0 ? (
            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-400">
              لا توجد توصيات إضافية مطلوبة حالياً.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {smartSuggestions.map((sug) => (
                <div key={sug.id} className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-zinc-100">{sug.titleAr}</h4>
                    <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-zinc-800 text-amber-400 shrink-0">
                      {sug.totals.calories} kcal
                    </span>
                  </div>
                  <p className="text-xs text-teal-300/90 leading-relaxed">{sug.reasonAr}</p>
                  <ul className="text-[11px] text-zinc-300 space-y-1">
                    {sug.ingredients.map((ing) => (
                      <li key={ing.id} className="flex items-center justify-between gap-2">
                        <span>{ing.nameAr} — <b className="font-mono">{ing.grams} جم</b></span>
                        <span className="font-mono text-zinc-500">USDA #{ing.source.fdcId}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-[11px] font-mono text-zinc-400">
                    <span>P:{sug.totals.protein}g · C:{sug.totals.carbs}g · F:{sug.totals.fat}g</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setMealModalState({
                            isOpen: true,
                            mode: "log",
                            initialMeal: {
                              name: sug.titleAr,
                              title: sug.titleAr,
                              mealType: sug.mealType,
                              items: sug.ingredients,
                              calories: sug.totals.calories,
                              protein: sug.totals.protein,
                              carbs: sug.totals.carbs,
                              fat: sug.totals.fat,
                            },
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold cursor-pointer"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          addMeal({
                            name: sug.titleAr,
                            title: sug.titleAr,
                            mealType: sug.mealType,
                            date: activeDate,
                            items: sug.ingredients,
                            calories: sug.totals.calories,
                            protein: sug.totals.protein,
                            carbs: sug.totals.carbs,
                            fat: sug.totals.fat,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer"
                      >
                        تسجيل الآن
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <NutritionProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        initialProfile={profile}
        latestGymWeight={latestGymWeight}
        onSaveProfile={saveNutritionProfile}
      />

      <MealBuilderModal
        isOpen={mealModalState.isOpen}
        onClose={() => setMealModalState({ isOpen: false, mode: "log", initialMeal: null })}
        mode={mealModalState.mode}
        initialMeal={mealModalState.initialMeal}
        dailyLogged={todayLogged}
        dailyTargets={dailyTargets}
        customFoods={customFoods}
        onSaveCustomFood={saveCustomFoods}
        onSubmitMeal={handleMealModalSubmit}
        onSaveFavorite={handleSaveFavorite}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmDeleteMealId)}
        onClose={() => setConfirmDeleteMealId(null)}
        onConfirm={() => {
          if (confirmDeleteMealId) deleteMeal(confirmDeleteMealId);
          setConfirmDeleteMealId(null);
        }}
        title="حذف الوجبة؟"
        description="سيتم حذف هذه الوجبة من سجل اليوم ومزامنة الحذف مع حسابك."
        confirmLabel="حذف الوجبة"
        isDestructive
      />
    </div>
  );
}
