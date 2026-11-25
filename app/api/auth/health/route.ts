import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth, authConfig } from "@/lib/auth";
import { getFailureReportByReference } from "@/lib/auth-diagnostics";

type CheckStatus = "PASS" | "FAIL" | "BLOCKED";

interface HealthCheckItem {
  name: string;
  status: CheckStatus;
  detail: string;
}

const REQUIRED_AUTH_TABLES = ["user", "session", "account", "verification"] as const;

async function isAuthorizedForDetailedDiagnostics(
  request: NextRequest
): Promise<boolean> {
  if (authConfig.isDevelopment) {
    return true;
  }

  const configuredKey = process.env.AUTH_DIAGNOSTICS_KEY?.trim();
  const headerKey =
    request.headers.get("x-auth-diagnostics-key")?.trim() ||
    request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();

  if (configuredKey && headerKey && configuredKey === headerKey) {
    return true;
  }

  try {
    const session = await auth.api.getSession({ headers: request.headers });
    return Boolean(session?.user?.id);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const authorized = await isAuthorizedForDetailedDiagnostics(request);

  // Optional failure report lookup by referenceId (only when authorized)
  const refParam = request.nextUrl.searchParams.get("ref")?.trim();
  if (refParam) {
    if (!authorized) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }
    const report = getFailureReportByReference(refParam);
    if (!report) {
      return NextResponse.json(
        { found: false, referenceId: refParam },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }
    const { serverStack: _omitStack, ...safeReport } = report;
    return NextResponse.json(
      { found: true, report: safeReport },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  const checks: HealthCheckItem[] = [];

  // 1. Environment variables (presence & format only — NEVER values)
  for (const envCheck of authConfig.envChecks) {
    const isRequiredHere = envCheck.expectedIn.includes(authConfig.environment);
    let status: CheckStatus = "PASS";
    let detail = `Present and valid format (expected in: ${envCheck.expectedIn.join(", ")})`;

    if (!envCheck.present) {
      status = isRequiredHere ? "FAIL" : "BLOCKED";
      detail = envCheck.issue || `Missing (expected in: ${envCheck.expectedIn.join(", ")})`;
    } else if (!envCheck.validFormat) {
      status = "FAIL";
      detail = envCheck.issue || "Invalid format";
    } else if (envCheck.issue) {
      status = "PASS";
      detail = envCheck.issue;
    }

    checks.push({
      name: `env:${envCheck.name}`,
      status,
      detail,
    });
  }

  // 2. Base URL & Callback URL coherence
  const hasBlockingCoherenceWarning = authConfig.coherenceWarnings.some((w) =>
    w.includes("Production")
  );
  checks.push({
    name: "config:base_url_and_callback",
    status: hasBlockingCoherenceWarning ? "FAIL" : "PASS",
    detail: `baseURL=${authConfig.baseUrl} (${authConfig.baseUrlSource}), googleCallbackUrl=${authConfig.googleCallbackUrl}`,
  });

  // 3. Google provider readiness
  checks.push({
    name: "provider:google_oauth",
    status: authConfig.googleEnabled ? "PASS" : "FAIL",
    detail: authConfig.googleEnabled
      ? "Google provider credentials configured on server"
      : "Google provider disabled/incomplete due to missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET",
  });

  // 4. Cookie security mode
  const cookiesCoherent = authConfig.isDevelopment
    ? true
    : authConfig.useSecureCookies;
  checks.push({
    name: "config:cookie_security",
    status: cookiesCoherent ? "PASS" : "FAIL",
    detail: `useSecureCookies=${authConfig.useSecureCookies}, trustedProxyHeaders=${authConfig.trustedProxyHeaders}`,
  });

  // 5. Database connectivity & auth tables (read-only)
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({
      name: "database:connectivity",
      status: "PASS",
      detail: "PostgreSQL connection succeeded",
    });

    const tablesResult = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    const tableNames = new Set(tablesResult.map((r) => r.table_name));
    const missingTables = REQUIRED_AUTH_TABLES.filter((t) => !tableNames.has(t));

    checks.push({
      name: "database:auth_tables",
      status: missingTables.length === 0 ? "PASS" : "FAIL",
      detail:
        missingTables.length === 0
          ? "All Better Auth tables present (user, session, account, verification)"
          : `Missing table(s): ${missingTables.join(", ")}`,
    });
  } catch {
    checks.push({
      name: "database:connectivity",
      status: "FAIL",
      detail: "Failed to query PostgreSQL database",
    });
    checks.push({
      name: "database:auth_tables",
      status: "BLOCKED",
      detail: "Cannot verify tables without database connectivity",
    });
  }

  const hasFail = checks.some((c) => c.status === "FAIL");
  const statusText = hasFail ? "misconfigured" : "ok";

  // In production/preview, unauthenticated callers receive only minimal health status
  if (!authorized) {
    return NextResponse.json(
      {
        ok: !hasFail,
        status: statusText,
        timestamp: new Date().toISOString(),
      },
      {
        status: hasFail ? 503 : 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  return NextResponse.json(
    {
      ok: !hasFail,
      status: statusText,
      environment: authConfig.environment,
      timestamp: new Date().toISOString(),
      baseUrl: authConfig.baseUrl,
      googleCallbackPath: authConfig.googleCallbackPath,
      googleCallbackUrl: authConfig.googleCallbackUrl,
      coherenceWarnings: authConfig.coherenceWarnings,
      checks,
    },
    {
      status: hasFail ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
