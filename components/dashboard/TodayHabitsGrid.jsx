"use client";

import { useAthar } from "../context/AtharContext";
import { formatDurationDetailed } from "../data/storage";
import Link from "next/link";
import { 
  Code2, 
  Dumbbell, 
  Footprints,
  Smartphone,
  Cigarette,
  CigaretteOff,
  Droplets,
  ArrowUpRight,
  Plus,
  Play,
  ChevronRight
} from "lucide-react";

function HabitCard({ children, hoverBorder = "hover:border-zinc-700" }) {
  return (
    <div className={`flex flex-col justify-between p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 ${hoverBorder} transition-all group`}>
      {children}
    </div>
  );
}

function ProgressBar({ value, max, colorClass = "bg-violet-500" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden mt-2">
      <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function TodayHabitsGrid() {
  const {
    getDayRecords,
    selectedDate,
    startTimer,
    activeTimer,
    addWaterCup,
    openSmokingModal,
    openSocialModal,
    openRunningModal,
    openGymModal,
  } = useAthar();

  const dayRecords = getDayRecords(selectedDate);

  // Computed values
  const programmingSessions = dayRecords.sessions?.filter(s => s.type === "programming" || !s.type?.includes("social")) || [];
  const progSeconds = programmingSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const progTargetSecs = 3.5 * 3600;

  const gymSessions = dayRecords.gymSessions || [];
  const totalGymMins = gymSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

  const runningSessions = dayRecords.runningSessions || [];
  const totalRunKm = runningSessions.reduce((acc, s) => acc + (s.distanceKm || 0), 0);
  const latestRun = runningSessions[0];

  const socialSessions = dayRecords.socialMediaSessions || [];
  const totalSocialMins = socialSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const socialLimitMins = 60;

  const smokingEvents = dayRecords.smokingEvents || [];
  const totalCigarettes = smokingEvents.reduce((acc, e) => acc + (e.count || 1), 0);

  const waterCount = dayRecords.waterCount || 0;
  const waterTargetCups = 14;

  const hasActiveTimer = activeTimer && activeTimer.isRunning;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-300">الأنشطة والعادات</h2>
        <Link href="/habits" className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors">
          <span>الكل</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

        {/* 1. Programming */}
        <HabitCard hoverBorder="hover:border-cyan-500/30">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Code2 className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-semibold text-zinc-200">البرمجة</span>
              </div>
              <Link href="/habits/programming" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="text-xl font-black font-mono text-cyan-400 leading-none">
              {progSeconds > 0 ? formatDurationDetailed(progSeconds) : "٠ دقيقة"}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">الهدف: ٣.٥ ساعة</div>
            <ProgressBar value={progSeconds} max={progTargetSecs} colorClass="bg-cyan-500" />
          </div>

          <button
            type="button"
            onClick={() => startTimer("programming", "برمجة وعمل عميق")}
            disabled={hasActiveTimer}
            className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="w-3 h-3 fill-cyan-300" />
            <span>بدء مؤقت</span>
          </button>
        </HabitCard>

        {/* 2. Gym */}
        <HabitCard hoverBorder="hover:border-orange-500/30">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400">
                  <Dumbbell className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-semibold text-zinc-200">الجيم</span>
              </div>
              <Link href="/gym" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="text-xl font-black font-mono text-orange-400 leading-none">
              {totalGymMins > 0 ? `${totalGymMins} د` : "٠ دقيقة"}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1 truncate">
              {gymSessions[0]?.workoutType || "لم يسجَّل تمرين اليوم"}
            </div>
            <ProgressBar value={totalGymMins} max={75} colorClass="bg-orange-500" />
          </div>

          <div className="mt-3 flex gap-1.5">
            <button
              onClick={() => startTimer("gym", "تمرين جيم")}
              disabled={hasActiveTimer}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 text-xs border border-orange-500/20 transition-all disabled:opacity-40"
            >
              <Play className="w-3 h-3 fill-orange-300" />
            </button>
            <button
              onClick={openGymModal}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-all"
            >
              <Plus className="w-3 h-3" />
              <span>توثيق</span>
            </button>
          </div>
        </HabitCard>

        {/* 3. Running */}
        <HabitCard hoverBorder="hover:border-lime-500/30">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-lime-500/10 text-lime-400">
                  <Footprints className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-semibold text-zinc-200">الجري</span>
              </div>
              <Link href="/habits/running" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="text-xl font-black font-mono text-lime-400 leading-none">
              {totalRunKm > 0 ? `${totalRunKm.toFixed(1)} كم` : "٠ كم"}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">
              {latestRun ? `الوتيرة: ${latestRun.pace}` : "الهدف: ٥ كم"}
            </div>
            <ProgressBar value={totalRunKm} max={5} colorClass="bg-lime-500" />
          </div>

          <div className="mt-3 flex gap-1.5">
            <button
              onClick={() => startTimer("running", "تمرين جري")}
              disabled={hasActiveTimer}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-lime-500/10 hover:bg-lime-500/20 text-lime-300 text-xs border border-lime-500/20 transition-all disabled:opacity-40"
            >
              <Play className="w-3 h-3 fill-lime-300" />
            </button>
            <button
              onClick={openRunningModal}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-all"
            >
              <Plus className="w-3 h-3" />
              <span>توثيق</span>
            </button>
          </div>
        </HabitCard>

        {/* 4. Social Media */}
        <HabitCard hoverBorder="hover:border-pink-500/30">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-pink-500/10 text-pink-400">
                  <Smartphone className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-semibold text-zinc-200">سوشيال</span>
              </div>
              <Link href="/habits/social-media" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className={`text-xl font-black font-mono leading-none ${
              totalSocialMins > socialLimitMins ? "text-rose-400" : "text-pink-400"
            }`}>
              {totalSocialMins} د
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">
              {totalSocialMins > socialLimitMins ? "تجاوز الحد ⚠️" : `الحد: ${socialLimitMins} د`}
            </div>
            <ProgressBar 
              value={totalSocialMins} 
              max={socialLimitMins} 
              colorClass={totalSocialMins > socialLimitMins ? "bg-rose-500" : "bg-pink-500"} 
            />
          </div>

          <button
            onClick={openSocialModal}
            className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 text-xs font-semibold border border-pink-500/20 transition-all"
          >
            <Plus className="w-3 h-3" />
            <span>توثيق جلسة</span>
          </button>
        </HabitCard>

        {/* 5. Smoking */}
        <HabitCard hoverBorder="hover:border-rose-500/30">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400">
                  {totalCigarettes === 0 
                    ? <CigaretteOff className="w-3.5 h-3.5" /> 
                    : <Cigarette className="w-3.5 h-3.5" />
                  }
                </span>
                <span className="text-xs font-semibold text-zinc-200">التدخين</span>
              </div>
              <Link href="/habits/smoking" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className={`text-xl font-black font-mono leading-none ${
              totalCigarettes === 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              {totalCigarettes}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">
              {totalCigarettes === 0 ? "يوم ناصع 🌿" : `سجائر اليوم`}
            </div>
          </div>

          <button
            onClick={openSmokingModal}
            className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/20 transition-all"
          >
            <Plus className="w-3 h-3" />
            <span>تسجيل حدث</span>
          </button>
        </HabitCard>

        {/* 6. Water */}
        <HabitCard hoverBorder="hover:border-teal-500/30">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400">
                  <Droplets className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-semibold text-zinc-200">الماء</span>
              </div>
              <Link href="/nutrition" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="text-xl font-black font-mono text-teal-400 leading-none">
              {(waterCount * 0.25).toFixed(1)} ل
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">الهدف: ٣.٥ ل ({waterCount}/{waterTargetCups} كوب)</div>
            <ProgressBar value={waterCount} max={waterTargetCups} colorClass="bg-teal-500" />
          </div>

          <div className="mt-3 flex gap-1.5">
            <button
              onClick={() => addWaterCup(1)}
              className="flex-1 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/20 transition-all"
            >
              +250 مل
            </button>
            <button
              onClick={() => addWaterCup(2)}
              className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-all"
            >
              +500 مل
            </button>
          </div>
        </HabitCard>

      </div>
    </div>
  );
}
