/**
 * Pure physics, geometry, and persistence helpers for the Floating Task Bubble.
 *
 * Kept strictly decoupled from React rendering and task timer business logic
 * so frame stepping remains deterministic, time-based, and zero-allocation.
 */

export type Edge = "top" | "right" | "bottom" | "left";

export interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  viewportWidth: number;
  viewportHeight: number;
  bubbleWidth: number;
  bubbleHeight: number;
}

export interface RestingAnchor {
  edge: Edge;
  /** Normalized position [0..1] along the free axis of the edge */
  ratio: number;
}

export interface BubblePrefs {
  isMinimized: boolean;
  anchor: RestingAnchor | null;
}

export interface PointerSample {
  x: number;
  y: number;
  t: number;
}

export interface PhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface GlideStepResult extends PhysicsState {
  bounced: boolean;
  shouldSnap: boolean;
}

export interface SnapStepResult extends PhysicsState {
  settled: boolean;
}

export const BUBBLE_PREFS_KEY = "athar_task_bubble_prefs_v1";

/** Movement threshold (px) distinguishing a tap/click from a real drag */
export const DRAG_THRESHOLD_PX = 6;

/** Sliding window (ms) for computing release throw velocity */
export const VELOCITY_WINDOW_MS = 90;

/** If pointer has not moved for this long (ms) before release, treat as gentle stop */
export const STALE_POINTER_MS = 95;

/** Maximum release velocity magnitude (px/s) */
export const MAX_THROW_SPEED = 2800;

/** Exponential glide friction rate (1/s) — produces smooth, billiard-felt deceleration */
export const FRICTION_RATE = 2.7;

/** Restitution coefficient on viewport cushion impact */
export const WALL_RESTITUTION = 0.56;

/** Subtle tangential damping on cushion bounce */
export const WALL_TANGENTIAL_DAMPING = 0.9;

/** Speed (px/s) below which glide transitions into nearest-edge spring snap */
export const SNAP_SPEED_THRESHOLD = 95;

/** Critically damped spring parameters for smooth edge settling */
export const SPRING_OMEGA = 19;
export const SPRING_ZETA = 0.96;

/** Max physics sub-step (s) for unconditional spring stability across refresh rates */
const MAX_SPRING_SUBSTEP = 1 / 120;

export function clamp(val: number, min: number, max: number): number {
  if (max <= min) return min;
  return Math.max(min, Math.min(max, val));
}

export function computeViewportBounds(
  viewportWidth: number,
  viewportHeight: number,
  bubbleWidth: number,
  bubbleHeight: number,
  safeInsets: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 }
): ViewportBounds {
  const w = Math.max(1, viewportWidth);
  const h = Math.max(1, viewportHeight);
  const bw = Math.max(1, bubbleWidth);
  const bh = Math.max(1, bubbleHeight);
  const edgeMargin = w < 640 ? 10 : 14;

  const minX = edgeMargin + Math.max(0, safeInsets.left);
  const maxX = Math.max(minX, w - bw - edgeMargin - Math.max(0, safeInsets.right));
  const minY = edgeMargin + Math.max(0, safeInsets.top);
  const maxY = Math.max(minY, h - bh - edgeMargin - Math.max(0, safeInsets.bottom));

  return {
    minX,
    maxX,
    minY,
    maxY,
    viewportWidth: w,
    viewportHeight: h,
    bubbleWidth: bw,
    bubbleHeight: bh,
  };
}

export function clampPosition(
  x: number,
  y: number,
  bounds: ViewportBounds
): { x: number; y: number } {
  return {
    x: clamp(x, bounds.minX, bounds.maxX),
    y: clamp(y, bounds.minY, bounds.maxY),
  };
}

export function getDefaultAnchor(viewportWidth: number): RestingAnchor {
  // Desktop: bottom-left edge (clear of RTL primary content on the right & bottom toast).
  // Mobile: upper-left edge below navbar and well clear of the bottom navigation bar.
  if (viewportWidth < 768) {
    return { edge: "left", ratio: 0.14 };
  }
  return { edge: "left", ratio: 0.82 };
}

export function anchorToPosition(
  anchor: RestingAnchor,
  bounds: ViewportBounds
): { x: number; y: number } {
  const r = clamp(Number.isFinite(anchor.ratio) ? anchor.ratio : 0.5, 0, 1);
  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;

  switch (anchor.edge) {
    case "top":
      return { x: bounds.minX + spanX * r, y: bounds.minY };
    case "bottom":
      return { x: bounds.minX + spanX * r, y: bounds.maxY };
    case "right":
      return { x: bounds.maxX, y: bounds.minY + spanY * r };
    case "left":
    default:
      return { x: bounds.minX, y: bounds.minY + spanY * r };
  }
}

