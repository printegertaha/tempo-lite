"use client";

import { useState } from "react";
import { Clock, Check, X, Sparkles, Settings } from "lucide-react";

export default function PrayerScheduleModal({
  isOpen,
  currentSchedule,
  onSaveSchedule,
  onClose,
}) {
  const [schedule, setSchedule] = useState(
    currentSchedule || {
      fajr: { name: "الفجر", scheduledTime: "04:52" },
      dhuhr: { name: "الظهر", scheduledTime: "11:48" },
      asr: { name: "العصر", scheduledTime: "14:52" },
      maghrib: { name: "المغرب", scheduledTime: "17:10" },
      isha: { name: "العشاء", scheduledTime: "18:28" },
    }
  );

  if (!isOpen) return null;

  const handleChangeTime = (key, newTime) => {
    setSchedule((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        scheduledTime: newTime,
      },
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSaveSchedule(schedule);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md rounded-3xl bg-[#0e111a] border border-zinc-800 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Settings className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">ضبط جدول مواقيت الأذان</h3>
              <p className="text-[11px] text-zinc-400">خصص توقيت كل صلاة حسب مدينتك وموقعك</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5 my-4">
          {Object.entries(schedule).map(([key, data]) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-xs font-bold text-zinc-200">{data.name}</span>
              <input
                type="time"
                value={data.scheduledTime}
                onChange={(e) => handleChangeTime(key, e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 font-mono text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
            >
              <Check className="w-4 h-4" />
              <span>تحديث الجدول</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

