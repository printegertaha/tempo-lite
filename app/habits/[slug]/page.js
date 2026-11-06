"use client";

import { useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { useAthar } from "@/components/context/AtharContext";
import { formatDurationDetailed, formatDigitalClock } from "@/components/data/storage";
import Link from "next/link";
import { 
  Flame, 
  Dumbbell, 
  Footprints, 
  Code2, 
  BookMarked, 
  Smartphone, 
  Cigarette, 
  CigaretteOff, 
  Wallet, 
  Moon, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  Settings,
  Plus,
  Play,
  Trash2,
  MapPin,
  Heart,
  ShieldCheck
} from "lucide-react";

const SLUG_ICON_MAP = {
  prayer: Flame,
  gym: Dumbbell,
  running: Footprints,
  programming: Code2,
  reading: BookMarked,
  "social-media": Smartphone,
  smoking: Cigarette,
  water: Sparkles,
};

function HabitDetailsContent() {
  const params = useParams();
  const slug = params?.slug || "programming";
  const { 
    habits, 
    appState, 
    selectedDate, 
    getDayRecords,
    startTimer,
    activeTimer,
    openSmokingModal,
    openSocialModal,
    openRunningModal,
    openGymModal,
    openPrayerDetail,
    deleteSession,
    deleteSmokingEvent,
    deleteSocialMediaSession,
    deleteRunningSession,
    deleteGymSession,
    addWaterCup,
    showToast
  } = useAthar();

  const habit = habits.find((h) => h.slug === slug) || habits[0];
  const dayRecords = getDayRecords(selectedDate);

  // Local quick manual log state for custom habits
  const [customValue, setCustomValue] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const Icon = SLUG_ICON_MAP[habit?.slug] || Sparkles;


  // Aggregate historical records across all dates in recordsByDate
  const allDates = Object.keys(appState.recordsByDate || {}).sort().reverse();

  // Calculate habit-specific statistics
  let habitSpecificStats = {
    todayValue: "0",
    totalLogged: "0",
    unit: habit?.unit || "",
  };

  if (slug === "programming") {
    const todayProg = dayRecords.sessions?.filter(s => s.type === "programming") || [];
    const totalTodaySecs = todayProg.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    habitSpecificStats.todayValue = formatDurationDetailed(totalTodaySecs);
    habitSpecificStats.totalLogged = `${todayProg.length} جلسات اليوم`;
  } else if (slug === "gym") {
    const todayGym = dayRecords.gymSessions || [];
    const totalGymMins = todayGym.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    habitSpecificStats.todayValue = `${totalGymMins} دقيقة`;
    habitSpecificStats.totalLogged = `${todayGym.length} تمارين`;
  } else if (slug === "running") {
    const todayRun = dayRecords.runningSessions || [];
    const totalKm = todayRun.reduce((acc, s) => acc + (s.distanceKm || 0), 0);
    habitSpecificStats.todayValue = `${totalKm.toFixed(1)} كم`;
    habitSpecificStats.totalLogged = `${todayRun.length} جولات`;
  } else if (slug === "prayer") {
    const prayers = dayRecords.prayers || {};
    const count = Object.values(prayers).filter(p => p.done).length;
    habitSpecificStats.todayValue = `${count}/5 فروض`;
    habitSpecificStats.totalLogged = "الصلاة لوقتها";
  } else if (slug === "social-media") {
    const todaySocial = dayRecords.socialMediaSessions || [];
    const totalMins = todaySocial.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    habitSpecificStats.todayValue = `${totalMins} دقيقة`;
    habitSpecificStats.totalLogged = `${todaySocial.length} جلسات`;
  } else if (slug === "smoking") {
    const todaySmoke = dayRecords.smokingEvents || [];
    const totalCigs = todaySmoke.reduce((acc, s) => acc + (s.count || 1), 0);
    habitSpecificStats.todayValue = `${totalCigs} سجائر`;
    habitSpecificStats.totalLogged = totalCigs === 0 ? "يوم ناصع نقي 🌿" : `${todaySmoke.length} أحداث`;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* 1. Breadcrumb & Back */}
      <div className="flex items-center justify-between">
        <Link
          href="/habits"
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة إلى دليل العادات</span>
        </Link>

        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>إعدادات العادة</span>
        </button>
      </div>

      {/* 2. Hero Section of Habit */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0c0e17] via-[#121524] to-[#0c0e17] border border-zinc-800/80 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 text-violet-400 shadow-xl shrink-0">
              <Icon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-zinc-100">{habit.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-violet-500/15 text-violet-300 border border-violet-500/25">
                  {habit.categoryLabel}
                </span>
              </div>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-xl">
                {habit.tagline}
              </p>
            </div>
          </div>

          {/* Quick Streak Pill & Action */}
          <div className="flex items-center gap-3 bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 self-start md:self-auto">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400">
              <Flame className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <span className="text-xs text-zinc-400 block font-medium">سلسلة المواظبة</span>
              <span className="text-lg font-black font-mono text-amber-400">{habit.streak || 14} يوماً</span>
            </div>
          </div>
        </div>

        {/* Settings Drawer */}
        {settingsOpen && (
          <div className="mt-6 pt-6 border-t border-zinc-800 animate-in fade-in">
            <h4 className="text-xs font-bold text-zinc-300 mb-3 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-violet-400" />
              <span>إعدادات ونوع تتبع العادة ({habit.trackingType})</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
                <span className="text-zinc-500 block mb-1">نوع التتبع</span>
                <span className="font-mono text-zinc-200 font-bold">{habit.trackingType}</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
                <span className="text-zinc-500 block mb-1">المستهدف</span>
                <span className="text-emerald-400 font-bold font-mono">
                  {habit.targetDailyMinutes ? `${habit.targetDailyMinutes} دقيقة` : habit.targetDailyCount ? `${habit.targetDailyCount} مرات` : "يومياً"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
                <span className="text-zinc-500 block mb-1">حفظ البيانات</span>
                <span className="text-zinc-200 font-mono">محلي (localStorage)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0c0e17]/80 border border-zinc-800 text-center">
          <span className="text-xs text-zinc-400">إنجاز اليوم الموثق</span>
          <div className="text-xl font-black font-mono text-cyan-400 mt-1 truncate">
            {habitSpecificStats.todayValue}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c0e17]/80 border border-zinc-800 text-center">
          <span className="text-xs text-zinc-400">إجمالي الأنشطة اليوم</span>
          <div className="text-xl font-black font-mono text-emerald-400 mt-1">
            {habitSpecificStats.totalLogged}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c0e17]/80 border border-zinc-800 text-center">
          <span className="text-xs text-zinc-400">أطول سلسلة تاريخية</span>
          <div className="text-xl font-black font-mono text-amber-400 mt-1">
            {(habit.streak || 14) + 12} يوماً
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c0e17]/80 border border-zinc-800 text-center">
          <span className="text-xs text-zinc-400">الحالة العامة</span>
          <div className="text-sm font-bold text-emerald-400 mt-2 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>نشطة ومحدثة</span>
          </div>
        </div>
      </div>

      {/* 4. Specialized Action & Recording Experience based on Habit Type */}
      <div className="p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-violet-400" />
            <span>توثيق نشاط جديد لهذه العادة</span>
          </h3>
          <span className="text-xs font-mono text-zinc-400">{selectedDate}</span>
        </div>

        {/* PROGRAMMING & STUDY: Start session timer or finish */}
        {(slug === "programming" || habit.trackingType === "duration") && (
          <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-cyan-300 block">مؤقت الجلسات الحية (Timestamp-Based Timer)</span>
              <p className="text-xs text-zinc-400 mt-0.5">
                سجل جلسة عمل حقيقية دقيقة لا تتأثر بالانتقال أو إعادة التحميل، مع نافذة تأكيد ومراجعة المدة عند الانتهاء.
              </p>
            </div>

            <button
              type="button"
              onClick={() => startTimer("programming", habit.name)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-black text-xs shadow-lg shadow-cyan-500/25 transition-all shrink-0 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-zinc-950" />
              <span>بدء جلسة عمل عميق</span>
            </button>
          </div>
        )}

        {/* GYM: Start timer or open workout modal */}
        {slug === "gym" && (
          <div className="p-5 rounded-2xl bg-orange-950/20 border border-orange-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-orange-300 block">تسجيل تمرين القوة والجيم</span>
              <p className="text-xs text-zinc-400 mt-0.5">
                وثّق اسم النادي ونوع التمرين والمدة وملاحظات الأوزان.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => startTimer("gym", "تمرين حديد")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs font-bold border border-orange-500/30 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-orange-300" />
                <span>مؤقت التمرين</span>
              </button>
              <button
                type="button"
                onClick={openGymModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>توثيق تمرين</span>
              </button>
            </div>
          </div>
        )}

        {/* RUNNING: Distance & Duration modal */}
        {slug === "running" && (
          <div className="p-5 rounded-2xl bg-lime-950/20 border border-lime-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-lime-300 block">توثيق تمرين الجري وحساب الوتيرة</span>
              <p className="text-xs text-zinc-400 mt-0.5">
                سجل الكيلومترات المقطوعة والمدة ليتم حساب الوتيرة (Pace) والسعرات تلقائياً.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => startTimer("running", "تمرين جري")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-lime-500/20 hover:bg-lime-500/30 text-lime-300 text-xs font-bold border border-lime-500/30 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-lime-300" />
                <span>مؤقت الجري</span>
              </button>
              <button
                type="button"
                onClick={openRunningModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-lime-600 hover:bg-lime-500 text-zinc-950 text-xs font-black shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>توثيق مسافة</span>
              </button>
            </div>
          </div>
        )}

        {/* PRAYER: 5 prayers interactive matrix */}
        {slug === "prayer" && (
          <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
            <span className="text-xs font-bold text-emerald-300 block">فروض اليوم والتوثيق التفصيلي</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {["fajr", "dhuhr", "asr", "maghrib", "isha"].map((key) => {
                const p = dayRecords.prayers?.[key] || {};
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => openPrayerDetail(key)}
                    className={`p-3 rounded-xl border text-xs text-right transition-all cursor-pointer ${
                      p.done
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">{p.name || key}</span>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${p.done ? "text-emerald-400" : "text-zinc-600"}`} />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 block">{p.actualTime || p.scheduledTime}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SMOKING: Private, nonjudgmental event modal */}
        {slug === "smoking" && (
          <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-rose-300 block">سجل التدخين والامتناع الدقيق</span>
              <p className="text-xs text-zinc-400 mt-0.5">
                تتبع مدة الامتناع بالثواني وتسجيل الانتكاسات ومحفزاتها عبر نظام الامتناع.
              </p>
            </div>

            <Link
              href="/abstinence"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>فتح سجل الامتناع والتعافي</span>
            </Link>
          </div>
        )}

        {/* SOCIAL MEDIA: Usage session logger */}
        {slug === "social-media" && (
          <div className="p-5 rounded-2xl bg-pink-950/20 border border-pink-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-pink-300 block">توثيق وقت الشاشة والسوشيال ميديا</span>
              <p className="text-xs text-zinc-400 mt-0.5">
                سجل يدوي للمنصة والمدة والدافع لحماية تركيزك من الاستهلاك السلبي.
              </p>
            </div>

            <button
              type="button"
              onClick={openSocialModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تسجيل جلسة</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Historical Activity Feed for this habit */}
      <div className="p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-400" />
            <span>السجل التاريخي للأنشطة الموثقة</span>
          </h3>
          <span className="text-xs text-zinc-400">محفوظ محلياً</span>
        </div>

        {/* Render relevant historical records */}
        <div className="divide-y divide-zinc-850">
          {slug === "programming" && (
            dayRecords.sessions?.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between group">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-200">{s.projectName}</span>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      {formatDurationDetailed(s.durationSeconds)}
                    </span>
                  </div>
                  {s.task && <p className="text-xs text-zinc-400 mt-0.5">{s.task}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => deleteSession(s.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-opacity"
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}

          {slug === "gym" && (
            dayRecords.gymSessions?.map((g) => (
              <div key={g.id} className="py-3 flex items-center justify-between group">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-200">{g.workoutType}</span>
                    <span className="text-xs font-mono font-bold text-orange-400">{g.durationMinutes} دقيقة</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{g.gymName} {g.notes ? `• ${g.notes}` : ""}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteGymSession(g.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-opacity"
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}

          {slug === "running" && (
            dayRecords.runningSessions?.map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between group">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-200">{r.distanceKm} كم</span>
                    <span className="text-xs font-mono font-bold text-lime-400">{r.pace}</span>
                    <span className="text-xs text-zinc-400">({Math.round(r.durationSeconds / 60)} دقيقة)</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{r.location} {r.notes ? `• ${r.notes}` : ""}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteRunningSession(r.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-opacity"
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}

          {slug === "social-media" && (
            dayRecords.socialMediaSessions?.map((sm) => (
              <div key={sm.id} className="py-3 flex items-center justify-between group">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-200">{sm.platform}</span>
                    <span className="text-xs font-mono font-bold text-pink-400">{sm.durationMinutes} دقيقة</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">الدافع: {sm.reason}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteSocialMediaSession(sm.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-opacity"
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}

          {slug === "smoking" && (
            dayRecords.smokingEvents?.map((ev) => (
              <div key={ev.id} className="py-3 flex items-center justify-between group">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-300">{ev.count} سيجارة</span>
                    <span className="text-xs font-mono text-zinc-400">{ev.time}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">المحفز: {ev.trigger} • {ev.location}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteSmokingEvent(ev.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-opacity"
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

export default function HabitDetailsPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto p-12 text-center text-zinc-400">جاري تحميل بيانات العادة...</div>}>
      <HabitDetailsContent />
    </Suspense>
  );
}
