"use client";

import { useMemo, useState } from "react";
import { useAthar } from "@/components/context/AtharContext";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DatePickerField from "@/components/ui/DatePickerField";
import NutritionProfileModal from "@/components/nutrition/NutritionProfileModal";
import NutritionOnboardingWizard from "@/components/nutrition/NutritionOnboardingWizard";
import NutritionCalculatorView from "@/components/nutrition/NutritionCalculatorView";
import InteractiveDietBuilder from "@/components/nutrition/InteractiveDietBuilder";
import NutritionTargetsSection from "@/components/health/NutritionTargetsSection";
import MealBuilderModal from "@/components/nutrition/MealBuilderModal";
import { computeDailyNutritionSummary } from "@/lib/nutrition/meal-planner";
import {
  Utensils,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Compass,
  CalendarRange,
} from "lucide-react";

const OFF_PLAN_REASONS = [
  "سفر",
  "عمل خارج المنزل",
  "مناسبة اجتماعية",
  "وجبة غير متوقعة",
  "سبب شخصي آخر",
];

const MEAL_TYPE_META = {
  breakfast: { label: "إفطار", badgeClass: "text-amber-300 bg-amber-500/10 border-amber-500/20" },
  lunch: { label: "غداء", badgeClass: "text-orange-300 bg-orange-500/10 border-orange-500/20" },
  dinner: { label: "عشاء", badgeClass: "text-indigo-300 bg-indigo-500/10 border-indigo-500/20" },
  snacks: { label: "سناك", badgeClass: "text-lime-300 bg-lime-500/10 border-lime-500/20" },
};

