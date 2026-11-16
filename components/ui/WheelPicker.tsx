"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { soundManager } from "@/lib/audio";

interface WheelColumn {
  options: { value: string | number; label: string | number }[];
  value: string | number;
  onChange: (value: string | number) => void;
  /** Flex weight — defaults to 1 */
  flex?: number;
  /** Text alignment — defaults to center */
  align?: "left" | "center" | "right";
}

interface AppleWheelPickerProps {
  columns: WheelColumn[];
  /** Total visible height (px) */
  height?: number;
  /** Height of each row (px) */
  itemHeight?: number;
  ariaLabel?: string;
}

/* ═══════════════════════════════════════════════════════════════════
   Single scrollable column — internal component
   ═══════════════════════════════════════════════════════════════════ */

function WheelCol({
  options,
  value,
  onChange,
  height,
  itemHeight,
  align = "center",
}: {
  options: WheelColumn["options"];
  value: string | number;
  onChange: (v: string | number) => void;
  height: number;
  itemHeight: number;
  align?: "left" | "center" | "right";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTickIndex = useRef(-1);

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );

  // visualIndex updates in real-time as the user scrolls
  const [visualIndex, setVisualIndex] = useState(selectedIndex);

  const scrollToIndex = useCallback(
    (idx: number, smooth = true) => {
      const el = containerRef.current;
      if (!el) return;
      const target = idx * itemHeight;
      if (Math.abs(el.scrollTop - target) > 1) {
        el.scrollTo({ top: target, behavior: smooth ? "smooth" : "auto" });
      }
    },
    [itemHeight]
  );

  // Sync external value → scroll position & visualIndex
  useEffect(() => {
    if (!isUserScrolling.current) {
      setVisualIndex(selectedIndex);
      scrollToIndex(selectedIndex, false);
    }
  }, [selectedIndex, scrollToIndex]);

  // Real-time tracking during scroll
  const handleScroll = () => {
    isUserScrolling.current = true;
    const el = containerRef.current;
    if (el) {
      const liveIdx = Math.min(
        options.length - 1,
        Math.max(0, Math.round(el.scrollTop / itemHeight))
      );

      // Trigger tick sound when crossing into a new index
      if (liveIdx !== lastTickIndex.current) {
        lastTickIndex.current = liveIdx;
        soundManager.playWheelTick();
      }

      // Immediately highlight the item currently between the two lines
      setVisualIndex((prev) => (prev !== liveIdx ? liveIdx : prev));
    }

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    scrollTimeout.current = setTimeout(() => {
      const c = containerRef.current;
      if (!c) return;
      const snapIdx = Math.min(
        options.length - 1,
        Math.max(0, Math.round(c.scrollTop / itemHeight))
      );
      const v = options[snapIdx]?.value;
      if (v !== undefined && v !== value) {
        onChange(v);
      }
      setVisualIndex(snapIdx);
      scrollToIndex(snapIdx, true);
      isUserScrolling.current = false;
    }, 80);
  };

  const padCount = Math.floor(height / (2 * itemHeight));

  const alignCls =
    align === "left"
      ? "justify-start ps-4"
      : align === "right"
      ? "justify-end pe-4"
      : "justify-center";

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto no-scrollbar relative [&::-webkit-scrollbar]:hidden"
      style={{
        scrollSnapType: "y mandatory",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
      tabIndex={0}
      role="listbox"
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          const next = Math.min(options.length - 1, selectedIndex + 1);
          setVisualIndex(next);
          onChange(options[next].value);
          scrollToIndex(next);
          soundManager.playWheelTick();
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          const prev = Math.max(0, selectedIndex - 1);
          setVisualIndex(prev);
          onChange(options[prev].value);
          scrollToIndex(prev);
          soundManager.playWheelTick();
        }
      }}
    >
      {/* Top spacer */}
      <div style={{ height: padCount * itemHeight }} />

      {options.map((opt, i) => {
        const dist = Math.abs(i - visualIndex);
        const isCenter = dist === 0;

        return (
          <div
            key={`${opt.value}`}
            onClick={() => {
              setVisualIndex(i);
              onChange(opt.value);
              scrollToIndex(i, true);
              soundManager.playWheelTick();
            }}
            style={{
              height: itemHeight,
              scrollSnapAlign: "center",
            }}
            className={`flex items-center ${alignCls} cursor-pointer select-none tabular-nums transition-colors duration-75 ${
              isCenter
                ? "text-white font-bold text-[18px] tracking-tight drop-shadow-sm"
                : dist === 1
                ? "text-zinc-300 font-medium text-[16px]"
                : dist === 2
                ? "text-zinc-400 font-normal text-[14px]"
                : "text-zinc-500 font-normal text-[13px]"
            }`}
            role="option"
            aria-selected={isCenter}
          >
            {opt.label}
          </div>
        );
      })}

      {/* Bottom spacer */}
      <div style={{ height: padCount * itemHeight }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   AppleWheelPicker — the unified multi-column picker
   ═══════════════════════════════════════════════════════════════════ */

export default function AppleWheelPicker({
  columns,
  height = 220,
  itemHeight = 44,
  ariaLabel = "عجلة اختيار",
}: AppleWheelPickerProps) {
  return (
    <div
      className="relative select-none overflow-hidden rounded-2xl bg-zinc-900/60"
      style={{ height }}
      aria-label={ariaLabel}
    >
      {/* ── Subtle selection slot backdrop ───────────────────────── */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 bg-zinc-800/25"
        style={{
          top: `calc(50% - ${itemHeight / 2}px)`,
          height: itemHeight,
        }}
      />

      {/* ── Two thin selection lines (spanning full width) ────────── */}
      <div
        className="pointer-events-none absolute inset-x-0 z-20 border-t border-zinc-600/70"
        style={{ top: `calc(50% - ${itemHeight / 2}px)` }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 z-20 border-t border-zinc-600/70"
        style={{ top: `calc(50% + ${itemHeight / 2}px)` }}
      />

      {/* ── Top & bottom edge fades ──────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-[#0c0e17] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-[#0c0e17] to-transparent" />

      {/* ── Columns ─────────────────────────────────────────────── */}
      <div className="flex h-full relative z-0">
        {columns.map((col, idx) => (
          <div key={idx} className="h-full" style={{ flex: col.flex ?? 1 }}>
            <WheelCol
              options={col.options}
              value={col.value}
              onChange={col.onChange}
              height={height}
              itemHeight={itemHeight}
              align={col.align}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
