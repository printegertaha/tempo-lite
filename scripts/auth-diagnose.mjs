#!/usr/bin/env node
/**
 * Athar (أثـر) — Safe Authentication Diagnostics CLI
 *
 * Non-destructive verification of environment variables, URL coherence,
 * cookie configuration, PostgreSQL connectivity, auth tables, and live endpoints.
 * NEVER prints secret values, tokens, passwords, or full DB connection strings.
 */

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";

const { Pool } = pg;

const args = process.argv.slice(2);
const targetUrlArg = (() => {
  const idx = args.indexOf("--url");
  return idx !== -1 && args[idx + 1] ? args[idx + 1].trim() : null;
})();

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env");
const envLocalPath = path.join(rootDir, ".env.local");

const loadedSources = [];
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: false, quiet: true });
  loadedSources.push(".env");
}
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true, quiet: true });
  loadedSources.push(".env.local");
}

function normalizeUrl(raw) {
  let u = raw.trim();
  if (!u) return "";
  if (!u.startsWith("http://") && !u.startsWith("https://")) {
    const host = u.split("/")[0]?.split(":")[0]?.toLowerCase() || "";
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
    u = `${isLocal ? "http://" : "https://"}${u}`;
  }
  return u.replace(/\/+$/, "");
}

function isLocalhost(urlStr) {
  try {
    const h = new URL(urlStr).hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "::1";
  } catch {
    return false;
  }
}

function detectEnvironment() {
  const vercelEnv = (process.env.VERCEL_ENV || "").trim().toLowerCase();
  if (vercelEnv === "preview") return "preview";
  if (vercelEnv === "production") return "production";
  if (process.env.NODE_ENV === "production") {
    const explicit = normalizeUrl(
      process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || ""
    );
    if (explicit && isLocalhost(explicit)) return "development";
    if (!explicit && !process.env.VERCEL) return "development";
    return "production";
  }
  return "development";
}

function resolveBaseUrl(envName) {
  const port = (process.env.PORT || "3000").trim();
  const fallbackLocal = `http://localhost:${port}`;
  const betterAuthUrl = (process.env.BETTER_AUTH_URL || "").trim();
  const publicUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  const vercelUrl = (process.env.VERCEL_URL || "").trim();
  const vercelProdUrl = (process.env.VERCEL_PROJECT_PRODUCTION_URL || "").trim();

  if (betterAuthUrl) return { url: normalizeUrl(betterAuthUrl), source: "BETTER_AUTH_URL" };
  if (envName === "preview" && vercelUrl) {
    return { url: normalizeUrl(`https://${vercelUrl}`), source: "VERCEL_URL" };
  }
  if (envName === "production") {
    if (vercelProdUrl) {
      return { url: normalizeUrl(`https://${vercelProdUrl}`), source: "VERCEL_PROJECT_PRODUCTION_URL" };
    }
    if (publicUrl) return { url: normalizeUrl(publicUrl), source: "NEXT_PUBLIC_APP_URL" };
    if (vercelUrl) return { url: normalizeUrl(`https://${vercelUrl}`), source: "VERCEL_URL" };
  }
  if (publicUrl && isLocalhost(normalizeUrl(publicUrl))) {
    return { url: normalizeUrl(publicUrl), source: "NEXT_PUBLIC_APP_URL" };
  }
  return { url: fallbackLocal, source: "default-localhost" };
}

function findTypoKeys(target, regexes) {
  return Object.keys(process.env).filter(
    (k) => k !== target && regexes.some((r) => r.test(k))
  );
}

const results = [];
function record(name, status, detail) {
  results.push({ name, status, detail });
}

const envName = detectEnvironment();
const { url: baseUrl, source: baseUrlSource } = resolveBaseUrl(envName);
const callbackPath = "/api/auth/callback/google";
const callbackUrl = `${baseUrl}${callbackPath}`;

// 1. Env var checks (presence & format only)
const googleId = (process.env.GOOGLE_CLIENT_ID || "").trim();
const googleSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
const authSecret = (process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || "").trim();
const betterAuthUrl = (process.env.BETTER_AUTH_URL || "").trim();
const dbUrl = (process.env.DATABASE_URL || "").trim();
const directUrl = (process.env.DIRECT_URL || "").trim();

const googleSecretTypos = findTypoKeys("GOOGLE_CLIENT_SECRET", [
  /^GOOGLE.*SE.?CRET/i,
  /^GOOGLE.*CLIENT.*SEC/i,
]);
const googleIdTypos = findTypoKeys("GOOGLE_CLIENT_ID", [/^GOOGLE.*CLIENT.*ID/i]);

record(
  "ENV: GOOGLE_CLIENT_ID",
  googleId && googleId.endsWith(".apps.googleusercontent.com") ? "PASS" : "FAIL",
  googleId
    ? googleId.endsWith(".apps.googleusercontent.com")
      ? `Present (len=${googleId.length}, valid Google OAuth Client ID suffix)`
      : `Present (len=${googleId.length}) but unexpected format (expected *.apps.googleusercontent.com)`
    : googleIdTypos.length
      ? `Missing! Found near-match key(s): ${googleIdTypos.join(", ")}`
      : "Missing"
);

