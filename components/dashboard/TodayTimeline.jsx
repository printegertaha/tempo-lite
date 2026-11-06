"use client";

import { useState } from "react";
import { useAthar } from "../context/AtharContext";
import { formatDurationDetailed } from "../data/storage";
import { 
  Clock, 
  Flame, 
  Code2, 
  Dumbbell, 
  Footprints, 
  Smartphone,
  Cigarette,
  Plus, 
  ChevronDown,
  ChevronRight,
  MapPin,
  Trash2
} from "lucide-react";
import Link from "next/link";

function TimelineEvent({ event, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = event.icon;

  return (
    <div className="relative flex gap-3 group">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        <div className={`flex items-center justify-center w-7 h-7 rounded-full border-2 shrink-0 z-10 ${event.dotClass}`}>
          <Icon className={`w-3 h-3 ${event.iconColor}`} />
        </div>
        <div className="w-px flex-1 bg-zinc-800/60 mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div
          className={`rounded-xl border transition-colors cursor-pointer ${
            expanded 
              ? "bg-zinc-900/80 border-zinc-700/80" 
              : "bg-zinc-900/30 border-zinc-800/60 hover:border-zinc-700/60"
          }`}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-mono text-zinc-500 shrink-0">{event.time}</span>
              <h4 className="text-xs font-semibold text-zinc-200 truncate">{event.title}</h4>
              {event.badge && (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${event.badgeClass}`}>
                  {event.badge}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {event.duration && (
                <span className={`text-[10px] font-mono font-bold ${event.iconColor}`}>
                  {event.duration}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </div>
          </div>

          {expanded && event.desc && (
            <div className="px-3.5 pb-3 pt-0 border-t border-zinc-800/60">
              <p className="text-[11px] text-zinc-400 leading-relaxed mt-2">{event.desc}</p>
              {event.location && (
                <div className="flex items-center gap-1 mt-1.5">
                  <MapPin className="w-2.5 h-2.5 text-zinc-500" />
                  <span className="text-[10px] text-zinc-500">{event.location}</span>
                </div>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="mt-2 flex items-center gap-1 text-[10px] text-zinc-600 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>حذف</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TodayTimeline() {
  const { getDayRecords, selectedDate, openQuickLog, deleteSession, deleteGymSession, deleteRunningSession, deleteSocialMediaSession, deleteSmokingEvent } = useAthar();
  const dayRecords = getDayRecords(selectedDate);

  const events = [];

  // Prayers
  if (dayRecords.prayers) {
    const prayerNameMap = { fajr: "الفجر", dhuhr: "الظهر", asr: "العصر", maghrib: "المغرب", isha: "العشاء" };
    Object.entries(dayRecords.prayers).forEach(([key, p]) => {
      if (p.done) {
        const locationMap = { mosque: "مسجد", home: "منزل", work: "عمل" };
        events.push({
          time: p.actualTime || p.scheduledTime || "12:00",
          title: `صلاة ${p.name || prayerNameMap[key] || key}`,
          badge: p.onTime !== false ? "في وقتها" : "متأخرة",
          badgeClass: p.onTime !== false 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : "bg-amber-500/10 text-amber-400 border-amber-500/20",
          desc: p.notes || null,
          location: locationMap[p.location] || p.location,
          duration: p.durationMinutes ? `${p.durationMinutes} د` : null,
          icon: Flame,
          iconColor: "text-emerald-400",
          dotClass: "bg-emerald-950/60 border-emerald-500/40",
        });
      }
    });
  }

  // Programming sessions
  (dayRecords.sessions || []).forEach((s) => {
    const startDate = s.startedAt ? new Date(s.startedAt) : null;
    const timeStr = startDate 
      ? startDate.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) 
      : "09:00";
    events.push({
      time: timeStr,
      title: s.projectName || "جلسة عمل عميق",
      badge: s.type === "study" ? "مذاكرة" : "برمجة",
      badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      desc: s.task || s.notes || null,
      duration: s.durationSeconds ? formatDurationDetailed(s.durationSeconds) : null,
      icon: Code2,
      iconColor: "text-cyan-400",
      dotClass: "bg-cyan-950/60 border-cyan-500/40",
      onDelete: () => deleteSession(s.id),
    });
  });

  // Gym sessions
  (dayRecords.gymSessions || []).forEach((g) => {
    events.push({
      time: g.startTime || "16:00",
      title: g.workoutType || "تمرين جيم",
      badge: null,
      desc: g.notes || null,
      location: g.gymName,
      duration: g.durationMinutes ? `${g.durationMinutes} د` : null,
      icon: Dumbbell,
      iconColor: "text-orange-400",
      dotClass: "bg-orange-950/60 border-orange-500/40",
      onDelete: () => deleteGymSession(g.id),
    });
  });

  // Running sessions
  (dayRecords.runningSessions || []).forEach((r) => {
    events.push({
      time: r.startTime || "06:00",
      title: `جري ${r.distanceKm} كم`,
      badge: r.pace || null,
      badgeClass: "bg-lime-500/10 text-lime-400 border-lime-500/20",
      desc: r.notes || null,
      location: r.location,
      duration: r.durationSeconds ? formatDurationDetailed(r.durationSeconds) : null,
      icon: Footprints,
      iconColor: "text-lime-400",
      dotClass: "bg-lime-950/60 border-lime-500/40",
      onDelete: () => deleteRunningSession(r.id),
    });
  });

  // Social media
  (dayRecords.socialMediaSessions || []).forEach((sm) => {
    events.push({
      time: sm.startTime || "12:00",
      title: sm.platform || "سوشيال ميديا",
      badge: null,
      desc: sm.reason || null,
      duration: sm.durationMinutes ? `${sm.durationMinutes} د` : null,
      icon: Smartphone,
      iconColor: "text-pink-400",
      dotClass: "bg-pink-950/60 border-pink-500/40",
      onDelete: () => deleteSocialMediaSession(sm.id),
    });
  });

  // Smoking
  (dayRecords.smokingEvents || []).forEach((smk) => {
    events.push({
      time: smk.time || "14:00",
      title: `${smk.count || 1} سيجارة`,
      badge: null,
      desc: smk.trigger || smk.notes || null,
      location: smk.location,
      duration: null,
      icon: Cigarette,
      iconColor: "text-rose-400",
      dotClass: "bg-rose-950/60 border-rose-500/40",
      onDelete: () => deleteSmokingEvent(smk.id),
    });
  });

  // Sort by time
  events.sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="rounded-2xl bg-[#0c0e17]/90 border border-zinc-800/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400">
            <Clock className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">مسار اليوم</h3>
            <p className="text-[11px] text-zinc-500">{events.length} أحداث مسجلة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openQuickLog("prayer")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>تسجيل</span>
          </button>
          <Link
            href="/journal"
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
          >
            <span>اليومية</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Timeline body */}
      <div className="px-4 pt-4 pb-2">
        {events.length === 0 ? (
          <div className="py-10 text-center">
            <div className="text-3xl mb-3">📋</div>
            <p className="text-sm text-zinc-400 font-medium">لم يُسجَّل شيء بعد</p>
            <p className="text-xs text-zinc-600 mt-1">استخدم زر «تسجيل نشاط» أعلاه</p>
          </div>
        ) : (
          <div>
            {events.map((event, idx) => (
              <TimelineEvent 
                key={`${event.time}-${idx}`} 
                event={event}
                onDelete={event.onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
