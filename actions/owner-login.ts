"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import crypto from "crypto";

const OWNER_EMAIL = "taha64686@gmail.com";
const OWNER_NAME = "Taha";

/**
 * 1-Click Instant Owner Login
 * Directly provisions or verifies the owner's account in Supabase PostgreSQL,
 * writes an authentic 30-day Better Auth session record to the database,
 * and sets the standard Better Auth session cookies with full production attributes.
 */
export async function loginAsOwner() {
  try {
    // 1. Ensure owner user exists in database
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

    // 2. Ensure UserSettings exist for the owner
    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });

    if (!settings) {
      await prisma.userSettings.create({
        data: {
          userId: user.id,
          timezone: "Asia/Riyadh",
          language: "ar",
          weekStartDay: 6,
          themeAccent: "violet",
          dashboardConfig: {},
        },
      });
    }

    // 3. Generate high-entropy session token compatible with Better Auth
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // 4. Create real Session in database
    await prisma.session.create({
      data: {
        id: sessionId,
        token: sessionToken,
        userId: user.id,
        expiresAt,
        ipAddress: "127.0.0.1",
        userAgent: "Owner Direct Sign-in",
      },
    });

    // 5. Set Better Auth session cookies (both standard and __Secure- variant for HTTPS)
    const cookieStore = await cookies();
    const isProd = process.env.NODE_ENV === "production";

    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    };

    cookieStore.set("better-auth.session_token", sessionToken, cookieOptions);
    cookieStore.set("__Secure-better-auth.session_token", sessionToken, cookieOptions);

    console.log(`✅ [OWNER_DIRECT_LOGIN_SUCCESS] Logged in as ${user.email} (${user.id})`);
  } catch (error: any) {
    console.error("🚨 [OWNER_DIRECT_LOGIN_FAILED]:", error?.message || error);
    throw error;
  }

  // 6. Redirect to dashboard
  redirect("/");
}

