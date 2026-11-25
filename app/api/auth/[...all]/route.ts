import { auth, authConfig } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";
import {
  buildInvestigationReport,
  classifyAuthError,
  emitAuthDiagnostic,
  generateReferenceId,
  generateRequestId,
  recordTraceStage,
  redactUrlSecrets,
  runWithAuthTrace,
  type AuthRequestTraceContext,
} from "@/lib/auth-diagnostics";
import { resolveUserFacingAuthError } from "@/lib/auth-errors-ui";

const handler = toNextJsHandler(auth);

function getCookieNames(request: NextRequest): string[] {
  const raw = request.headers.get("cookie") || "";
  if (!raw) return [];
  return raw
    .split(";")
    .map((part) => part.split("=")[0]?.trim() || "")
    .filter(Boolean);
}

function hasAuthStateCookie(cookieNames: string[]): boolean {
  return cookieNames.some(
    (name) =>
      name.includes("better-auth.state") ||
      name.includes("better-auth.oauth_state")
  );
}

function hasSessionCookie(cookieNames: string[]): boolean {
  return cookieNames.some((name) => name.includes("better-auth.session_token"));
}

function buildLoginErrorRedirectUrl(
  baseUrl: string,
  errorCode: string,
  referenceId: string,
  returnTo?: string | null
): string {
  const url = new URL("/login", baseUrl);
  url.searchParams.set("error", errorCode);
  url.searchParams.set("ref", referenceId);
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    url.searchParams.set("returnTo", returnTo);
  }
  return url.toString();
}

