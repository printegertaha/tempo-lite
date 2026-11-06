"use client";

import { useState } from "react";
import { 
  BarChart3, 
  Calendar, 
  Sparkles, 
  Flame, 
  Clock, 
  Sun, 
  Sunset, 
  Moon, 
  Smile, 
  CheckCircle2, 
  Send,
  Zap,
  TrendingUp,
  Award
} from "lucide-react";

export default function DailyAnalyticsSection() {
  const [mood, setMood] = useState("great");
  const [journalNote, setJournalNote] = useState("");
  const [savedNotes, setSavedNotes] = useState([
    {
      id: 1,
      time: "منذ ساعتين",
      mood: "great",
      moodLabel: "منجز بقوة 🔥",
      text: "أتممت جلسة البرمجة الصباحية بكفاءة عالية، وحافظت على صلاة الضحى وقراءة ورد القرآن."
    }
  ]);
  const [noteSubmitted, setNoteSubmitted] = useState(false);

  // مصفوفة الـ 28 يوماً السابقة للمواظبة (Heatmap)
  const daysMatrix = [
    { day: 1, level: 3 }, { day: 2, level: 4 }, { day: 3, level: 2 }, { day: 4, level: 4 },
    { day: 5, level: 3 }, { day: 6, level: 4 }, { day: 7, level: 4 }, { day: 8, level: 1 },
    { day: 9, level: 4 }, { day: 10, level: 3 }, { day: 11, level: 4 }, { day: 12, level: 4 },
    { day: 13, level: 2 }, { day: 14, level: 4 }, { day: 15, level: 3 }, { day: 16, level: 4 },
    { day: 17, level: 4 }, { day: 18, level: 4 }, { day: 19, level: 3 }, { day: 20, level: 2 },
    { day: 21, level: 4 }, { day: 22, level: 4 }, { day: 23, level: 3 }, { day: 24, level: 4 },
    { day: 25, level: 4 }, { day: 26, level: 4 }, { day: 27, level: 3 }, { day: 28, level: 4 },
  ];

  const getHeatmapColor = (lvl) => {
    switch (lvl) {
      case 4: return "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.3)]";
      case 3: return "bg-emerald-600/70";
      case 2: return "bg-emerald-800/50";
      case 1: return "bg-zinc-800";
      default: return "bg-zinc-850";
    }
  };

  const moodsList = [
    { id: "great", label: "منجز بقوة", emoji: "🔥" },
    { id: "peaceful", label: "هادئ ومتزن", emoji: "🌿" },
    { id: "focused", label: "تركيز عميق", emoji: "⚡" },
    { id: "tired", label: "مجهد لكن صامد", emoji: "🛡️" },
  ];

  const handleSaveJournal = (e) => {
    e.preventDefault();
    if (!journalNote.trim()) return;

    const currentMoodObj = moodsList.find(m => m.id === mood);
    const newNote = {
      id: Date.now(),
      time: "الآن",
      mood,
      moodLabel: `${currentMoodObj.label} ${currentMoodObj.emoji}`,
      text: journalNote.trim()
    };

    setSavedNotes([newNote, ...savedNotes]);
    setJournalNote("");
    setNoteSubmitted(true);
    setTimeout(() => setNoteSubmitted(false), 3000);
  };

  return (
    <section id="analytics" className="w-full py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* العمود الأول: مصفوفة الالتزام الأسبوعي والشهري (Heatmap) */}
        <div className="lg:col-span-2 flex flex-col justify-between p-6 sm:p-8 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-2xl backdrop-blur-xl">
          <div>
            <div className="flex items-center justify-between pb-5 border-b border-zinc-800/70">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <BarChart3 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-zinc-100 font-bold text-lg tracking-tight">
                    مصفوفة الزخم الشهري (Consistency Grid)
                  </h3>
                  <span className="text-zinc-500 text-xs font-mono">سجل آخر 28 يوماً من الالتزام</span>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span>أقل</span>
                <span className="w-2.5 h-2.5 rounded-sm bg-zinc-800" />
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-800/50" />
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600/70" />
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span>أعلى</span>
              </div>
            </div>

            {/* Heatmap Grid */}
            <div className="py-6">
              <div className="grid grid-cols-7 sm:grid-cols-14 gap-2.5">
                {daysMatrix.map((item) => (
                  <div
                    key={item.day}
                    className={`h-8 sm:h-9 rounded-lg flex items-center justify-center font-mono text-[11px] font-bold text-zinc-950 transition-all hover:scale-110 cursor-pointer ${getHeatmapColor(item.level)}`}
                    title={`اليوم ${item.day}: مستوى الإنجاز ${item.level * 25}%`}
                  >
                    {item.day}
                  </div>
                ))}
              </div>
            </div>

            {/* Time of Day Rhythms */}
            <div className="pt-4 border-t border-zinc-800/70">
              <h4 className="text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-3">
                توزيع التركيز حسب أوقات اليوم
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Morning */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Sun className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-xs text-zinc-400 block">الفجر والصباح</span>
                    <span className="text-sm font-bold text-zinc-200 font-mono">100% منجز</span>
                  </div>
                </div>

                {/* Afternoon */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    <Sunset className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-xs text-zinc-400 block">الظهيرة والعصر</span>
                    <span className="text-sm font-bold text-zinc-200 font-mono">82% منجز</span>
                  </div>
                </div>

                {/* Night */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Moon className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-xs text-zinc-400 block">المساء والليل</span>
                    <span className="text-sm font-bold text-zinc-200 font-mono">جاري التنفيذ...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stat Footer */}
          <div className="mt-6 pt-4 border-t border-zinc-800/70 flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono">المعدل الشهري التراكمي: <strong className="text-emerald-400">89.4%</strong></span>
            <span className="flex items-center gap-1 text-violet-400">
              <Award className="w-4 h-4" />
              أفضل شهر في عام 2026
            </span>
          </div>
        </div>

        {/* العمود الثاني: أثر اليوم (تدوين وتفكر سريع مع المزاج) */}
        <div id="journal" className="flex flex-col justify-between p-6 sm:p-8 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-2xl backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-3 pb-5 border-b border-zinc-800/70">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-zinc-100 font-bold text-lg tracking-tight">أثـر اليوم</h3>
                <span className="text-zinc-500 text-xs">خاطرة سريعة وتفريغ ذهني يومي</span>
              </div>
            </div>

            {/* Mood selector */}
            <div className="py-4">
              <label className="text-xs text-zinc-400 block mb-2 font-medium">
                كيف تصف طاقتك وحضورك الذهني اليوم؟
              </label>
              <div className="grid grid-cols-2 gap-2">
                {moodsList.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMood(m.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      mood === m.id
                        ? "bg-violet-600/30 text-violet-200 border border-violet-500/50 shadow-sm"
                        : "bg-zinc-900/70 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
                    }`}
                  >
                    <span className="text-base">{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Journal Form */}
            <form onSubmit={handleSaveJournal} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1 font-medium">
                  ما الذي ترك أثراً حقيقياً في يومك اليوم؟
                </label>
                <textarea
                  rows={3}
                  value={journalNote}
                  onChange={(e) => setJournalNote(e.target.value)}
                  placeholder="دوّن إنجازاً تشكر الله عليه، أو فكرة برمجية، أو درساً تعلمته..."
                  className="w-full rounded-2xl bg-zinc-900/80 border border-zinc-800/80 p-3.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/40 resize-none transition-all"
                />
              </div>

              <div className="flex items-center justify-between">
                {noteSubmitted ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4" />
                    تم حفظ أثرك في السجل!
                  </span>
                ) : (
                  <span className="text-[11px] text-zinc-500">حفظ محلي فوري</span>
                )}

                <button
                  type="submit"
                  disabled={!journalNote.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-violet-600/20 transition-all cursor-pointer active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>تثبيت الأثر</span>
                </button>
              </div>
            </form>

            {/* Recent Recorded Notes */}
            {savedNotes.length > 0 && (
              <div className="mt-5 pt-4 border-t border-zinc-800/70">
                <span className="text-[11px] text-zinc-400 font-medium block mb-2">
                  آخر الملاحظات المسجلة:
                </span>
                <div className="space-y-2 max-h-36 overflow-y-auto scrollbar-none">
                  {savedNotes.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                        <span className="font-semibold text-violet-400">{item.moodLabel}</span>
                        <span>{item.time}</span>
                      </div>
                      <p className="text-zinc-300 leading-relaxed font-sans">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}

