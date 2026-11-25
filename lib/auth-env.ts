export type AuthRuntimeEnvironment = "development" | "preview" | "production";

export interface EnvVarCheckResult {
  name: string;
  present: boolean;
  validFormat: boolean;
  expectedIn: ("development" | "preview" | "production")[];
  issue?: string;
  typoCandidates?: string[];
}

export interface AuthResolvedConfig {
  environment: AuthRuntimeEnvironment;
  isProduction: boolean;
  isPreview: boolean;
  isDevelopment: boolean;
  baseUrl: string;
  baseUrlSource: string;
  basePath: string;
  googleCallbackPath: string;
  googleCallbackUrl: string;
  useSecureCookies: boolean;
  trustedProxyHeaders: boolean;
  googleClientId: string;
  googleClientSecret: string;
  googleEnabled: boolean;
  betterAuthSecret: string;
  betterAuthSecretSource: "env" | "build-placeholder" | "dev-ephemeral";
  staticTrustedOrigins: string[];
  envChecks: EnvVarCheckResult[];
  coherenceWarnings: string[];
}

const KNOWN_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function isLocalhostUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return KNOWN_LOCAL_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function normalizeOriginOrUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    const hostPart = url.split("/")[0]?.split(":")[0]?.toLowerCase() || "";
    const scheme = KNOWN_LOCAL_HOSTS.has(hostPart) ? "http://" : "https://";
    url = `${scheme}${url}`;
  }
  return url.replace(/\/+$/, "");
}

function findEnvKeyTypos(targetKey: string, patterns: RegExp[]): string[] {
  const keys = Object.keys(process.env);
  return keys.filter(
    (k) => k !== targetKey && patterns.some((re) => re.test(k))
  );
}

export function detectRuntimeEnvironment(): AuthRuntimeEnvironment {
  const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
  if (vercelEnv === "preview") return "preview";
  if (vercelEnv === "production") return "production";
  if (process.env.NODE_ENV === "production") {
    const explicitUrl =
      process.env.BETTER_AUTH_URL?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      "";
    if (explicitUrl && isLocalhostUrl(normalizeOriginOrUrl(explicitUrl))) {
      // Local `next start` smoke test on http://localhost
      return "development";
    }
    if (!explicitUrl && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT && !process.env.FLY_APP_NAME && !process.env.RENDER) {
      return "development";
    }
    return "production";
  }
  return "development";
}

