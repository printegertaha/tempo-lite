"use client";

import { useState, useEffect, useRef } from "react";
import { getCalendarMonthSummary } from "@/actions/history";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  Flame,
  CheckCircle2,
  Clock,
  BookMarked,
  ArrowUpRight,
  Loader2,
  LogIn,
} from "lucide-react";

const WEEK_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function CalendarClient({
  user,
  initialYear,
  initialMonth,
  initialDate,
  initialMonthData,
}) {
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth); // 1-12
  const [monthData, setMonthData] = useState(initialMonthData);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [isLoading, setIsLoading] = useState(false);

  const isInitialMount = useRef(true);

  const loadMonthData = async (y, m) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await getCalendarMonthSummary(y, m);
      if (res.success && res.data) {
        setMonthData(res.data);
      }
    } catch (err) {
      console.error("Error loading calendar data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadMonthData(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center">
        <div className="p-8 rounded-3xl bg-zinc-950/80 border border-zinc-800 shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-400">
            <CalendarIcon className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">سجل الدخول لاستعراض التقويم</h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              استعرض سجل إنجازاتك اليومية عبر التقويم التفاعلي المرتبط مباشرة بأنشطتك وجلساتك الحقيقية.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/20 transition-all active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول عبر Google</span>
          </Link>
        </div>
      </div>
    );
  }

  // Format month name in Arabic
  const monthDate = new Date(currentYear, currentMonth - 1, 1);
  const monthNameArabic = new Intl.DateTimeFormat("ar-EG", {
    month: "long",
    year: "numeric",
  }).format(monthDate);

  // Calculate starting day offset (0 = Sunday, 6 = Saturday)
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();
  const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();

  const daysMap = monthData?.days || {};
  const selectedDayInfo = daysMap[selectedDate];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-1">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>السجل التقويمي الحقيقي</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
            التقويم وسجل الإنجاز
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            يعكس الأيام التي تم فيها تدوين أنشطة فعلية دون افتراض الفشل عند غياب البيانات.
          </p>
        </div>

        {/* Month Switcher */}
        <div className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800 rounded-2xl p-1.5 shadow-md">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="الشهر السابق"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold font-mono px-3 text-zinc-200">
            {monthNameArabic}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="الشهر التالي"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Calendar Grid (2 Cols) */}
        <div className="lg:col-span-2 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 p-5 space-y-4 shadow-xl">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center border-b border-zinc-900 pb-2">
            {WEEK_DAYS.map((wd) => (
              <span key={wd} className="text-[11px] font-semibold text-zinc-400">
                {wd}
              </span>
            ))}
          </div>

          {/* Month Days Grid */}
          {isLoading ? (
            <div className="py-24 text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
              <p className="text-xs text-zinc-500">جاري تحميل بيانات الشهر...</p>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {/* Empty leading offset days */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`offset-${idx}`} className="h-16 sm:h-20 rounded-2xl bg-zinc-950/20" />
              ))}

              {/* Real month days */}
              {Array.from({ length: lastDayOfMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const dayObj = daysMap[dateStr] || { hasData: false, status: "no_data" };
                const isSelected = selectedDate === dateStr;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    disabled={dayObj.status === "future"}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`h-16 sm:h-20 rounded-2xl p-2 flex flex-col justify-between text-right transition-all relative border cursor-pointer ${
                      isSelected
                        ? "border-violet-500 bg-violet-950/25 shadow-lg shadow-violet-950/40 ring-2 ring-violet-500/20"
                        : dayObj.status === "future"
                        ? "border-zinc-900/50 bg-zinc-950/30 opacity-40 cursor-not-allowed"
                        : dayObj.hasData
                        ? "border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/50"
                        : "border-zinc-850 bg-zinc-900/30 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-mono font-bold ${
                          dayObj.isToday
                            ? "w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px]"
                            : isSelected
                            ? "text-violet-300"
                            : "text-zinc-300"
                        }`}
                      >
                        {dayNum}
                      </span>

                      {/* Status indicator dot */}
                      {dayObj.hasData && (
                        <span
                          className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"
                          title="يوم به أنشطة مسجلة"
                        />
                      )}
                    </div>

                    {/* Day metadata preview */}
                    <div className="text-[10px] space-y-0.5">
                      {dayObj.totalDurationSeconds > 0 && (
                        <span className="text-indigo-400 font-mono block text-[9px] truncate">
                          {Math.round(dayObj.totalDurationSeconds / 60)} د
                        </span>
                      )}
                      {dayObj.hasNote && (
                        <span className="text-violet-400 text-[9px] block">يومية ✍️</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Indicators Legend */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-900 text-[11px] text-zinc-400 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>أيام بها أنشطة مسجلة</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-700" />
              <span>أيام بدون تسجيل كافٍ (محايد)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              <span>اليوم المحدد</span>
            </div>
          </div>
        </div>

        {/* Side Panel: Selected Day Detail (1 Col) */}
        <div className="rounded-3xl bg-zinc-950/70 border border-zinc-800/80 p-6 space-y-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <span className="text-[11px] text-zinc-500 block">تفاصيل اليوم المحدد</span>
                <h3 className="text-base font-bold text-zinc-100 font-mono">
                  {selectedDate || "اختر يوماً"}
                </h3>
              </div>
              {selectedDayInfo?.hasData ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                  سجلات موثقة ✓
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-500">
                  لا توجد سجلات
                </span>
              )}
            </div>

            {selectedDayInfo ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs text-zinc-300">جلسات التركيز</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-300">
                    {Math.round((selectedDayInfo.totalDurationSeconds || 0) / 60)} دقيقة
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-zinc-300">التدوينات المكتملة</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {selectedDayInfo.entriesCount || 0} تدوينات
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span className="text-xs text-zinc-300">المهام المنجزة</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-sky-400">
                    {selectedDayInfo.completedTasksCount || 0} مهام
                  </span>
                </div>

                {selectedDayInfo.hasNote && (
                  <div className="p-3.5 rounded-2xl bg-violet-950/20 border border-violet-500/30 text-xs text-violet-300 space-y-1">
                    <span className="font-bold flex items-center gap-1.5">
                      <BookMarked className="w-3.5 h-3.5" />
                      <span>يوجد يومية وملاحظة مسجلة</span>
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 py-6 text-center">
                اضغط على أي يوم في التقويم لاستعراض ملخصه التاريخي.
              </p>
            )}
          </div>

          {/* Jump to Full Day Overview */}
          <Link
            href={`/journal`}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/20 transition-all active:scale-95"
          >
            <span>استعراض اليوميات التفصيلية لهذا اليوم</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

