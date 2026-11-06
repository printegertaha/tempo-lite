import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

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
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (!session || !session.user) {
      return null;
    }

    return session as unknown as AuthSessionResult;
  } catch (error: any) {
    if (
      error?.digest === "HANGING_PROMISE_REJECTION" ||
      error?.digest?.startsWith?.("NEXT_") ||
      error?.message?.includes?.("prerendering")
    ) {
      throw error;
    }
    console.error("Error retrieving server session:", error);
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

