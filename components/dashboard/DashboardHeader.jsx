"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Calendar,
  ChevronRight,
  ChevronLeft,
  Flame,
  CheckSquare,
  Sparkles,
  Zap
} from "lucide-react";
import { addDaysToDateString, getLocalDateString } from "@/lib/dates";

export default function DashboardHeader({
  selectedDate,
  onDateChange,
  user,
  onOpenCreateTracker,
  onOpenCreateTask,
  onOpenQuickLog,
}) {
  const [dayName, setDayName] = useState("");
  const [formattedDate, setFormattedDate] = useState("");
  const [isToday, setIsToday] = useState(true);

  useEffect(() => {
    if (!selectedDate) return;
    try {
      const [year, month, day] = selectedDate.split("-").map(Number);
      const dateObj = new Date(year, month - 1, day);
      
      const weekday = new Intl.DateTimeFormat("ar-EG", { weekday: "long" }).format(dateObj);
      const full = new Intl.DateTimeFormat("ar-EG", { 
        day: "numeric", 
        month: "long", 
        year: "numeric" 
      }).format(dateObj);

      setDayName(weekday);
      setFormattedDate(full);

      const todayStr = getLocalDateString();
      setIsToday(selectedDate === todayStr);
    } catch {
      setFormattedDate(selectedDate);
    }
  }, [selectedDate]);

  const handlePrevDay = () => {
    if (selectedDate && onDateChange) {
      onDateChange(addDaysToDateString(selectedDate, -1));
    }
  };

  const handleNextDay = () => {
    if (selectedDate && onDateChange) {
      onDateChange(addDaysToDateString(selectedDate, 1));
    }
  };

  const handleGoToday = () => {
    if (onDateChange) {
      onDateChange(getLocalDateString());
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-800/60">
      {/* Date & User Greeting */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {user ? (
            <span className="text-xs font-medium text-violet-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>مرحباً، {user.name?.split(" ")[0] || "بك"}</span>
            </span>
          ) : (
            <span className="text-xs font-medium text-zinc-500">لوحة المتابعة اليومية</span>
          )}

          {/* Quick Date Switcher */}
          <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 rounded-xl px-1.5 py-0.5 text-zinc-400">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
              title="اليوم السابق"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {!isToday && (
              <button
                type="button"
                onClick={handleGoToday}
                className="px-2 py-0.5 text-[10px] font-bold text-violet-400 hover:text-violet-300 rounded hover:bg-violet-500/10 transition-colors"
              >
                اليوم
              </button>
            )}

            <button
              type="button"
              onClick={handleNextDay}
              className="p-1 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
              title="اليوم التالي"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight leading-tight">
            {dayName ? `${dayName}، ${formattedDate}` : formattedDate || "اليوم"}
          </h1>

          {/* Date Picker Input */}
          <input
            type="date"
            value={selectedDate || ""}
            onChange={(e) => onDateChange && onDateChange(e.target.value)}
            className="w-7 h-7 opacity-70 hover:opacity-100 bg-transparent text-transparent border-0 cursor-pointer focus:outline-none"
            title="اختيار تاريخ مخصص"
          />
        </div>
      </div>

      {/* Primary Actions Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Quick Log Action */}
        <button
          type="button"
          onClick={onOpenQuickLog}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:text-white transition-all active:scale-95 shadow-sm"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>تدوين سريع</span>
        </button>

        {/* Add Task CTA */}
        <button
          type="button"
          onClick={onOpenCreateTask}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:text-white transition-all active:scale-95 shadow-sm"
        >
          <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
          <span>مهمة جديدة</span>
        </button>

        {/* Primary Add Tracker CTA */}
        <button
          type="button"
          onClick={onOpenCreateTracker}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/25 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>عادة جديدة</span>
        </button>
      </div>
    </div>
  );
}