export function resolveAuthConfig(): AuthResolvedConfig {
  const environment = detectRuntimeEnvironment();
  const isProduction = environment === "production";
  const isPreview = environment === "preview";
  const isDevelopment = environment === "development";

  const port = process.env.PORT?.trim() || "3000";
  const defaultLocalUrl = `http://localhost:${port}`;

  const envBetterAuthUrl = process.env.BETTER_AUTH_URL?.trim();
  const envPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const envVercelUrl = process.env.VERCEL_URL?.trim();
  const envVercelProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  let baseUrl = defaultLocalUrl;
  let baseUrlSource = "default-localhost";

  if (envBetterAuthUrl) {
    baseUrl = normalizeOriginOrUrl(envBetterAuthUrl);
    baseUrlSource = "BETTER_AUTH_URL";
  } else if (isPreview) {
    // Preview deployments must NEVER inherit production canonical URLs automatically.
    if (envVercelUrl) {
      baseUrl = normalizeOriginOrUrl(`https://${envVercelUrl}`);
      baseUrlSource = "VERCEL_URL";
    } else if (envPublicAppUrl) {
      baseUrl = normalizeOriginOrUrl(envPublicAppUrl);
      baseUrlSource = "NEXT_PUBLIC_APP_URL";
    }
  } else if (isProduction) {
    if (envVercelProdUrl) {
      baseUrl = normalizeOriginOrUrl(`https://${envVercelProdUrl}`);
      baseUrlSource = "VERCEL_PROJECT_PRODUCTION_URL";
    } else if (envPublicAppUrl) {
      baseUrl = normalizeOriginOrUrl(envPublicAppUrl);
      baseUrlSource = "NEXT_PUBLIC_APP_URL";
    } else if (envVercelUrl) {
      baseUrl = normalizeOriginOrUrl(`https://${envVercelUrl}`);
      baseUrlSource = "VERCEL_URL";
    }
  } else {
    if (envPublicAppUrl && isLocalhostUrl(normalizeOriginOrUrl(envPublicAppUrl))) {
      baseUrl = normalizeOriginOrUrl(envPublicAppUrl);
      baseUrlSource = "NEXT_PUBLIC_APP_URL";
    }
  }

  const basePath = "/api/auth";
  const googleCallbackPath = `${basePath}/callback/google`;
  const googleCallbackUrl = `${baseUrl}${googleCallbackPath}`;

  const googleClientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const googleEnabled = Boolean(googleClientId && googleClientSecret);

  const rawSecret = (
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    ""
  ).trim();

  const isBuildPhase =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build";

  let betterAuthSecret = rawSecret;
  let betterAuthSecretSource: AuthResolvedConfig["betterAuthSecretSource"] = "env";

  if (!rawSecret || rawSecret.length < 32) {
    if (process.env.NODE_ENV === "production" && !isBuildPhase) {
      // Defer hard crash or throw clearly for production runtime when BETTER_AUTH_SECRET is absent
      if (isProduction || isPreview) {
        throw new Error(
          "DEPLOYMENT_ERROR: BETTER_AUTH_SECRET must be configured and at least 32 characters long in production/preview."
        );
      }
    }
    if (isBuildPhase) {
      betterAuthSecret = "build-time-placeholder-secret-only-32chars";
      betterAuthSecretSource = "build-placeholder";
    } else {
      betterAuthSecret =
        rawSecret.length >= 32
          ? rawSecret
          : // Ephemeral only in local development when unset
            require("crypto").randomBytes(32).toString("hex");
      betterAuthSecretSource = "dev-ephemeral";
    }
  }

  // Cookie security: Secure cookies whenever serving over HTTPS (prod/preview).
  // Never force Secure cookies on plain http://localhost so local dev and local `next start` work.
  const useSecureCookies = baseUrl.startsWith("https://");
  const trustedProxyHeaders = !isDevelopment;

  const origins = new Set<string>([baseUrl]);
  if (isDevelopment || isLocalhostUrl(baseUrl)) {
    origins.add(`http://localhost:${port}`);
    origins.add(`http://127.0.0.1:${port}`);
    if (port !== "3000") {
      origins.add("http://localhost:3000");
      origins.add("http://127.0.0.1:3000");
    }
  }
  if (envBetterAuthUrl) origins.add(normalizeOriginOrUrl(envBetterAuthUrl));
  if (envPublicAppUrl) {
    const normPublic = normalizeOriginOrUrl(envPublicAppUrl);
    if (!isPreview || normPublic === baseUrl) {
      origins.add(normPublic);
    }
  }
  if (isPreview && envVercelUrl) {
    origins.add(normalizeOriginOrUrl(`https://${envVercelUrl}`));
  }
  if (isProduction && envVercelProdUrl) {
    origins.add(normalizeOriginOrUrl(`https://${envVercelProdUrl}`));
  }
  if (process.env.BETTER_AUTH_TRUSTED_ORIGINS) {
    for (const item of process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",")) {
      const norm = normalizeOriginOrUrl(item);
      if (norm) origins.add(norm);
    }
  }

  // Environment variable checks (never include values for secrets!)
  const secretTypos = findEnvKeyTypos("GOOGLE_CLIENT_SECRET", [
    /^GOOGLE.*SE.?CRET/i,
    /^GOOGLE.*CLIENT.*SEC/i,
    /^AUTH_GOOGLE.*SEC/i,
  ]);
  const clientIdTypos = findEnvKeyTypos("GOOGLE_CLIENT_ID", [
    /^GOOGLE.*CLIENT.*ID/i,
    /^AUTH_GOOGLE.*ID/i,
  ]);
  const authSecretTypos = findEnvKeyTypos("BETTER_AUTH_SECRET", [
    /^BETTER_AUTH.*SECRET/i,
    /^NEXTAUTH_SECRET$/i,
  ]);

  const dbUrl = (process.env.DATABASE_URL || "").trim();
  const directUrl = (process.env.DIRECT_URL || "").trim();

  const isGoogleIdValid =
    googleClientId.length > 10 &&
    (googleClientId.endsWith(".apps.googleusercontent.com") ||
      !googleClientId.includes("your-"));
  const isGoogleSecretValid =
    googleClientSecret.length >= 12 &&
    !googleClientSecret.includes("your-");

  const envChecks: EnvVarCheckResult[] = [
    {
      name: "GOOGLE_CLIENT_ID",
      present: googleClientId.length > 0,
      validFormat: isGoogleIdValid,
      expectedIn: ["development", "preview", "production"],
      issue: !googleClientId
        ? "Missing GOOGLE_CLIENT_ID."
        : !isGoogleIdValid
          ? "GOOGLE_CLIENT_ID does not look like a valid Google OAuth Client ID (*.apps.googleusercontent.com)."
          : undefined,
      typoCandidates: clientIdTypos.length ? clientIdTypos : undefined,
    },
    {
      name: "GOOGLE_CLIENT_SECRET",
      present: googleClientSecret.length > 0,
      validFormat: isGoogleSecretValid,
      expectedIn: ["development", "preview", "production"],
      issue: !googleClientSecret
        ? secretTypos.length
          ? `Missing GOOGLE_CLIENT_SECRET. Found similarly named key(s): ${secretTypos.join(", ")}`
          : "Missing GOOGLE_CLIENT_SECRET."
        : !isGoogleSecretValid
          ? "GOOGLE_CLIENT_SECRET looks incomplete or placeholder-like."
          : undefined,
      typoCandidates: secretTypos.length ? secretTypos : undefined,
    },
    {
      name: "BETTER_AUTH_URL",
      present: Boolean(envBetterAuthUrl),
      validFormat: Boolean(
        envBetterAuthUrl &&
          (envBetterAuthUrl.startsWith("http://") ||
            envBetterAuthUrl.startsWith("https://"))
      ),
      expectedIn: ["development", "production"],
      issue: !envBetterAuthUrl
        ? `BETTER_AUTH_URL is not explicitly set (resolved fallback: ${baseUrl} via ${baseUrlSource}).`
        : undefined,
    },
    {
      name: "BETTER_AUTH_SECRET",
      present: rawSecret.length > 0,
      validFormat: rawSecret.length >= 32,
      expectedIn: ["development", "preview", "production"],
      issue: !rawSecret
        ? "Missing BETTER_AUTH_SECRET (sessions/OAuth state signing will fail across restarts or instances)."
        : rawSecret.length < 32
          ? "BETTER_AUTH_SECRET should be at least 32 characters."
          : undefined,
      typoCandidates: authSecretTypos.length ? authSecretTypos : undefined,
    },
    {
      name: "DATABASE_URL",
      present: dbUrl.length > 0,
      validFormat:
        dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://"),
      expectedIn: ["development", "preview", "production"],
      issue: !dbUrl
        ? "Missing DATABASE_URL."
        : !(dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://"))
          ? "DATABASE_URL must start with postgresql:// or postgres://."
          : undefined,
    },
    {
      name: "DIRECT_URL",
      present: directUrl.length > 0,
      validFormat:
        directUrl.startsWith("postgresql://") ||
        directUrl.startsWith("postgres://"),
      expectedIn: ["development", "production"],
      issue: !directUrl
        ? "DIRECT_URL is unset (Prisma migrations rely on DIRECT_URL or fallback to DATABASE_URL)."
        : undefined,
    },
  ];

  const coherenceWarnings: string[] = [];
  if (isProduction && isLocalhostUrl(baseUrl)) {
    coherenceWarnings.push(
      `Production environment resolved baseURL to localhost (${baseUrl}). Set BETTER_AUTH_URL to your canonical HTTPS domain.`
    );
  }
  if (isProduction && !baseUrl.startsWith("https://")) {
    coherenceWarnings.push(
      `Production baseURL (${baseUrl}) is not HTTPS. Google OAuth and Secure session cookies require HTTPS in production.`
    );
  }
  if (
    envBetterAuthUrl &&
    envPublicAppUrl &&
    normalizeOriginOrUrl(envBetterAuthUrl) !== normalizeOriginOrUrl(envPublicAppUrl)
  ) {
    coherenceWarnings.push(
      `BETTER_AUTH_URL (${normalizeOriginOrUrl(envBetterAuthUrl)}) differs from NEXT_PUBLIC_APP_URL (${normalizeOriginOrUrl(envPublicAppUrl)}).`
    );
  }
  if (
    process.env.NODE_ENV === "production" &&
    isDevelopment &&
    isLocalhostUrl(baseUrl)
  ) {
    coherenceWarnings.push(
      "Running production build locally on HTTP localhost: Secure cookie prefix is disabled automatically for http://localhost."
    );
  }

  return {
    environment,
    isProduction,
    isPreview,
    isDevelopment,
    baseUrl,
    baseUrlSource,
    basePath,
    googleCallbackPath,
    googleCallbackUrl,
    useSecureCookies,
    trustedProxyHeaders,
    googleClientId,
    googleClientSecret,
    googleEnabled,
    betterAuthSecret,
    betterAuthSecretSource,
    staticTrustedOrigins: Array.from(origins),
    envChecks,
    coherenceWarnings,
  };
}

