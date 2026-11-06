"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Dumbbell, 
  Code2, 
  BookOpen, 
  Wallet, 
  Moon, 
  Smartphone, 
  Footprints,
  ArrowUpRight,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  Filter,
  Check,
  ChevronDown,
  RotateCcw
} from "lucide-react";

export default function HeroSection() {
  // بيانات الـ 8 عادات الرئيسية مع الحفاظ الكامل على كافة البيانات الأصلية وتوسيعها
  const [habits, setHabits] = useState([
    { 
      id: "prayer",
      name: "الصلاة", 
      progress: 100, 
      target: "5/5 فروض", 
      status: "+4.2%", 
      isUp: true, 
      icon: Flame, 
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      accentGlow: "emerald",
      streak: 42,
      category: "عبادات",
      history: [60, 80, 100, 100, 100, 100, 100]
    },
    { 
      id: "gym",
      name: "الجيم", 
      progress: 85, 
      target: "ساعة تمرين", 
      status: "+1.8%", 
      isUp: true, 
      icon: Dumbbell, 
      color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
      accentGlow: "orange",
      streak: 12,
      category: "رياضة",
      history: [40, 60, 70, 80, 85, 80, 85]
    },
    { 
      id: "coding",
      name: "البرمجة", 
      progress: 75, 
      target: "3 ساعات سداسية", 
      status: "+12.5%", 
      isUp: true, 
      icon: Code2, 
      color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
      accentGlow: "cyan",
      streak: 28,
      category: "إنتاجية",
      history: [30, 45, 60, 50, 70, 65, 75]
    },
    { 
      id: "study",
      name: "المذاكرة", 
      progress: 40, 
      target: "الفصل الثاني", 
      status: "-2.1%", 
      isUp: false, 
      icon: BookOpen, 
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      accentGlow: "indigo",
      streak: 5,
      category: "دراسة",
      history: [70, 65, 60, 50, 45, 45, 40]
    },
    { 
      id: "running",
      name: "الجري", 
      progress: 100, 
      target: "5 كم مكتملة", 
      status: "+5.0%", 
      isUp: true, 
      icon: Footprints, 
      color: "text-lime-400 bg-lime-500/10 border-lime-500/20",
      accentGlow: "lime",
      streak: 8,
      category: "رياضة",
      history: [50, 60, 75, 80, 90, 100, 100]
    },
    { 
      id: "social",
      name: "السوشيال ميديا", 
      progress: 60, 
      target: "تحت السيطرة", 
      status: "-8.4%", 
      isUp: true, 
      icon: Smartphone, 
      color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
      accentGlow: "pink",
      streak: 9,
      category: "انضباط",
      history: [90, 85, 80, 75, 70, 65, 60]
    },
    { 
      id: "expenses",
      name: "المصاريف", 
      progress: 90, 
      target: "ضمن الميزانية", 
      status: "+0.5%", 
      isUp: true, 
      icon: Wallet, 
      color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      accentGlow: "rose",
      streak: 16,
      category: "مالية",
      history: [60, 70, 75, 80, 85, 90, 90]
    },
    { 
      id: "sleep",
      name: "النوم المبكر", 
      progress: 50, 
      target: "4.5 / 8 ساعات", 
      status: "-3.2%", 
      isUp: false, 
      icon: Moon, 
      color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
      accentGlow: "sky",
      streak: 6,
      category: "صحة",
      history: [80, 75, 60, 50, 55, 50, 50]
    },
  ]);

  const [activeFilter, setActiveFilter] = useState("all");

  // التفاعل: تبديل حالة إكمال العادة بضغطة واحدة
  const toggleHabitComplete = (id) => {
    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        const isCompleted = h.progress === 100;
        return {
          ...h,
          progress: isCompleted ? 50 : 100,
          status: isCompleted ? "-4.0%" : "+5.0%",
          isUp: !isCompleted,
        };
      }
      return h;
    }));
  };

  // حساب الإحصائيات الإجمالية ديناميكياً
  const totalHabits = habits.length;
  const completedHabits = habits.filter(h => h.progress === 100).length;
  const averageProgress = Math.round(
    habits.reduce((acc, curr) => acc + curr.progress, 0) / totalHabits
  );

  // تصفية العادات
  const filteredHabits = habits.filter(h => {
    if (activeFilter === "completed") return h.progress === 100;
    if (activeFilter === "pending") return h.progress < 100;
    return true;
  });

  return (
    <section className="w-full py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Executive Card with Subtle Gradient Border */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 p-6 sm:p-8 lg:p-10 shadow-2xl backdrop-blur-xl">
        
        {/* Ambient atmospheric glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-indigo-600/8 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-8">
          
          {/* Executive Overview Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-zinc-800/70">
            {/* Title & Status */}
            <div className="flex items-start gap-4">
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/25 shrink-0">
                <Activity className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-zinc-100 font-extrabold text-xl sm:text-2xl tracking-tight">
                    مؤشر الإنجاز اليومي (Athar Index)
                  </h1>
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    جلسة اليوم حية
                  </span>
                </div>
                <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                  أنت متقدم بنسبة <span className="text-emerald-400 font-bold font-mono">+12.5%</span> مقارنة بمتوسط الأسبوع السابق. متبقي لك عادتين لإغلاق اليوم بالكامل.
                </p>
              </div>
            </div>

            {/* Live Financial / Metric Ticker Pills */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 p-2 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md">
              {/* Daily Yield */}
              <div className="flex flex-col px-3 py-1 text-right">
                <span className="text-[11px] text-zinc-400">عائد اليوم</span>
                <span className="text-emerald-400 text-base sm:text-lg font-extrabold font-mono flex items-center gap-1 mt-0.5">
                  <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                  <span>{averageProgress}%</span>
                </span>
              </div>

              <div className="border-r border-zinc-800 my-1" />

              {/* Connected Streak */}
              <div className="flex flex-col px-3 py-1 text-right">
                <span className="text-[11px] text-zinc-400">الستريك المتصل</span>
                <span className="text-amber-400 text-base sm:text-lg font-extrabold font-mono flex items-center gap-1 mt-0.5">
                  <Flame className="w-4 h-4 fill-amber-400" />
                  <span>14 يوم</span>
                </span>
              </div>

              <div className="border-r border-zinc-800 my-1" />

              {/* Habits Closed */}
              <div className="flex flex-col px-3 py-1 text-right">
                <span className="text-[11px] text-zinc-400">العادات المغلقة</span>
                <span className="text-zinc-100 text-base sm:text-lg font-extrabold font-mono mt-0.5">
                  {completedHabits} <span className="text-zinc-500 text-xs font-normal">/ {totalHabits}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Sub-bar: Filter Badges & Quick Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-xs font-medium flex items-center gap-1.5 ml-1">
                <Filter className="w-3.5 h-3.5 text-zinc-400" />
                عرض المؤشرات:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveFilter("all")}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    activeFilter === "all"
                      ? "bg-zinc-800 text-white border border-zinc-700 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  الكل ({totalHabits})
                </button>
                <button
                  onClick={() => setActiveFilter("completed")}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    activeFilter === "completed"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  المكتملة ({completedHabits})
                </button>
                <button
                  onClick={() => setActiveFilter("pending")}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    activeFilter === "pending"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  قيد العمل ({totalHabits - completedHabits})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span className="hidden sm:inline-block">💡 اضغط على علامة الصح لتسجيل الإنجاز الفوري</span>
            </div>
          </div>

          {/* Grid Cards: 8 Habits with Stock Terminals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredHabits.map((habit) => {
              const Icon = habit.icon;
              const isDone = habit.progress === 100;

              return (
                <div 
                  key={habit.id}
                  className={`relative flex flex-col justify-between p-5 rounded-2xl transition-all duration-300 group border backdrop-blur-sm ${
                    isDone 
                      ? "bg-[#111420]/90 border-emerald-500/30 hover:border-emerald-500/50 shadow-lg shadow-emerald-950/10" 
                      : "bg-[#0e101a]/90 border-zinc-800/80 hover:border-zinc-700 hover:bg-[#121522] shadow-sm"
                  }`}
                >
                  {/* Top Row: Icon + Trend Badge + Checkbox Toggle */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className={`flex items-center justify-center w-10 h-10 rounded-xl border ${habit.color} group-hover:scale-105 transition-transform duration-300`}>
                        <Icon className="w-5 h-5" />
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-400 border border-zinc-700/40">
                        {habit.category}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${
                        habit.isUp 
                          ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                          : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                      }`}>
                        {habit.isUp ? <TrendingUp className="w-3 h-3 stroke-[2.5]" /> : <TrendingDown className="w-3 h-3 stroke-[2.5]" />}
                        <span>{habit.status}</span>
                      </span>

                      {/* Interactive Fast Toggle Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleHabitComplete(habit.id)}
                        className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all cursor-pointer ${
                          isDone 
                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30" 
                            : "bg-zinc-800/90 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 border border-zinc-700/60"
                        }`}
                        title={isDone ? "تم الإكمال! اضغط للإلغاء" : "اضغط لتسجيل الإكمال الفوري"}
                        aria-label={`تحديد ${habit.name}`}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                  </div>

                  {/* Middle: Habit Name & Target & Mini Sparkline */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-100 font-bold text-base tracking-wide group-hover:text-white transition-colors">
                        {habit.name}
                      </span>
                      <span className="text-[11px] font-mono text-amber-400/90 flex items-center gap-1">
                        🔥 {habit.streak} يوم
                      </span>
                    </div>

                    <span className="text-zinc-400 text-xs font-mono mt-1 block">
                      الهدف: {habit.target}
                    </span>

                    {/* Mini Sparkline Chart (Simulating stock performance trend) */}
                    <div className="mt-3 h-6 w-full flex items-end gap-1.5">
                      {habit.history.map((val, idx) => (
                        <div 
                          key={idx} 
                          className="flex-1 bg-zinc-800/80 rounded-t-sm hover:bg-violet-400/80 transition-colors"
                          style={{ 
                            height: `${Math.max(15, (val / 100) * 24)}px`,
                            backgroundColor: idx === habit.history.length - 1 
                              ? (isDone ? '#10b981' : '#8b5cf6') 
                              : undefined
                          }}
                          title={`اليوم ${idx + 1}: ${val}%`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Bottom: Progress Bar & Percentage Number */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-zinc-800/60">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-zinc-400">نسبة الإنجاز</span>
                      <span className={`font-extrabold ${isDone ? "text-emerald-400" : "text-zinc-200"}`}>
                        {habit.progress}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-zinc-800/90 h-2.5 rounded-full overflow-hidden p-0.5">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          habit.progress === 100 
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                            : habit.progress >= 70 
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-500' 
                            : habit.progress >= 40 
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-400' 
                            : 'bg-gradient-to-r from-rose-500 to-red-400'
                        }`} 
                        style={{ width: `${habit.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-zinc-800/60">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono">
              <span className="inline-block w-2 h-2 rounded-full bg-violet-400" />
              <span>* جميع المؤشرات ومعدلات الصعود والهبوط محسوبة وفق جلسة اليوم</span>
            </div>
            
            <Link 
              href="/#analytics" 
              className="inline-flex items-center gap-2 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors group"
            >
              <span>عرض السجل التحليلي الشامل والأسبوعي</span>
              <ArrowUpRight className="w-4 h-4 group-hover:-translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
