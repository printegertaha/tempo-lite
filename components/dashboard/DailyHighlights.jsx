"use client";

import { useState } from "react";
import { useAthar } from "../context/AtharContext";
import { 
  Sparkles, 
  Flame, 
  TrendingUp, 
  Award, 
  Smile, 
  Zap, 
  Heart,
  ChevronLeft
} from "lucide-react";
import Link from "next/link";

export default function DailyHighlights() {
  const { showToast } = useAthar();
  const [currentMood, setCurrentMood] = useState("great");

  const moods = [
    { id: "great", label: "منجز ومتحفز", emoji: "🔥" },
    { id: "peaceful", label: "هادئ ومطمئن", emoji: "🌿" },
    { id: "focused", label: "تركيز عميق", emoji: "⚡" },
    { id: "grateful", label: "شاكر وممتن", emoji: "🤍" },
    { id: "tired", label: "مجهد لكن صامد", emoji: "🛡️" },
  ];

  const handleSelectMood = (mood) => {
    setCurrentMood(mood.id);
    showToast(`تم تسجيل الحالة النفسية: ${mood.label} ${mood.emoji}`, "info");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Overall Consistency & Daily Score Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c0e17] to-[#121624] border border-zinc-800/80 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/70">
            <span className="text-xs font-semibold text-zinc-400">مؤشر الإنجاز والاتزان العام</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-violet-500/15 text-violet-300 border border-violet-500/25">
              اليوم: 94%
            </span>
          </div>

          <div className="flex items-center gap-5 my-4">
            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-violet-600/10 border-2 border-violet-500/30">
              <span className="text-2xl font-black font-mono text-violet-400">94%</span>
            </div>
            <div>
              <h4 className="text-zinc-100 font-bold text-base">يوم استثنائي بامتياز</h4>
              <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                حافظت على 10 من أصل 10 التزامات رئيسية، مع جودة تركيز تفوق المتوسط بـ 25%.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-850 flex items-center justify-between text-xs">
          <span className="text-zinc-400">سلسلة الالتزام الكبرى</span>
          <span className="text-amber-400 font-mono font-bold flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 fill-amber-400" />
            <span>14 يوماً متواصلاً</span>
          </span>
        </div>
      </div>

      {/* 2. Mood & Energy Tracker */}
      <div className="p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/70">
            <span className="text-xs font-semibold text-zinc-400">الحالة الذهنية والنفسية</span>
            <span className="text-xs font-mono text-zinc-500">اليومية</span>
          </div>

          <p className="text-xs text-zinc-300 my-3">
            كيف تصف حضورك الذهني ونقاء روحك في هذه اللحظة؟
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {moods.map((m) => {
              const active = currentMood === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelectMood(m)}
                  className={`flex items-center gap-1.5 p-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                    active
                      ? "bg-violet-600/20 border-violet-500/50 text-violet-200 shadow-sm"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
                  }`}
                >
                  <span className="text-base">{m.emoji}</span>
                  <span className="truncate">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-850 flex items-center justify-between text-xs text-zinc-400">
          <span>يتم ربط الحالة بالإحصائيات الحيوية</span>
          <Link href="/analytics" className="text-violet-400 hover:underline">
            تحليل الارتباط &larr;
          </Link>
        </div>
      </div>

      {/* 3. Daily Wisdom & Impact Note */}
      <div className="p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/70 text-zinc-400 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>بوصلة الأثر اليومي</span>
          </div>

          <blockquote className="my-4 text-xs text-zinc-300 italic leading-relaxed">
            «أحبُّ الأعمالِ إلى اللهِ أدْومُها وإنْ قَلّ.. الأثرُ لا يُبنى بقفزات متباعدة، بل بتراكم الخطوات الصادقة يوماً بعد يوم دون انقطاع.»
          </blockquote>
        </div>

        <div className="pt-3 border-t border-zinc-850 flex items-center justify-between text-xs">
          <span className="text-zinc-400">تخليد اللحظة</span>
          <Link 
            href="/journal"
            className="flex items-center gap-1 text-violet-400 hover:text-violet-300 font-semibold"
          >
            <span>اكتب خواطر اليوم</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

    </div>
  );
}

