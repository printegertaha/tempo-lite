"use client";

import { Calculator, CheckCircle2, Sliders, Sparkles, Utensils } from "lucide-react";
import { GOAL_OPTIONS, resolveProfileAge } from "@/lib/nutrition/calculations";

export default function NutritionCalculatorView({
  mode = "pending_choice", // "pending_choice" | "calculator_only"
  dailyTargets,
  profile,
  onEditProfile,
  onSelectExperience,
}) {
  const goalLabel =
    GOAL_OPTIONS.find((g) => g.id === (profile?.goal || "maintain"))?.labelAr || "ثبات الوزن";
  const resolvedAge = resolveProfileAge(profile);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      {/* Personalized Targets Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0e17]/95 border border-zinc-800/90 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-600/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-zinc-100">احتياجاتك اليومية</h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                دي احتياجاتك اليومية بناءً على بياناتك وهدفك (تقديرات شخصية).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onEditProfile}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold shrink-0 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-teal-400" />
            <span>تعديل بياناتي</span>
          </button>
        </div>

        {/* 5 Target Cards (Calories, Protein, Carbs, Fat, Hydration) */}
        {dailyTargets ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center space-y-1">
              <div className="text-xs text-zinc-400">السعرات اليومية</div>
              <div className="text-2xl font-black font-mono text-amber-400">
                {dailyTargets.calories}
              </div>
              <div className="text-[11px] font-mono text-zinc-500">سعرة</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center space-y-1">
              <div className="text-xs text-zinc-400">البروتين (ب)</div>
              <div className="text-2xl font-black font-mono text-emerald-400">
                {dailyTargets.protein}
              </div>
              <div className="text-[11px] text-zinc-500">جم / يوم</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center space-y-1">
              <div className="text-xs text-zinc-400">الكاربوهيدرات (ك)</div>
              <div className="text-2xl font-black font-mono text-cyan-400">
                {dailyTargets.carbs}
              </div>
              <div className="text-[11px] text-zinc-500">جم / يوم</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center space-y-1">
              <div className="text-xs text-zinc-400">الدهون (د)</div>
              <div className="text-2xl font-black font-mono text-orange-400">
                {dailyTargets.fat}
              </div>
              <div className="text-[11px] text-zinc-500">جم / يوم</div>
            </div>

            <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center space-y-1">
              <div className="text-xs text-zinc-400">الماء اليومي</div>
              <div className="text-2xl font-black font-mono text-teal-300">
                {dailyTargets.waterLiters}
              </div>
              <div className="text-[11px] text-zinc-500">لتر / يوم</div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200">
            يمكنك إدخال أهدافك يدوياً من «تعديل بياناتي» لحساب السعرات والماكروز بدقة.
          </div>
        )}

        {/* Body Summary */}
        {profile && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-zinc-800/80 text-xs text-zinc-400 font-mono">
            {profile.weightKg ? <span>الوزن: <b className="text-zinc-200">{profile.weightKg} كجم</b></span> : null}
            {profile.heightCm ? <span>· الطول: <b className="text-zinc-200">{profile.heightCm} سم</b></span> : null}
            {resolvedAge ? <span>· العمر: <b className="text-zinc-200">{resolvedAge} سنة</b></span> : null}
            <span>· الهدف: <b className="text-teal-300 font-sans">{goalLabel}</b></span>
          </div>
        )}
      </div>

      {/* Choice Section (Immediate Post-Setup OR Switch Option in Calculator-Only) */}
      {mode === "pending_choice" ? (
        <div className="p-6 rounded-3xl bg-[#0c0e17]/95 border border-zinc-800/90 shadow-xl space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-base font-black text-zinc-100">كيف تحب تستخدم قسم التغذية؟</h2>
            <p className="text-xs text-zinc-400">يمكنك التبديل بين الوضعين في أي وقت بدون فقدان بياناتك.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onSelectExperience?.("calculator_only")}
              className="text-right p-5 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-700 hover:border-teal-500/50 transition-all space-y-2 cursor-pointer"
            >
              <div className="flex items-center gap-2 text-sm font-black text-zinc-100">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>عايز أعرف احتياجي بس</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                شاشة خفيفة تعرض أهداف السعرات والماكروز وبيانات جسمك فقط بدون تسجيل وجبات أو خطط.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onSelectExperience?.("diet_builder")}
              className="text-right p-5 rounded-2xl bg-teal-950/30 hover:bg-teal-950/45 border border-teal-500/40 hover:border-teal-400 transition-all space-y-2 cursor-pointer"
            >
              <div className="flex items-center gap-2 text-sm font-black text-teal-200">
                <Utensils className="w-4 h-4 text-teal-400 shrink-0" />
                <span>عايز أظبط وجباتي وأعمل نظام غذائي</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                ابني وجباتك بنفسك من أطعمة حقيقية وشوف هل تناسب هدفك خطوة بخطوة.
              </p>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-[#0c0e17]/80 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-zinc-300">
            <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
            <span>هل تريد تنظيم وجباتك ومتابعة أكلك اليومي؟</span>
          </div>
          <button
            type="button"
            onClick={() => onSelectExperience?.("diet_builder")}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/35 text-teal-300 text-xs font-bold shrink-0 cursor-pointer"
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>عايز أظبط وجباتي وأعمل نظام غذائي</span>
          </button>
        </div>
      )}
    </div>
  );
}
