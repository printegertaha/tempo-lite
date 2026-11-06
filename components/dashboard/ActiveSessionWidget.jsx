"use client";

import { useState } from "react";
import { useAthar } from "../context/AtharContext";
import { formatDigitalClock, formatDurationDetailed } from "../data/storage";
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  Code2, 
  Dumbbell, 
  Footprints, 
  Smartphone,
  Trash2,
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react";

const SESSION_TYPES = [
  { id: "programming", label: "برمجة", icon: Code2, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/25" },
  { id: "study", label: "مذاكرة", icon: Code2, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/25" },
  { id: "gym", label: "جيم", icon: Dumbbell, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/25" },
  { id: "running", label: "جري", icon: Footprints, color: "text-lime-400", bg: "bg-lime-500/10 border-lime-500/25" },
  { id: "social_media", label: "سوشيال", icon: Smartphone, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/25" },
];

function getTypeConfig(type) {
  return SESSION_TYPES.find(t => t.id === type) || SESSION_TYPES[0];
}

export default function ActiveSessionWidget() {
  const { 
    activeTimer, 
    elapsedSeconds, 
    startTimer, 
    pauseTimer, 
    resumeTimer, 
    requestFinishTimer, 
    cancelTimer,
    getDayRecords,
    selectedDate,
    deleteSession
  } = useAthar();

  const [sessionType, setSessionType] = useState("programming");
  const [projectInput, setProjectInput] = useState("");
  const [showConfig, setShowConfig] = useState(false);

  const dayRecords = getDayRecords(selectedDate);
  const completedSessions = dayRecords.sessions || [];
  const totalCompletedSeconds = completedSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);

  const isTimerRunning = activeTimer?.isRunning;
  const typeConfig = activeTimer ? getTypeConfig(activeTimer.type) : getTypeConfig(sessionType);
  const TypeIcon = typeConfig.icon;

  const handleStart = () => {
    startTimer(sessionType, projectInput.trim() || "جلسة عمل عميق");
  };

  // Don't render if no timer and no completed sessions (avoid unnecessary space)
  if (!activeTimer && completedSessions.length === 0 && !showConfig) {
    return (
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-zinc-800 text-zinc-500">
            <Clock className="w-4 h-4" />
          </span>
          <div>
            <span className="text-xs font-semibold text-zinc-400">مؤقت الجلسات</span>
            <p className="text-[11px] text-zinc-600">لا توجد جلسات نشطة اليوم</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowConfig(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/20 transition-all"
        >
          <Play className="w-3.5 h-3.5 fill-cyan-300" />
          <span>بدء جلسة</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Active / Start Panel */}
      <div className={`rounded-2xl border overflow-hidden transition-all ${
        activeTimer 
          ? `${typeConfig.bg} shadow-lg` 
          : "bg-zinc-900/40 border-zinc-800/80"
      }`}>
        
        {/* Main row */}
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          
          {/* Left: Icon + Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
              activeTimer ? "bg-black/20" : "bg-zinc-800"
            }`}>
              <TypeIcon className={`w-5 h-5 ${typeConfig.color}`} />
              {isTimerRunning && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
              )}
            </div>

            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-300 truncate">
                {activeTimer ? activeTimer.title : "مؤقت الجلسات"}
              </div>
              <div className="text-[10px] text-zinc-500">
                {activeTimer 
                  ? (isTimerRunning ? "جارٍ التسجيل..." : "متوقف مؤقتاً") 
                  : `إجمالي اليوم: ${formatDurationDetailed(totalCompletedSeconds)}`}
              </div>
            </div>
          </div>

          {/* Center: Timer */}
          <div className="text-2xl sm:text-3xl font-black font-mono tracking-wider shrink-0">
            <span className={activeTimer ? typeConfig.color : "text-zinc-600"}>
              {formatDigitalClock(activeTimer ? elapsedSeconds : 0)}
            </span>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!activeTimer ? (
              <button
                type="button"
                onClick={showConfig ? handleStart : () => setShowConfig(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-black text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-zinc-950" />
                <span className="hidden sm:inline">بدء</span>
              </button>
            ) : (
              <>
                {isTimerRunning ? (
                  <button
                    type="button"
                    onClick={pauseTimer}
                    className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all"
                    title="إيقاف مؤقت"
                  >
                    <Pause className="w-4 h-4 fill-amber-300" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={resumeTimer}
                    className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all"
                    title="استئناف"
                  >
                    <Play className="w-4 h-4 fill-cyan-300" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={requestFinishTimer}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">إنهاء</span>
                </button>

                <button
                  type="button"
                  onClick={cancelTimer}
                  className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                  title="إلغاء"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {!activeTimer && (
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="p-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Config strip (only when idle and expanded) */}
        {!activeTimer && showConfig && (
          <div className="border-t border-zinc-800/60 px-4 py-3 space-y-3">
            {/* Type selector */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {SESSION_TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSessionType(t.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      sessionType === t.id
                        ? `${t.bg} ${t.color}`
                        : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Project name */}
            <div className="flex gap-2">
              <input
                type="text"
                value={projectInput}
                onChange={(e) => setProjectInput(e.target.value)}
                placeholder="اسم المشروع أو المهمة (اختياري)"
                className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
              />
              <button
                type="button"
                onClick={handleStart}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-black transition-all active:scale-95"
              >
                بدء
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Completed sessions (compact) */}
      {completedSessions.length > 0 && (
        <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/30">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs font-semibold text-zinc-400">
                جلسات اليوم ({completedSessions.length})
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400">
              {formatDurationDetailed(totalCompletedSeconds)}
            </span>
          </div>
          <div className="divide-y divide-zinc-800/40">
            {completedSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between gap-3 px-4 py-2.5 group">
                <div className="flex items-center gap-2 min-w-0">
                  <Code2 className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="text-xs text-zinc-300 truncate">{session.projectName}</span>
                  {session.task && (
                    <span className="text-[10px] text-zinc-500 truncate hidden sm:block">· {session.task}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono text-cyan-400">{formatDurationDetailed(session.durationSeconds)}</span>
                  <button
                    onClick={() => deleteSession(session.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400 transition-all"
                    title="حذف"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
