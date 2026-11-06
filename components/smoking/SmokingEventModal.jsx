"use client";

import { useState, useEffect } from "react";
import { Cigarette, Check, X, Clock, MapPin, Heart, ShieldAlert } from "lucide-react";

export default function SmokingEventModal({
  isOpen,
  onSaveEvent,
  onClose,
}) {
  const [count, setCount] = useState(1);
  const [eventTime, setEventTime] = useState("14:30");
  const [location, setLocation] = useState("خارج المنزل / العمل");
  const [trigger, setTrigger] = useState("توتر وضغط عمل");
  const [durationMinutes, setDurationMinutes] = useState(7);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      try {
        setEventTime(new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }));
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const locations = [
    "خارج المنزل / العمل",
    "في السيارة",
    "شرفة المنزل",
    "في مقهى",
    "أثناء المشي",
  ];

  const triggers = [
    "توتر وضغط عمل",
    "بعد وجبة الطعام",
    "مع القهوة الصباحية",
    "ملل وفراغ",
    "عادة اجتماعية مع زملاء",
    "رغبة ملحة مفاجئة (Craving)",
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveEvent({
      count: Number(count) || 1,
      time: eventTime,
      timestamp: Date.now(),
      location,
      trigger,
      durationMinutes: Number(durationMinutes) || 0,
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
        className="relative w-full max-w-lg rounded-3xl bg-[#0e111a] border border-rose-500/30 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Cigarette className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-zinc-100 font-bold text-base">تسجيل حدث تدخين (بكل خصوصية)</h3>
              <p className="text-zinc-400 text-xs">توثيق واعي للمحفزات والظروف دون لوم أو إصدار أحكام</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Cigarette Count Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              عدد السجائر المستهلكة في هذه المرة
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCount(num)}
                  className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                    count === num
                      ? "bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-sm"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {num} {num === 1 ? "سيجارة واحدة" : num === 2 ? "سيجارتان" : "سجائر"}
                </button>
              ))}
            </div>
          </div>

          {/* Time & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                توقيت الحدث
              </label>
              <input
                type="text"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 font-mono text-zinc-100 text-xs focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                مدة الجلسة (دقائق)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 font-mono text-zinc-100 text-xs focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Trigger / Reason */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              المحفز أو الدافع (Trigger)
            </label>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-200 focus:outline-none focus:border-rose-500"
            >
              {triggers.map((t, idx) => (
                <option key={idx} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              المكان
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-200 focus:outline-none focus:border-rose-500"
            >
              {locations.map((loc, idx) => (
                <option key={idx} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              ملاحظة أو بديل ممكن في المرة القادمة
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: كان يمكنني شرب ماء بارد أو التنفس بعمق لدقيقة"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-200 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Supportive guidance text */}
          <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-400 shrink-0" />
            <span>توثيقك الصادق هو أول وأهم خطوة لفهم نمطك السلوكي والتغلب عليه تدريجياً.</span>
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
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>حفظ السجل</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
