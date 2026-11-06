"use client";

import { useEffect, useState } from "react";
import { useAthar } from "../context/AtharContext";
import { 
  Flame, 
  Check, 
  MapPin, 
  Clock,
  Settings,
  ArrowUpRight,
  Edit3,
  Lock,
  Timer
} from "lucide-react";
import Link from "next/link";

// Parse "HH:MM" => total minutes from midnight
function parseTime(str) {
  if (!str || typeof str !== "string") return -1;
  const [h, m] = str.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
}

// Format minutes-remaining as "١٥ د" or "١ س و ٣٠ د"
function formatRemaining(minutesLeft) {
  if (minutesLeft <= 0) return "";
  const hrs = Math.floor(minutesLeft / 60);
  const mins = minutesLeft % 60;
  if (hrs === 0) return `${mins} د`;
  if (mins === 0) return `${hrs} س`;
  return `${hrs} س ${mins} د`;
}

function getPrayerState(scheduledTime, currentMinutes) {
  const scheduled = parseTime(scheduledTime);
  if (scheduled < 0) return "unknown";
  const diff = scheduled - currentMinutes;
  if (diff > 15) return "upcoming";      // more than 15 min away → locked
  if (diff > 0) return "soon";           // within 15 min → prepare
  return "available";                     // at or past scheduled time
}

const LOCATION_LABELS = {
  mosque: "مسجد",
  home: "منزل",
  work: "عمل",
  other: "أخرى",
};

export default function PrayerTrackerCard() {
  const {
    getDayRecords,
    selectedDate,
    togglePrayerQuick,
    openPrayerDetail,
    openPrayerScheduleModal,
    prayerSchedule,
  } = useAthar();

  const [currentMinutes, setCurrentMinutes] = useState(0);

  useEffect(() => {
    // Update current time every 30 seconds for state transitions
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const dayRecords = getDayRecords(selectedDate);
  const prayers = dayRecords.prayers || {};
  const prayerKeys = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  const completedCount = prayerKeys.filter((k) => prayers[k]?.done).length;

  return (
    <div className="rounded-2xl bg-[#0c0e17]/90 border border-zinc-800/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Flame className="w-4 h-4 fill-emerald-400/30" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-100">الصلوات الخمس</h3>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {completedCount}/5
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {completedCount === 5 
                ? "اكتملت صلوات اليوم ✓"
                : `${5 - completedCount} صلوات متبقية`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openPrayerScheduleModal}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="تعديل أوقات الأذان"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <Link
            href="/habits/prayer"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="السجل الكامل"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Prayer Cards */}
      <div className="grid grid-cols-5 gap-0 divide-x divide-x-reverse divide-zinc-800/60">
        {prayerKeys.map((key) => {
          const p = prayers[key] || {};
          const scheduleInfo = prayerSchedule[key] || { name: key, scheduledTime: "12:00" };
          const isDone = Boolean(p.done);
          const state = getPrayerState(scheduleInfo.scheduledTime, currentMinutes);
          const scheduledMins = parseTime(scheduleInfo.scheduledTime);
          const minutesLeft = scheduledMins - currentMinutes;
          const isLocked = !isDone && state === "upcoming";
          const isSoon = !isDone && state === "soon";

          return (
            <div
              key={key}
              className={`relative flex flex-col items-center justify-between p-3 sm:p-4 transition-all min-h-[90px] sm:min-h-[100px] ${
                isDone
                  ? "bg-emerald-950/15"
                  : isSoon
                  ? "bg-amber-950/10"
                  : "bg-transparent"
              }`}
            >
              {/* Time */}
              <span className={`text-[10px] font-mono font-medium ${
                isDone ? "text-emerald-400" : isSoon ? "text-amber-400" : "text-zinc-500"
              }`}>
                {scheduleInfo.scheduledTime}
              </span>

              {/* Prayer Name + Check */}
              <div className="flex flex-col items-center gap-1.5 my-1">
                <span className={`text-xs font-bold ${
                  isDone ? "text-emerald-200" : isSoon ? "text-amber-200" : "text-zinc-300"
                }`}>
                  {scheduleInfo.name}
                </span>

                {/* Action button */}
                {isDone ? (
                  <button
                    type="button"
                    onClick={() => togglePrayerQuick(key)}
                    className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500 text-zinc-950 shadow-sm shadow-emerald-500/30 active:scale-90 transition-transform cursor-pointer"
                    title="مكتملة (انقر للإلغاء)"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                ) : isLocked ? (
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800/60 text-zinc-600" title="لم يحن وقتها بعد">
                    <Lock className="w-3 h-3" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => togglePrayerQuick(key)}
                    className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-all active:scale-90 cursor-pointer ${
                      isSoon
                        ? "border-amber-500/50 bg-amber-500/10 text-transparent hover:bg-amber-500/20"
                        : "border-zinc-700 bg-zinc-800/40 text-transparent hover:border-zinc-500"
                    }`}
                    title="تحديد كمكتملة"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                )}
              </div>

              {/* Footer state */}
              <div className="flex flex-col items-center gap-0.5">
                {isDone ? (
                  <div className="flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5 text-emerald-500" />
                    <span className="text-[9px] text-emerald-500">
                      {LOCATION_LABELS[p.location] || "مسجد"}
                    </span>
                  </div>
                ) : isSoon ? (
                  <div className="flex items-center gap-0.5">
                    <Timer className="w-2.5 h-2.5 text-amber-400" />
                    <span className="text-[9px] text-amber-400 font-mono">
                      {formatRemaining(minutesLeft)}
                    </span>
                  </div>
                ) : isLocked ? (
                  <div className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5 text-zinc-600" />
                    <span className="text-[9px] text-zinc-600 font-mono">
                      {formatRemaining(minutesLeft)}
                    </span>
                  </div>
                ) : (
                  <span className="text-[9px] text-zinc-600">متاحة</span>
                )}

                {/* Edit detail button */}
                <button
                  type="button"
                  onClick={() => openPrayerDetail(key)}
                  className="text-zinc-600 hover:text-zinc-400 transition-colors mt-0.5"
                  title="تفاصيل"
                >
                  <Edit3 className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {completedCount > 0 && (
        <div className="px-5 py-2.5 border-t border-zinc-800/60 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 italic">
            «أحبُّ الأعمالِ إلى الله الصلاةُ لوقتِها»
          </span>
          <button
            type="button"
            onClick={openPrayerScheduleModal}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            تعديل الأوقات
          </button>
        </div>
      )}
    </div>
  );
}
