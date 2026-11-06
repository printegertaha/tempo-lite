-- AlterTable
ALTER TABLE "life_area" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "hiddenOnDashboard" BOOLEAN NOT NULL DEFAULT false;

