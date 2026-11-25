import { AsyncLocalStorage } from "node:async_hooks";
import crypto from "node:crypto";
import { AuthRuntimeEnvironment, resolveAuthConfig } from "./auth-env";

export type AuthLifecycleEvent =
  | "AUTH_GOOGLE_SIGN_IN_STARTED"
  | "AUTH_GOOGLE_REDIRECT_CREATED"
  | "AUTH_GOOGLE_CALLBACK_RECEIVED"
  | "AUTH_GOOGLE_PROVIDER_ERROR"
  | "AUTH_GOOGLE_CODE_EXCHANGE_FAILED"
  | "AUTH_GOOGLE_PROFILE_RETRIEVAL_FAILED"
  | "AUTH_USER_LOOKUP_FAILED"
  | "AUTH_USER_CREATION_FAILED"
  | "AUTH_ACCOUNT_LINKING_FAILED"
  | "AUTH_DATABASE_OPERATION_FAILED"
  | "AUTH_SESSION_CREATION_FAILED"
  | "AUTH_COOKIE_CREATION_FAILED"
  | "AUTH_SESSION_VALIDATION_FAILED"
  | "AUTH_GOOGLE_SIGN_IN_SUCCEEDED";

export type AuthErrorCategory =
  | "GOOGLE_OAUTH_CONFIG_ERROR"
  | "BETTER_AUTH_ERROR"
  | "APPLICATION_ERROR"
  | "COOKIE_BROWSER_ERROR"
  | "DATABASE_ERROR"
  | "DEPLOYMENT_ERROR";

export type AuthOriginLayer =
  | "google"
  | "application"
  | "database"
  | "browser"
  | "deployment";

export interface AuthDiagnosticLogEntry {
  timestamp: string;
  requestId: string;
  referenceId: string;
  environment: AuthRuntimeEnvironment;
  provider: "google" | "credential" | "session" | "unknown";
  stage: AuthLifecycleEvent | string;
  route: string;
  method: string;
  httpStatus?: number;
  durationMs?: number;
  safeErrorCode?: string;
  category?: AuthErrorCategory;
  errorName?: string;
  safeErrorMessage?: string;
  originLayer?: AuthOriginLayer;
  lastSuccessfulStage?: string;
  failedStage?: string;
  correctiveAction?: string;
  metadata?: Record<string, unknown>;
  serverStack?: string;
}

export interface AuthFailureInvestigationReport {
  referenceId: string;
  requestId: string;
  timestamp: string;
  environment: AuthRuntimeEnvironment;
  provider: string;
  lastSuccessfulStage: string;
  failedStage: string;
  category: AuthErrorCategory;
  safeErrorCode: string;
  errorName: string;
  safeErrorMessage: string;
  originLayer: AuthOriginLayer;
  correctiveAction: string;
  route: string;
  method: string;
  httpStatus: number;
  durationMs: number;
  timeline: Array<{
    stage: string;
    at: string;
    ok: boolean;
    detail?: string;
  }>;
  serverStack?: string;
}

export interface InternalCapturedLog {
  level: string;
  message: string;
  safeArgs: unknown[];
  rawErrorCode?: string;
  rawErrorMessage?: string;
  rawErrorName?: string;
  rawStack?: string;
}

export interface AuthRequestTraceContext {
  requestId: string;
  referenceId: string;
  startedAt: number;
  environment: AuthRuntimeEnvironment;
  route: string;
  method: string;
  provider: "google" | "credential" | "session" | "unknown";
  lastSuccessfulStage: string;
  hasStateCookie?: boolean;
  hasSessionCookie?: boolean;
  host?: string;
  timeline: Array<{
    stage: string;
    at: string;
    ok: boolean;
    detail?: string;
  }>;
  internalLogs: InternalCapturedLog[];
}

const SENSITIVE_KEY_PATTERN =
  /secret|token|password|cookie|authorization|code_verifier|codeverifier|client_secret|id_token|access_token|refresh_token|^code$|^state$/i;

const SENSITIVE_QUERY_KEYS = [
  "code",
  "state",
  "token",
  "access_token",
  "id_token",
  "refresh_token",
  "code_verifier",
  "code_challenge",
  "client_secret",
  "secret",
];

