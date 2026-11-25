import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, authConfig } from "./auth";
import {
  classifyAuthError,
  emitAuthDiagnostic,
  generateReferenceId,
  generateRequestId,
} from "./auth-diagnostics";

export interface AuthSessionResult {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Retrieves the current authenticated Better Auth session from incoming request headers.
 * Next.js 16 App Router compliant (headers() is an asynchronous Promise).
 */
export async function getServerSession(): Promise<AuthSessionResult | null> {
  try {
    const reqHeaders = await headers();
    const cookieHeader = reqHeaders.get("cookie") || "";
    const hasSessionCookie = cookieHeader.includes("better-auth.session_token");
    const host = reqHeaders.get("host") || "unknown";

    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (!session || !session.user) {
      if (hasSessionCookie && authConfig.isDevelopment) {
        emitAuthDiagnostic({
          timestamp: new Date().toISOString(),
          requestId: generateRequestId(),
          referenceId: generateReferenceId(),
          environment: authConfig.environment,
          provider: "session",
          stage: "AUTH_SESSION_VALIDATION_FAILED",
          route: "RSC:getServerSession",
          method: "INTERNAL",
          safeErrorCode: "session_not_found_with_cookie",
          category: "COOKIE_BROWSER_ERROR",
          safeErrorMessage:
            "Session cookie was present on request, but Better Auth returned no valid session.",
          metadata: { host, hasSessionCookie: true },
        });
      }
      return null;
    }

    return session as unknown as AuthSessionResult;
  } catch (error: unknown) {
    const errAny = error as { digest?: string; message?: string };
    if (
      errAny?.digest === "HANGING_PROMISE_REJECTION" ||
      errAny?.digest === "DYNAMIC_SERVER_USAGE" ||
      errAny?.digest?.startsWith?.("NEXT_") ||
      errAny?.message?.includes?.("prerendering")
    ) {
      throw error;
    }

    const classified = classifyAuthError({
      error,
      route: "RSC:getServerSession",
    });

    emitAuthDiagnostic({
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      referenceId: generateReferenceId(),
      environment: authConfig.environment,
      provider: "session",
      stage: "AUTH_SESSION_VALIDATION_FAILED",
      route: "RSC:getServerSession",
      method: "INTERNAL",
      safeErrorCode: classified.safeCode,
      category: classified.category,
      errorName: classified.errorName,
      safeErrorMessage: classified.safeMessage,
      originLayer: classified.originLayer,
      correctiveAction: classified.correctiveAction,
      serverStack: classified.serverStack,
    });

    return null;
  }
}

/**
 * Enforces session authentication in Server Components or Server Actions.
 * If unauthenticated, redirects to `/login` with a safe returnTo query param.
 */
export async function requireAuth(returnTo?: string): Promise<AuthSessionResult> {
  const session = await getServerSession();

  if (!session) {
    const query = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    redirect(`/login${query}`);
  }

  return session;
}

/**
 * Returns strictly verified server-derived userId.
 * Throws an Unauthorized error if no session is present.
 * Invariant: Never trust client-supplied userId.
 */
export async function requireUserId(): Promise<string> {
  const session = await getServerSession();

  if (!session || !session.user?.id) {
    throw new Error("UNAUTHORIZED: Active session required to perform this operation.");
  }

  return session.user.id;
}
