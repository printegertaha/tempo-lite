import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import crypto from "crypto";

const OWNER_EMAIL = "taha64686@gmail.com";
const OWNER_NAME = "Taha";

export async function GET(request: NextRequest) {
  // Reading cookies automatically opts into dynamic request-time execution
  const cookieStore = await cookies();
  try {
    let user = await prisma.user.findUnique({
      where: { email: OWNER_EMAIL },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: "QlQYUtz7E5nKV0EyRwm9EUyPR75zRkXU",
          name: OWNER_NAME,
          email: OWNER_EMAIL,
          emailVerified: true,
        },
      });
    }

    const sessionToken = crypto.randomBytes(32).toString("hex");
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        id: sessionId,
        token: sessionToken,
        userId: user.id,
        expiresAt,
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: request.headers.get("user-agent") || "Owner Direct Route",
      },
    });

    const isProd = process.env.NODE_ENV === "production";
    const redirectUrl = new URL("/", request.url);
    const response = NextResponse.redirect(redirectUrl);

    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    };

    response.cookies.set("better-auth.session_token", sessionToken, cookieOptions);
    response.cookies.set("__Secure-better-auth.session_token", sessionToken, cookieOptions);

    console.log(`✅ [OWNER_ROUTE_LOGIN_SUCCESS] Logged in as ${user.email}`);
    return response;
  } catch (error: any) {
    console.error("🚨 [OWNER_ROUTE_LOGIN_ERROR]:", error);
    return NextResponse.json({ error: "Failed to login as owner", details: error?.message }, { status: 500 });
  }
}
