/**
 * Athar (أثـر) — Safe Return URL Validator
 *
 * Enforces strict validation of post-authentication redirects:
 * - Only internal relative URLs are allowed.
 * - Rejects protocol-relative URLs (e.g. `//evil.com`).
 * - Rejects backslash schemes (e.g. `/\evil.com`, `\\evil.com`).
 * - Prevents open redirect vulnerabilities.
 * - Prevents auth redirect loops (e.g. `/login` or `/register`).
 * - Falls back to main dashboard (`/`) whenever an unsafe destination is supplied.
 */
export function getSafeReturnUrl(
  url?: string | null,
  fallback: string = "/"
): string {
  if (!url || typeof url !== "string") {
    return fallback;
  }

  const trimmed = url.trim();

  // Reject any backslashes (prevents backslash escape and open redirect vectors)
  if (trimmed.includes("\\")) {
    return fallback;
  }

  // Must begin with a single forward slash
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  // Reject CR/LF/Null control characters that could induce HTTP response splitting
  if (/[\r\n\t\0]/.test(trimmed)) {
    return fallback;
  }

  try {
    const dummyOrigin = "http://athar.internal";
    const parsed = new URL(trimmed, dummyOrigin);

    // Verify origin remained strictly within internal scope
    if (parsed.origin !== dummyOrigin) {
      return fallback;
    }

    // Disallow redirecting directly back to authentication pages or auth API routes
    if (
      parsed.pathname === "/login" ||
      parsed.pathname === "/register" ||
      parsed.pathname.startsWith("/api/auth")
    ) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Validates an error callback URL (which is expected to stay on `/login` or `/register`).
 */
export function getSafeErrorCallbackUrl(
  url?: string | null,
  fallback: string = "/login"
): string {
  if (!url || typeof url !== "string") return fallback;
  const trimmed = url.trim();
  if (trimmed.includes("\\") || !trimmed.startsWith("/") || trimmed.startsWith("//") || /[\r\n\t\0]/.test(trimmed)) {
    return fallback;
  }
  try {
    const dummyOrigin = "http://athar.internal";
    const parsed = new URL(trimmed, dummyOrigin);
    if (parsed.origin !== dummyOrigin) return fallback;
    if (parsed.pathname !== "/login" && parsed.pathname !== "/register") {
      return fallback;
    }
    const safeReturnTo = getSafeReturnUrl(parsed.searchParams.get("returnTo"), "");
    if (safeReturnTo) {
      return `${parsed.pathname}?returnTo=${encodeURIComponent(safeReturnTo)}`;
    }
    return parsed.pathname;
  } catch {
    return fallback;
  }
}
