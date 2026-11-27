-- AlterTable
ALTER TABLE "meal_entry"
ADD COLUMN "time" TEXT,
ADD COLUMN "items" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "dailyTargetsSnapshot" JSONB;

-- CreateTable
CREATE TABLE "water_entry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "amountMl" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'nutrition',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "water_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "water_entry_userId_date_idx" ON "water_entry"("userId", "date");

-- AddForeignKey
ALTER TABLE "water_entry" ADD CONSTRAINT "water_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
