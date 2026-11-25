import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const PRISMA_CLIENT_EPOCH = "20261125_localization_currency_prayer_pref";

// Global declaration for singleton caching in Next.js development mode
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaEpoch: string | undefined;
  pgPool: Pool | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.DIRECT_URL ||
    "postgresql://postgres:postgres@localhost:5432/postgres";

  // Re-use connection pool to prevent connection exhaustion, especially in serverless & Supabase poolers
  const poolMax = process.env.DATABASE_POOL_MAX
    ? parseInt(process.env.DATABASE_POOL_MAX, 10)
    : 5;

  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
      max: poolMax,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

  globalForPrisma.pgPool = pool;

  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

  globalForPrisma.prisma = client;
  globalForPrisma.prismaEpoch = PRISMA_CLIENT_EPOCH;
  return client;
}

const cachedPrismaValid =
  globalForPrisma.prisma && globalForPrisma.prismaEpoch === PRISMA_CLIENT_EPOCH;

export const prisma = cachedPrismaValid
  ? (globalForPrisma.prisma as PrismaClient)
  : createPrismaClient();

// Ensure bulletproof interoperability across both CommonJS and ES Modules
(prisma as any).default = prisma;
(prisma as any).prisma = prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaEpoch = PRISMA_CLIENT_EPOCH;
}

export default prisma;

