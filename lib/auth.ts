import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";
import { resolveAuthConfig, resolveRequestTrustedOrigins } from "./auth-env";
import {
  captureBetterAuthInternalLog,
  classifyAuthError,
  emitAuthDiagnostic,
  getActiveAuthTrace,
  recordTraceStage,
} from "./auth-diagnostics";

export const authConfig = resolveAuthConfig();

export const auth = betterAuth({
  appName: "Athar",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: authConfig.baseUrl,
  basePath: authConfig.basePath,
  secret: authConfig.betterAuthSecret,
  trustedOrigins: (request) => resolveRequestTrustedOrigins(authConfig, request),
  logger: {
    disabled: false,
    level: authConfig.isProduction ? "warn" : "debug",
    log: (level, message, ...args) => {
      captureBetterAuthInternalLog(level, message, ...args);
    },
  },
  onAPIError: {
    errorURL: `${authConfig.baseUrl}/login`,
    onError: async (error) => {
      const trace = getActiveAuthTrace();
      const classified = classifyAuthError({
        error,
        internalLogs: trace?.internalLogs,
        hasStateCookie: trace?.hasStateCookie,
        host: trace?.host,
        route: trace?.route,
      });

      emitAuthDiagnostic({
        timestamp: new Date().toISOString(),
        requestId: trace?.requestId || "no-request-context",
        referenceId: trace?.referenceId || "AUTH-APIERR",
        environment: authConfig.environment,
        provider: trace?.provider || "unknown",
        stage: classified.failedStage,
        route: trace?.route || authConfig.basePath,
        method: trace?.method || "UNKNOWN",
        safeErrorCode: classified.safeCode,
        category: classified.category,
        errorName: classified.errorName,
        safeErrorMessage: classified.safeMessage,
        originLayer: classified.originLayer,
        lastSuccessfulStage: trace?.lastSuccessfulStage,
        failedStage: classified.failedStage,
        correctiveAction: classified.correctiveAction,
        serverStack: classified.serverStack,
      });
    },
  },
  advanced: {
    useSecureCookies: authConfig.useSecureCookies,
    trustedProxyHeaders: authConfig.trustedProxyHeaders,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  socialProviders: {
    google: {
      clientId: authConfig.googleClientId,
      clientSecret: authConfig.googleClientSecret,
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
          recordTraceStage("USER_CREATED", true, `userId=${user.id}`);
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
            const trace = getActiveAuthTrace();
            emitAuthDiagnostic({
              timestamp: new Date().toISOString(),
              requestId: trace?.requestId || "no-request-context",
              referenceId: trace?.referenceId || "AUTH-DBHOOK",
              environment: authConfig.environment,
              provider: trace?.provider || "unknown",
              stage: "AUTH_DATABASE_OPERATION_FAILED",
              route: trace?.route || authConfig.basePath,
              method: trace?.method || "POST",
              safeErrorCode: "user_settings_init_failed",
              category: "DATABASE_ERROR",
              errorName: err instanceof Error ? err.name : "DatabaseError",
              safeErrorMessage: "Failed to initialize UserSettings row after user creation.",
              originLayer: "database",
              correctiveAction: "Inspect user_settings table schema and database permissions.",
              serverStack: err instanceof Error ? err.stack : undefined,
            });
          }
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          recordTraceStage("SESSION_CREATED", true, `sessionId=${session.id}`);
        },
      },
    },
  },
});

export default auth;
