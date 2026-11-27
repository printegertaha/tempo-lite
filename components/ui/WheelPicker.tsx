"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { soundManager } from "@/lib/audio";

export interface WheelColumn {
  options: { value: string | number; label: string | number }[];
  value: string | number;
  onChange: (value: string | number) => void;
  /** Optional column header label (e.g. "الساعة", "الدقيقة") */
  label?: string;
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
   Single scrollable column — GPU translate3d spring & inertia physics
   Zero scrollTop layout thrashing, zero listener churn on rapid clicks
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Keep latest callbacks/options in refs so RAF & event listeners never tear down
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const maxOffset = Math.max(0, (options.length - 1) * itemHeight);
  const maxOffsetRef = useRef(maxOffset);
  maxOffsetRef.current = maxOffset;

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );

  const [visualIndex, setVisualIndex] = useState(selectedIndex);

  // Physics state
  const offsetRef = useRef(selectedIndex * itemHeight);
  const targetOffsetRef = useRef<number | null>(null);
  const velocityRef = useRef(0); // px/sec
  const isInteractingRef = useRef(false);
  const lastTickIndexRef = useRef(selectedIndex);
  const rafRef = useRef<number | null>(null);
  const wheelSnapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dragRef = useRef<{
    active: boolean;
    captured: boolean;
    pointerId: number;
    startY: number;
    startOffset: number;
    moved: boolean;
    lastY: number;
    lastTime: number;
  }>({
    active: false,
    captured: false,
    pointerId: -1,
    startY: 0,
    startOffset: 0,
    moved: false,
    lastY: 0,
    lastTime: 0,
  });

  const applyTransform = useCallback((offsetPx: number) => {
    const track = trackRef.current;
    if (track) {
      track.style.transform = `translate3d(0, ${-offsetPx}px, 0)`;
    }
  }, []);

  const updateVisualAndTick = useCallback(
    (offsetPx: number, commitChange = false) => {
      const opts = optionsRef.current;
      const idx = Math.min(opts.length - 1, Math.max(0, Math.round(offsetPx / itemHeight)));
      if (idx !== lastTickIndexRef.current) {
        lastTickIndexRef.current = idx;
        soundManager.playPickerTick();
      }
      setVisualIndex((prev) => (prev !== idx ? idx : prev));
      if (commitChange) {
        const val = opts[idx]?.value;
        if (val !== undefined) {
          onChangeRef.current(val);
        }
      }
    },
    [itemHeight]
  );

  const stopPhysics = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startPhysicsLoop = useCallback(() => {
    if (rafRef.current !== null) return;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.004, (now - lastTime) / 1000));
      lastTime = now;

      const maxOff = maxOffsetRef.current;

      if (targetOffsetRef.current !== null) {
        // Critically-damped smooth spring toward targetOffsetRef
        const diff = targetOffsetRef.current - offsetRef.current;
        const speed = 18;
        const nextOffset = offsetRef.current + diff * (1 - Math.exp(-speed * dt));
        offsetRef.current = nextOffset;
        applyTransform(nextOffset);
        updateVisualAndTick(nextOffset, false);

        if (Math.abs(diff) < 0.35) {
          offsetRef.current = targetOffsetRef.current;
          applyTransform(offsetRef.current);
          updateVisualAndTick(offsetRef.current, true);
          targetOffsetRef.current = null;
          velocityRef.current = 0;
          isInteractingRef.current = false;
          rafRef.current = null;
          return;
        }
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      // Free inertia glide (after touch/mouse flick)
      let v = velocityRef.current;
      let nextOffset = offsetRef.current + v * dt;

      // Rubber-band / clamp at boundaries
      if (nextOffset < 0) {
        nextOffset = 0;
        v = 0;
      } else if (nextOffset > maxOff) {
        nextOffset = maxOff;
        v = 0;
      }

      // Exponential friction decay
      v *= Math.exp(-6.5 * dt);
      offsetRef.current = nextOffset;
      velocityRef.current = v;

      applyTransform(nextOffset);
      updateVisualAndTick(nextOffset, false);

      // Once slow enough, lock onto nearest item with spring
      if (Math.abs(v) < 55) {
        const snapIdx = Math.min(
          optionsRef.current.length - 1,
          Math.max(0, Math.round(nextOffset / itemHeight))
        );
        targetOffsetRef.current = snapIdx * itemHeight;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
  }, [applyTransform, itemHeight, updateVisualAndTick]);

  const goToIndex = useCallback(
    (idx: number, immediateCommit = true) => {
      const clamped = Math.min(optionsRef.current.length - 1, Math.max(0, idx));
      if (wheelSnapTimerRef.current) clearTimeout(wheelSnapTimerRef.current);
      isInteractingRef.current = true;
      velocityRef.current = 0;
      targetOffsetRef.current = clamped * itemHeight;

      if (immediateCommit) {
        const val = optionsRef.current[clamped]?.value;
        if (val !== undefined) onChangeRef.current(val);
      }
      startPhysicsLoop();
    },
    [itemHeight, startPhysicsLoop]
  );

  // Sync external prop `value` -> position only when not actively animating/dragging
  useEffect(() => {
    if (!isInteractingRef.current && !dragRef.current.active && rafRef.current === null) {
      const target = selectedIndex * itemHeight;
      offsetRef.current = target;
      lastTickIndexRef.current = selectedIndex;
      setVisualIndex(selectedIndex);
      applyTransform(target);
    }
  }, [selectedIndex, itemHeight, applyTransform]);

  // Mouse wheel & trackpad handler (attached once, reads refs)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      isInteractingRef.current = true;
      velocityRef.current = 0;

      let deltaPx = e.deltaY;
      if (e.deltaMode === 1) {
        deltaPx *= itemHeight * 0.9;
      } else if (e.deltaMode === 2) {
        deltaPx *= height;
      } else if (Math.abs(deltaPx) >= 40) {
        const notches =
          Math.sign(deltaPx) * Math.min(2, Math.max(1, Math.round(Math.abs(deltaPx) / 100)));
        deltaPx = notches * itemHeight;
      } else {
        deltaPx = deltaPx * 0.85;
      }

      const base = targetOffsetRef.current ?? offsetRef.current;
      targetOffsetRef.current = Math.max(0, Math.min(maxOffsetRef.current, base + deltaPx));
      startPhysicsLoop();

      if (wheelSnapTimerRef.current) clearTimeout(wheelSnapTimerRef.current);
      wheelSnapTimerRef.current = setTimeout(() => {
        const cur = targetOffsetRef.current ?? offsetRef.current;
        const snapIdx = Math.min(
          optionsRef.current.length - 1,
          Math.max(0, Math.round(cur / itemHeight))
        );
        targetOffsetRef.current = snapIdx * itemHeight;
        startPhysicsLoop();
      }, 85);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, [height, itemHeight, startPhysicsLoop]);

  useEffect(() => {
    return () => {
      stopPhysics();
      if (wheelSnapTimerRef.current) clearTimeout(wheelSnapTimerRef.current);
    };
  }, [stopPhysics]);

  // Unified Pointer Drag (touch + mouse)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    stopPhysics();
    targetOffsetRef.current = null;
    velocityRef.current = 0;
    if (wheelSnapTimerRef.current) clearTimeout(wheelSnapTimerRef.current);

    dragRef.current = {
      active: true,
      captured: false,
      pointerId: e.pointerId,
      startY: e.clientY,
      startOffset: offsetRef.current,
      moved: false,
      lastY: e.clientY,
      lastTime: performance.now(),
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dy = e.clientY - dragRef.current.startY;

    if (!dragRef.current.moved && Math.abs(dy) > 5) {
      dragRef.current.moved = true;
      isInteractingRef.current = true;
      if (!dragRef.current.captured && viewportRef.current) {
        try {
          viewportRef.current.setPointerCapture(dragRef.current.pointerId);
          dragRef.current.captured = true;
        } catch {}
      }
    }
    if (!dragRef.current.moved) return;

    const now = performance.now();
    const dt = Math.max(0.008, (now - dragRef.current.lastTime) / 1000);
    const instVel = (dragRef.current.lastY - e.clientY) / dt;
    velocityRef.current = velocityRef.current * 0.4 + instVel * 0.6;
    dragRef.current.lastY = e.clientY;
    dragRef.current.lastTime = now;

    // Gentle rubber-band outside [0, maxOffset]
    const raw = dragRef.current.startOffset - dy;
    const maxOff = maxOffsetRef.current;
    let clamped = raw;
    if (raw < 0) clamped = raw * 0.3;
    else if (raw > maxOff) clamped = maxOff + (raw - maxOff) * 0.3;

    offsetRef.current = clamped;
    applyTransform(clamped);
    updateVisualAndTick(clamped, false);
  };

  const handlePointerUp = () => {
    if (!dragRef.current.active) return;
    const wasMoved = dragRef.current.moved;
    const wasCaptured = dragRef.current.captured;
    const pId = dragRef.current.pointerId;
    dragRef.current.active = false;
    dragRef.current.captured = false;

    if (wasCaptured && viewportRef.current) {
      try {
        viewportRef.current.releasePointerCapture(pId);
      } catch {}
    }

    if (wasMoved) {
      const maxOff = maxOffsetRef.current;
      if (offsetRef.current < 0) {
        targetOffsetRef.current = 0;
      } else if (offsetRef.current > maxOff) {
        targetOffsetRef.current = maxOff;
      } else if (Math.abs(velocityRef.current) < 80) {
        const snapIdx = Math.min(
          optionsRef.current.length - 1,
          Math.max(0, Math.round(offsetRef.current / itemHeight))
        );
        targetOffsetRef.current = snapIdx * itemHeight;
      }
      startPhysicsLoop();
    }

    setTimeout(() => {
      dragRef.current.moved = false;
    }, 0);
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
      ref={viewportRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="h-full overflow-hidden relative touch-none select-none cursor-grab active:cursor-grabbing focus:outline-none"
      tabIndex={0}
      role="listbox"
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          const curIdx = Math.round((targetOffsetRef.current ?? offsetRef.current) / itemHeight);
          goToIndex(curIdx + 1, true);
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          const curIdx = Math.round((targetOffsetRef.current ?? offsetRef.current) / itemHeight);
          goToIndex(curIdx - 1, true);
        }
      }}
    >
      <div
        ref={trackRef}
        className="will-change-transform"
        style={{
          transform: `translate3d(0, ${-(selectedIndex * itemHeight)}px, 0)`,
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
                if (dragRef.current.moved) return;
                goToIndex(i, true);
              }}
              style={{
                height: itemHeight,
              }}
              className={`flex items-center ${alignCls} cursor-pointer select-none tabular-nums transition-[color,opacity,transform] duration-100 ${
                isCenter
                  ? "text-white font-bold text-[18px] tracking-tight drop-shadow-sm scale-100"
                  : dist === 1
                  ? "text-zinc-300 font-medium text-[15px] scale-95 opacity-85 hover:text-white"
                  : dist === 2
                  ? "text-zinc-400 font-normal text-[14px] scale-90 opacity-60 hover:opacity-85"
                  : "text-zinc-500 font-normal text-[13px] scale-90 opacity-40"
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
  const hasLabels = columns.some((c) => Boolean(c.label));

  return (
    <div className="space-y-1.5">
      {hasLabels && (
        <div className="flex items-center px-1">
          {columns.map((col, idx) => (
            <div
              key={idx}
              style={{ flex: col.flex ?? 1 }}
              className="text-center text-[11px] font-bold text-zinc-400 select-none"
            >
              {col.label || ""}
            </div>
          ))}
        </div>
      )}

      <div
        className="relative select-none overflow-hidden rounded-2xl bg-zinc-900/60"
        style={{ height }}
        aria-label={ariaLabel}
      >
        {/* Subtle selection slot backdrop */}
        <div
          className="pointer-events-none absolute inset-x-0 z-10 bg-zinc-800/25"
          style={{
            top: `calc(50% - ${itemHeight / 2}px)`,
            height: itemHeight,
          }}
        />

        {/* Two thin selection lines */}
        <div
          className="pointer-events-none absolute inset-x-0 z-20 border-t border-zinc-600/70"
          style={{ top: `calc(50% - ${itemHeight / 2}px)` }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 z-20 border-t border-zinc-600/70"
          style={{ top: `calc(50% + ${itemHeight / 2}px)` }}
        />

        {/* Top & bottom edge fades */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-[#0c0e17] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-[#0c0e17] to-transparent" />

        {/* Columns */}
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
    </div>
  );
}
