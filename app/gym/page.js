"use client";

import { useMemo, useState } from "react";
import { useAthar } from "@/components/context/AtharContext";
import DatePickerField from "@/components/ui/DatePickerField";
import {
  Dumbbell,
  Plus,
  Clock,
  Play,
  Trash2,
  Scale,
} from "lucide-react";

export default function GymPage() {
  const {
    gymData,
    appState,
    openGymModal,
    startTimer,
    getDayRecords,
    selectedDate,
    deleteGymSession,
    addBodyWeight,
    deleteBodyWeight,
  } = useAthar();

  const [weightInput, setWeightInput] = useState("");
  const [weightDate, setWeightDate] = useState(selectedDate || "");

  const dayRecords = getDayRecords(selectedDate);
  const loggedGymSessions = dayRecords.gymSessions || [];

  // Aggregate real user workouts across all recorded days
  const allWorkouts = useMemo(() => {
    const rows = [];
    const records = appState?.recordsByDate || {};
    for (const [dateKey, day] of Object.entries(records)) {
      for (const s of day?.gymSessions || []) {
        rows.push({ ...s, date: s.date || dateKey });
      }
    }
    rows.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return rows;
  }, [appState?.recordsByDate]);

  // Derive real stats strictly from actual logged workouts (0 when none exist)
  const realStats = useMemo(() => {
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    const workoutsThisMonth = allWorkouts.filter((w) =>
      (w.date || "").startsWith(currentMonthPrefix)
    ).length;

    let maxWeightOverall = 0;
    let totalMinutes = 0;
    for (const w of allWorkouts) {
      totalMinutes += Number(w.durationMinutes || 0);
      for (const ex of w.exercises || []) {
        const wKg = Number(ex?.weightKg || ex?.weight || 0);
        if (Number.isFinite(wKg) && wKg > maxWeightOverall) {
          maxWeightOverall = wKg;
        }
      }
    }

    const weights = Array.isArray(gymData?.bodyWeights) ? gymData.bodyWeights : [];
    const latestBodyWeight = weights.length > 0 ? Number(weights[0].weightKg || 0) : null;

    return {
      workoutsThisMonth,
      totalWorkouts: allWorkouts.length,
      totalMinutes,
      maxWeightOverall,
      latestBodyWeight,
      weights,
    };
  }, [allWorkouts, gymData]);

  const handleSaveWeight = (e) => {
    e.preventDefault();
    const numeric = Number(weightInput);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    addBodyWeight?.(numeric, weightDate || selectedDate);
    setWeightInput("");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-600/10 border border-orange-500/20 text-orange-400">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100">
                منظومة التمرين والقوة البدنية
              </h1>
              {allWorkouts[0]?.workoutType && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-orange-500/15 text-orange-300 border border-orange-500/25">
                  {allWorkouts[0].workoutType.split(" (")[0]}
                </span>
              )}
            </div>
            <p className="text-zinc-400 text-xs mt-1">
              سجل تمارينك الفعلية وأوزان التمرين وقياسات وزن الجسم دون أي بيانات افتراضية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => startTimer("gym", "تمرين جيم")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 text-xs font-bold border border-orange-500/30 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-orange-300" />
            <span>بدء مؤقت التمرين</span>
          </button>

          <button
            type="button"
            onClick={openGymModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold shadow-md shadow-orange-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>توثيق تمرين جديد</span>
          </button>
        </div>
      </div>

      {/* 2. Real Stats (Starts clean at 0 / غير مسجل) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0c0e17]/80 border border-zinc-800 text-center">
          <span className="text-xs text-zinc-400">أعلى وزن مرفوع مسجل</span>
          <div className="text-xl font-black font-mono text-orange-400 mt-1">
            {realStats.maxWeightOverall > 0 ? `${realStats.maxWeightOverall} كجم` : "0 كجم"}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c0e17]/80 border border-zinc-800 text-center">
          <span className="text-xs text-zinc-400">آخر قياس لوزن الجسم</span>
          <div className="text-xl font-black font-mono text-zinc-100 mt-1">
            {realStats.latestBodyWeight ? `${realStats.latestBodyWeight} كجم` : "—"}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c0e17]/80 border border-zinc-800 text-center">
          <span className="text-xs text-zinc-400">تمارين هذا الشهر</span>
          <div className="text-xl font-black font-mono text-emerald-400 mt-1">
            {realStats.workoutsThisMonth} تمرين
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c0e17]/80 border border-zinc-800 text-center">
          <span className="text-xs text-zinc-400">إجمالي وقت التمرين</span>
          <div className="text-xl font-black font-mono text-zinc-100 mt-1">
            {realStats.totalMinutes} دقيقة
          </div>
        </div>
      </div>

      {/* 3. Body Weight Tracker — Empty Input by Default, Never Auto-Saves Zero */}
      <div className="p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <Scale className="w-4 h-4 text-orange-400" />
            <div>
              <h3 className="text-sm font-bold text-zinc-100">سجل قياسات وزن الجسم</h3>
              <p className="text-[11px] text-zinc-400">
                أدخل قياس وزنك يدوياً فقط عند الرغبة في المتابعة
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveWeight} className="flex items-center gap-2 flex-wrap">
            <input
              type="number"
              min="1"
              step="0.1"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="الوزن (كجم)"
              className="w-32 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-100 focus:outline-none focus:border-orange-500"
            />
            <DatePickerField
              value={weightDate || selectedDate}
              onChange={(d) => setWeightDate(d)}
              title="تاريخ قياس الوزن"
              className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-200 focus:outline-none focus:border-orange-500 min-w-[130px]"
            />
            <button
              type="submit"
              disabled={!weightInput || Number(weightInput) <= 0}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all cursor-pointer"
            >
              تسجيل الوزن
            </button>
          </form>
        </div>

        {realStats.weights.length === 0 ? (
          <p className="text-xs text-zinc-500 py-3 text-center">
            لا توجد قياسات وزن جسم مسجلة بعد.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {realStats.weights.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs"
              >
                <span className="font-mono font-bold text-orange-300">{entry.weightKg} كجم</span>
                <span className="text-[11px] font-mono text-zinc-500">{entry.date}</span>
                <button
                  type="button"
                  onClick={() => deleteBodyWeight?.(entry.id)}
                  className="text-zinc-500 hover:text-rose-400"
                  title="حذف القياس"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Today's & Historical Logged Workouts OR Clean Empty State */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-400" />
            <span>سجل التمارين والجلسات ({allWorkouts.length})</span>
          </h3>
          {loggedGymSessions.length > 0 && (
            <span className="text-xs font-mono text-orange-400 font-bold">
              اليوم: {loggedGymSessions.length} جلسة
            </span>
          )}
        </div>

        {allWorkouts.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Dumbbell className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h4 className="text-base font-bold text-zinc-100">لسه مفيش تمارين مسجلة</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                سجل التمارين والأوزان الخاصة بك يبدأ فارغاً حتى توثّق أول جلسة تدريب حقيقية لك.
              </p>
            </div>
            <button
              type="button"
              onClick={openGymModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-orange-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>توثيق أول تمرين</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-850">
            {allWorkouts.map((session) => (
              <div key={session.id} className="py-3.5 flex items-center justify-between gap-4 group">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-zinc-100">
                      {session.workoutType}
                    </span>
                    <span className="text-xs font-mono font-bold text-orange-400">
                      {session.durationMinutes} دقيقة
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {session.date}
                      {session.startTime ? ` (${session.startTime} - ${session.endTime})` : ""}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    المكان: <b className="text-zinc-300">{session.gymName || "النادي الرياضي"}</b>
                    {session.notes ? ` • ${session.notes}` : ""}
                  </p>
                  {Array.isArray(session.exercises) && session.exercises.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {session.exercises.map((ex, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"
                        >
                          {ex.name}
                          {Number(ex.weightKg || ex.weight) > 0
                            ? ` • ${ex.weightKg || ex.weight} كجم`
                            : ""}
                          {Number(ex.reps) > 0 ? ` × ${ex.reps}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => deleteGymSession(session.id, session.date)}
                  className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-zinc-500 hover:text-rose-400 transition-opacity"
                  title="حذف الجلسة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
