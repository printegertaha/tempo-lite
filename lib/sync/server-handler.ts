import prisma from "@/lib/prisma";
import { z } from "zod";

export const SyncBatchMutationSchema = z.object({
  mutationId: z.string().min(1),
  entityType: z.enum([
    "task",
    "tracker",
    "tracker_entry",
    "daily_note",
    "abstinence",
    "life_area",
    "gym_workout",
    "meal_entry",
    "expense_entry",
  ]),
  entityId: z.string().min(1),
  action: z.enum(["create", "update", "delete"]),
  payload: z.record(z.string(), z.any()),
  clientTimestamp: z.number().int().positive(),
  version: z.number().int().default(1),
});

export const SyncBatchRequestSchema = z.object({
  mutations: z.array(SyncBatchMutationSchema).max(100),
});

export type SyncBatchRequest = z.infer<typeof SyncBatchRequestSchema>;

export interface SyncBatchResultItem {
  mutationId: string;
  entityId: string;
  status: "applied" | "duplicate" | "conflict" | "error";
  serverVersion?: number;
  error?: string;
}

export interface SyncBatchResponse {
  success: boolean;
  results: SyncBatchResultItem[];
  serverTimestamp: number;
}

export async function processSyncBatch(
  userId: string,
  rawBatch: unknown
): Promise<SyncBatchResponse> {
  const parsed = SyncBatchRequestSchema.safeParse(rawBatch);
  if (!parsed.success) {
    throw new Error(`INVALID_SYNC_PAYLOAD: ${parsed.error.message}`);
  }

  const { mutations } = parsed.data;
  const results: SyncBatchResultItem[] = [];

  // Check idempotency first: find which mutations were already executed
  const existingReceipts = await prisma.mutationReceipt.findMany({
    where: {
      userId,
      id: { in: mutations.map((m) => m.mutationId) },
    },
    select: { id: true, entityId: true },
  });

  const processedMutationIds = new Set(existingReceipts.map((r) => r.id));

  // Filter out duplicates
  const pendingToApply = mutations.filter((m) => {
    if (processedMutationIds.has(m.mutationId)) {
      results.push({
        mutationId: m.mutationId,
        entityId: m.entityId,
        status: "duplicate",
      });
      return false;
    }
    return true;
  });

  if (pendingToApply.length === 0) {
    return {
      success: true,
      results,
      serverTimestamp: Date.now(),
    };
  }

  // Execute remaining mutations inside a single atomic Prisma transaction
  await prisma.$transaction(async (tx) => {
    for (const mut of pendingToApply) {
      try {
        if (mut.entityType === "task") {
          if (mut.action === "create") {
            const task = await tx.task.upsert({
              where: { id: mut.entityId },
              create: {
                id: mut.entityId,
                userId,
                title: mut.payload.title || "مهمة جديدة",
                description: mut.payload.description || null,
                dueDate: mut.payload.dueDate || null,
                startTime: mut.payload.startTime || null,
                durationMinutes: mut.payload.durationMinutes || null,
                priority: mut.payload.priority || "MEDIUM",
                status: mut.payload.status || "TODO",
                completedAt: mut.payload.status === "COMPLETED" ? new Date() : null,
                isPomodoro: Boolean(mut.payload.isPomodoro),
                workCycle: mut.payload.workCycle ?? 25,
                breakCycle: mut.payload.breakCycle ?? 5,
                isRecurring: Boolean(mut.payload.isRecurring),
                subtasks: mut.payload.subtasks ?? [],
                tags: mut.payload.tags ?? [],
                sortOrder: mut.payload.sortOrder ?? 0,
                version: (mut.payload.version ?? 1) + 1,
                lifeAreaId: mut.payload.lifeAreaId || null,
                trackerId: mut.payload.trackerId || null,
              },
              update: {
                // If it already existed, update safely
                title: mut.payload.title,
                description: mut.payload.description,
                dueDate: mut.payload.dueDate,
                startTime: mut.payload.startTime,
                durationMinutes: mut.payload.durationMinutes,
                priority: mut.payload.priority,
                status: mut.payload.status,
                completedAt: mut.payload.completedAt ? new Date(mut.payload.completedAt) : null,
                isPomodoro: mut.payload.isPomodoro,
                workCycle: mut.payload.workCycle,
                breakCycle: mut.payload.breakCycle,
                isRecurring: mut.payload.isRecurring,
                subtasks: mut.payload.subtasks,
                tags: mut.payload.tags,
                sortOrder: mut.payload.sortOrder,
                version: { increment: 1 },
              },
            });

            results.push({
              mutationId: mut.mutationId,
              entityId: mut.entityId,
              status: "applied",
              serverVersion: task.version,
            });
          } else if (mut.action === "update") {
            // Verify ownership
            const existing = await tx.task.findFirst({
              where: { id: mut.entityId, userId },
              select: { id: true, version: true },
            });

            if (!existing) {
              results.push({
                mutationId: mut.mutationId,
                entityId: mut.entityId,
                status: "error",
                error: "NOT_FOUND_OR_UNAUTHORIZED",
              });
              continue;
            }

            const updateData: any = {
              version: { increment: 1 },
            };
            if (mut.payload.title !== undefined) updateData.title = mut.payload.title;
            if (mut.payload.description !== undefined) updateData.description = mut.payload.description;
            if (mut.payload.dueDate !== undefined) updateData.dueDate = mut.payload.dueDate;
            if (mut.payload.startTime !== undefined) updateData.startTime = mut.payload.startTime;
            if (mut.payload.durationMinutes !== undefined) updateData.durationMinutes = mut.payload.durationMinutes;
            if (mut.payload.priority !== undefined) updateData.priority = mut.payload.priority;
            if (mut.payload.status !== undefined) {
              updateData.status = mut.payload.status;
              updateData.completedAt = mut.payload.status === "COMPLETED" ? new Date() : null;
            }
            if (mut.payload.isPomodoro !== undefined) updateData.isPomodoro = mut.payload.isPomodoro;
            if (mut.payload.workCycle !== undefined) updateData.workCycle = mut.payload.workCycle;
            if (mut.payload.breakCycle !== undefined) updateData.breakCycle = mut.payload.breakCycle;
            if (mut.payload.isRecurring !== undefined) updateData.isRecurring = mut.payload.isRecurring;
            if (mut.payload.subtasks !== undefined) updateData.subtasks = mut.payload.subtasks;
            if (mut.payload.tags !== undefined) updateData.tags = mut.payload.tags;
            if (mut.payload.sortOrder !== undefined) updateData.sortOrder = mut.payload.sortOrder;
            if (mut.payload.isArchived !== undefined) {
              updateData.isArchived = mut.payload.isArchived;
              updateData.archivedAt = mut.payload.isArchived ? new Date() : null;
            }

            const updated = await tx.task.update({
              where: { id: mut.entityId },
              data: updateData,
            });

            results.push({
              mutationId: mut.mutationId,
              entityId: mut.entityId,
              status: "applied",
              serverVersion: updated.version,
            });
          } else if (mut.action === "delete") {
            await tx.task.deleteMany({
              where: { id: mut.entityId, userId },
            });

            results.push({
              mutationId: mut.mutationId,
              entityId: mut.entityId,
              status: "applied",
            });
          }
        } else if (mut.entityType === "daily_note") {
          if (mut.action === "create" || mut.action === "update") {
            await tx.dailyNote.upsert({
              where: {
                userId_localDate: {
                  userId,
                  localDate: mut.payload.localDate,
                },
              },
              create: {
                userId,
                localDate: mut.payload.localDate,
                content: mut.payload.content || "",
                mood: mut.payload.mood || null,
                tags: mut.payload.tags || [],
              },
              update: {
                content: mut.payload.content,
                mood: mut.payload.mood,
                tags: mut.payload.tags,
              },
            });
            results.push({
              mutationId: mut.mutationId,
              entityId: mut.entityId,
              status: "applied",
            });
          }
        } else if (mut.entityType === "tracker_entry") {
          if (mut.action === "create") {
            await tx.trackerEntry.create({
              data: {
                id: mut.entityId,
                userId,
                trackerId: mut.payload.trackerId,
                localDate: mut.payload.localDate,
                occurredAt: mut.payload.occurredAt ? new Date(mut.payload.occurredAt) : new Date(),
                valueBoolean: mut.payload.valueBoolean ?? null,
                valueNumeric: mut.payload.valueNumeric ?? null,
                valueDuration: mut.payload.valueDuration ?? null,
                entryPayload: mut.payload.entryPayload ?? null,
                notes: mut.payload.notes ?? null,
              },
            });
            results.push({
              mutationId: mut.mutationId,
              entityId: mut.entityId,
              status: "applied",
            });
          } else if (mut.action === "delete") {
            await tx.trackerEntry.deleteMany({
              where: { id: mut.entityId, userId },
            });
            results.push({
              mutationId: mut.mutationId,
              entityId: mut.entityId,
              status: "applied",
            });
          }
        } else if (mut.entityType === "gym_workout") {
          if (mut.action === "create" || mut.action === "update") {
            await tx.gymWorkout.upsert({
              where: { id: mut.entityId },
              create: {
                id: mut.entityId,
                userId,
                date: mut.payload.date,
                title: mut.payload.title || "تمرين رياضي",
                muscleGroup: mut.payload.muscleGroup || null,
                durationMinutes: mut.payload.durationMinutes || 60,
                exercises: mut.payload.exercises || [],
                notes: mut.payload.notes || null,
              },
              update: {
                date: mut.payload.date,
                title: mut.payload.title,
                muscleGroup: mut.payload.muscleGroup,
                durationMinutes: mut.payload.durationMinutes,
                exercises: mut.payload.exercises,
                notes: mut.payload.notes,
              },
            });
            results.push({
              mutationId: mut.mutationId,
              entityId: mut.entityId,
              status: "applied",
            });
          } else if (mut.action === "delete") {
            await tx.gymWorkout.deleteMany({
              where: { id: mut.entityId, userId },
            });
            results.push({
              mutationId: mut.mutationId,
              entityId: mut.entityId,
              status: "applied",
            });
          }
        } else if (mut.entityType === "meal_entry") {
          if (mut.action === "create" || mut.action === "update") {
            await tx.mealEntry.upsert({
              where: { id: mut.entityId },
              create: {
                id: mut.entityId,
                userId,
                date: mut.payload.date,
                mealType: mut.payload.mealType || "lunch",
                title: mut.payload.title || "وجبة",
                calories: mut.payload.calories || 0,
                protein: mut.payload.protein || 0,
                carbs: mut.payload.carbs || 0,
                fat: mut.payload.fat || 0,
                notes: mut.payload.notes || null,
              },
              update: {
                date: mut.payload.date,
                mealType: mut.payload.mealType,
                title: mut.payload.title,
                calories: mut.payload.calories,
                protein: mut.payload.protein,
                carbs: mut.payload.carbs,
                fat: mut.payload.fat,
                notes: mut.payload.notes,
              },
            });
            results.push({
              mutationId: mut.mutationId,
              entityId: mut.entityId,
              status: "applied",
            });
          } else if (mut.action === "delete") {
            await tx.mealEntry.deleteMany({
              where: { id: mut.entityId, userId },
            });
            results.push({
              mutationId: mut.mutationId,
              entityId: mut.entityId,
              status: "applied",
            });
          }
        } else if (mut.entityType === "expense_entry") {
          if (mut.action === "create" || mut.action === "update") {
            await tx.expenseEntry.upsert({
              where: { id: mut.entityId },
              create: {
                id: mut.entityId,
                userId,
                date: mut.payload.date,
                title: mut.payload.title || "مصروف",
                amount: mut.payload.amount || 0,
                category: mut.payload.category || "عام",
                notes: mut.payload.notes || null,
              },
              update: {
                date: mut.payload.date,
                title: mut.payload.title,
                amount: mut.payload.amount,
                category: mut.payload.category,
                notes: mut.payload.notes,
              },
            });
            results.push({
              mutationId: mut.mutationId,
              entityId: mut.entityId,
              status: "applied",
            });
          } else if (mut.action === "delete") {
            await tx.expenseEntry.deleteMany({
              where: { id: mut.entityId, userId },
            });
            results.push({
              mutationId: mut.mutationId,
              entityId: mut.entityId,
              status: "applied",
            });
          }
        }

        // Record Mutation Receipt for idempotency
        await tx.mutationReceipt.create({
          data: {
            id: mut.mutationId,
            userId,
            entityType: mut.entityType,
            entityId: mut.entityId,
            action: mut.action,
          },
        });
      } catch (err: any) {
        console.error(`Error processing mutation ${mut.mutationId}:`, err);
        results.push({
          mutationId: mut.mutationId,
          entityId: mut.entityId,
          status: "error",
          error: err?.message || "TRANSACTION_MUTATION_FAILED",
        });
      }
    }
  });

  return {
    success: true,
    results,
    serverTimestamp: Date.now(),
  };
}
