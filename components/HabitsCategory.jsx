"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Flame, 
  Dumbbell, 
  Gamepad2, 
  Crown, 
  Wallet, 
  Code2, 
  BookOpen, 
  BookMarked, 
  GraduationCap, 
  Footprints, 
  Smartphone, 
  CigaretteOff, 
  Moon,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

// قائمة الـ 13 عادة الأصلية مع تعزيز البيانات والنسب والفئات
export const INITIAL_HABITS_LIST = [
  { id: "salah", name: "الصلاة", category: "spiritual", icon: Flame, progressVal: 100, target: "5/5 فروض", streak: 42, color: "emerald", href: "/#salah" },
  { id: "gym", name: "الجيم", category: "health", icon: Dumbbell, progressVal: 85, target: "ساعة ونصف تمرين", streak: 12, color: "orange", href: "/#gym" },
  { id: "running", name: "الجري", category: "health", icon: Footprints, progressVal: 100, target: "5 كم معتدل", streak: 8, color: "lime", href: "/#running" },
  { id: "coding", name: "البرمجة", category: "intellect", icon: Code2, progressVal: 75, target: "3 ساعات عمل عميق", streak: 28, color: "cyan", href: "/#coding" },
  { id: "studying", name: "المذاكرة", category: "intellect", icon: BookOpen, progressVal: 40, target: "الفصل الثاني", streak: 5, color: "indigo", href: "/#studying" },
  { id: "reading", name: "القراءة", category: "intellect", icon: BookMarked, progressVal: 100, target: "30 صفحة يومياً", streak: 19, color: "violet", href: "/#reading" },
  { id: "university", name: "الجامعة", category: "intellect", icon: GraduationCap, progressVal: 100, target: "المحاضرات والمشاريع", streak: 14, color: "blue", href: "/#university" },
  { id: "social", name: "السوشيال ميديا", category: "discipline", icon: Smartphone, progressVal: 60, target: "أقل من 60 دقيقة", streak: 9, color: "pink", href: "/#social" },
  { id: "smoking", name: "التدخين", category: "discipline", icon: CigaretteOff, progressVal: 0, target: "0 سجائر (مقاوم)", streak: 90, color: "rose", href: "/#smoking" },
  { id: "expenses", name: "المصاريف", category: "discipline", icon: Wallet, progressVal: 90, target: "ضمن الميزانية", streak: 16, color: "amber", href: "/#expenses" },
  { id: "sleep", name: "النوم المبكر", category: "health", icon: Moon, progressVal: 50, target: "استيقاظ الفجر", streak: 6, color: "sky", href: "/#sleep" },
  { id: "chess", name: "الشطرنج", category: "mind", icon: Crown, progressVal: 25, target: "3 مباريات تكتيكية", streak: 3, color: "yellow", href: "/#chess" },
  { id: "gaming", name: "ببجي", category: "mind", icon: Gamepad2, progressVal: 35, target: "مباراة واحدة للترويح", streak: 2, color: "purple", href: "/#gaming" },
];

const CATEGORY_TABS = [
  { id: "all", label: "جميع العادات", count: 13 },
  { id: "spiritual", label: "روحانية وإيمانية", count: 1 },
  { id: "health", label: "صحة ولياقة", count: 3 },
  { id: "intellect", label: "تطوير ومهارات", count: 4 },
  { id: "discipline", label: "انضباط وسلوك", count: 3 },
  { id: "mind", label: "ترويح وفكر", count: 2 },
];

export default function HabitsCategory({ activeCategory = "all", onSelectCategory }) {
  const [selected, setSelected] = useState(activeCategory);

  const handleSelect = (catId) => {
    setSelected(catId);
    if (onSelectCategory) {
      onSelectCategory(catId);
    }
  };

  const filteredHabits = selected === "all" 
    ? INITIAL_HABITS_LIST 
    : INITIAL_HABITS_LIST.filter(h => h.category === selected);

  return (
    <section id="habits" className="w-full py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Category Navigation Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-zinc-100 font-bold text-base tracking-tight flex items-center gap-2">
              <span>تصنيفات العادات المفتوحة</span>
              <span className="text-xs font-mono text-zinc-500">({INITIAL_HABITS_LIST.length})</span>
            </h2>
            <p className="text-zinc-400 text-xs">تصفح مسارات حياتك حسب الأولوية والتصنيف</p>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
            const isActive = selected === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelect(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-violet-600 text-white shadow-md shadow-violet-600/30 border border-violet-500/50"
                    : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400"
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Habits Horizontal Ribbon */}
      <div className="relative group">
        <nav aria-label="Habits Categories List">
          <ul className="flex items-center gap-3 overflow-x-auto py-2 px-1 scrollbar-none scroll-smooth">
            {filteredHabits.map((habit) => {
              const Icon = habit.icon;
              const isFull = habit.progressVal === 100;

              return (
                <li key={habit.id} className="shrink-0 snap-start">
                  <Link 
                    href={habit.href}
                    className="group relative flex items-center gap-3.5 bg-zinc-900/70 hover:bg-zinc-850 border border-zinc-800/80 hover:border-violet-500/40 px-4 py-3 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-violet-600/5 overflow-hidden backdrop-blur-sm"
                  >
                    {/* Bottom Progress Accent Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-zinc-800/90">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          isFull 
                            ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                            : "bg-gradient-to-r from-violet-600 to-indigo-400"
                        }`}
                        style={{ width: `${habit.progressVal}%` }}
                      />
                    </div>

                    {/* Icon Container */}
                    <span className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${
                      isFull 
                        ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 group-hover:scale-105" 
                        : "bg-violet-500/10 border border-violet-500/20 text-violet-400 group-hover:scale-105 group-hover:bg-violet-500/20"
                    }`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    
                    {/* Details */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-100 text-sm font-semibold tracking-wide group-hover:text-white transition-colors">
                          {habit.name}
                        </span>
                        {isFull && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="مكتملة اليوم" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                        <span>{habit.target}</span>
                        <span>•</span>
                        <span className={isFull ? "text-emerald-400 font-bold" : "text-zinc-300"}>
                          {habit.progressVal}%
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </section>
  );
}
