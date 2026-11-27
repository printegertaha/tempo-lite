-- Additive migration for personalized onboarding, durable TaskSession history, and >7-day EntityRevision snapshots.
-- Non-destructive: preserves all existing tables, rows, and user accounts.

ALTER TABLE "user_settings"
  ADD COLUMN IF NOT EXISTS "salutation" TEXT,
  ADD COLUMN IF NOT EXISTS "religion" TEXT,
  ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "onboardingStep" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "task_session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "trackerId" TEXT,
  "localDate" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "durationSeconds" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'completed',
  "completionSource" TEXT NOT NULL DEFAULT 'timer',
  "isEstimated" BOOLEAN NOT NULL DEFAULT false,
  "completedCycles" INTEGER NOT NULL DEFAULT 0,
  "taskTitleSnapshot" TEXT NOT NULL,
  "taskDescriptionSnapshot" TEXT,
  "subtasksSnapshot" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "lifeAreaIdSnapshot" TEXT,
  "lifeAreaNameSnapshot" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "task_session_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_session_userId_fkey'
  ) THEN
    ALTER TABLE "task_session"
      ADD CONSTRAINT "task_session_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "user"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "task_session_userId_localDate_idx"
  ON "task_session"("userId", "localDate");

CREATE INDEX IF NOT EXISTS "task_session_userId_taskId_idx"
  ON "task_session"("userId", "taskId");

CREATE TABLE IF NOT EXISTS "entity_revision" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "localDate" TEXT,
  "revisionNumber" INTEGER NOT NULL DEFAULT 1,
  "previousValues" JSONB NOT NULL,
  "newValues" JSONB NOT NULL,
  "editedBy" TEXT NOT NULL,
  "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "entity_revision_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'entity_revision_userId_fkey'
  ) THEN
    ALTER TABLE "entity_revision"
      ADD CONSTRAINT "entity_revision_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "user"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "entity_revision_userId_entityType_entityId_idx"
  ON "entity_revision"("userId", "entityType", "entityId");

CREATE INDEX IF NOT EXISTS "entity_revision_userId_localDate_idx"
  ON "entity_revision"("userId", "localDate");

-- Safely migrate pre-existing accounts so they are never locked out or forced through broken first-time onboarding.
INSERT INTO "user_settings" ("id", "userId", "timezone", "onboardingCompleted", "onboardingStep", "onboardingCompletedAt", "religion", "updatedAt")
SELECT
  'us_' || md5(u."id" || '_preexisting'),
  u."id",
  'Africa/Cairo',
  true,
  3,
  COALESCE(u."createdAt", NOW()),
  'muslim',
  NOW()
FROM "user" u
WHERE NOT EXISTS (
  SELECT 1 FROM "user_settings" us WHERE us."userId" = u."id"
);

UPDATE "user_settings"
SET
  "onboardingCompleted" = true,
  "onboardingStep" = 3,
  "onboardingCompletedAt" = COALESCE("onboardingCompletedAt", "createdAt", NOW()),
  "religion" = COALESCE("religion", 'muslim')
WHERE "onboardingCompleted" = false;