record(
  "ENV: GOOGLE_CLIENT_SECRET",
  googleSecret && googleSecret.length >= 12 ? "PASS" : "FAIL",
  googleSecret
    ? `Present (len=${googleSecret.length})`
    : googleSecretTypos.length
      ? `Missing! Typo detected in env key(s): ${googleSecretTypos.join(", ")}`
      : "Missing"
);

record(
  "ENV: BETTER_AUTH_SECRET",
  authSecret && authSecret.length >= 32 ? "PASS" : "FAIL",
  authSecret
    ? authSecret.length >= 32
      ? `Present (len=${authSecret.length})`
      : `Too short (len=${authSecret.length}, requires >= 32)`
    : "Missing"
);

record(
  "ENV: BETTER_AUTH_URL",
  betterAuthUrl && (betterAuthUrl.startsWith("http://") || betterAuthUrl.startsWith("https://"))
    ? envName === "production" && isLocalhost(betterAuthUrl)
      ? "FAIL"
      : "PASS"
    : betterAuthUrl
      ? "FAIL"
      : "FAIL",
  betterAuthUrl
    ? `Present (${normalizeUrl(betterAuthUrl)})`
    : `Missing (fallback resolved to ${baseUrl} via ${baseUrlSource})`
);

record(
  "ENV: DATABASE_URL",
  dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://") ? "PASS" : "FAIL",
  dbUrl ? "Present (PostgreSQL URI format valid)" : "Missing"
);

record(
  "ENV: DIRECT_URL",
  directUrl.startsWith("postgresql://") || directUrl.startsWith("postgres://") ? "PASS" : "BLOCKED",
  directUrl ? "Present (PostgreSQL URI format valid)" : "Unset (CLI migrations fall back to DATABASE_URL)"
);

// 2. Cookie security & URL coherence
const secureCookies = baseUrl.startsWith("https://");
record(
  "CONFIG: Base & Callback URL",
  envName === "production" && (!secureCookies || isLocalhost(baseUrl)) ? "FAIL" : "PASS",
  `env=${envName}, baseURL=${baseUrl}, callbackURL=${callbackUrl}`
);

record(
  "CONFIG: Cookie Security",
  envName === "production" && !secureCookies ? "FAIL" : "PASS",
  `useSecureCookies=${secureCookies} (${secureCookies ? "HTTPS __Secure- cookies" : "HTTP localhost cookies"})`
);

// 3. Database connectivity & tables
if (dbUrl) {
  const pool = new Pool({
    connectionString: dbUrl,
    connectionTimeoutMillis: 8000,
    max: 1,
  });
  try {
    await pool.query("SELECT 1");
    record("DB: PostgreSQL Connectivity", "PASS", "Connected and executed SELECT 1");

    const tablesRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    const tables = new Set(tablesRes.rows.map((r) => r.table_name));
    const required = ["user", "session", "account", "verification"];
    const missing = required.filter((t) => !tables.has(t));
    record(
      "DB: Better Auth Tables",
      missing.length === 0 ? "PASS" : "FAIL",
      missing.length === 0
        ? "Verified tables: user, session, account, verification"
        : `Missing tables: ${missing.join(", ")}`
    );
  } catch (err) {
    record(
      "DB: PostgreSQL Connectivity",
      "FAIL",
      `Connection failed (${err?.code || "UNKNOWN"}): ${err?.message || "unknown error"}`
    );
    record("DB: Better Auth Tables", "BLOCKED", "Skipped due to DB connection failure");
  } finally {
    await pool.end().catch(() => {});
  }
} else {
  record("DB: PostgreSQL Connectivity", "BLOCKED", "DATABASE_URL is not set");
  record("DB: Better Auth Tables", "BLOCKED", "DATABASE_URL is not set");
}

// 4. Optional live server endpoint probe
const probeBase = targetUrlArg || baseUrl;
try {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  const okRes = await fetch(`${probeBase}/api/auth/ok`, {
    signal: controller.signal,
  });
  clearTimeout(timer);
  record(
    "HTTP: Better Auth /api/auth/ok",
    okRes.ok ? "PASS" : "FAIL",
    `${probeBase}/api/auth/ok -> HTTP ${okRes.status}`
  );
} catch {
  record(
    "HTTP: Better Auth /api/auth/ok",
    "BLOCKED",
    `No running server reachable at ${probeBase} (start dev/prod server or pass --url)`
  );
}

console.log("\n=== ATHAR AUTH DIAGNOSTICS REPORT ===");
console.log(`Loaded env files: ${loadedSources.length ? loadedSources.join(", ") : "none (process env only)"}`);
console.log(`Detected environment: ${envName}`);
console.log("");

for (const item of results) {
  console.log(`[${item.status.padEnd(7)}] ${item.name} -> ${item.detail}`);
}

console.log("\n=== GOOGLE CLOUD CONSOLE CHECKLIST ===");
console.log(`Authorized JavaScript origin (active): ${baseUrl}`);
console.log(`Authorized Redirect URI (active):      ${callbackUrl}`);
console.log("");

const hasFailures = results.some((r) => r.status === "FAIL");
process.exitCode = hasFailures ? 1 : 0;
