"use client";

import { useState } from "react";
import { useAthar } from "@/components/context/AtharContext";
import DatePickerField from "@/components/ui/DatePickerField";
import { computeProgressPercent } from "@/lib/nutrition/calculations";
import { Droplets, Pencil, Plus, Trash2 } from "lucide-react";

export default function WaterSection() {
  const {
    nutritionData,
    setSelectedDate,
    addWater,
    addWaterMl,
    updateWaterEntry,
    deleteWaterEntry,
  } = useAthar();

  const [customWaterMl, setCustomWaterMl] = useState("");
  const [editingWaterId, setEditingWaterId] = useState(null);
  const [editingWaterMl, setEditingWaterMl] = useState("");

  const {
    activeDate,
    todayDate,
    dailyTargets,
    todayLogged,
    waterEntries,
  } = nutritionData;

  const isToday = activeDate === todayDate;
  const waterPercent = computeProgressPercent(todayLogged.waterLiters, dailyTargets?.waterLiters);

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

  return (
    <div className="space-y-6">
      {/* Header & Quick Add */}
      <div className="p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-zinc-100">
                  شرب المياه {isToday ? "اليوم" : activeDate}
                </h2>
                {dailyTargets?.waterLiters ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/20 text-sky-300">
                    {waterPercent}%
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                شربت <b className="font-mono text-sky-300">{todayLogged.waterLiters} لتر</b>{" "}
                <span className="font-mono text-zinc-500">({todayLogged.waterMl} مل)</span>
                {dailyTargets?.waterLiters ? ` · الهدف التقديري ${dailyTargets.waterLiters} لتر` : ""}
              </p>
            </div>
          </div>

          <DatePickerField
            value={activeDate}
            maxDate={todayDate}
            onChange={(d) => setSelectedDate(d || todayDate)}
            title="اختيار تاريخ سجل الماء"
            ariaLabel="اختيار تاريخ سجل الماء"
            className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 min-w-[130px]"
          />
        </div>

        {/* Progress Bar */}
        {dailyTargets?.waterLiters ? (
          <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all"
              style={{ width: `${waterPercent}%` }}
            />
          </div>
        ) : null}

        {/* Quick Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => addWater(0.25, activeDate)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+250 مل (كوب)</span>
          </button>
          <button
            type="button"
            onClick={() => addWater(0.5, activeDate)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer"
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
              className="w-24 px-2.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700 text-xs font-mono text-zinc-100"
              aria-label="كمية ماء مخصصة بالمليلتر"
            />
            <button
              type="submit"
              className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-200 cursor-pointer"
            >
              إضافة
            </button>
          </form>
        </div>
      </div>

      {/* Logged Water Entries */}
      <div className="p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-zinc-200">
          سجلات المياه ({waterEntries.length})
        </h3>
        {waterEntries.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4 text-center">
            لا توجد سجلات مياه مسجلة لهذا اليوم بعد.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {waterEntries.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs"
              >
                {editingWaterId === w.id ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="number"
                      min="10"
                      max="5000"
                      value={editingWaterMl}
                      onChange={(e) => setEditingWaterMl(e.target.value)}
                      className="w-20 px-2 py-1 rounded-lg bg-zinc-950 border border-sky-500/40 text-xs font-mono text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEditedWater(w.id)}
                      className="text-sky-300 font-bold cursor-pointer"
                    >
                      حفظ
                    </button>
                  </div>
                ) : (
                  <div>
                    <span className="font-mono font-bold text-sky-300">{w.amountMl} مل</span>
                    <span className="text-[10px] text-zinc-500 mr-2">
                      {w.source === "habit_water" ? "من عادة الماء" : "توثيق مباشر"}
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
                    className="p-1 text-zinc-400 hover:text-sky-300 cursor-pointer"
                    aria-label="تعديل كمية الماء"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteWaterEntry(w.id)}
                    className="p-1 text-zinc-400 hover:text-rose-400 cursor-pointer"
                    aria-label="حذف سجل الماء"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
