"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Info, Plus, X } from "lucide-react";
import { formatShortFoodNameAr } from "@/lib/nutrition/meal-planner";

export default function FoodQuantitySelector({
  food,
  gramsInput,
  setGramsInput,
  preview,
  onAdd,
  onCancel,
}) {
  const hasNativePortions = Boolean(food?.portions && food.portions.length > 0);
  const portions = hasNativePortions
    ? food.portions
    : [{ labelAr: "حصة (100 جم)", grams: 100 }];

  const [mode, setMode] = useState(hasNativePortions ? "unit" : "grams");
  const [portionIdx, setPortionIdx] = useState(0);
  const [unitCount, setUnitCount] = useState("1");

  const activePortion = portions[portionIdx] || portions[0];

  const applyUnitCount = (rawCount, targetPortion = activePortion) => {
    setUnitCount(rawCount);
    const parsed = Number(rawCount);
    if (Number.isFinite(parsed) && parsed > 0) {
      const computedGrams = Math.max(1, Math.round(parsed * targetPortion.grams));
      setGramsInput(String(computedGrams));
    }
  };

  const stepUnitCount = (delta) => {
    const current = Number(unitCount) || 1;
    const next = Math.max(0.5, Math.round((current + delta) * 2) / 2);
    applyUnitCount(String(next));
  };

  const stepGrams = (delta) => {
    const current = Number(gramsInput) || 0;
    const next = Math.max(1, Math.min(3000, Math.round(current + delta)));
    setGramsInput(String(next));
  };

  const handleSelectPortion = (idx) => {
    setPortionIdx(idx);
    const nextPortion = portions[idx] || portions[0];
    applyUnitCount(unitCount, nextPortion);
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#0c151c] border border-teal-500/35 space-y-4">
      {/* Header: Food name on right, X cancel-to-search button on left */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="text-base sm:text-lg font-bold text-zinc-100">
            {formatShortFoodNameAr(food.nameAr)}
          </div>
          {food.ediblePortionNoteAr && (
            <div className="text-[11px] text-teal-300/90 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>{food.ediblePortionNoteAr}</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          title="إلغاء والعودة للبحث"
          aria-label="إلغاء والعودة للبحث"
          className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Prominent Calories & Macros Summary */}
      {preview && (
        <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
          <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-950/80 border border-amber-500/25 text-center">
            <div className="text-[10px] sm:text-xs text-zinc-400">السعرات</div>
            <div className="text-base sm:text-lg font-black font-mono text-amber-400 mt-0.5">
              {preview.calories}
            </div>
            <div className="text-[10px] text-zinc-500">kcal</div>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-950/80 border border-emerald-500/25 text-center">
            <div className="text-[10px] sm:text-xs text-zinc-400">بروتين</div>
            <div className="text-base sm:text-lg font-black font-mono text-emerald-400 mt-0.5">
              {preview.protein}
            </div>
            <div className="text-[10px] text-zinc-500">جم</div>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-950/80 border border-cyan-500/25 text-center">
            <div className="text-[10px] sm:text-xs text-zinc-400">كارب</div>
            <div className="text-base sm:text-lg font-black font-mono text-cyan-400 mt-0.5">
              {preview.carbs}
            </div>
            <div className="text-[10px] text-zinc-500">جم</div>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-950/80 border border-orange-500/25 text-center">
            <div className="text-[10px] sm:text-xs text-zinc-400">دهون</div>
            <div className="text-base sm:text-lg font-black font-mono text-orange-400 mt-0.5">
              {preview.fat}
            </div>
            <div className="text-[10px] text-zinc-500">جم</div>
          </div>
        </div>
      )}

      {/* Quantity Mode Toggle (Unit vs Grams) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="inline-flex items-center p-0.5 rounded-xl bg-zinc-950 border border-zinc-800 gap-0.5">
            <button
              type="button"
              onClick={() => {
                setMode("unit");
                const currentG = Number(gramsInput) || activePortion.grams;
                const inferredCount = Math.max(
                  0.5,
                  Math.round((currentG / activePortion.grams) * 2) / 2
                );
                applyUnitCount(String(inferredCount));
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                mode === "unit"
                  ? "bg-teal-600/25 text-teal-200 border border-teal-500/40"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              بالوحدة / الحصة
            </button>
            <button
              type="button"
              onClick={() => setMode("grams")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                mode === "grams"
                  ? "bg-teal-600/25 text-teal-200 border border-teal-500/40"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              بالجرام
            </button>
          </div>

          <span className="text-xs font-mono text-zinc-400">
            الإجمالي: <b className="text-zinc-200">{gramsInput || 0}</b> جم
          </span>
        </div>

        {mode === "unit" ? (
          <div className="space-y-2.5">
            {portions.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {portions.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPortion(idx)}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      portionIdx === idx
                        ? "bg-teal-500/20 border-teal-500/50 text-teal-200"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {p.labelAr}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center rounded-xl bg-zinc-950 border border-teal-500/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => stepUnitCount(0.5)}
                  aria-label="زيادة العدد"
                  title="زيادة"
                  className="px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="0.25"
                  max="50"
                  step="any"
                  autoFocus
                  value={unitCount}
                  onChange={(e) => applyUnitCount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onAdd();
                    }
                  }}
                  aria-label="العدد"
                  className="w-20 py-2 bg-transparent text-center text-sm font-mono font-bold text-zinc-100 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => stepUnitCount(-0.5)}
                  aria-label="إنقاص العدد"
                  title="نقصان"
                  className="px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              <span className="text-xs text-zinc-300 font-medium">
                × {activePortion.labelAr}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center rounded-xl bg-zinc-950 border border-teal-500/40 overflow-hidden">
              <button
                type="button"
                onClick={() => stepGrams(10)}
                aria-label="زيادة الجرامات"
                title="زيادة"
                className="px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <input
                type="number"
                min="1"
                max="3000"
                step="any"
                autoFocus
                value={gramsInput}
                onChange={(e) => setGramsInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAdd();
                  }
                }}
                className="w-20 py-2 bg-transparent text-center text-sm font-mono font-bold text-zinc-100 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="الكمية بالجرام"
              />
              <button
                type="button"
                onClick={() => stepGrams(-10)}
                aria-label="إنقاص الجرامات"
                title="نقصان"
                className="px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <span className="text-xs text-zinc-400">جم</span>
          </div>
        )}
      </div>

      {/* Add to Meal Action */}
      <div className="flex items-center justify-end pt-2 border-t border-teal-500/20">
        <button
          type="button"
          onClick={onAdd}
          disabled={!preview}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-teal-600/25 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة للوجبة</span>
        </button>
      </div>
    </div>
  );
}

