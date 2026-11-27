export type NavigationProgressStatus = "idle" | "loading" | "completing";

export interface NavigationProgressSnapshot {
  status: NavigationProgressStatus;
  progress: number;
  visible: boolean;
  navId: number;
}

type Listener = (snapshot: NavigationProgressSnapshot) => void;

const INITIAL_PROGRESS = 0.08;
const MAX_PENDING_PROGRESS = 0.88;
const FALLBACK_TIMEOUT_MS = 12000;
const COMPLETE_HOLD_MS = 180;
const FADE_OUT_MS = 220;

class NavigationProgressController {
  private status: NavigationProgressStatus = "idle";
  private progress = 0;
  private visible = false;
  private navId = 0;

  private listeners = new Set<Listener>();
  private rafId: number | null = null;
  private lastTickTime = 0;
  private fallbackTimerId: ReturnType<typeof setTimeout> | null = null;
  private completeTimerId: ReturnType<typeof setTimeout> | null = null;
  private hideTimerId: ReturnType<typeof setTimeout> | null = null;

  getSnapshot(): NavigationProgressSnapshot {
    return {
      status: this.status,
      progress: this.progress,
      visible: this.visible,
      navId: this.navId,
    };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private clearTimersAndRaf(): void {
    if (this.rafId !== null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.fallbackTimerId !== null) {
      clearTimeout(this.fallbackTimerId);
      this.fallbackTimerId = null;
    }
    if (this.completeTimerId !== null) {
      clearTimeout(this.completeTimerId);
      this.completeTimerId = null;
    }
    if (this.hideTimerId !== null) {
      clearTimeout(this.hideTimerId);
      this.hideTimerId = null;
    }
  }

  private prefersReducedMotion(): boolean {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  start(): number {
    this.clearTimersAndRaf();
    this.navId += 1;
    const currentNavId = this.navId;

    const reducedMotion = this.prefersReducedMotion();

    // If overlapping with an in-flight navigation, don't jump backwards noticeably
    if (this.status === "loading" && this.visible) {
      this.progress = Math.max(this.progress, INITIAL_PROGRESS);
    } else {
      this.progress = reducedMotion ? 0.85 : INITIAL_PROGRESS;
    }

    this.status = "loading";
    this.visible = true;
    this.emit();

    // Safe fallback so a failed or stalled navigation never leaves the bar stuck
    this.fallbackTimerId = setTimeout(() => {
      this.complete(currentNavId);
    }, FALLBACK_TIMEOUT_MS);

    if (!reducedMotion && typeof requestAnimationFrame === "function") {
      this.lastTickTime = performance.now();
      const tick = (now: number) => {
        if (this.navId !== currentNavId || this.status !== "loading") {
          return;
        }

        const dt = Math.min(Math.max((now - this.lastTickTime) / 1000, 0.008), 0.1);
        this.lastTickTime = now;

        // Asymptotically approach MAX_PENDING_PROGRESS: fast at first, then tapering
        const remaining = MAX_PENDING_PROGRESS - this.progress;
        if (remaining > 0.001) {
          const rate = this.progress < 0.45 ? 1.85 : this.progress < 0.72 ? 0.75 : 0.25;
          this.progress = Math.min(
            MAX_PENDING_PROGRESS,
            this.progress + remaining * rate * dt
          );
          this.emit();
        }

        this.rafId = requestAnimationFrame(tick);
      };

      this.rafId = requestAnimationFrame(tick);
    }

    return currentNavId;
  }

  complete(expectedNavId?: number): void {
    if (expectedNavId !== undefined && expectedNavId !== this.navId) {
      return;
    }
    if (this.status === "idle") {
      return;
    }

    const currentNavId = this.navId;
    this.clearTimersAndRaf();

    this.status = "completing";
    this.progress = 1;
    this.visible = true;
    this.emit();

    const holdMs = this.prefersReducedMotion() ? 80 : COMPLETE_HOLD_MS;
    const fadeMs = this.prefersReducedMotion() ? 120 : FADE_OUT_MS;

    this.completeTimerId = setTimeout(() => {
      if (this.navId !== currentNavId) return;
      this.visible = false;
      this.emit();

      this.hideTimerId = setTimeout(() => {
        if (this.navId !== currentNavId) return;
        this.status = "idle";
        this.progress = 0;
        this.visible = false;
        this.emit();
      }, fadeMs);
    }, holdMs);
  }

  cancel(expectedNavId?: number): void {
    if (expectedNavId !== undefined && expectedNavId !== this.navId) {
      return;
    }
    if (this.status === "idle") {
      return;
    }
    this.clearTimersAndRaf();
    this.status = "idle";
    this.progress = 0;
    this.visible = false;
    this.emit();
  }

  reset(): void {
    this.clearTimersAndRaf();
    this.navId += 1;
    this.status = "idle";
    this.progress = 0;
    this.visible = false;
    this.emit();
  }
}

export const navigationProgress = new NavigationProgressController();

export function shouldTrackNavigationUrl(rawUrl: string): boolean {
  if (typeof window === "undefined") return false;
  if (!rawUrl || typeof rawUrl !== "string") return false;

  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith("#")) return false;

  // Reject non-HTTP(S) schemes like mailto:, tel:, javascript:
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed) && !/^https?:/i.test(trimmed)) {
    return false;
  }

  try {
    const target = new URL(trimmed, window.location.href);
    const current = new URL(window.location.href);

    if (target.origin !== current.origin) {
      return false;
    }

    // Ignore same-page and hash-only navigation
    if (target.pathname === current.pathname && target.search === current.search) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function startNavigation(): number {
  return navigationProgress.start();
}

export function startNavigationForUrl(rawUrl: string): number | null {
  if (!shouldTrackNavigationUrl(rawUrl)) {
    return null;
  }
  return navigationProgress.start();
}

export function completeNavigation(expectedNavId?: number): void {
  navigationProgress.complete(expectedNavId);
}

export function cancelNavigation(expectedNavId?: number): void {
  navigationProgress.cancel(expectedNavId);
}

export function navigateAssign(url: string): void {
  startNavigationForUrl(url);
  window.location.assign(url);
}

export function navigateReplace(url: string): void {
  startNavigationForUrl(url);
  window.location.replace(url);
}