export function redactUrlSecrets(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl, "http://placeholder.internal");
    for (const key of SENSITIVE_QUERY_KEYS) {
      if (parsed.searchParams.has(key)) {
        parsed.searchParams.set(key, "[REDACTED]");
      }
    }
    const isRelative = !rawUrl.startsWith("http://") && !rawUrl.startsWith("https://");
    return isRelative
      ? `${parsed.pathname}${parsed.search}`
      : `${parsed.origin}${parsed.pathname}${parsed.search}`;
  } catch {
    return rawUrl.replace(
      /([?&](?:code|state|token|access_token|id_token|refresh_token|client_secret)=)[^&]+/gi,
      "$1[REDACTED]"
    );
  }
}

export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[MAX_DEPTH]";
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    let clean = value;
    if (clean.includes("http://") || clean.includes("https://") || clean.includes("?code=") || clean.includes("&state=")) {
      clean = redactUrlSecrets(clean);
    }
    if (clean.length > 500) {
      clean = `${clean.slice(0, 500)}...[truncated]`;
    }
    return clean;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Error) {
    const errAny = value as unknown as Record<string, unknown>;
    return {
      name: value.name,
      message: sanitizeForLog(value.message, depth + 1),
      code: typeof errAny.code === "string" || typeof errAny.code === "number" ? errAny.code : undefined,
      status: typeof errAny.status === "number" || typeof errAny.status === "string" ? errAny.status : undefined,
      cause: errAny.cause ? sanitizeForLog(errAny.cause, depth + 1) : undefined,
    };
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeForLog(item, depth + 1));
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        result[k] = v ? "[REDACTED]" : null;
      } else {
        result[k] = sanitizeForLog(v, depth + 1);
      }
    }
    return result;
  }

  return String(value);
}

const globalDiagStore = globalThis as unknown as {
  __atharAuthAls?: AsyncLocalStorage<AuthRequestTraceContext>;
  __atharAuthReports?: Map<string, AuthFailureInvestigationReport>;
};

const authAls =
  globalDiagStore.__atharAuthAls ??
  new AsyncLocalStorage<AuthRequestTraceContext>();
globalDiagStore.__atharAuthAls = authAls;

const failureReports =
  globalDiagStore.__atharAuthReports ??
  new Map<string, AuthFailureInvestigationReport>();
globalDiagStore.__atharAuthReports = failureReports;

const MAX_STORED_REPORTS = 200;

export function storeFailureReport(report: AuthFailureInvestigationReport): void {
  if (failureReports.size >= MAX_STORED_REPORTS) {
    const oldestKey = failureReports.keys().next().value;
    if (oldestKey) failureReports.delete(oldestKey);
  }
  failureReports.set(report.referenceId, report);
}

export function getFailureReportByReference(
  referenceId: string
): AuthFailureInvestigationReport | null {
  return failureReports.get(referenceId.trim().toUpperCase()) || null;
}

export function getRecentFailureReports(limit = 20): AuthFailureInvestigationReport[] {
  return Array.from(failureReports.values()).slice(-limit).reverse();
}