export function findNearestEdgeTarget(
  x: number,
  y: number,
  bounds: ViewportBounds
): { edge: Edge; x: number; y: number } {
  const cx = clamp(x, bounds.minX, bounds.maxX);
  const cy = clamp(y, bounds.minY, bounds.maxY);

  const dLeft = Math.abs(cx - bounds.minX);
  const dRight = Math.abs(bounds.maxX - cx);
  const dTop = Math.abs(cy - bounds.minY);
  const dBottom = Math.abs(bounds.maxY - cy);

  let nearestEdge: Edge = "left";
  let minDist = dLeft;

  if (dRight < minDist) {
    minDist = dRight;
    nearestEdge = "right";
  }
  if (dTop < minDist) {
    minDist = dTop;
    nearestEdge = "top";
  }
  if (dBottom < minDist) {
    nearestEdge = "bottom";
  }

  switch (nearestEdge) {
    case "left":
      return { edge: "left", x: bounds.minX, y: cy };
    case "right":
      return { edge: "right", x: bounds.maxX, y: cy };
    case "top":
      return { edge: "top", x: cx, y: bounds.minY };
    case "bottom":
      return { edge: "bottom", x: cx, y: bounds.maxY };
  }
}

export function positionToAnchor(
  x: number,
  y: number,
  bounds: ViewportBounds
): RestingAnchor {
  const target = findNearestEdgeTarget(x, y, bounds);
  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;

  if (target.edge === "top" || target.edge === "bottom") {
    const ratio = spanX > 0 ? clamp((target.x - bounds.minX) / spanX, 0, 1) : 0.5;
    return { edge: target.edge, ratio };
  }

  const ratio = spanY > 0 ? clamp((target.y - bounds.minY) / spanY, 0, 1) : 0.5;
  return { edge: target.edge, ratio };
}

/**
 * Estimate pointer release velocity (px/s) from recent pointer samples.
 * Returns zero velocity if the pointer paused before release so gentle drags
 * settle cleanly instead of flying away.
 */
export function estimateReleaseVelocity(
  samples: readonly PointerSample[],
  nowMs: number
): { vx: number; vy: number } {
  if (samples.length < 2) {
    return { vx: 0, vy: 0 };
  }

  const latest = samples[samples.length - 1];
  if (nowMs - latest.t > STALE_POINTER_MS) {
    return { vx: 0, vy: 0 };
  }

  const windowStart = nowMs - VELOCITY_WINDOW_MS;
  let anchorSample = samples[0];
  for (let i = samples.length - 1; i >= 0; i--) {
    if (samples[i].t <= windowStart) {
      anchorSample = samples[i];
      break;
    }
    anchorSample = samples[i];
  }

  const dtSec = (latest.t - anchorSample.t) / 1000;
  if (dtSec <= 0.004) {
    return { vx: 0, vy: 0 };
  }

  let vx = (latest.x - anchorSample.x) / dtSec;
  let vy = (latest.y - anchorSample.y) / dtSec;

  const speed = Math.hypot(vx, vy);
  if (speed > MAX_THROW_SPEED) {
    const scale = MAX_THROW_SPEED / speed;
    vx *= scale;
    vy *= scale;
  }

  return { vx, vy };
}

/**
 * Advance free momentum glide by `dt` seconds with exponential friction
 * and viewport boundary cushion reflections.
 */