function attachDiagnosticHeaders(
  response: Response,
  trace: AuthRequestTraceContext
): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Auth-Request-Id", trace.requestId);
  headers.set("X-Auth-Reference-Id", trace.referenceId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function createJsonErrorResponse(
  status: number,
  safeCode: string,
  referenceId: string,
  requestId: string
): NextResponse {
  const uiError = resolveUserFacingAuthError(safeCode, referenceId);
  return NextResponse.json(
    {
      error: {
        code: safeCode,
        message: uiError.message,
        title: uiError.title,
        category: uiError.categoryLabel,
        canRetry: uiError.canRetry,
        referenceId,
        requestId,
      },
    },
    {
      status,
      headers: {
        "X-Auth-Request-Id": requestId,
        "X-Auth-Reference-Id": referenceId,
      },
    }
  );
}

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "unknown";
  const cookieNames = getCookieNames(request);
  const isGoogleCallback = pathname.endsWith("/callback/google");
  const isGetSession = pathname.endsWith("/get-session");

  const trace: AuthRequestTraceContext = {
    requestId: generateRequestId(),
    referenceId: generateReferenceId(),
    startedAt: Date.now(),
    environment: authConfig.environment,
    route: pathname,
    method: "GET",
    provider: isGoogleCallback ? "google" : isGetSession ? "session" : "unknown",
    lastSuccessfulStage: "REQUEST_RECEIVED",
    hasStateCookie: hasAuthStateCookie(cookieNames),
    hasSessionCookie: hasSessionCookie(cookieNames),
    host,
    timeline: [],
    internalLogs: [],
  };

  const incomingProviderError = isGoogleCallback
    ? request.nextUrl.searchParams.get("error")
    : null;
  const incomingProviderErrorDesc = isGoogleCallback
    ? request.nextUrl.searchParams.get("error_description")
    : null;

  return runWithAuthTrace(trace, async () => {
    if (isGoogleCallback) {
      const hasCode = request.nextUrl.searchParams.has("code");
      const hasState = request.nextUrl.searchParams.has("state");
      const providerError = incomingProviderError;
      const providerErrorDesc = incomingProviderErrorDesc;

      recordTraceStage("AUTH_GOOGLE_CALLBACK_RECEIVED", true, `hasCode=${hasCode} hasState=${hasState}`);
      emitAuthDiagnostic({
        timestamp: new Date().toISOString(),
        requestId: trace.requestId,
        referenceId: trace.referenceId,
        environment: trace.environment,
        provider: "google",
        stage: "AUTH_GOOGLE_CALLBACK_RECEIVED",
        route: pathname,
        method: "GET",
        metadata: {
          host,
          hasCode,
          hasState,
          hasProviderError: Boolean(providerError),
          hasStateCookie: trace.hasStateCookie,
          cookieCount: cookieNames.length,
        },
      });

      if (providerError) {
        const classified = classifyAuthError({
          code: providerError,
          description: providerErrorDesc,
          hasStateCookie: trace.hasStateCookie,
          host,
          route: pathname,
        });
        const report = buildInvestigationReport(trace, classified, 302);
        emitAuthDiagnostic({
          timestamp: report.timestamp,
          requestId: report.requestId,
          referenceId: report.referenceId,
          environment: report.environment,
          provider: "google",
          stage: "AUTH_GOOGLE_PROVIDER_ERROR",
          route: pathname,
          method: "GET",
          httpStatus: 302,
          durationMs: report.durationMs,
          safeErrorCode: report.safeErrorCode,
          category: report.category,
          errorName: report.errorName,
          safeErrorMessage: report.safeErrorMessage,
          originLayer: report.originLayer,
          lastSuccessfulStage: report.lastSuccessfulStage,
          failedStage: report.failedStage,
          correctiveAction: report.correctiveAction,
        });
      }
    }

    try {
      const response = await handler.GET(request);
      const durationMs = Date.now() - trace.startedAt;
      const location = response.headers.get("location");
      const setCookieHeader = response.headers.get("set-cookie") || "";
      const hasSessionSetCookie = setCookieHeader.includes("better-auth.session_token");

      if (isGoogleCallback) {
        let redirectError: string | null = null;
        let redirectErrorDesc: string | null = null;

        if (location) {
          try {
            const parsedLoc = new URL(location, authConfig.baseUrl);
            redirectError = parsedLoc.searchParams.get("error");
            redirectErrorDesc = parsedLoc.searchParams.get("error_description");
          } catch {
            // ignore unparseable relative locations
          }
        }

        if (redirectError) {
          const effectiveError =
            incomingProviderError &&
            (redirectError === "state_not_found" || redirectError === "state_mismatch")
              ? incomingProviderError
              : redirectError;
          const effectiveDesc =
            incomingProviderError && effectiveError === incomingProviderError
              ? incomingProviderErrorDesc || redirectErrorDesc
              : redirectErrorDesc;

          const classified = classifyAuthError({
            code: effectiveError,
            description: effectiveDesc,
            internalLogs: trace.internalLogs,
            hasStateCookie: trace.hasStateCookie,
            host,
            httpStatus: response.status,
            route: pathname,
          });
          const report = buildInvestigationReport(trace, classified, response.status);

          emitAuthDiagnostic({
            timestamp: report.timestamp,
            requestId: report.requestId,
            referenceId: report.referenceId,
            environment: report.environment,
            provider: "google",
            stage: report.failedStage,
            route: pathname,
            method: "GET",
            httpStatus: response.status,
            durationMs,
            safeErrorCode: report.safeErrorCode,
            category: report.category,
            errorName: report.errorName,
            safeErrorMessage: report.safeErrorMessage,
            originLayer: report.originLayer,
            lastSuccessfulStage: report.lastSuccessfulStage,
            failedStage: report.failedStage,
            correctiveAction: report.correctiveAction,
            serverStack: report.serverStack,
            metadata: {
              betterAuthRedirectError: redirectError,
              hasStateCookie: trace.hasStateCookie,
              timeline: report.timeline,
            },
          });

          const headers = new Headers(response.headers);
          headers.set(
            "location",
            buildLoginErrorRedirectUrl(
              authConfig.baseUrl,
              classified.safeCode,
              trace.referenceId
            )
          );
          headers.set("X-Auth-Request-Id", trace.requestId);
          headers.set("X-Auth-Reference-Id", trace.referenceId);
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        }

        if (response.status >= 300 && response.status < 400 && location) {
          if (!hasSessionSetCookie) {
            const classified = classifyAuthError({
              code: "cookie_creation_failed",
              description: "Session cookie was missing from successful OAuth callback response.",
              internalLogs: trace.internalLogs,
              hasStateCookie: trace.hasStateCookie,
              host,
              httpStatus: response.status,
              route: pathname,
            });
            const report = buildInvestigationReport(trace, classified, response.status);
            emitAuthDiagnostic({
              timestamp: report.timestamp,
              requestId: report.requestId,
              referenceId: report.referenceId,
              environment: report.environment,
              provider: "google",
              stage: "AUTH_COOKIE_CREATION_FAILED",
              route: pathname,
              method: "GET",
              httpStatus: response.status,
              durationMs,
              safeErrorCode: "cookie_creation_failed",
              category: "COOKIE_BROWSER_ERROR",
              errorName: "SessionCookieMissingError",
              safeErrorMessage: "OAuth callback completed without issuing a session cookie.",
              originLayer: "application",
              lastSuccessfulStage: report.lastSuccessfulStage,
              failedStage: "AUTH_COOKIE_CREATION_FAILED",
              correctiveAction: "Verify session configuration and cookie domain/Secure attributes.",
            });
          } else {
            recordTraceStage("AUTH_GOOGLE_SIGN_IN_SUCCEEDED", true);
            emitAuthDiagnostic({
              timestamp: new Date().toISOString(),
              requestId: trace.requestId,
              referenceId: trace.referenceId,
              environment: trace.environment,
              provider: "google",
              stage: "AUTH_GOOGLE_SIGN_IN_SUCCEEDED",
              route: pathname,
              method: "GET",
              httpStatus: response.status,
              durationMs,
              metadata: {
                redirectTo: redactUrlSecrets(location),
                sessionCookieIssued: true,
              },
            });
          }
        }
      } else if (isGetSession && response.status >= 500) {
        const classified = classifyAuthError({
          code: "session_validation_failed",
          internalLogs: trace.internalLogs,
          host,
          httpStatus: response.status,
          route: pathname,
        });
        const report = buildInvestigationReport(trace, classified, response.status);
        emitAuthDiagnostic({
          timestamp: report.timestamp,
          requestId: report.requestId,
          referenceId: report.referenceId,
          environment: report.environment,
          provider: "session",
          stage: "AUTH_SESSION_VALIDATION_FAILED",
          route: pathname,
          method: "GET",
          httpStatus: response.status,
          durationMs,
          safeErrorCode: report.safeErrorCode,
          category: report.category,
          errorName: report.errorName,
          safeErrorMessage: report.safeErrorMessage,
          originLayer: report.originLayer,
          correctiveAction: report.correctiveAction,
        });
      }

      return attachDiagnosticHeaders(response, trace);
    } catch (error: unknown) {
      const durationMs = Date.now() - trace.startedAt;
      const classified = classifyAuthError({
        error,
        internalLogs: trace.internalLogs,
        hasStateCookie: trace.hasStateCookie,
        host,
        httpStatus: 500,
        route: pathname,
      });
      const report = buildInvestigationReport(trace, classified, 500);

      emitAuthDiagnostic({
        timestamp: report.timestamp,
        requestId: report.requestId,
        referenceId: report.referenceId,
        environment: report.environment,
        provider: trace.provider,
        stage: report.failedStage,
        route: pathname,
        method: "GET",
        httpStatus: 500,
        durationMs,
        safeErrorCode: report.safeErrorCode,
        category: report.category,
        errorName: report.errorName,
        safeErrorMessage: report.safeErrorMessage,
        originLayer: report.originLayer,
        lastSuccessfulStage: report.lastSuccessfulStage,
        failedStage: report.failedStage,
        correctiveAction: report.correctiveAction,
        serverStack: report.serverStack,
      });

      if (isGoogleCallback) {
        return NextResponse.redirect(
          buildLoginErrorRedirectUrl(
            authConfig.baseUrl,
            classified.safeCode,
            trace.referenceId
          )
        );
      }

      return createJsonErrorResponse(
        500,
        classified.safeCode,
        trace.referenceId,
        trace.requestId
      );
    }
  });
}

