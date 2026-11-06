"use client";

import { useState, useEffect } from "react";
import { Flame, Clock, MapPin, AlertCircle, Check, X, ShieldCheck, Sparkles } from "lucide-react";

export default function PrayerDetailModal({
  isOpen,
  prayerKey,
  prayerData,
  onSave,
  onClose,
}) {
  const [actualTime, setActualTime] = useState("");
  const [location, setLocation] = useState("mosque");
  const [onTime, setOnTime] = useState(true);
  const [delayReason, setDelayReason] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(12);
  const [notes, setNotes] = useState("");
  const [isDone, setIsDone] = useState(true);

  useEffect(() => {
    if (prayerData) {
      setActualTime(prayerData.actualTime || prayerData.scheduledTime || "12:00");
      setLocation(prayerData.location || "mosque");
      setOnTime(prayerData.onTime !== false);
      setDelayReason(prayerData.delayReason || "");
      setDurationMinutes(prayerData.durationMinutes || 12);
      setNotes(prayerData.notes || "");
      setIsDone(prayerData.done !== false);
    }
  }, [prayerData]);

  if (!isOpen || !prayerData) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(prayerKey, {
      done: isDone,
      scheduledTime: prayerData.scheduledTime,
      actualTime: actualTime || prayerData.scheduledTime,
      onTime,
      location,
      delayReason: !onTime ? delayReason : "",
      durationMinutes: Number(durationMinutes) || 0,
      notes: notes.trim(),
    });
    onClose();
  };

  const locations = [
    { id: "mosque", label: "مسجد جماعة", icon: "🕌" },
    { id: "home", label: "المنزل", icon: "🏡" },
    { id: "work", label: "العمل / المصلى", icon: "🏢" },
    { id: "other", label: "مكان آخر", icon: "📍" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg rounded-3xl bg-[#0e111a] border border-emerald-500/30 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Flame className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-zinc-100 font-bold text-base">توثيق صلاة {prayerData.name}</h3>
              <p className="text-zinc-400 text-xs">الأذان المقرر: {prayerData.scheduledTime}</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Status Checkbox */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-zinc-200">حالة أداء الفرض</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold ${isDone ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                {isDone ? "تمت بحمد الله" : "لم تؤدَّ بعد"}
              </span>
            </div>
            <input
              type="checkbox"
              checked={isDone}
              onChange={(e) => setIsDone(e.target.checked)}
              className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
            />
          </div>

          {/* Actual Time & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                الوقت الفعلي للأداء
              </label>
              <input
                type="time"
                value={actualTime}
                onChange={(e) => setActualTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 font-mono text-zinc-100 text-xs focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                مدة الصلاة والذكر (دقائق)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 font-mono text-zinc-100 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Location Picker */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              مكان أداء الصلاة
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {locations.map((loc) => {
                const isSelected = location === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setLocation(loc.id)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl border text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200 shadow-sm"
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <span className="text-base">{loc.icon}</span>
                    <span className="text-[11px] font-bold">{loc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* On-Time vs Delayed */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">
                هل صليت في أول الوقت أم تأخرت؟
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOnTime(true)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    onTime
                      ? "bg-emerald-500 text-zinc-950 font-bold"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  في وقتها 🌿
                </button>
                <button
                  type="button"
                  onClick={() => setOnTime(false)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    !onTime
                      ? "bg-amber-500 text-zinc-950 font-bold"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  تأخرت طفيفاً
                </button>
              </div>
            </div>

            {!onTime && (
              <div className="animate-in fade-in pt-1">
                <label className="block text-[11px] text-zinc-400 mb-1">
                  سبب التأخير (لزيادة الوعي ومعالجة السبب مستقبلاً):
                </label>
                <input
                  type="text"
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  placeholder="مثال: اجتماع عمل، نوم، مواصلات، ظرف عائلي"
                  className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-750 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              ملاحظة أو تدبر (اختياري)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: حضور القلب في الركوع، قراءة سنة الرواتب كاملة"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
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
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>حفظ توثيق الصلاة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

