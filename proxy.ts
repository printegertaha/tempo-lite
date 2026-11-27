import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  ONBOARDING_COOKIE_NAME,
  ONBOARDING_COOKIE_DONE,
  ONBOARDING_COOKIE_PENDING,
} from "@/lib/onboarding";

const PUBLIC_UNRESTRICTED_PATHS = ["/login", "/register", "/landing"];

function isStaticOrExemptPath(pathname: string): boolean {
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/__rsc") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/offline.html"
  ) {
    return true;
  }

  // Static asset extensions
  return /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|json|txt|xml)$/i.test(
    pathname
  );
}

function getBetterAuthSessionToken(request: NextRequest): string | null {
  const raw =
    request.cookies.get("__Secure-better-auth.session_token")?.value ||
    request.cookies.get("better-auth.session_token")?.value;
  if (!raw) return null;
  // Better Auth signed cookie values can be "<token>.<hmac>"
  const dotIdx = raw.indexOf(".");
  return dotIdx > 0 ? raw.slice(0, dotIdx) : raw;
}

async function resolveServerAccountOnboarding(
  request: NextRequest
): Promise<boolean | null> {
  const token = getBetterAuthSessionToken(request);
  if (!token) return null;

  try {
    const session = await prisma.session.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      select: {
        user: {
          select: {
            settings: {
              select: {
                onboardingCompleted: true,
              },
            },
          },
        },
      },
    });
    if (!session?.user) return null;
    return Boolean(session.user.settings?.onboardingCompleted);
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    isStaticOrExemptPath(pathname) ||
    PUBLIC_UNRESTRICTED_PATHS.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    )
  ) {
    return NextResponse.next();
  }

  // Avoid breaking Service Worker install/precache fetches from blocking redirect responses
  const isWelcomeRoute = pathname === "/welcome" || pathname.startsWith("/welcome/");
  const cookieVal = request.cookies.get(ONBOARDING_COOKIE_NAME)?.value;

  if (isWelcomeRoute) {
    if (cookieVal === ONBOARDING_COOKIE_DONE) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const serverOnboarded = await resolveServerAccountOnboarding(request);
    if (serverOnboarded === true) {
      const res = NextResponse.redirect(new URL("/", request.url));
      res.cookies.set(ONBOARDING_COOKIE_NAME, ONBOARDING_COOKIE_DONE, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
      return res;
    }

    return NextResponse.next();
  }

  if (cookieVal === ONBOARDING_COOKIE_DONE) {
    return NextResponse.next();
  }

  if (cookieVal === ONBOARDING_COOKIE_PENDING) {
    return NextResponse.redirect(new URL("/welcome", request.url));
  }

  // First request without onboarding cookie: check authenticated DB session first
  const serverOnboarded = await resolveServerAccountOnboarding(request);
  if (serverOnboarded === true) {
    const res = NextResponse.next();
    res.cookies.set(ONBOARDING_COOKIE_NAME, ONBOARDING_COOKIE_DONE, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return res;
  }

  const redirectRes = NextResponse.redirect(new URL("/welcome", request.url));
  redirectRes.cookies.set(ONBOARDING_COOKIE_NAME, ONBOARDING_COOKIE_PENDING, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return redirectRes;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|offline.html).*)",
  ],
};