export function generateReferenceId(): string {
  return `AUTH-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export function generateRequestId(): string {
  return crypto.randomUUID();
}

export function getActiveAuthTrace(): AuthRequestTraceContext | undefined {
  return authAls.getStore();
}

export function runWithAuthTrace<T>(
  ctx: AuthRequestTraceContext,
  fn: () => Promise<T>
): Promise<T> {
  return authAls.run(ctx, fn);
}

export function recordTraceStage(
  stage: AuthLifecycleEvent | string,
  ok = true,
  detail?: string
): void {
  const ctx = getActiveAuthTrace();
  if (!ctx) return;
  if (ok) {
    ctx.lastSuccessfulStage = stage;
  }
  ctx.timeline.push({
    stage,
    at: new Date().toISOString(),
    ok,
    detail: detail ? String(sanitizeForLog(detail)) : undefined,
  });
}

function extractRawErrorSignals(args: unknown[]): {
  code?: string;
  message?: string;
  name?: string;
  stack?: string;
} {
  for (const arg of args) {
    if (!arg) continue;
    if (arg instanceof Error) {
      const anyErr = arg as unknown as Record<string, unknown>;
      const cause = anyErr.cause as Record<string, unknown> | undefined;
      return {
        name: arg.name,
        message: arg.message,
        code:
          (typeof anyErr.code === "string" ? anyErr.code : undefined) ||
          (typeof cause?.code === "string" ? cause.code : undefined),
        stack: arg.stack,
      };
    }
    if (typeof arg === "object") {
      const obj = arg as Record<string, unknown>;
      if (obj.error && typeof obj.error === "object") {
        const nested = extractRawErrorSignals([obj.error]);
        if (nested.message || nested.code) return nested;
      }
      const msg =
        (typeof obj.error_description === "string" && obj.error_description) ||
        (typeof obj.message === "string" && obj.message) ||
        (typeof obj.error === "string" && obj.error) ||
        undefined;
      const code =
        (typeof obj.error === "string" && obj.error) ||
        (typeof obj.code === "string" && obj.code) ||
        undefined;
      if (msg || code) {
        return { code, message: msg, name: typeof obj.name === "string" ? obj.name : undefined };
      }
    }
  }
  return {};
}

export function captureBetterAuthInternalLog(
  level: string,
  message: string,
  ...args: unknown[]
): void {
  const ctx = getActiveAuthTrace();
  const signals = extractRawErrorSignals(args);
  const safeArgs = args.map((a) => sanitizeForLog(a));

  if (ctx) {
    ctx.internalLogs.push({
      level,
      message: String(sanitizeForLog(message)),
      safeArgs,
      rawErrorCode: signals.code,
      rawErrorMessage: signals.message,
      rawErrorName: signals.name,
      rawStack: signals.stack,
    });
  }

  // Emit structured log respecting environment verbosity
  const env = ctx?.environment ?? "development";
  if (env === "production" && level === "debug") {
    return;
  }
  if (env === "production" && level === "info") {
    return;
  }

  const payload = {
    source: "better-auth-internal",
    timestamp: new Date().toISOString(),
    level,
    requestId: ctx?.requestId || "no-request-context",
    referenceId: ctx?.referenceId || "AUTH-SYSTEM",
    environment: env,
    route: ctx?.route,
    message: sanitizeForLog(message),
    errorCode: signals.code,
    errorName: signals.name,
    details: safeArgs.length ? safeArgs : undefined,
  };

  if (level === "error") {
    console.error(`[ATHAR_AUTH_INTERNAL] ${JSON.stringify(payload)}`);
  } else if (level === "warn") {
    console.warn(`[ATHAR_AUTH_INTERNAL] ${JSON.stringify(payload)}`);
  } else {
    console.log(`[ATHAR_AUTH_INTERNAL] ${JSON.stringify(payload)}`);
  }
}

export function emitAuthDiagnostic(entry: AuthDiagnosticLogEntry): void {
  const sanitized: AuthDiagnosticLogEntry = {
    ...entry,
    safeErrorMessage: entry.safeErrorMessage
      ? String(sanitizeForLog(entry.safeErrorMessage))
      : undefined,
    metadata: entry.metadata
      ? (sanitizeForLog(entry.metadata) as Record<string, unknown>)
      : undefined,
    serverStack: entry.serverStack
      ? entry.serverStack
          .split("\n")
          .slice(0, 12)
          .map((line) => redactUrlSecrets(line))
          .join("\n")
      : undefined,
  };

  const line = `[ATHAR_AUTH_EVENT] ${JSON.stringify(sanitized)}`;
  if (sanitized.category || sanitized.stage.endsWith("_FAILED") || sanitized.stage === "AUTH_GOOGLE_PROVIDER_ERROR") {
    console.error(line);
  } else if (sanitized.environment === "development") {
    console.log(line);
  } else if (sanitized.stage === "AUTH_GOOGLE_SIGN_IN_SUCCEEDED") {
    console.info(line);
  }
}

export interface ErrorClassificationInput {
  code?: string | null;
  description?: string | null;
  error?: unknown;
  internalLogs?: InternalCapturedLog[];
  hasStateCookie?: boolean;
  host?: string;
  httpStatus?: number;
  route?: string;
}

export interface ClassifiedAuthError {
  category: AuthErrorCategory;
  safeCode: string;
  errorName: string;
  safeMessage: string;
  originLayer: AuthOriginLayer;
  failedStage: AuthLifecycleEvent;
  correctiveAction: string;
  serverStack?: string;
}

export function classifyAuthError(
  input: ErrorClassificationInput
): ClassifiedAuthError {
  const config = resolveAuthConfig();
  const rawCode = (input.code || "").trim();
  const codeLower = rawCode.toLowerCase();
  const desc = (input.description || "").trim();
  const errObj = input.error instanceof Error ? input.error : undefined;
  const errMsg = errObj?.message || (typeof input.error === "string" ? input.error : "");
  const errAny = input.error as Record<string, unknown> | undefined;
  const rawStack =
    errObj?.stack ||
    input.internalLogs?.find((l) => l.rawStack)?.rawStack ||
    undefined;

  const internalMessages = (input.internalLogs || [])
    .map((l) => `${l.message} ${l.rawErrorCode || ""} ${l.rawErrorMessage || ""}`)
    .join(" | ");

  const combinedText = `${rawCode} ${desc} ${errMsg} ${internalMessages}`.toLowerCase();

  // 1. Deployment / Missing Environment Variables Checks
  if (
    !config.googleEnabled &&
    (codeLower === "missing_google_credentials" ||
      codeLower === "client_id_and_secret_required" ||
      combinedText.includes("client_id_and_secret_required") ||
      combinedText.includes("client id and client secret is required"))
  ) {
    const missingKeys = config.envChecks
      .filter((c) => c.name.startsWith("GOOGLE_") && (!c.present || !c.validFormat))
      .map((c) => c.issue || c.name)
      .join(" ");

    return {
      category: config.isDevelopment ? "GOOGLE_OAUTH_CONFIG_ERROR" : "DEPLOYMENT_ERROR",
      safeCode: "missing_google_credentials",
      errorName: "MissingGoogleCredentialsError",
      safeMessage: "Google OAuth credentials are missing or malformed on the server.",
      originLayer: config.isDevelopment ? "google" : "deployment",
      failedStage: "AUTH_GOOGLE_PROVIDER_ERROR",
      correctiveAction:
        missingKeys ||
        "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the active environment variables and restart the server.",
      serverStack: rawStack,
    };
  }

  if (
    combinedText.includes("better_auth_secret") ||
    combinedText.includes("deployment_error")
  ) {
    return {
      category: "DEPLOYMENT_ERROR",
      safeCode: "missing_auth_secret",
      errorName: "MissingAuthSecretError",
      safeMessage: "Server authentication secret is missing or invalid.",
      originLayer: "deployment",
      failedStage: "AUTH_COOKIE_CREATION_FAILED",
      correctiveAction:
        "Configure BETTER_AUTH_SECRET (>= 32 chars) consistently across all server instances.",
      serverStack: rawStack,
    };
  }

  // 2. Database Errors (PostgreSQL / Prisma / Network)
  const dbCode =
    (typeof errAny?.code === "string" ? errAny.code : "") ||
    (typeof (errAny?.cause as Record<string, unknown> | undefined)?.code === "string"
      ? String((errAny?.cause as Record<string, unknown>).code)
      : "");

  if (
    combinedText.includes("econnrefused") ||
    combinedText.includes("etimedout") ||
    combinedText.includes("enotfound") ||
    combinedText.includes("econnreset") ||
    combinedText.includes("connection terminated") ||
    combinedText.includes("too many clients") ||
    combinedText.includes("unable to query your database") ||
    combinedText.includes("relation ") ||
    combinedText.includes("does not exist") ||
    dbCode.startsWith("P2") ||
    dbCode === "42P01" ||
    dbCode === "42703" ||
    codeLower === "unable_to_create_user" ||
    codeLower === "unable_to_create_session" ||
    codeLower === "state_generation_error"
  ) {
    let failedStage: AuthLifecycleEvent = "AUTH_DATABASE_OPERATION_FAILED";
    if (codeLower === "unable_to_create_user") failedStage = "AUTH_USER_CREATION_FAILED";
    else if (codeLower === "unable_to_create_session") failedStage = "AUTH_SESSION_CREATION_FAILED";
    else if (combinedText.includes("findaccount") || combinedText.includes("finduser")) {
      failedStage = "AUTH_USER_LOOKUP_FAILED";
    }

    return {
      category: "DATABASE_ERROR",
      safeCode: codeLower || "database_error",
      errorName: errObj?.name || "DatabaseAuthError",
      safeMessage: "Authentication database operation failed.",
      originLayer: "database",
      failedStage,
      correctiveAction:
        "Verify PostgreSQL/Supabase connectivity (DATABASE_URL), run `npx prisma migrate deploy`, and inspect `user`, `session`, `account`, and `verification` tables.",
      serverStack: rawStack,
    };
  }

  // 3. Google OAuth Configuration & Provider Errors
  if (
    codeLower === "redirect_uri_mismatch" ||
    combinedText.includes("redirect_uri_mismatch")
  ) {
    return {
      category: "GOOGLE_OAUTH_CONFIG_ERROR",
      safeCode: "redirect_uri_mismatch",
      errorName: "GoogleRedirectUriMismatchError",
      safeMessage: "Google rejected the OAuth redirect_uri.",
      originLayer: "google",
      failedStage:
        input.route?.includes("callback")
          ? "AUTH_GOOGLE_CODE_EXCHANGE_FAILED"
          : "AUTH_GOOGLE_PROVIDER_ERROR",
      correctiveAction: `Register exact Authorized Redirect URI "${config.googleCallbackUrl}" in Google Cloud Console > APIs & Services > Credentials > Web application client, and ensure BETTER_AUTH_URL="${config.baseUrl}" matches the request origin.`,
      serverStack: rawStack,
    };
  }

  if (
    codeLower === "invalid_client" ||
    codeLower === "unauthorized_client" ||
    combinedText.includes("invalid_client") ||
    combinedText.includes("unauthorized_client") ||
    combinedText.includes("the oauth client was not found")
  ) {
    return {
      category: "GOOGLE_OAUTH_CONFIG_ERROR",
      safeCode: codeLower || "invalid_client",
      errorName: "GoogleInvalidClientError",
      safeMessage: "Google rejected the OAuth client credentials.",
      originLayer: "google",
      failedStage: "AUTH_GOOGLE_CODE_EXCHANGE_FAILED",
      correctiveAction:
        "Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET match an active Web application OAuth 2.0 Client in Google Cloud Console without extra whitespace.",
      serverStack: rawStack,
    };
  }

  if (
    codeLower === "access_denied" ||
    codeLower === "org_internal" ||
    codeLower === "admin_policy_enforced" ||
    codeLower === "invalid_request"
  ) {
    return {
      category: "GOOGLE_OAUTH_CONFIG_ERROR",
      safeCode: codeLower,
      errorName: "GoogleProviderError",
      safeMessage:
        codeLower === "access_denied"
          ? "User cancelled Google authorization or account is not allowed by OAuth consent screen."
          : `Google OAuth returned provider error: ${codeLower}.`,
      originLayer: "google",
      failedStage: "AUTH_GOOGLE_PROVIDER_ERROR",
      correctiveAction:
        codeLower === "access_denied"
          ? "If OAuth consent screen is in Testing status, add the Google account under Test Users in Google Cloud Console, or publish the app."
          : "Review Google Cloud Console OAuth consent screen, authorized domains, and client type settings.",
      serverStack: rawStack,
    };
  }

  // 4. Token exchange failures from Better Auth `invalid_code`
  if (codeLower === "invalid_code") {
    if (combinedText.includes("redirect_uri")) {
      return {
        category: "GOOGLE_OAUTH_CONFIG_ERROR",
        safeCode: "redirect_uri_mismatch",
        errorName: "GoogleRedirectUriMismatchError",
        safeMessage: "Authorization code exchange failed due to redirect_uri mismatch.",
        originLayer: "google",
        failedStage: "AUTH_GOOGLE_CODE_EXCHANGE_FAILED",
        correctiveAction: `Verify "${config.googleCallbackUrl}" is listed verbatim in Google Cloud Console Authorized Redirect URIs.`,
        serverStack: rawStack,
      };
    }
    if (combinedText.includes("invalid_client") || combinedText.includes("unauthorized")) {
      return {
        category: "GOOGLE_OAUTH_CONFIG_ERROR",
        safeCode: "invalid_client",
        errorName: "GoogleInvalidClientError",
        safeMessage: "Authorization code exchange failed because GOOGLE_CLIENT_SECRET or GOOGLE_CLIENT_ID is invalid.",
        originLayer: "google",
        failedStage: "AUTH_GOOGLE_CODE_EXCHANGE_FAILED",
        correctiveAction:
          "Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables against Google Cloud Console.",
        serverStack: rawStack,
      };
    }
    return {
      category: "BETTER_AUTH_ERROR",
      safeCode: "invalid_code",
      errorName: "OAuthCodeExchangeError",
      safeMessage: "Google authorization code exchange failed or code expired/reused.",
      originLayer: "google",
      failedStage: "AUTH_GOOGLE_CODE_EXCHANGE_FAILED",
      correctiveAction:
        "Ensure GOOGLE_CLIENT_SECRET is valid, system clock is synced, and the callback URL is not hit twice or cached.",
      serverStack: rawStack,
    };
  }

  // 5. Cookie / State / Browser Errors vs Better Auth State Errors
  if (
    codeLower === "state_mismatch" ||
    codeLower === "state_security_mismatch" ||
    codeLower === "state_not_found" ||
    codeLower === "state_invalid"
  ) {
    const missingCookie = input.hasStateCookie === false;
    const hostMismatch =
      input.host &&
      (() => {
        try {
          return new URL(config.baseUrl).host !== input.host;
        } catch {
          return false;
        }
      })();

    if (missingCookie || hostMismatch || config.betterAuthSecretSource === "dev-ephemeral") {
      return {
        category: "COOKIE_BROWSER_ERROR",
        safeCode: codeLower,
        errorName: "OAuthStateCookieError",
        safeMessage: missingCookie
          ? "OAuth state cookie was not present on callback."
          : hostMismatch
            ? `Callback host (${input.host}) does not match BETTER_AUTH_URL (${config.baseUrl}).`
            : "OAuth state verification failed across server requests.",
        originLayer:
          config.betterAuthSecretSource === "dev-ephemeral" ? "deployment" : "browser",
        failedStage: "AUTH_GOOGLE_CALLBACK_RECEIVED",
        correctiveAction: hostMismatch
          ? `Access the app using the same host as BETTER_AUTH_URL (${config.baseUrl}), not an alias like 127.0.0.1 vs localhost.`
          : missingCookie
            ? "Check browser cookie settings, SameSite/Secure attributes (HTTPS vs HTTP), reverse proxy headers, and avoid concurrent sign-in tabs."
            : "Set a persistent BETTER_AUTH_SECRET in .env so state cookies remain valid across server reloads.",
        serverStack: rawStack,
      };
    }

    return {
      category: "BETTER_AUTH_ERROR",
      safeCode: codeLower,
      errorName: "BetterAuthStateError",
      safeMessage: "OAuth state validation failed or expired.",
      originLayer: "application",
      failedStage: "AUTH_GOOGLE_CALLBACK_RECEIVED",
      correctiveAction:
        "Verify verification table state persistence, consistent BETTER_AUTH_SECRET across instances, and retry sign-in.",
      serverStack: rawStack,
    };
  }

  if (
    codeLower === "no_code" ||
    codeLower === "no_callback_url" ||
    codeLower === "invalid_callback_request" ||
    codeLower === "unable_to_get_user_info" ||
    codeLower === "email_not_found" ||
    codeLower === "issuer_mismatch" ||
    codeLower === "provider_not_found"
  ) {
    const failedStage: AuthLifecycleEvent =
      codeLower === "unable_to_get_user_info" || codeLower === "email_not_found"
        ? "AUTH_GOOGLE_PROFILE_RETRIEVAL_FAILED"
        : "AUTH_GOOGLE_CALLBACK_RECEIVED";

    return {
      category: "BETTER_AUTH_ERROR",
      safeCode: codeLower,
      errorName: "BetterAuthCallbackError",
      safeMessage: `Better Auth callback failed with ${codeLower}.`,
      originLayer: "application",
      failedStage,
      correctiveAction:
        "Inspect Google OAuth scopes (`openid`, `email`, `profile`) and verify callback URL parameters are preserved by proxies/middleware.",
      serverStack: rawStack,
    };
  }

  if (
    codeLower === "account_not_linked" ||
    codeLower === "unable_to_link_account" ||
    codeLower === "account_already_linked_to_different_user"
  ) {
    return {
      category: "BETTER_AUTH_ERROR",
      safeCode: codeLower,
      errorName: "BetterAuthAccountLinkError",
      safeMessage: "Could not link Google account to existing user record.",
      originLayer: "application",
      failedStage: "AUTH_ACCOUNT_LINKING_FAILED",
      correctiveAction:
        codeLower === "account_not_linked"
          ? "An existing account with this email has unverified email status. Sign in with email/password or configure trusted provider verification policy."
          : "Check account table records for conflicting providerId/accountId entries.",
      serverStack: rawStack,
    };
  }

  // 6. Application / Origin / Trusted Origin Errors
  if (
    codeLower === "invalid_origin" ||
    codeLower === "invalid_callback_url" ||
    codeLower === "invalid_error_callback_url" ||
    codeLower === "cross_site_navigation_login_blocked" ||
    codeLower === "missing_or_null_origin" ||
    combinedText.includes("trustedorigins") ||
    combinedText.includes("invalid origin")
  ) {
    return {
      category: "APPLICATION_ERROR",
      safeCode: codeLower || "invalid_origin",
      errorName: "TrustedOriginError",
      safeMessage: "Request origin or callback URL is not in Better Auth trustedOrigins.",
      originLayer: "application",
      failedStage: "AUTH_GOOGLE_SIGN_IN_STARTED",
      correctiveAction: `Add the active origin to BETTER_AUTH_URL or BETTER_AUTH_TRUSTED_ORIGINS (currently resolved baseUrl: ${config.baseUrl}).`,
      serverStack: rawStack,
    };
  }

  // Fallback classification
  return {
    category: "APPLICATION_ERROR",
    safeCode: codeLower || "internal_server_error",
    errorName: errObj?.name || "AuthenticationError",
    safeMessage: "An unexpected authentication error occurred.",
    originLayer: "application",
    failedStage: input.route?.includes("callback")
      ? "AUTH_GOOGLE_CALLBACK_RECEIVED"
      : "AUTH_GOOGLE_SIGN_IN_STARTED",
    correctiveAction:
      "Search server logs using the referenceId to inspect the exact captured Better Auth timeline and stack trace.",
    serverStack: rawStack,
  };
}

export function buildInvestigationReport(
  ctx: AuthRequestTraceContext,
  classified: ClassifiedAuthError,
  httpStatus: number
): AuthFailureInvestigationReport {
  const report: AuthFailureInvestigationReport = {
    referenceId: ctx.referenceId,
    requestId: ctx.requestId,
    timestamp: new Date().toISOString(),
    environment: ctx.environment,
    provider: ctx.provider,
    lastSuccessfulStage: ctx.lastSuccessfulStage || "NONE",
    failedStage: classified.failedStage,
    category: classified.category,
    safeErrorCode: classified.safeCode,
    errorName: classified.errorName,
    safeErrorMessage: classified.safeMessage,
    originLayer: classified.originLayer,
    correctiveAction: classified.correctiveAction,
    route: ctx.route,
    method: ctx.method,
    httpStatus,
    durationMs: Date.now() - ctx.startedAt,
    timeline: ctx.timeline,
    serverStack: classified.serverStack,
  };
  storeFailureReport(report);
  return report;
}
