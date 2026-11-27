"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";

const HOVER_REVEAL_DELAY_MS = 3000;

export default function AbstinenceAchievementCard({ item }) {
  const [isHovering, setIsHovering] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const timerRef = useRef(null);

  const clearHoverTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleEnter = () => {
    clearHoverTimer();
    setIsHovering(true);
    timerRef.current = setTimeout(() => {
      setIsRevealed(true);
    }, HOVER_REVEAL_DELAY_MS);
  };

  const handleLeave = () => {
    clearHoverTimer();
    setIsHovering(false);
    setIsRevealed(false);
  };

  useEffect(() => {
    return () => clearHoverTimer();
  }, []);

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      tabIndex={0}
      className="relative overflow-hidden p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-emerald-500/30 transition-colors flex items-center justify-between gap-3 select-none"
    >
      <div className="flex items-center gap-2 min-w-0">
        <ShieldCheck
          className={`w-3.5 h-3.5 shrink-0 transition-colors duration-300 ${
            isRevealed ? "text-violet-400" : "text-emerald-400"
          }`}
        />
        <span
          className={`font-semibold truncate transition-colors duration-300 ${
            isRevealed ? "text-violet-200" : "text-emerald-200"
          }`}
        >
          {isRevealed ? item.revealedText : item.encryptedText}
        </span>
      </div>

      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shrink-0">
        {item.milestoneDays === 1 ? "24+ ساعة" : `${item.milestoneDays} أيام`}
      </span>

      {/* Subtle 3-second hover progress indicator */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-0 right-0 h-0.5 bg-emerald-400/50 transition-all ${
          isRevealed
            ? "w-full opacity-0 duration-300"
            : isHovering
              ? "w-full opacity-100 duration-[3000ms] ease-linear"
              : "w-0 opacity-0 duration-150"
        }`}
      />
    </div>
  );
}