export function resolveRequestTrustedOrigins(
  config: AuthResolvedConfig,
  request?: Request
): string[] {
  const origins = new Set<string>(config.staticTrustedOrigins);
  if (!request) return Array.from(origins);

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host && isLocalhostUrl(`http://${host}`) ? "http" : "https");

  if (host) {
    const cleanHost = host.split(",")[0].trim().toLowerCase();
    const cleanProto = proto.split(",")[0].trim().toLowerCase();

    // Trust localhost variants only in development
    if (config.isDevelopment && isLocalhostUrl(`${cleanProto}://${cleanHost}`)) {
      origins.add(`${cleanProto}://${cleanHost}`);
    }

    // Trust explicit Vercel deployment host for preview or production when matching current deployment
    if (
      config.isPreview &&
      process.env.VERCEL_URL &&
      cleanHost === process.env.VERCEL_URL.trim().toLowerCase()
    ) {
      origins.add(`https://${cleanHost}`);
    }
    if (
      config.isProduction &&
      process.env.VERCEL_PROJECT_PRODUCTION_URL &&
      cleanHost === process.env.VERCEL_PROJECT_PRODUCTION_URL.trim().toLowerCase()
    ) {
      origins.add(`https://${cleanHost}`);
    }
  }

  return Array.from(origins);
}
