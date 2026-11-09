-- AlterTable: UserSettings
ALTER TABLE "user_settings" ADD COLUMN "audioEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "audioVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
ADD COLUMN "plannerConfig" JSONB NOT NULL DEFAULT '{}';

-- AlterTable: Task
ALTER TABLE "task" ADD COLUMN "startTime" TEXT,
ADD COLUMN "durationMinutes" INTEGER,
ADD COLUMN "isPomodoro" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "workCycle" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN "breakCycle" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "subtasks" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable: MutationReceipt
CREATE TABLE "mutation_receipt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mutation_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: MutationReceipt
CREATE INDEX "mutation_receipt_userId_createdAt_idx" ON "mutation_receipt"("userId", "createdAt");
CREATE UNIQUE INDEX "mutation_receipt_userId_id_key" ON "mutation_receipt"("userId", "id");

-- AddForeignKey: MutationReceipt
ALTER TABLE "mutation_receipt" ADD CONSTRAINT "mutation_receipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: GymWorkout
CREATE TABLE "gym_workout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "muscleGroup" TEXT,
    "durationMinutes" INTEGER DEFAULT 60,
    "exercises" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gym_workout_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "gym_workout_userId_date_idx" ON "gym_workout"("userId", "date");
ALTER TABLE "gym_workout" ADD CONSTRAINT "gym_workout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: MealEntry
CREATE TABLE "meal_entry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "mealType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "calories" INTEGER NOT NULL DEFAULT 0,
    "protein" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_entry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "meal_entry_userId_date_idx" ON "meal_entry"("userId", "date");
ALTER TABLE "meal_entry" ADD CONSTRAINT "meal_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: ExpenseEntry
CREATE TABLE "expense_entry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_entry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "expense_entry_userId_date_idx" ON "expense_entry"("userId", "date");
ALTER TABLE "expense_entry" ADD CONSTRAINT "expense_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