export default function NutritionSection({ subSection = "log", onSelectSubSection }) {
  const {
    nutritionData,
    gymData,
    setSelectedDate,
    addMeal,
    updateMeal,
    deleteMeal,
    confirmPlannedMeal,
    saveNutritionProfile,
    saveNutritionProfileDraft,
    saveNutritionExperienceMode,
    saveNutritionDietDraft,
    retryNutritionLoad,
    saveNutritionPlans,
    saveFavoriteMeals,
    saveCustomFoods,
    saveNutritionDayStatus,
  } = useAthar();

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [mealModalState, setMealModalState] = useState({
    isOpen: false,
    mode: "log",
    initialMeal: null,
  });
  const [confirmDeleteMealId, setConfirmDeleteMealId] = useState(null);
  const [showOffPlanEditor, setShowOffPlanEditor] = useState(false);
  const [offPlanReasonDraft, setOffPlanReasonDraft] = useState("");

  const {
    activeDate,
    todayDate,
    dailyTargets,
    todayLogged,
    meals,
    profile,
    nutritionPlans,
    favoriteMeals,
    customFoods,
    dayStatus,
    nutritionReady,
    nutritionLoadError,
    isProfileCompleted,
    experienceMode,
    nutritionDietDraft,
  } = nutritionData;

  const isToday = activeDate === todayDate;
  const latestGymWeight = Array.isArray(gymData?.bodyWeights) ? gymData.bodyWeights[0] || null : null;

  const dailySummary = useMemo(
    () =>
      computeDailyNutritionSummary({
        dailyTargets,
        plannedMeals: nutritionPlans || [],
        actualMeals: meals || [],
      }),
    [dailyTargets, nutritionPlans, meals]
  );

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

  if (!nutritionReady) {
    return (
      <div className="py-16 flex items-center justify-center">
        <div className="p-8 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 text-center space-y-3 max-w-sm w-full">
          <div className="mx-auto w-10 h-10 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-zinc-400">جاري تحميل بيانات التغذية...</p>
        </div>
      </div>
    );
  }

  if (nutritionLoadError) {
    return (
      <div className="py-16 flex items-center justify-center">
        <div className="p-8 rounded-3xl bg-[#0c0e17]/90 border border-rose-500/30 text-center space-y-4 max-w-md w-full">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-zinc-100">تعذر تحميل بيانات التغذية مؤقتاً</h2>
            <p className="text-xs text-zinc-400">
              حدث خطأ مؤقت أثناء قراءة التخزين المحلي. أعد المحاولة دون فقدان بياناتك.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void retryNutritionLoad?.()}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!isProfileCompleted) {
    return (
      <NutritionOnboardingWizard
        initialProfile={profile}
        latestGymWeight={latestGymWeight}
        onSaveDraft={saveNutritionProfileDraft}
        onCompleteProfile={saveNutritionProfile}
      />
    );
  }

  if (experienceMode === "pending_choice") {
    return (
      <>
        <NutritionCalculatorView
          mode={experienceMode}
          dailyTargets={dailyTargets}
          profile={profile}
          onEditProfile={() => setProfileModalOpen(true)}
          onSelectExperience={(nextMode) => {
            void saveNutritionExperienceMode(nextMode);
            if (nextMode === "calculator_only") onSelectSubSection?.("targets");
            else if (nextMode === "diet_builder") onSelectSubSection?.("diet");
            else if (nextMode === "full_tracking") onSelectSubSection?.("log");
          }}
        />
        <NutritionProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          initialProfile={profile}
          latestGymWeight={latestGymWeight}
          onSaveProfile={saveNutritionProfile}
          experienceMode={experienceMode}
          onChangeExperienceMode={saveNutritionExperienceMode}
        />
      </>
    );
  }

  if (subSection === "targets") {
    return (
      <>
        <NutritionTargetsSection
          dailyTargets={dailyTargets}
          profile={profile}
          onEditProfile={() => setProfileModalOpen(true)}
        />
        <NutritionProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          initialProfile={profile}
          latestGymWeight={latestGymWeight}
          onSaveProfile={saveNutritionProfile}
          experienceMode={experienceMode}
          onChangeExperienceMode={saveNutritionExperienceMode}
        />
      </>
    );
  }

  if (subSection === "diet") {
    return (
      <>
        <InteractiveDietBuilder
          dailyTargets={dailyTargets}
          nutritionPlans={nutritionPlans}
          customFoods={customFoods}
          dietDraft={nutritionDietDraft}
          onSaveDietDraft={saveNutritionDietDraft}
          onSavePlans={saveNutritionPlans}
          onSwitchExperience={() => onSelectSubSection?.("log")}
          onEditProfile={() => setProfileModalOpen(true)}
        />
        <NutritionProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          initialProfile={profile}
          latestGymWeight={latestGymWeight}
          onSaveProfile={saveNutritionProfile}
          experienceMode={experienceMode}
          onChangeExperienceMode={saveNutritionExperienceMode}
        />
      </>
    );
  }

  const hasPlanForDay = nutritionPlans.length > 0 && isToday;
  const isCompletelyEmptyDay = meals.length === 0 && !hasPlanForDay;

  return (
    <div className="space-y-6">
      {/* Simple Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-teal-600/10 border border-teal-500/20 text-teal-400 shrink-0">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-zinc-100">متابعة وتسجيل الأكل</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-500/15 text-teal-300 border border-teal-500/25">
                {isToday ? "اليوم" : activeDate}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isToday ? "وجبات اليوم" : `وجبات يوم ${activeDate}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DatePickerField
            value={activeDate}
            maxDate={todayDate}
            onChange={(d) => {
              setSelectedDate(d || todayDate);
              setShowOffPlanEditor(false);
              setOffPlanReasonDraft("");
            }}
            title="اختيار تاريخ السجل"
            ariaLabel="اختيار تاريخ السجل"
            className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 min-w-[130px]"
          />

          {isToday && (nutritionPlans.length > 0 || dayStatus?.offPlan) && (
            <button
              type="button"
              onClick={() => {
                setOffPlanReasonDraft(dayStatus?.reason || "");
                setShowOffPlanEditor((v) => !v);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                dayStatus?.offPlan
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                  : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{dayStatus?.offPlan ? "خارج الخطة" : "اليوم خارج خطتي"}</span>
            </button>
          )}

          {isToday && (
            <button
              type="button"
              onClick={() =>
                setMealModalState({ isOpen: true, mode: "log", initialMeal: null })
              }
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل وجبة</span>
            </button>
          )}
        </div>
      </div>

      {/* Off-Plan Day Editor / Supportive Banner */}
      {(showOffPlanEditor || dayStatus?.offPlan) && (
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/25 space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-200">
              <Compass className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {dayStatus?.offPlan
                  ? `اليوم خارج خطتك${dayStatus.reason ? ` (${dayStatus.reason})` : ""} — تقدر تسجل أي أكل أكلته بحرية.`
                  : "اليوم خارج خطتك المعتادة (سفر، مناسبة، شغل)؟"}
              </span>
            </div>
            {dayStatus?.offPlan && !showOffPlanEditor && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOffPlanReasonDraft(dayStatus.reason || "");
                    setShowOffPlanEditor(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 font-bold cursor-pointer"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void saveNutritionDayStatus(activeDate, { offPlan: false, reason: "" });
                    setShowOffPlanEditor(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold cursor-pointer"
                >
                  العودة للخطة
                </button>
              </div>
            )}
          </div>

          {showOffPlanEditor && (
            <div className="space-y-2 pt-2 border-t border-amber-500/15">
              <div className="flex flex-wrap gap-1.5">
                {OFF_PLAN_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setOffPlanReasonDraft(r)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer ${
                      offPlanReasonDraft === r
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-200"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={offPlanReasonDraft}
                  onChange={(e) => setOffPlanReasonDraft(e.target.value)}
                  placeholder="سبب اختياري..."
                  className="flex-1 min-w-[180px] px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    void saveNutritionDayStatus(activeDate, {
                      offPlan: true,
                      reason: offPlanReasonDraft,
                    });
                    setShowOffPlanEditor(false);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => setShowOffPlanEditor(false)}
                  className="px-3 py-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Simple Empty State when no meals & no plan for selected date */}
      {isCompletelyEmptyDay ? (
        <div className="p-8 sm:p-10 rounded-3xl bg-[#0c0e17]/90 border border-dashed border-zinc-800 text-center space-y-4">
          <Utensils className="w-9 h-9 text-teal-400/70 mx-auto" />
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-zinc-100">
              {isToday
                ? "مفيش نظام غذائي أو وجبات للنهارده"
                : `مكنش فيه أي وجبة أو نظام غذائي ليوم ${activeDate}`}
            </h3>
            {isToday && (
              <p className="text-xs text-zinc-400 leading-relaxed">
                تقدر تبدأ بإنشاء نظامك الغذائي أو تسجل وجبة أكلتها النهارده.
              </p>
            )}
          </div>
          {isToday && (
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => onSelectSubSection?.("diet")}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs font-bold cursor-pointer"
              >
                <CalendarRange className="w-4 h-4 text-teal-400" />
                <span>إضافة نظام غذائي</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setMealModalState({ isOpen: true, mode: "log", initialMeal: null })
                }
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل وجبة</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Planned Meals to Confirm (only when today has a plan and day isn't off-plan) */}
          {hasPlanForDay && !dayStatus?.offPlan && (
            <div className="p-5 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-zinc-200">وجبات خطتك للنهارده</span>
                <button
                  type="button"
                  onClick={() => onSelectSubSection?.("diet")}
                  className="text-teal-400 hover:text-teal-300 font-bold cursor-pointer"
                >
                  تعديل النظام
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {nutritionPlans.map((p) => {
                  const mt = MEAL_TYPE_META[p.mealType] || MEAL_TYPE_META.lunch;
                  const isConfirmed = dailySummary.confirmedPlanIds.has(p.id);
                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${mt.badgeClass}`}>
                            {mt.label}
                          </span>
                          <span className="text-xs font-bold text-zinc-100 truncate">
                            {p.title || p.name}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-400 mt-1">
                          {p.calories} kcal · ب:{p.protein} · ك:{p.carbs} · د:{p.fat}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>تم تناولها</span>
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => confirmPlannedMeal(p, activeDate)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/35 text-teal-300 text-[11px] font-bold cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>تأكيد</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setMealModalState({
                                  isOpen: true,
                                  mode: "log",
                                  initialMeal: { ...p, id: undefined, sourcePlanId: p.id },
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-bold cursor-pointer"
                            >
                              تعديل
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Logged Meals for Selected Date */}
          <div className="p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-100">
                {isToday ? `الوجبات المسجلة اليوم (${meals.length})` : `الوجبات المسجلة ليوم ${activeDate} (${meals.length})`}
              </h3>
              {meals.length > 0 && (
                <span className="text-xs font-mono text-zinc-400">
                  الإجمالي: <b className="text-amber-400">{todayLogged.calories} kcal</b>
                </span>
              )}
            </div>

            {meals.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-xs text-zinc-400">
                  {isToday
                    ? "لم تسجل أي وجبة أكلتها النهارده لسه."
                    : `مكنش فيه أي وجبة مسجلة ليوم ${activeDate}.`}
                </p>
                {isToday && (
                  <button
                    type="button"
                    onClick={() =>
                      setMealModalState({ isOpen: true, mode: "log", initialMeal: null })
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>تسجيل وجبة</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {meals.map((meal) => {
                  const itemsList = Array.isArray(meal.items) ? meal.items : [];
                  const mt = MEAL_TYPE_META[meal.mealType] || MEAL_TYPE_META.lunch;
                  return (
                    <div key={meal.id} className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between">
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
                            {meal.isEstimated && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-amber-500/15 text-amber-300 border-amber-500/30 shrink-0">
                                {meal.entrySource === "restaurant" ? "مطعم · تقدير تقريبي" : "تقدير تقريبي"}
                              </span>
                            )}
                            <h4 className="text-sm font-bold text-zinc-100 truncate">{meal.name || meal.title}</h4>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-zinc-800 text-zinc-200">
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
                          <ul className="text-xs text-zinc-300 space-y-1 my-2.5 pr-2 list-disc list-inside">
                            {itemsList.map((item, idx) =>
                              typeof item === "string" ? (
                                <li key={idx}>{item}</li>
                              ) : (
                                <li key={item.id || idx} className="flex flex-wrap items-center justify-between gap-1">
                                  <span>
                                    {item.nameAr} — <b className="font-mono text-teal-300">{item.grams} جم</b>
                                  </span>
                                  <span className="text-[10px] font-mono text-zinc-500">
                                    {item.calories} kcal
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

                      <div className="pt-2.5 border-t border-zinc-850 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                        <span>ب: <b className="text-emerald-400">{meal.protein} جم</b></span>
                        <span>ك: <b className="text-cyan-400">{meal.carbs} جم</b></span>
                        <span>د: <b className="text-orange-400">{meal.fat} جم</b></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
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
