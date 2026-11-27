"use client";

import { useEffect, useRef, useState } from "react";
import { Flame, Trophy } from "lucide-react";
import { soundManager } from "@/lib/audio";
import { useAthar } from "@/components/context/AtharContext";
import { useLocalSession } from "@/hooks/useLocalSession";

const STATUS_STEPS = [
  "نُهيئ مساحتك الشخصية...",
  "نرتّب بوصلة يومك...",
  "لحظات ويبدأ يومك...",
];

function readLocalScore(uid: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const scoped = Number(localStorage.getItem(`athar_loading_score:${uid}`) || 0);
    const guest = Number(localStorage.getItem("athar_loading_score:guest") || 0);
    return Math.max(
      Number.isFinite(scoped) ? scoped : 0,
      Number.isFinite(guest) ? guest : 0
    );
  } catch {
    return 0;
  }
}

export default function OnboardingLoadingExperience() {
  const { userPreferences, updatePreferences } = useAthar() as any;
  const { userId } = useLocalSession();
  const uid = userId || "guest";

  const [score, setScore] = useState<number>(0);
  const [sessionTaps, setSessionTaps] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [ripples, setRipples] = useState<number[]>([]);

  const scoreRef = useRef(score);
  scoreRef.current = score;
  const dirtyRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updatePrefsRef = useRef(updatePreferences);
  updatePrefsRef.current = updatePreferences;

  // Merge cloud/preferences score whenever available (never lose local taps)
  useEffect(() => {
    const localVal = readLocalScore(uid);
    const cloudVal = Number(userPreferences?.loadingSparkScore || 0);
    const merged = Math.max(scoreRef.current, localVal, Number.isFinite(cloudVal) ? cloudVal : 0);
    if (merged !== scoreRef.current) {
      scoreRef.current = merged;
      setScore(merged);
    }
  }, [uid, userPreferences?.loadingSparkScore]);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % STATUS_STEPS.length);
    }, 1400);

    return () => {
      clearInterval(stepTimer);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      if (dirtyRef.current) {
        dirtyRef.current = false;
        void updatePrefsRef.current?.({ loadingSparkScore: scoreRef.current }).catch(() => {});
      }
    };
  }, []);

  const handleSparkTap = () => {
    const nextScore = scoreRef.current + 1;
    scoreRef.current = nextScore;
    dirtyRef.current = true;
    setScore(nextScore);
    setSessionTaps((c) => c + 1);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`athar_loading_score:${uid}`, String(nextScore));
      } catch {}
    }

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      dirtyRef.current = false;
      void updatePrefsRef.current?.({ loadingSparkScore: scoreRef.current }).catch(() => {});
    }, 500);

    const id = Date.now() + Math.random();
    setRipples((prev) => [...prev.slice(-4), id]);
    soundManager.playPickerTick();
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r !== id));
    }, 650);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-[#08090d] text-zinc-200 px-6 relative overflow-hidden select-none"
      aria-busy="true"
    >
      {/* Ambient Breathing Glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-72 h-72 rounded-full bg-violet-600/15 blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full space-y-6">
        {/* Persistent Score Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-amber-500/30 shadow-lg shadow-amber-500/10">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] text-zinc-400">السكور:</span>
          <span className="font-mono text-sm font-black text-amber-300 tabular-nums">
            {score.toLocaleString("en-US")}
          </span>
        </div>

        {/* Interactive Tactile Orb */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full border border-violet-500/25 animate-ping [animation-duration:2.4s]" />

          {ripples.map((r) => (
            <span
              key={r}
              className="pointer-events-none absolute w-20 h-20 rounded-3xl border-2 border-amber-400/70 animate-ping [animation-duration:0.65s]"
            />
          ))}

          <button
            type="button"
            onClick={handleSparkTap}
            aria-label="زيادة السكور"
            className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-2xl shadow-violet-600/40 hover:scale-105 active:scale-90 transition-transform duration-150 cursor-pointer border border-violet-400/30"
          >
            <Flame className="w-8 h-8 text-white fill-white" />
            {sessionTaps > 0 && (
              <span className="absolute -top-2 -left-2 px-1.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-mono text-[10px] font-black shadow-md">
                +{sessionTaps}
              </span>
            )}
          </button>
        </div>

        {/* Status + Smooth Progress Shimmer */}
        <div className="space-y-2.5 w-full max-w-[240px]">
          <p className="text-xs font-bold text-violet-300 tracking-wide transition-opacity duration-300">
            {STATUS_STEPS[stepIndex]}
          </p>
          <div className="h-1 w-full rounded-full bg-zinc-900 overflow-hidden border border-zinc-800/80">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-violet-500 via-amber-400 to-violet-500 animate-[pulse_1.2s_ease-in-out_infinite]" />
          </div>
          <p className="text-[11px] text-zinc-500">
            اضغط على الشعلة لجمع النقاط قبل الدخول 🔥
          </p>
        </div>
      </div>
    </div>
  );
}
