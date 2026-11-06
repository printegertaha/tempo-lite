"use client";

import { useState } from "react";
import { Footprints, Check, X, Clock, MapPin, Flame } from "lucide-react";
import { calculatePace } from "../data/storage";

export default function RunningSessionModal({
  isOpen,
  initialDurationSeconds = 0,
  onSaveSession,
  onClose,
}) {
  const [distanceKm, setDistanceKm] = useState("5.0");
  const [durationMinutes, setDurationMinutes] = useState(() => {
    return initialDurationSeconds > 0 ? String(Math.round(initialDurationSeconds / 60)) : "28";
  });
  const [location, setLocation] = useState("المضمار وحديقة الحي");
  const [notes, setNotes] = useState("");
  const [calories, setCalories] = useState("350");

  if (!isOpen) return null;

  const totalSecs = (Number(durationMinutes) || 0) * 60;
  const currentPace = calculatePace(Number(distanceKm) || 0, totalSecs);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!distanceKm || !durationMinutes) return;

    const end = new Date();
    const start = new Date(end.getTime() - totalSecs * 1000);

    onSaveSession({
      distanceKm: Number(distanceKm),
      durationSeconds: totalSecs,
      pace: currentPace,
      startTime: start.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      endTime: end.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      location: location.trim(),
      calories: Number(calories) || Math.round(Number(distanceKm) * 70),
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg rounded-3xl bg-[#0e111a] border border-lime-500/30 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-lime-500/20 text-lime-400 border border-lime-500/30">
              <Footprints className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-zinc-100 font-bold text-base">توثيق تمرين الجري أو المشي</h3>
              <p className="text-zinc-400 text-xs">حساب الوتيرة والسعرات والمسافة بدقة</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Calculated Pace Preview Badge */}
          <div className="p-4 rounded-2xl bg-lime-950/20 border border-lime-500/30 flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-400 block mb-0.5">الوتيرة المحسوبة (Pace):</span>
              <span className="text-2xl font-black font-mono text-lime-400">{currentPace}</span>
            </div>
            <div className="text-left font-mono">
              <span className="text-xs text-zinc-400 block mb-0.5">السعرات المقدرة:</span>
              <span className="text-xl font-bold text-zinc-200">~{calories} kcal</span>
            </div>
          </div>

          {/* Distance and Duration Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                المسافة المقطوعة (كم)
              </label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="100"
                value={distanceKm}
                onChange={(e) => {
                  setDistanceKm(e.target.value);
                  setCalories(String(Math.round((Number(e.target.value) || 0) * 72)));
                }}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 font-mono text-zinc-100 text-sm focus:outline-none focus:border-lime-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                المدة الإجمالية (دقائق)
              </label>
              <input
                type="number"
                min="1"
                max="600"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 font-mono text-zinc-100 text-sm focus:outline-none focus:border-lime-500"
                required
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              المسار أو المكان
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="مثال: حديقة الحي، كورنيش البحر، جهاز السير المنزلي"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-lime-500"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              ملاحظة عن الإحساس والطقس (اختياري)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: رتم ثابت وتنفس منتظم، الجو كان لطيفاً"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-200 focus:outline-none focus:border-lime-500"
            />
          </div>

          <div className="text-[11px] text-zinc-500 font-sans">
            * يتم توثيق التمرين يدوياً بناءً على بيانات ساعتك أو المسافة المقدرة، دون ادعاء تتبع الـ GPS في الخلفية.
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-lime-600 to-emerald-600 hover:from-lime-500 hover:to-emerald-500 text-zinc-950 text-xs font-black shadow-lg shadow-lime-600/30 transition-all"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>توثيق تمرين الجري</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

