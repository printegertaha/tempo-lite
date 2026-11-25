"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CheckCircle2, Pause, X } from "lucide-react";
import {
  anchorToPosition,
  clampPosition,
  computeViewportBounds,
  DRAG_THRESHOLD_PX,
  estimateReleaseVelocity,
  findNearestEdgeTarget,
  getDefaultAnchor,
  loadBubblePrefs,
  PointerSample,
  positionToAnchor,
  RestingAnchor,
  SafeInsets,
  saveBubblePrefs,
  SNAP_SPEED_THRESHOLD,
  stepGlidePhysics,
  stepSpringSnap,
  ViewportBounds,
} from "@/lib/timer/bubble-physics";

interface FloatingTaskBubbleProps {
  taskTitle: string;
  elapsedSeconds: number;
  isRunning: boolean;
  isCompleted: boolean;
  isOvertime?: boolean;
  reducedMotion: boolean;
  formatDuration: (totalSeconds: number) => string;
  onRestore: () => void;
  onDismissCompleted?: () => void;
}

const EDGE_LABELS_AR: Record<string, string> = {
  top: "الحافة العلوية",
  right: "الحافة اليمنى",
  bottom: "الحافة السفلية",
  left: "الحافة اليسرى",
};

function readSafeInsets(): SafeInsets {
  if (typeof window === "undefined") {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  const styles = getComputedStyle(document.documentElement);
  const parsePx = (prop: string) => {
    const val = parseFloat(styles.getPropertyValue(prop));
    return Number.isFinite(val) ? val : 0;
  };
  return {
    top: parsePx("--safe-area-top"),
    right: parsePx("--safe-area-right"),
    bottom: parsePx("--safe-area-bottom"),
    left: parsePx("--safe-area-left"),
  };
}

export default function FloatingTaskBubble({
  taskTitle,
  elapsedSeconds,
  isRunning,
  isCompleted,
  isOvertime = false,
  reducedMotion,
  formatDuration,
  onRestore,
  onDismissCompleted,
}: FloatingTaskBubbleProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const posRef = useRef({ x: 14, y: 120 });
  const velRef = useRef({ vx: 0, vy: 0 });
  const phaseRef = useRef<"idle" | "dragging" | "glide" | "snap">("idle");
  const restingAnchorRef = useRef<RestingAnchor | null>(null);
  const snapEdgeRef = useRef<"top" | "right" | "bottom" | "left">("left");
  const snapRatioRef = useRef(0.5);

  const rafIdRef = useRef<number | null>(null);
  const lastFrameMsRef = useRef(0);
  const resizeSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activePointerIdRef = useRef<number | null>(null);
  const dragOriginRef = useRef({ startX: 0, startY: 0, offsetX: 0, offsetY: 0 });
  const hasDraggedRef = useRef(false);
  const suppressClickUntilRef = useRef(0);
  const samplesRef = useRef<PointerSample[]>([]);

  const reducedMotionRef = useRef(reducedMotion);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  const [isDraggingVisual, setIsDraggingVisual] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  const announce = (msg: string) => {
    setLiveAnnouncement(msg);
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    announceTimerRef.current = setTimeout(() => {
      setLiveAnnouncement("");
    }, 1200);
  };

  const getBounds = (): ViewportBounds => {
    const el = wrapperRef.current;
    const bw = el?.offsetWidth || 180;
    const bh = el?.offsetHeight || 44;
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return computeViewportBounds(vw, vh, bw, bh, readSafeInsets());
  };

  const applyTransform = (x: number, y: number) => {
    const el = wrapperRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
  };

  const stopAnimation = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  };

  const persistAnchor = (anchor: RestingAnchor) => {
    restingAnchorRef.current = anchor;
    saveBubblePrefs({ isMinimized: true, anchor });
  };

  const startPhysics = (initialVx: number, initialVy: number) => {
    stopAnimation();
    const bounds = getBounds();

    if (reducedMotionRef.current) {
      const target = findNearestEdgeTarget(
        posRef.current.x,
        posRef.current.y,
        bounds
      );
      posRef.current = { x: target.x, y: target.y };
      velRef.current = { vx: 0, vy: 0 };
      phaseRef.current = "idle";
      applyTransform(target.x, target.y);
      persistAnchor(positionToAnchor(target.x, target.y, bounds));
      return;
    }

    velRef.current = { vx: initialVx, vy: initialVy };
    const initialSpeed = Math.hypot(initialVx, initialVy);

    if (initialSpeed < SNAP_SPEED_THRESHOLD) {
      const target = findNearestEdgeTarget(
        posRef.current.x,
        posRef.current.y,
        bounds
      );
      const anchor = positionToAnchor(target.x, target.y, bounds);
      snapEdgeRef.current = anchor.edge;
      snapRatioRef.current = anchor.ratio;
      phaseRef.current = "snap";
    } else {
      phaseRef.current = "glide";
    }

    lastFrameMsRef.current = performance.now();

    const tick = (nowMs: number) => {
      const dt = Math.min((nowMs - lastFrameMsRef.current) / 1000, 0.05);
      lastFrameMsRef.current = nowMs;
      const currentBounds = getBounds();

      if (phaseRef.current === "glide") {
        const res = stepGlidePhysics(
          { ...posRef.current, ...velRef.current },
          dt,
          currentBounds
        );
        posRef.current = { x: res.x, y: res.y };
        velRef.current = { vx: res.vx, vy: res.vy };
        applyTransform(res.x, res.y);

        if (res.shouldSnap) {
          const target = findNearestEdgeTarget(res.x, res.y, currentBounds);
          const anchor = positionToAnchor(target.x, target.y, currentBounds);
          snapEdgeRef.current = anchor.edge;
          snapRatioRef.current = anchor.ratio;
          phaseRef.current = "snap";
        }
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      if (phaseRef.current === "snap") {
        const lockedAnchor: RestingAnchor = {
          edge: snapEdgeRef.current,
          ratio: snapRatioRef.current,
        };
        const targetPos = anchorToPosition(lockedAnchor, currentBounds);
        const res = stepSpringSnap(
          { ...posRef.current, ...velRef.current },
          targetPos,
          dt,
          currentBounds
        );
        posRef.current = { x: res.x, y: res.y };
        velRef.current = { vx: res.vx, vy: res.vy };
        applyTransform(res.x, res.y);

        if (res.settled) {
          phaseRef.current = "idle";
          rafIdRef.current = null;
          persistAnchor(lockedAnchor);
          return;
        }
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      rafIdRef.current = null;
    };

    rafIdRef.current = requestAnimationFrame(tick);
  };

  // Initial synchronous positioning before paint so bubble never flickers at (0,0)
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const bounds = getBounds();
    const prefs = loadBubblePrefs();
    const anchor = prefs.anchor || getDefaultAnchor(bounds.viewportWidth);
    restingAnchorRef.current = anchor;

    const pos = anchorToPosition(anchor, bounds);
    posRef.current = pos;
    applyTransform(pos.x, pos.y);
    el.style.opacity = "1";

    if (!prefs.anchor) {
      saveBubblePrefs({ isMinimized: true, anchor });
    }
  }, []);

  // Keep position clamped and edge-anchored across window resize, orientation change, zoom, and bubble size changes
  useEffect(() => {
    const handleViewportOrSizeChange = () => {
      if (phaseRef.current === "dragging") return;
      const bounds = getBounds();

      if (phaseRef.current === "idle") {
        const anchor =
          restingAnchorRef.current || getDefaultAnchor(bounds.viewportWidth);
        const nextPos = anchorToPosition(anchor, bounds);
        posRef.current = nextPos;
        applyTransform(nextPos.x, nextPos.y);

        if (resizeSaveTimerRef.current) clearTimeout(resizeSaveTimerRef.current);
        resizeSaveTimerRef.current = setTimeout(() => {
          persistAnchor(anchor);
        }, 160);
      } else {
        const clamped = clampPosition(
          posRef.current.x,
          posRef.current.y,
          bounds
        );
        posRef.current = clamped;
        applyTransform(clamped.x, clamped.y);
      }
    };

    window.addEventListener("resize", handleViewportOrSizeChange, { passive: true });
    window.addEventListener("orientationchange", handleViewportOrSizeChange, {
      passive: true,
    });
    const vv = window.visualViewport;
    vv?.addEventListener("resize", handleViewportOrSizeChange);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && wrapperRef.current) {
      ro = new ResizeObserver(handleViewportOrSizeChange);
      ro.observe(wrapperRef.current);
    }

    return () => {
      stopAnimation();
      if (resizeSaveTimerRef.current) clearTimeout(resizeSaveTimerRef.current);
      if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
      window.removeEventListener("resize", handleViewportOrSizeChange);
      window.removeEventListener("orientationchange", handleViewportOrSizeChange);
      vv?.removeEventListener("resize", handleViewportOrSizeChange);
      ro?.disconnect();
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (activePointerIdRef.current !== null) return;

    stopAnimation();
    velRef.current = { vx: 0, vy: 0 };
    phaseRef.current = "idle";

    activePointerIdRef.current = e.pointerId;
    hasDraggedRef.current = false;
    dragOriginRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - posRef.current.x,
      offsetY: e.clientY - posRef.current.y,
    };
    samplesRef.current = [{ x: e.clientX, y: e.clientY, t: performance.now() }];

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== activePointerIdRef.current) return;

    const now = performance.now();
    const { startX, startY, offsetX, offsetY } = dragOriginRef.current;

    if (!hasDraggedRef.current) {
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (dist < DRAG_THRESHOLD_PX) {
        return;
      }
      hasDraggedRef.current = true;
      phaseRef.current = "dragging";
      setIsDraggingVisual(true);
    }

    const bounds = getBounds();
    const clamped = clampPosition(
      e.clientX - offsetX,
      e.clientY - offsetY,
      bounds
    );
    posRef.current = clamped;
    applyTransform(clamped.x, clamped.y);

    const samples = samplesRef.current;
    samples.push({ x: e.clientX, y: e.clientY, t: now });
    const cutoff = now - 140;
    while (samples.length > 2 && samples[0].t < cutoff) {
      samples.shift();
    }
  };

  const finishPointerInteraction = (
    e: React.PointerEvent<HTMLButtonElement>,
    cancelled: boolean
  ) => {
    if (e.pointerId !== activePointerIdRef.current) return;
    activePointerIdRef.current = null;
    setIsDraggingVisual(false);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (cancelled) {
      suppressClickUntilRef.current = performance.now() + 250;
      startPhysics(0, 0);
      return;
    }

    if (hasDraggedRef.current) {
      suppressClickUntilRef.current = performance.now() + 260;
      const { vx, vy } = estimateReleaseVelocity(
        samplesRef.current,
        performance.now()
      );
      startPhysics(vx, vy);
      return;
    }

    // Simple click/tap with no drag: ensure physics stops cleanly; onClick handles restore
    stopAnimation();
    velRef.current = { vx: 0, vy: 0 };
    phaseRef.current = "idle";
  };

  const handleMainClick = () => {
    if (performance.now() < suppressClickUntilRef.current) return;
    stopAnimation();
    velRef.current = { vx: 0, vy: 0 };
    phaseRef.current = "idle";
    onRestore();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = 28;
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = -step;
    else if (e.key === "ArrowDown") dy = step;
    else return;

    e.preventDefault();
    stopAnimation();
    velRef.current = { vx: 0, vy: 0 };
    phaseRef.current = "idle";

    const bounds = getBounds();
    const targetX = e.shiftKey
      ? dx < 0
        ? bounds.minX
        : dx > 0
        ? bounds.maxX
        : posRef.current.x
      : posRef.current.x + dx;
    const targetY = e.shiftKey
      ? dy < 0
        ? bounds.minY
        : dy > 0
        ? bounds.maxY
        : posRef.current.y
      : posRef.current.y + dy;

    const clamped = clampPosition(targetX, targetY, bounds);
    posRef.current = clamped;
    applyTransform(clamped.x, clamped.y);

    const anchor = positionToAnchor(clamped.x, clamped.y, bounds);
    persistAnchor(anchor);
    announce(`تم تحريك فقاعة المهمة نحو ${EDGE_LABELS_AR[anchor.edge] || "الشاشة"}`);
  };

  const surfaceClasses = isCompleted
    ? "bg-[#091612]/95 border-emerald-500/50 hover:border-emerald-400/75 shadow-emerald-950/40"
    : isRunning
    ? "bg-[#0b0e17]/95 border-violet-500/45 hover:border-violet-400/75 shadow-black/50"
    : "bg-[#0c0e16]/95 border-amber-500/40 hover:border-amber-400/70 shadow-black/50";

  const statusText = isCompleted
    ? "مكتملة"
    : isRunning
    ? "نشطة"
    : "متوقفة مؤقتاً";

  return (
    <>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      <div
        ref={wrapperRef}
        data-testid="floating-task-bubble"
        style={{ opacity: 0, transform: "translate3d(14px, 120px, 0)" }}
        className="fixed top-0 left-0 z-[45] pointer-events-auto select-none"
      >
        <div
          className={`athar-bubble-surface flex items-center gap-1.5 rounded-full p-1 border backdrop-blur-xl shadow-xl transition-transform duration-150 ${surfaceClasses} ${
            isDraggingVisual && !reducedMotion ? "scale-[1.03]" : "scale-100"
          }`}
        >
          <button
            type="button"
            data-testid="floating-task-bubble-restore"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => finishPointerInteraction(e, false)}
            onPointerCancel={(e) => finishPointerInteraction(e, true)}
            onLostPointerCapture={() => {
              if (activePointerIdRef.current !== null) {
                activePointerIdRef.current = null;
                setIsDraggingVisual(false);
                startPhysics(0, 0);
              }
            }}
            onClick={handleMainClick}
            onKeyDown={handleKeyDown}
            style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none" }}
            className={`flex items-center gap-2 min-h-[38px] sm:min-h-[36px] px-3 py-1 rounded-full text-right focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 transition-colors ${
              isDraggingVisual ? "cursor-grabbing" : "cursor-grab"
            }`}
            aria-label={`المهمة ${taskTitle} (${statusText})، المدة ${formatDuration(
              elapsedSeconds
            )}. اضغط للاستعادة إلى الشريط العلوي، أو اسحب لتحريك الفقاعة، أو استخدم مفاتيح الأسهم.`}
            title="اضغط للاستعادة • اسحب للتحريك"
          >
            {/* Status Dot / Icon */}
            {isCompleted ? (
              <CheckCircle2
                className="w-4 h-4 text-emerald-400 shrink-0"
                aria-hidden="true"
              />
            ) : isRunning ? (
              <span
                className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20 shrink-0"
                aria-hidden="true"
              />
            ) : (
              <Pause
                className="w-3.5 h-3.5 text-amber-400 shrink-0"
                aria-hidden="true"
              />
            )}

            {/* Compact Task Title */}
            <span className="text-xs font-bold text-zinc-100 truncate max-w-[90px] sm:max-w-[130px]">
              {taskTitle}
            </span>

            <span className="w-px h-3.5 bg-zinc-800 shrink-0" aria-hidden="true" />

            {/* Timer Readout */}
            <span
              dir="ltr"
              className={`font-mono text-xs sm:text-[13px] font-black tabular-nums tracking-tight shrink-0 ${
                isCompleted
                  ? "text-emerald-300"
                  : isOvertime
                  ? "text-amber-300"
                  : isRunning
                  ? "text-white"
                  : "text-zinc-300"
              }`}
            >
              {formatDuration(elapsedSeconds)}
            </span>

            {isCompleted && (
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-full shrink-0">
                تم
              </span>
            )}
          </button>

          {isCompleted && onDismissCompleted && (
            <button
              type="button"
              data-testid="floating-task-bubble-dismiss"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onDismissCompleted();
              }}
              className="flex items-center justify-center w-8 h-8 rounded-full text-emerald-300/80 hover:text-white hover:bg-emerald-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 transition-colors cursor-pointer shrink-0"
              aria-label={`إغلاق إشعار إنجاز المهمة ${taskTitle}`}
              title="إغلاق"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
