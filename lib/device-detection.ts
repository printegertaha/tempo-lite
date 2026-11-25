/**
 * Reliable client-side device capability detection for choosing between
 * desktop OAuth popup and mobile/tablet full-page OAuth redirect.
 *
 * Does NOT rely on viewport width alone, and explicitly handles iPadOS
 * devices reporting a desktop Macintosh user-agent.
 */

export type GoogleOAuthMode = "popup" | "redirect";

interface NavigatorWithUAData extends Navigator {
  userAgentData?: {
    mobile?: boolean;
    platform?: string;
  };
}

export function isMobileOrTabletDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const nav = navigator as NavigatorWithUAData;
  const ua = nav.userAgent || "";
  const platform = nav.platform || "";
  const maxTouchPoints = nav.maxTouchPoints ?? 0;

  // 1. User-Agent Client Hints (Chromium browsers)
  if (nav.userAgentData?.mobile === true) {
    return true;
  }

  // 2. iPadOS 13+ desktop-mode detection (reports Macintosh / MacIntel with multi-touch)
  const isIpadOSDesktopMode =
    (platform === "MacIntel" || /Macintosh/i.test(ua)) && maxTouchPoints > 1;
  if (isIpadOSDesktopMode) {
    return true;
  }

  // 3. Explicit phone/tablet user-agent tokens
  const isMobileOrTabletUA =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet|PlayBook|Silk|Kindle|Mobile/i.test(
      ua
    );
  if (isMobileOrTabletUA) {
    return true;
  }

  // 4. Device input capability detection (catches Android tablets in desktop mode, etc.)
  const matchMediaFn =
    typeof window.matchMedia === "function" ? window.matchMedia.bind(window) : null;
  const isCoarsePrimary = matchMediaFn ? matchMediaFn("(pointer: coarse)").matches : false;
  const hasNoHover = matchMediaFn ? matchMediaFn("(hover: none)").matches : false;
  const hasAnyFinePointer = matchMediaFn
    ? matchMediaFn("(any-pointer: fine)").matches
    : false;
  const hasTouchSupport = maxTouchPoints > 0 || "ontouchstart" in window;

  if ((isCoarsePrimary && hasNoHover) || (hasTouchSupport && !hasAnyFinePointer)) {
    return true;
  }

  return false;
}

export function getGoogleOAuthMode(): GoogleOAuthMode {
  return isMobileOrTabletDevice() ? "redirect" : "popup";
}
