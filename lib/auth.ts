import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "development_secret_key_at_least_32_characters_long",
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
  ],
  // Google OAuth is the ONLY authentication provider
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
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
