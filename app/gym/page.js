"use client";

import { useState } from "react";
import { useAthar } from "@/components/context/AtharContext";
import { 
  Dumbbell, 
  Check, 
  Plus, 
  Flame, 
  Trophy, 
  Activity, 
  Sparkles, 
  RotateCcw,
  Clock,
  ArrowRight,
  Play,
  Trash2
} from "lucide-react";
import Link from "next/link";

export default function GymPage() {
  const { 
    gymData, 
    toggleGymSet, 
    showToast, 
    openGymModal, 
    startTimer,
    getDayRecords,
    selectedDate,
    deleteGymSession
  } = useAthar();

  const [restTimerSeconds, setRestTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const dayRecords = getDayRecords(selectedDate);
  const loggedGymSessions = dayRecords.gymSessions || [];

  // Simple rest timer
  const startRestTimer = (seconds = 90) => {
    setRestTimerSeconds(seconds);
    setTimerActive(true);
    showToast(`بدأ مؤقت الراحة (${seconds} ثانية) ⏱️`, "info");
  };

  const plan = gymData.todayWorkoutPlan;

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
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100">منظومة القوة وبناء الأجسام</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-orange-500/15 text-orange-300 border border-orange-500/25">
                {gymData.currentSplit}
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-1">
              سجل الجولات، متابعة الأحمال التدريبية (RPE)، وحالة استشفاء العضلات
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => startTimer("gym", "تمرين حديد بالنادي")}
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

      {/* 2. Top Stats: Personal Records & Consistency */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0c0e17]/80 border border-zinc-800 text-center">
          <span className="text-xs text-zinc-400">أقصى وزن بنش برس (1RM)</span>
          <div className="text-xl font-black font-mono text-orange-400 mt-1">
            {gymData.stats.benchMaxKg} كجم
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c0e17]/80 border border-zinc-800 text-center">
          <span className="text-xs text-zinc-400">أقصى وزن سكوات (1RM)</span>
          <div className="text-xl font-black font-mono text-zinc-100 mt-1">
            {gymData.stats.squatMaxKg} كجم
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c0e17]/80 border border-zinc-800 text-center">
          <span className="text-xs text-zinc-400">أقصى وزن ديدليفت (1RM)</span>
          <div className="text-xl font-black font-mono text-zinc-100 mt-1">
            {gymData.stats.deadliftMaxKg} كجم
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c0e17]/80 border border-zinc-800 text-center">
          <span className="text-xs text-zinc-400">تمارين هذا الشهر</span>
          <div className="text-xl font-black font-mono text-emerald-400 mt-1">
            {gymData.stats.totalWorkoutsThisMonth} تمرين
          </div>
        </div>
      </div>

      {/* 3. Today's Logged Gym Sessions (Saved Locally) */}
      {loggedGymSessions.length > 0 && (
        <div className="p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400" />
              <span>تمارين اليوم الموثقة ({loggedGymSessions.length})</span>
            </h3>
            <span className="text-xs font-mono text-orange-400 font-bold">
              {loggedGymSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0)} دقيقة إجمالية
            </span>
          </div>

          <div className="divide-y divide-zinc-850">
            {loggedGymSessions.map((session) => (
              <div key={session.id} className="py-3 flex items-center justify-between group">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-200">{session.workoutType}</span>
                    <span className="text-xs font-mono font-bold text-orange-400">{session.durationMinutes} دقيقة</span>
                    <span className="text-[11px] text-zinc-500 font-mono">({session.startTime} - {session.endTime})</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    النادي: <b className="text-zinc-300">{session.gymName}</b> {session.notes ? `• ${session.notes}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteGymSession(session.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-500 hover:text-rose-400 transition-opacity"
                  title="حذف الجلسة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Active Workout Plan & Sets Table */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-800">
          <div>
            <span className="text-xs text-orange-400 font-bold uppercase tracking-wider block">خطة تمرين اليوم</span>
            <h2 className="text-lg font-black text-zinc-100 mt-0.5">{plan.title}</h2>
          </div>
          <span className="text-xs text-zinc-400 font-mono bg-zinc-900 px-3 py-1 rounded-xl border border-zinc-800">
            المدة المقدرة: {plan.estimatedDuration}
          </span>
        </div>

        <div className="space-y-6">
          {plan.exercises.map((exercise) => (
            <div 
              key={exercise.id}
              className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">{exercise.name}</h3>
                  <span className="text-xs text-zinc-400">{exercise.targetMuscles}</span>
                </div>
              </div>

              {/* Sets Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-semibold">
                      <th className="pb-2 pr-2">الجولة</th>
                      <th className="pb-2">الوزن (كجم)</th>
                      <th className="pb-2">العدات</th>
                      <th className="pb-2">شدة الجهد (RPE)</th>
                      <th className="pb-2 text-center">الإنجاز</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {exercise.sets.map((set) => (
                      <tr key={set.set} className="text-zinc-200">
                        <td className="py-2.5 pr-2 font-mono font-bold text-zinc-400">#{set.set}</td>
                        <td className="py-2.5 font-mono font-bold text-orange-300">
                          {set.weight} كجم
                          {set.isPR && (
                            <span className="mr-2 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              رقم قياسي! 🔥
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 font-mono">{set.reps} عدة</td>
                        <td className="py-2.5 font-mono text-zinc-400">{set.rpe} / 10</td>
                        <td className="py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleGymSet(exercise.id, set.set)}
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-xl border transition-all active:scale-90 cursor-pointer ${
                              set.completed
                                ? "bg-emerald-500 border-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/30"
                                : "bg-zinc-800 border-zinc-700 text-transparent hover:border-zinc-500"
                            }`}
                            title={set.completed ? "مكتملة" : "تأكيد الجولة"}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Muscle Recovery Status Map */}
      <div className="p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-zinc-100">خريطة استشفاء العضلات</h3>
            <p className="text-xs text-zinc-400 mt-0.5">جاهزية العضلات للتمرين التالي بناءً على الأحمال السابقة</p>
          </div>
          <span className="text-xs font-mono text-zinc-400">تحديث فوري</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {gymData.muscleRecovery.map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-200">{item.muscle}</span>
                <span className="text-xs font-mono font-bold text-zinc-400">{item.recoveryPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden mb-2">
                <div 
                  className={`h-full rounded-full ${item.recoveryPercent >= 80 ? "bg-emerald-500" : item.recoveryPercent >= 50 ? "bg-amber-500" : "bg-rose-500"}`} 
                  style={{ width: `${item.recoveryPercent}%` }} 
                />
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md w-fit border border-current/20 ${item.color}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
