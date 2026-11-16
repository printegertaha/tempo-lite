import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";

function resolveBaseUrl(): string {
  let url =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  url = url.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, "");
}

const authBaseUrl = resolveBaseUrl();

const originsList = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  authBaseUrl,
  ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL.trim().replace(/\/+$/, "")] : []),
  ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, "")] : []),
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL.trim()}`] : []),
  ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`] : []),
];

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: authBaseUrl,
  secret: (() => {
    const s = process.env.BETTER_AUTH_SECRET?.trim();
    if (s && s.length >= 32) return s;
    if (process.env.NODE_ENV === "production") {
      throw new Error("SECURITY_ERROR: BETTER_AUTH_SECRET must be set and at least 32 characters long in production.");
    }
    console.warn("⚠️ [SECURITY WARNING] BETTER_AUTH_SECRET is unset. Generating a temporary runtime secret for development.");
    return require("crypto").randomBytes(32).toString("hex");
  })(),
  trustedOrigins: Array.from(new Set(originsList)),
  logger: {
    disabled: false,
    level: "debug",
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
  },
  // Social authentication providers
  socialProviders: {
    google: {
      clientId: (process.env.GOOGLE_CLIENT_ID || "").trim(),
      clientSecret: (process.env.GOOGLE_CLIENT_SECRET || "").trim(),
      prompt: "select_account",
      accessType: "offline",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days session persistence
    updateAge: 60 * 60 * 24, // Refresh session cookie daily
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 min cookie cache
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Automatic onboarding for new user: Initialize default user settings
          // Does NOT create any default trackers or categories (Empty Canvas Principle)
          try {
            await prisma.userSettings.upsert({
              where: { userId: user.id },
              create: {
                userId: user.id,
                timezone: "Asia/Riyadh",
                language: "ar",
                weekStartDay: 6,
                themeAccent: "violet",
                dashboardConfig: {},
              },
              update: {},
            });
          } catch (err) {
            console.error("Failed to initialize UserSettings for user:", user.id, err);
          }
        },
      },
    },
  },
});

export default auth;
