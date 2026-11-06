-- AlterTable
ALTER TABLE "task" ADD COLUMN "trackerId" TEXT;

-- CreateIndex
CREATE INDEX "task_userId_trackerId_idx" ON "task"("userId", "trackerId");

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "tracker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "daily_note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "mood" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_note_userId_localDate_idx" ON "daily_note"("userId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "daily_note_userId_localDate_key" ON "daily_note"("userId", "localDate");

-- AddForeignKey
ALTER TABLE "daily_note" ADD CONSTRAINT "daily_note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

