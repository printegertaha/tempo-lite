-- AlterTable: user_settings localization, currency preference, and optional prayer tracking
ALTER TABLE "user_settings"
  ADD COLUMN IF NOT EXISTS "countryCode" TEXT,
  ADD COLUMN IF NOT EXISTS "governorate" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "currency" TEXT,
  ADD COLUMN IF NOT EXISTS "currencyAuto" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "prayerTrackingEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: expense_entry original currency and transaction type
ALTER TABLE "expense_entry"
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'expense';

-- Safe non-destructive backfill for existing Egyptian profiles
UPDATE "user_settings"
SET
  "countryCode" = COALESCE("countryCode", 'EG'),
  "governorate" = COALESCE("governorate", NULLIF(TRIM("dashboardConfig"->>'city'), ''), 'القاهرة'),
  "currency" = COALESCE("currency", 'EGP')
WHERE
  "countryCode" IS NULL
  AND (
    "timezone" = 'Africa/Cairo'
    OR "dashboardConfig"->>'country' IN ('جمهورية مصر العربية', 'مصر', 'Egypt', 'EG')
  );

-- Safe non-destructive backfill for existing Saudi / default profiles
UPDATE "user_settings"
SET
  "countryCode" = COALESCE("countryCode", 'SA'),
  "governorate" = COALESCE("governorate", NULLIF(TRIM("dashboardConfig"->>'city'), ''), 'الرياض'),
  "currency" = COALESCE("currency", 'SAR')
WHERE
  "countryCode" IS NULL
  AND (
    "timezone" = 'Asia/Riyadh'
    OR "dashboardConfig"->>'country' IN ('المملكة العربية السعودية', 'السعودية', 'Saudi Arabia', 'SA')
  );
