-- CreateTable
CREATE TABLE "abstinence_tracker" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackerId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'ShieldCheck',
    "color" TEXT NOT NULL DEFAULT 'rose',
    "targetDays" INTEGER,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abstinence_tracker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abstinence_session" (
    "id" TEXT NOT NULL,
    "abstinenceTrackerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "relapseReason" TEXT,
    "trigger" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abstinence_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "abstinence_tracker_trackerId_key" ON "abstinence_tracker"("trackerId");

-- CreateIndex
CREATE INDEX "abstinence_tracker_userId_isArchived_idx" ON "abstinence_tracker"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "abstinence_session_userId_abstinenceTrackerId_startedAt_idx" ON "abstinence_session"("userId", "abstinenceTrackerId", "startedAt");

-- CreateIndex
CREATE INDEX "abstinence_session_userId_endedAt_idx" ON "abstinence_session"("userId", "endedAt");

-- AddForeignKey
ALTER TABLE "abstinence_tracker" ADD CONSTRAINT "abstinence_tracker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abstinence_tracker" ADD CONSTRAINT "abstinence_tracker_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "tracker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abstinence_session" ADD CONSTRAINT "abstinence_session_abstinenceTrackerId_fkey" FOREIGN KEY ("abstinenceTrackerId") REFERENCES "abstinence_tracker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abstinence_session" ADD CONSTRAINT "abstinence_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

