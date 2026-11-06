import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 configuration file
// Uses DIRECT_URL for Prisma CLI migrations and schema management against Supabase PostgreSQL
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