export function stepGlidePhysics(
  state: PhysicsState,
  dtSeconds: number,
  bounds: ViewportBounds
): GlideStepResult {
  const dt = Math.min(Math.max(dtSeconds, 0), 0.05);
  if (dt <= 0) {
    const speed = Math.hypot(state.vx, state.vy);
    return { ...state, bounced: false, shouldSnap: speed < SNAP_SPEED_THRESHOLD };
  }

  const decay = Math.exp(-FRICTION_RATE * dt);
  let vx = state.vx * decay;
  let vy = state.vy * decay;

  // Midpoint velocity integration for accurate frame-rate-independent displacement
  let x = state.x + 0.5 * (state.vx + vx) * dt;
  let y = state.y + 0.5 * (state.vy + vy) * dt;
  let bounced = false;

  if (x < bounds.minX) {
    const overshoot = bounds.minX - x;
    x = clamp(bounds.minX + overshoot * WALL_RESTITUTION, bounds.minX, bounds.maxX);
    vx = Math.abs(vx) * WALL_RESTITUTION;
    vy *= WALL_TANGENTIAL_DAMPING;
    bounced = true;
  } else if (x > bounds.maxX) {
    const overshoot = x - bounds.maxX;
    x = clamp(bounds.maxX - overshoot * WALL_RESTITUTION, bounds.minX, bounds.maxX);
    vx = -Math.abs(vx) * WALL_RESTITUTION;
    vy *= WALL_TANGENTIAL_DAMPING;
    bounced = true;
  }

  if (y < bounds.minY) {
    const overshoot = bounds.minY - y;
    y = clamp(bounds.minY + overshoot * WALL_RESTITUTION, bounds.minY, bounds.maxY);
    vy = Math.abs(vy) * WALL_RESTITUTION;
    vx *= WALL_TANGENTIAL_DAMPING;
    bounced = true;
  } else if (y > bounds.maxY) {
    const overshoot = y - bounds.maxY;
    y = clamp(bounds.maxY - overshoot * WALL_RESTITUTION, bounds.minY, bounds.maxY);
    vy = -Math.abs(vy) * WALL_RESTITUTION;
    vx *= WALL_TANGENTIAL_DAMPING;
    bounced = true;
  }

  const speed = Math.hypot(vx, vy);
  return {
    x,
    y,
    vx,
    vy,
    bounced,
    shouldSnap: speed < SNAP_SPEED_THRESHOLD,
  };
}

/**
 * Advance critically damped spring toward the nearest resting edge target.
 * Sub-steps internally so behavior is identical at 60Hz, 120Hz, or 144Hz.
 */
export function stepSpringSnap(
  state: PhysicsState,
  target: { x: number; y: number },
  dtSeconds: number,
  bounds: ViewportBounds
): SnapStepResult {
  const totalDt = Math.min(Math.max(dtSeconds, 0), 0.05);
  if (totalDt <= 0) {
    const dist = Math.hypot(target.x - state.x, target.y - state.y);
    const speed = Math.hypot(state.vx, state.vy);
    return { ...state, settled: dist < 0.5 && speed < 6 };
  }

  const steps = Math.max(1, Math.ceil(totalDt / MAX_SPRING_SUBSTEP));
  const h = totalDt / steps;
  const k = SPRING_OMEGA * SPRING_OMEGA;
  const c = 2 * SPRING_ZETA * SPRING_OMEGA;

  let { x, y, vx, vy } = state;

  for (let i = 0; i < steps; i++) {
    const ax = k * (target.x - x) - c * vx;
    const ay = k * (target.y - y) - c * vy;
    vx += ax * h;
    vy += ay * h;
    x += vx * h;
    y += vy * h;
  }

  // Clamp strictly to safe viewport bounds so bubble never dips offscreen
  const clamped = clampPosition(x, y, bounds);
  if (clamped.x !== x) vx = 0;
  if (clamped.y !== y) vy = 0;
  x = clamped.x;
  y = clamped.y;

  const dist = Math.hypot(target.x - x, target.y - y);
  const speed = Math.hypot(vx, vy);
  const settled = dist < 0.6 && speed < 8;

  if (settled) {
    return { x: target.x, y: target.y, vx: 0, vy: 0, settled: true };
  }

  return { x, y, vx, vy, settled: false };
}

export function loadBubblePrefs(): BubblePrefs {
  if (typeof window === "undefined") {
    return { isMinimized: false, anchor: null };
  }
  try {
    const raw = localStorage.getItem(BUBBLE_PREFS_KEY);
    if (!raw) return { isMinimized: false, anchor: null };
    const parsed = JSON.parse(raw);
    const isMinimized = Boolean(parsed?.isMinimized);
    const edge = parsed?.anchor?.edge;
    const ratio = parsed?.anchor?.ratio;
    const validEdge =
      edge === "top" || edge === "right" || edge === "bottom" || edge === "left";
    const anchor: RestingAnchor | null =
      validEdge && typeof ratio === "number" && Number.isFinite(ratio)
        ? { edge, ratio: clamp(ratio, 0, 1) }
        : null;
    return { isMinimized, anchor };
  } catch {
    return { isMinimized: false, anchor: null };
  }
}

export function saveBubblePrefs(prefs: BubblePrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BUBBLE_PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}