export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "unknown";
  const isSocialSignIn = pathname.endsWith("/sign-in/social");

  let requestedProvider: string | undefined;
  let rawBodyText: string | null = null;
  if (isSocialSignIn) {
    try {
      rawBodyText = await request.text();
      const parsed = JSON.parse(rawBodyText);
      if (typeof parsed?.provider === "string") {
        requestedProvider = parsed.provider;
      }
    } catch {
      // ignore non-json bodies
    }
  }

  const isGoogleSignIn = isSocialSignIn && requestedProvider === "google";

  const trace: AuthRequestTraceContext = {
    requestId: generateRequestId(),
    referenceId: generateReferenceId(),
    startedAt: Date.now(),
    environment: authConfig.environment,
    route: pathname,
    method: "POST",
    provider: isGoogleSignIn
      ? "google"
      : pathname.includes("email")
        ? "credential"
        : "unknown",
    lastSuccessfulStage: "REQUEST_RECEIVED",
    host,
    timeline: [],
    internalLogs: [],
  };

  return runWithAuthTrace(trace, async () => {
    if (isGoogleSignIn) {
      recordTraceStage("AUTH_GOOGLE_SIGN_IN_STARTED", true);
      emitAuthDiagnostic({
        timestamp: new Date().toISOString(),
        requestId: trace.requestId,
        referenceId: trace.referenceId,
        environment: trace.environment,
        provider: "google",
        stage: "AUTH_GOOGLE_SIGN_IN_STARTED",
        route: pathname,
        method: "POST",
        metadata: {
          host,
          origin: request.headers.get("origin") || "none",
          resolvedBaseUrl: authConfig.baseUrl,
          expectedCallbackUrl: authConfig.googleCallbackUrl,
        },
      });

      // Fail early with actionable diagnostics if Google credentials are missing
      if (!authConfig.googleEnabled) {
        const classified = classifyAuthError({
          code: "missing_google_credentials",
          host,
          httpStatus: 503,
          route: pathname,
        });
        const report = buildInvestigationReport(trace, classified, 503);
        emitAuthDiagnostic({
          timestamp: report.timestamp,
          requestId: report.requestId,
          referenceId: report.referenceId,
          environment: report.environment,
          provider: "google",
          stage: "AUTH_GOOGLE_PROVIDER_ERROR",
          route: pathname,
          method: "POST",
          httpStatus: 503,
          durationMs: report.durationMs,
          safeErrorCode: report.safeErrorCode,
          category: report.category,
          errorName: report.errorName,
          safeErrorMessage: report.safeErrorMessage,
          originLayer: report.originLayer,
          lastSuccessfulStage: report.lastSuccessfulStage,
          failedStage: report.failedStage,
          correctiveAction: report.correctiveAction,
        });

        return createJsonErrorResponse(
          503,
          classified.safeCode,
          trace.referenceId,
          trace.requestId
        );
      }
    }

    const forwardRequest =
      rawBodyText !== null
        ? new NextRequest(request.url, {
            method: request.method,
            headers: request.headers,
            body: rawBodyText,
          })
        : request;

    try {
      const response = await handler.POST(forwardRequest);
      const durationMs = Date.now() - trace.startedAt;

      if (isGoogleSignIn) {
        const cloned = response.clone();
        let bodyJson: Record<string, unknown> | null = null;
        try {
          bodyJson = await cloned.json();
        } catch {
          bodyJson = null;
        }

        if (response.ok && typeof bodyJson?.url === "string") {
          recordTraceStage("AUTH_GOOGLE_REDIRECT_CREATED", true);
          emitAuthDiagnostic({
            timestamp: new Date().toISOString(),
            requestId: trace.requestId,
            referenceId: trace.referenceId,
            environment: trace.environment,
            provider: "google",
            stage: "AUTH_GOOGLE_REDIRECT_CREATED",
            route: pathname,
            method: "POST",
            httpStatus: response.status,
            durationMs,
            metadata: {
              authorizeOrigin: (() => {
                try {
                  return new URL(bodyJson.url as string).origin;
                } catch {
                  return "unknown";
                }
              })(),
              redirectUriConfigured: authConfig.googleCallbackUrl,
              setsStateCookie: Boolean(response.headers.get("set-cookie")),
            },
          });
        } else if (!response.ok) {
          const errCode =
            (typeof bodyJson?.code === "string" && bodyJson.code) ||
            (typeof (bodyJson?.error as Record<string, unknown> | undefined)?.code === "string"
              ? String((bodyJson?.error as Record<string, unknown>).code)
              : null) ||
            `http_${response.status}`;
          const errMsg =
            (typeof bodyJson?.message === "string" && bodyJson.message) ||
            (typeof (bodyJson?.error as Record<string, unknown> | undefined)?.message === "string"
              ? String((bodyJson?.error as Record<string, unknown>).message)
              : null);

          const classified = classifyAuthError({
            code: errCode,
            description: errMsg,
            internalLogs: trace.internalLogs,
            host,
            httpStatus: response.status,
            route: pathname,
          });
          const report = buildInvestigationReport(trace, classified, response.status);
          emitAuthDiagnostic({
            timestamp: report.timestamp,
            requestId: report.requestId,
            referenceId: report.referenceId,
            environment: report.environment,
            provider: "google",
            stage: report.failedStage,
            route: pathname,
            method: "POST",
            httpStatus: response.status,
            durationMs,
            safeErrorCode: report.safeErrorCode,
            category: report.category,
            errorName: report.errorName,
            safeErrorMessage: report.safeErrorMessage,
            originLayer: report.originLayer,
            lastSuccessfulStage: report.lastSuccessfulStage,
            failedStage: report.failedStage,
            correctiveAction: report.correctiveAction,
            serverStack: report.serverStack,
          });

          return createJsonErrorResponse(
            response.status,
            classified.safeCode,
            trace.referenceId,
            trace.requestId
          );
        }
      }

      return attachDiagnosticHeaders(response, trace);
    } catch (error: unknown) {
      const durationMs = Date.now() - trace.startedAt;
      const classified = classifyAuthError({
        error,
        internalLogs: trace.internalLogs,
        host,
        httpStatus: 500,
        route: pathname,
      });
      const report = buildInvestigationReport(trace, classified, 500);

      emitAuthDiagnostic({
        timestamp: report.timestamp,
        requestId: report.requestId,
        referenceId: report.referenceId,
        environment: report.environment,
        provider: trace.provider,
        stage: report.failedStage,
        route: pathname,
        method: "POST",
        httpStatus: 500,
        durationMs,
        safeErrorCode: report.safeErrorCode,
        category: report.category,
        errorName: report.errorName,
        safeErrorMessage: report.safeErrorMessage,
        originLayer: report.originLayer,
        lastSuccessfulStage: report.lastSuccessfulStage,
        failedStage: report.failedStage,
        correctiveAction: report.correctiveAction,
        serverStack: report.serverStack,
      });

      return createJsonErrorResponse(
        500,
        classified.safeCode,
        trace.referenceId,
        trace.requestId
      );
    }
  });
}
