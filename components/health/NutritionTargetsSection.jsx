"use client";

import { Calculator, Sliders } from "lucide-react";
import { GOAL_OPTIONS, resolveProfileAge } from "@/lib/nutrition/calculations";

export default function NutritionTargetsSection({
  dailyTargets,
  profile,
  onEditProfile,
}) {
  const goalLabel =
    GOAL_OPTIONS.find((g) => g.id === (profile?.goal || "maintain"))?.labelAr || "ثبات الوزن";
  const resolvedAge = resolveProfileAge(profile);

  return (
    <div className="space-y-6">
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-600/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-zinc-100">سعراتي وأهدافي اليومية</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                دي احتياجاتك اليومية بناءً على بياناتك وهدفك ({goalLabel})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onEditProfile}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/25 shrink-0 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>تعديل بياناتي والأهداف</span>
          </button>
        </div>

        {dailyTargets ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center space-y-1">
              <div className="text-xs text-zinc-400">السعرات</div>
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
              <div className="text-xs text-zinc-400">الكارب (ك)</div>
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
              <div className="text-2xl font-black font-mono text-sky-400">
                {dailyTargets.waterLiters}
              </div>
              <div className="text-[11px] text-zinc-500">لتر / يوم</div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200">
            يمكنك إدخال أهدافك يدوياً من «تعديل بياناتي والأهداف» لحساب السعرات والماكروز بدقة.
          </div>
        )}

        {profile && (
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-zinc-800/80 text-xs text-zinc-400 font-mono">
            {profile.weightKg ? <span>الوزن: <b className="text-zinc-200">{profile.weightKg} كجم</b></span> : null}
            {profile.heightCm ? <span>· الطول: <b className="text-zinc-200">{profile.heightCm} سم</b></span> : null}
            {resolvedAge ? <span>· العمر: <b className="text-zinc-200">{resolvedAge} سنة</b></span> : null}
            <span>· الهدف: <b className="text-teal-300 font-sans">{goalLabel}</b></span>
          </div>
        )}
      </div>
    </div>
  );
}
