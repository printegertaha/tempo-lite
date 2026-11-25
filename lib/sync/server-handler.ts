import prisma from "@/lib/prisma";
import { z } from "zod";
import { slugify } from "@/lib/validations/life-area";

export const SyncBatchMutationSchema = z.object({
  mutationId: z.string().min(1),
  entityType: z.enum([
    "task",
    "tracker",
    "tracker_entry",
    "daily_note",
    "abstinence",
    "abstinence_session",
    "life_area",
    "gym_workout",
    "meal_entry",
    "expense_entry",
    "prayer_record",
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
  permanent?: boolean;
}

export interface SyncBatchResponse {
  success: boolean;
  results: SyncBatchResultItem[];
  serverTimestamp: number;
}

const PERMANENT_ERROR_CODES = new Set([
  "FORBIDDEN_ENTITY_ID",
  "NOT_FOUND_OR_UNAUTHORIZED",
  "UNSUPPORTED_ENTITY_TYPE",
  "UNSUPPORTED_ACTION",
  "MISSING_REQUIRED_FIELD",
]);

function parseOptionalDate(val: unknown): Date | null {
  if (!val) return null;
  const d = new Date(val as any);
  return Number.isNaN(d.getTime()) ? null : d;
}

class PermanentSyncError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message || code);
    this.code = code;
  }
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

  if (mutations.length === 0) {
    return {
      success: true,
      results,
      serverTimestamp: Date.now(),
    };
  }

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

  // Execute each mutation inside its OWN atomic transaction so one failure
  // never aborts PostgreSQL's transaction state (25P02) for other valid mutations.
  for (const mut of pendingToApply) {
    try {
      const itemResult = await prisma.$transaction(async (tx) => {
        // Double-check receipt inside transaction for concurrent batch race protection
        const receiptExists = await tx.mutationReceipt.findFirst({
          where: { id: mut.mutationId },
          select: { id: true, userId: true },
        });
        if (receiptExists) {
          if (receiptExists.userId !== userId) {
            throw new PermanentSyncError("FORBIDDEN_ENTITY_ID");
          }
          return {
            mutationId: mut.mutationId,
            entityId: mut.entityId,
            status: "duplicate" as const,
          };
        }

        let serverVersion: number | undefined;

        if (mut.entityType === "task") {
          if (mut.action === "create") {
            const existingOwner = await tx.task.findUnique({
              where: { id: mut.entityId },
              select: { id: true, userId: true },
            });
            if (existingOwner && existingOwner.userId !== userId) {
              throw new PermanentSyncError("FORBIDDEN_ENTITY_ID");
            }

            // Validate optional FKs safely
            let safeLifeAreaId: string | null = mut.payload.lifeAreaId || null;
            if (safeLifeAreaId) {
              const area = await tx.lifeArea.findFirst({
                where: { id: safeLifeAreaId, userId },
                select: { id: true },
              });
              if (!area) safeLifeAreaId = null;
            }

            let safeTrackerId: string | null = mut.payload.trackerId || null;
            if (safeTrackerId) {
              const trk = await tx.tracker.findFirst({
                where: { id: safeTrackerId, userId },
                select: { id: true },
              });
              if (!trk) safeTrackerId = null;
            }

            const status = mut.payload.status || "TODO";
            const completedAt =
              status === "COMPLETED"
                ? parseOptionalDate(mut.payload.completedAt) || new Date()
                : null;

            const task = existingOwner
              ? await tx.task.update({
                  where: { id: mut.entityId },
                  data: {
                    title: mut.payload.title || "مهمة جديدة",
                    description: mut.payload.description ?? null,
                    dueDate: mut.payload.dueDate ?? null,
                    startTime: mut.payload.startTime ?? null,
                    durationMinutes: mut.payload.durationMinutes ?? null,
                    priority: mut.payload.priority || "MEDIUM",
                    status,
                    completedAt,
                    isPomodoro: Boolean(mut.payload.isPomodoro),
                    workCycle: mut.payload.workCycle ?? 25,
                    breakCycle: mut.payload.breakCycle ?? 5,
                    isRecurring: Boolean(mut.payload.isRecurring),
                    subtasks: mut.payload.subtasks ?? [],
                    tags: mut.payload.tags ?? [],
                    sortOrder: mut.payload.sortOrder ?? 0,
                    lifeAreaId: safeLifeAreaId,
                    trackerId: safeTrackerId,
                    version: { increment: 1 },
                  },
                })
              : await tx.task.create({
                  data: {
                    id: mut.entityId,
                    userId,
                    title: mut.payload.title || "مهمة جديدة",
                    description: mut.payload.description ?? null,
                    dueDate: mut.payload.dueDate ?? null,
                    startTime: mut.payload.startTime ?? null,
                    durationMinutes: mut.payload.durationMinutes ?? null,
                    priority: mut.payload.priority || "MEDIUM",
                    status,
                    completedAt,
                    isPomodoro: Boolean(mut.payload.isPomodoro),
                    workCycle: mut.payload.workCycle ?? 25,
                    breakCycle: mut.payload.breakCycle ?? 5,
                    isRecurring: Boolean(mut.payload.isRecurring),
                    subtasks: mut.payload.subtasks ?? [],
                    tags: mut.payload.tags ?? [],
                    sortOrder: mut.payload.sortOrder ?? 0,
                    version: (mut.payload.version ?? 1) + 1,
                    lifeAreaId: safeLifeAreaId,
                    trackerId: safeTrackerId,
                  },
                });
            serverVersion = task.version;
          } else if (mut.action === "update") {
            const existing = await tx.task.findFirst({
              where: { id: mut.entityId, userId },
              select: { id: true, version: true },
            });
            if (!existing) {
              throw new PermanentSyncError("NOT_FOUND_OR_UNAUTHORIZED");
            }

            const updateData: any = { version: { increment: 1 } };
            if (mut.payload.title !== undefined) updateData.title = mut.payload.title;
            if (mut.payload.description !== undefined) updateData.description = mut.payload.description;
            if (mut.payload.dueDate !== undefined) updateData.dueDate = mut.payload.dueDate;
            if (mut.payload.startTime !== undefined) updateData.startTime = mut.payload.startTime;
            if (mut.payload.durationMinutes !== undefined) updateData.durationMinutes = mut.payload.durationMinutes;
            if (mut.payload.priority !== undefined) updateData.priority = mut.payload.priority;
            if (mut.payload.status !== undefined) {
              updateData.status = mut.payload.status;
              updateData.completedAt =
                mut.payload.status === "COMPLETED"
                  ? parseOptionalDate(mut.payload.completedAt) || new Date()
                  : null;
            }
            if (mut.payload.lifeAreaId !== undefined) {
              if (mut.payload.lifeAreaId) {
                const area = await tx.lifeArea.findFirst({
                  where: { id: mut.payload.lifeAreaId, userId },
                  select: { id: true },
                });
                updateData.lifeAreaId = area ? area.id : null;
              } else {
                updateData.lifeAreaId = null;
              }
            }
            if (mut.payload.trackerId !== undefined) {
              if (mut.payload.trackerId) {
                const trk = await tx.tracker.findFirst({
                  where: { id: mut.payload.trackerId, userId },
                  select: { id: true },
                });
                updateData.trackerId = trk ? trk.id : null;
              } else {
                updateData.trackerId = null;
              }
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
              updateData.archivedAt = mut.payload.isArchived
                ? parseOptionalDate(mut.payload.archivedAt) || new Date()
                : null;
            }

            const updated = await tx.task.update({
              where: { id: mut.entityId },
              data: updateData,
            });
            serverVersion = updated.version;
          } else if (mut.action === "delete") {
            await tx.task.deleteMany({
              where: { id: mut.entityId, userId },
            });
          }
        } else if (mut.entityType === "daily_note") {
          if (!mut.payload.localDate) {
            throw new PermanentSyncError("MISSING_REQUIRED_FIELD", "localDate required");
          }
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
                title: mut.payload.title ?? null,
                content: mut.payload.content || "",
                mood: mut.payload.mood ?? null,
                tags: mut.payload.tags || [],
              },
              update: {
                ...(mut.payload.title !== undefined ? { title: mut.payload.title } : {}),
                content: mut.payload.content ?? "",
                ...(mut.payload.mood !== undefined ? { mood: mut.payload.mood } : {}),
                ...(mut.payload.tags !== undefined ? { tags: mut.payload.tags } : {}),
              },
            });
          } else if (mut.action === "delete") {
            await tx.dailyNote.deleteMany({
              where: { userId, localDate: mut.payload.localDate },
            });
          }
        } else if (mut.entityType === "tracker_entry") {
          if (mut.action === "create" || mut.action === "update") {
            const existingOwner = await tx.trackerEntry.findUnique({
              where: { id: mut.entityId },
              select: { id: true, userId: true },
            });
            if (existingOwner && existingOwner.userId !== userId) {
              throw new PermanentSyncError("FORBIDDEN_ENTITY_ID");
            }

            if (mut.action === "create" || !existingOwner) {
              if (!mut.payload.trackerId || !mut.payload.localDate) {
                throw new PermanentSyncError("MISSING_REQUIRED_FIELD", "trackerId and localDate required");
              }
              const tracker = await tx.tracker.findFirst({
                where: { id: mut.payload.trackerId, userId },
                select: { id: true, version: true },
              });
              if (!tracker) {
                throw new PermanentSyncError("NOT_FOUND_OR_UNAUTHORIZED", "Tracker not found");
              }

              await tx.trackerEntry.upsert({
                where: { id: mut.entityId },
                create: {
                  id: mut.entityId,
                  userId,
                  trackerId: mut.payload.trackerId,
                  localDate: mut.payload.localDate,
                  occurredAt: parseOptionalDate(mut.payload.occurredAt) || new Date(),
                  valueBoolean: mut.payload.valueBoolean ?? null,
                  valueNumeric: mut.payload.valueNumeric ?? null,
                  valueDuration: mut.payload.valueDuration ?? null,
                  timeRangeStart: parseOptionalDate(mut.payload.timeRangeStart),
                  timeRangeEnd: parseOptionalDate(mut.payload.timeRangeEnd),
                  entryPayload: mut.payload.entryPayload ?? undefined,
                  notes: mut.payload.notes ?? null,
                  trackerVersion: mut.payload.trackerVersion ?? tracker.version,
                },
                update: {
                  occurredAt: parseOptionalDate(mut.payload.occurredAt) || new Date(),
                  valueBoolean: mut.payload.valueBoolean ?? null,
                  valueNumeric: mut.payload.valueNumeric ?? null,
                  valueDuration: mut.payload.valueDuration ?? null,
                  timeRangeStart: parseOptionalDate(mut.payload.timeRangeStart),
                  timeRangeEnd: parseOptionalDate(mut.payload.timeRangeEnd),
                  entryPayload: mut.payload.entryPayload ?? undefined,
                  notes: mut.payload.notes ?? null,
                },
              });
            } else {
              await tx.trackerEntry.update({
                where: { id: mut.entityId },
                data: {
                  ...(mut.payload.valueBoolean !== undefined ? { valueBoolean: mut.payload.valueBoolean } : {}),
                  ...(mut.payload.valueNumeric !== undefined ? { valueNumeric: mut.payload.valueNumeric } : {}),
                  ...(mut.payload.valueDuration !== undefined ? { valueDuration: mut.payload.valueDuration } : {}),
                  ...(mut.payload.entryPayload !== undefined ? { entryPayload: mut.payload.entryPayload } : {}),
                  ...(mut.payload.notes !== undefined ? { notes: mut.payload.notes } : {}),
                  occurredAt: parseOptionalDate(mut.payload.occurredAt) || new Date(),
                },
              });
            }
          } else if (mut.action === "delete") {
            await tx.trackerEntry.deleteMany({
              where: { id: mut.entityId, userId },
            });
          }
        } else if (mut.entityType === "gym_workout") {
          if (mut.action === "create" || mut.action === "update") {
            const existingOwner = await tx.gymWorkout.findUnique({
              where: { id: mut.entityId },
              select: { id: true, userId: true },
            });
            if (existingOwner && existingOwner.userId !== userId) {
              throw new PermanentSyncError("FORBIDDEN_ENTITY_ID");
            }
            if (existingOwner) {
              await tx.gymWorkout.update({
                where: { id: mut.entityId },
                data: {
                  ...(mut.payload.date !== undefined ? { date: mut.payload.date } : {}),
                  ...(mut.payload.title !== undefined ? { title: mut.payload.title } : {}),
                  ...(mut.payload.muscleGroup !== undefined ? { muscleGroup: mut.payload.muscleGroup } : {}),
                  ...(mut.payload.durationMinutes !== undefined ? { durationMinutes: mut.payload.durationMinutes } : {}),
                  ...(mut.payload.exercises !== undefined ? { exercises: mut.payload.exercises } : {}),
                  ...(mut.payload.notes !== undefined ? { notes: mut.payload.notes } : {}),
                },
              });
            } else {
              await tx.gymWorkout.create({
                data: {
                  id: mut.entityId,
                  userId,
                  date: mut.payload.date || new Date().toISOString().split("T")[0],
                  title: mut.payload.title || "تمرين رياضي",
                  muscleGroup: mut.payload.muscleGroup || null,
                  durationMinutes: mut.payload.durationMinutes || 60,
                  exercises: mut.payload.exercises || [],
                  notes: mut.payload.notes || null,
                },
              });
            }
          } else if (mut.action === "delete") {
            await tx.gymWorkout.deleteMany({
              where: { id: mut.entityId, userId },
            });
          }
        } else if (mut.entityType === "meal_entry") {
          if (mut.action === "create" || mut.action === "update") {
            const existingOwner = await tx.mealEntry.findUnique({
              where: { id: mut.entityId },
              select: { id: true, userId: true },
            });
            if (existingOwner && existingOwner.userId !== userId) {
              throw new PermanentSyncError("FORBIDDEN_ENTITY_ID");
            }
            if (existingOwner) {
              await tx.mealEntry.update({
                where: { id: mut.entityId },
                data: {
                  ...(mut.payload.date !== undefined ? { date: mut.payload.date } : {}),
                  ...(mut.payload.mealType !== undefined ? { mealType: mut.payload.mealType } : {}),
                  ...(mut.payload.title !== undefined ? { title: mut.payload.title } : {}),
                  ...(mut.payload.calories !== undefined ? { calories: Number(mut.payload.calories) || 0 } : {}),
                  ...(mut.payload.protein !== undefined ? { protein: Number(mut.payload.protein) || 0 } : {}),
                  ...(mut.payload.carbs !== undefined ? { carbs: Number(mut.payload.carbs) || 0 } : {}),
                  ...(mut.payload.fat !== undefined ? { fat: Number(mut.payload.fat) || 0 } : {}),
                  ...(mut.payload.notes !== undefined ? { notes: mut.payload.notes } : {}),
                },
              });
            } else {
              await tx.mealEntry.create({
                data: {
                  id: mut.entityId,
                  userId,
                  date: mut.payload.date || new Date().toISOString().split("T")[0],
                  mealType: mut.payload.mealType || "lunch",
                  title: mut.payload.title || "وجبة",
                  calories: Number(mut.payload.calories) || 0,
                  protein: Number(mut.payload.protein) || 0,
                  carbs: Number(mut.payload.carbs) || 0,
                  fat: Number(mut.payload.fat) || 0,
                  notes: mut.payload.notes || null,
                },
              });
            }
          } else if (mut.action === "delete") {
            await tx.mealEntry.deleteMany({
              where: { id: mut.entityId, userId },
            });
          }
        } else if (mut.entityType === "expense_entry") {
          if (mut.action === "create" || mut.action === "update") {
            const existingOwner = await tx.expenseEntry.findUnique({
              where: { id: mut.entityId },
              select: { id: true, userId: true },
            });
            if (existingOwner && existingOwner.userId !== userId) {
              throw new PermanentSyncError("FORBIDDEN_ENTITY_ID");
            }
            if (existingOwner) {
              await tx.expenseEntry.update({
                where: { id: mut.entityId },
                data: {
                  ...(mut.payload.date !== undefined ? { date: mut.payload.date } : {}),
                  ...(mut.payload.title !== undefined ? { title: mut.payload.title } : {}),
                  ...(mut.payload.amount !== undefined ? { amount: Number(mut.payload.amount) || 0 } : {}),
                  ...(mut.payload.category !== undefined ? { category: mut.payload.category } : {}),
                  ...(mut.payload.notes !== undefined ? { notes: mut.payload.notes } : {}),
                },
              });
            } else {
              await tx.expenseEntry.create({
                data: {
                  id: mut.entityId,
                  userId,
                  date: mut.payload.date || new Date().toISOString().split("T")[0],
                  title: mut.payload.title || "مصروف",
                  amount: Number(mut.payload.amount) || 0,
                  category: mut.payload.category || "عام",
                  notes: mut.payload.notes || null,
                },
              });
            }
          } else if (mut.action === "delete") {
            await tx.expenseEntry.deleteMany({
              where: { id: mut.entityId, userId },
            });
          }
        } else if (mut.entityType === "tracker") {
          if (mut.action === "create" || mut.action === "update") {
            const existingOwner = await tx.tracker.findUnique({
              where: { id: mut.entityId },
              select: { id: true, userId: true, version: true },
            });
            if (existingOwner && existingOwner.userId !== userId) {
              throw new PermanentSyncError("FORBIDDEN_ENTITY_ID");
            }

            if (existingOwner) {
              const tracker = await tx.tracker.update({
                where: { id: mut.entityId },
                data: {
                  ...(mut.payload.name !== undefined ? { name: mut.payload.name } : {}),
                  ...(mut.payload.description !== undefined ? { description: mut.payload.description } : {}),
                  ...(mut.payload.icon !== undefined ? { icon: mut.payload.icon } : {}),
                  ...(mut.payload.color !== undefined ? { color: mut.payload.color } : {}),
                  ...(mut.payload.priority !== undefined ? { priority: mut.payload.priority } : {}),
                  ...(mut.payload.unit !== undefined ? { unit: mut.payload.unit } : {}),
                  ...(mut.payload.targetValue !== undefined ? { targetValue: mut.payload.targetValue } : {}),
                  ...(mut.payload.targetFrequency !== undefined ? { targetFrequency: mut.payload.targetFrequency } : {}),
                  ...(mut.payload.scheduleConfig !== undefined ? { scheduleConfig: mut.payload.scheduleConfig } : {}),
                  ...(mut.payload.trackerConfig !== undefined ? { trackerConfig: mut.payload.trackerConfig } : {}),
                  ...(mut.payload.displayPreferences !== undefined ? { displayPreferences: mut.payload.displayPreferences } : {}),
                  ...(mut.payload.sortOrder !== undefined ? { sortOrder: mut.payload.sortOrder } : {}),
                  ...(mut.payload.isPaused !== undefined ? { isPaused: mut.payload.isPaused } : {}),
                  ...(mut.payload.isArchived !== undefined ? { isArchived: mut.payload.isArchived } : {}),
                  version: { increment: 1 },
                },
              });
              serverVersion = tracker.version;
            } else {
              // Ensure slug uniqueness per user
              const baseSlug = mut.payload.slug || slugify(mut.payload.name || `tracker-${mut.entityId}`);
              let finalSlug = baseSlug;
              let slugCounter = 1;
              while (
                await tx.tracker.findUnique({
                  where: { userId_slug: { userId, slug: finalSlug } },
                  select: { id: true },
                })
              ) {
                slugCounter++;
                finalSlug = `${baseSlug}-${slugCounter}`;
              }

              let safeLifeAreaId: string | null = mut.payload.lifeAreaId || null;
              if (safeLifeAreaId) {
                const area = await tx.lifeArea.findFirst({
                  where: { id: safeLifeAreaId, userId },
                  select: { id: true },
                });
                if (!area) safeLifeAreaId = null;
              }

              const tracker = await tx.tracker.create({
                data: {
                  id: mut.entityId,
                  userId,
                  lifeAreaId: safeLifeAreaId,
                  name: mut.payload.name || "عادة جديدة",
                  slug: finalSlug,
                  description: mut.payload.description || null,
                  icon: mut.payload.icon || "Flame",
                  color: mut.payload.color || "emerald",
                  priority: mut.payload.priority ?? 1,
                  metricType: mut.payload.metricType || "BOOLEAN",
                  unit: mut.payload.unit || null,
                  targetValue: mut.payload.targetValue ?? null,
                  targetFrequency: mut.payload.targetFrequency || "DAILY",
                  scheduleConfig: mut.payload.scheduleConfig ?? {},
                  trackerConfig: mut.payload.trackerConfig ?? {},
                  displayPreferences: mut.payload.displayPreferences ?? {},
                  sortOrder: mut.payload.sortOrder ?? 0,
                  version: (mut.payload.version ?? 1) + 1,
                  isPaused: Boolean(mut.payload.isPaused),
                  isArchived: Boolean(mut.payload.isArchived),
                },
              });
              serverVersion = tracker.version;
            }
          } else if (mut.action === "delete") {
            await tx.tracker.deleteMany({
              where: { id: mut.entityId, userId },
            });
          }
        } else if (mut.entityType === "life_area") {
          if (mut.action === "create" || mut.action === "update") {
            const existingOwner = await tx.lifeArea.findUnique({
              where: { id: mut.entityId },
              select: { id: true, userId: true },
            });
            if (existingOwner && existingOwner.userId !== userId) {
              throw new PermanentSyncError("FORBIDDEN_ENTITY_ID");
            }
            if (existingOwner) {
              await tx.lifeArea.update({
                where: { id: mut.entityId },
                data: {
                  ...(mut.payload.name !== undefined ? { name: mut.payload.name } : {}),
                  ...(mut.payload.description !== undefined ? { description: mut.payload.description } : {}),
                  ...(mut.payload.icon !== undefined ? { icon: mut.payload.icon } : {}),
                  ...(mut.payload.color !== undefined ? { color: mut.payload.color } : {}),
                  ...(mut.payload.priority !== undefined ? { priority: mut.payload.priority } : {}),
                  ...(mut.payload.sortOrder !== undefined ? { sortOrder: mut.payload.sortOrder } : {}),
                  ...(mut.payload.hiddenOnDashboard !== undefined ? { hiddenOnDashboard: mut.payload.hiddenOnDashboard } : {}),
                  ...(mut.payload.isArchived !== undefined ? { isArchived: mut.payload.isArchived } : {}),
                },
              });
            } else {
              const baseSlug = mut.payload.slug || slugify(mut.payload.name || `area-${mut.entityId}`);
              let finalSlug = baseSlug;
              let slugCounter = 1;
              while (
                await tx.lifeArea.findUnique({
                  where: { userId_slug: { userId, slug: finalSlug } },
                  select: { id: true },
                })
              ) {
                slugCounter++;
                finalSlug = `${baseSlug}-${slugCounter}`;
              }
              await tx.lifeArea.create({
                data: {
                  id: mut.entityId,
                  userId,
                  name: mut.payload.name || "تصنيف جديد",
                  slug: finalSlug,
                  description: mut.payload.description || null,
                  icon: mut.payload.icon || "Sparkles",
                  color: mut.payload.color || "violet",
                  priority: mut.payload.priority ?? 1,
                  sortOrder: mut.payload.sortOrder ?? 0,
                  hiddenOnDashboard: Boolean(mut.payload.hiddenOnDashboard),
                  isArchived: Boolean(mut.payload.isArchived),
                },
              });
            }
          } else if (mut.action === "delete") {
            await tx.lifeArea.deleteMany({
              where: { id: mut.entityId, userId },
            });
          }
        } else if (mut.entityType === "abstinence") {
          if (mut.action === "create" || mut.action === "update") {
            const existingOwner = await tx.abstinenceTracker.findUnique({
              where: { id: mut.entityId },
              select: { id: true, userId: true },
            });
            if (existingOwner && existingOwner.userId !== userId) {
              throw new PermanentSyncError("FORBIDDEN_ENTITY_ID");
            }
            if (existingOwner) {
              await tx.abstinenceTracker.update({
                where: { id: mut.entityId },
                data: {
                  ...(mut.payload.name !== undefined ? { name: mut.payload.name } : {}),
                  ...(mut.payload.description !== undefined ? { description: mut.payload.description } : {}),
                  ...(mut.payload.icon !== undefined ? { icon: mut.payload.icon } : {}),
                  ...(mut.payload.color !== undefined ? { color: mut.payload.color } : {}),
                  ...(mut.payload.targetDays !== undefined ? { targetDays: mut.payload.targetDays } : {}),
                  ...(mut.payload.isArchived !== undefined ? { isArchived: mut.payload.isArchived } : {}),
                },
              });
            } else {
              await tx.abstinenceTracker.create({
                data: {
                  id: mut.entityId,
                  userId,
                  name: mut.payload.name || "هدف امتناع",
                  description: mut.payload.description || null,
                  icon: mut.payload.icon || "ShieldCheck",
                  color: mut.payload.color || "rose",
                  targetDays: mut.payload.targetDays ?? null,
                  isArchived: Boolean(mut.payload.isArchived),
                },
              });
            }

            if (mut.payload.startedAt) {
              const activeSession = await tx.abstinenceSession.findFirst({
                where: { abstinenceTrackerId: mut.entityId, userId, endedAt: null },
              });
              if (!activeSession) {
                await tx.abstinenceSession.create({
                  data: {
                    abstinenceTrackerId: mut.entityId,
                    userId,
                    startedAt: parseOptionalDate(mut.payload.startedAt) || new Date(),
                  },
                });
              }
            }
          } else if (mut.action === "delete") {
            await tx.abstinenceTracker.deleteMany({
              where: { id: mut.entityId, userId },
            });
          }
        } else if (mut.entityType === "abstinence_session") {
          const trackerId = mut.payload.abstinenceTrackerId || mut.payload.trackerId;
          if (mut.action === "create" || mut.action === "update") {
            if (!trackerId) {
              throw new PermanentSyncError("MISSING_REQUIRED_FIELD", "abstinenceTrackerId required");
            }
            const trackerOwner = await tx.abstinenceTracker.findFirst({
              where: { id: trackerId, userId },
              select: { id: true },
            });
            if (!trackerOwner) {
              throw new PermanentSyncError("NOT_FOUND_OR_UNAUTHORIZED");
            }

            const existingOwner = await tx.abstinenceSession.findUnique({
              where: { id: mut.entityId },
              select: { id: true, userId: true },
            });
            if (existingOwner && existingOwner.userId !== userId) {
              throw new PermanentSyncError("FORBIDDEN_ENTITY_ID");
            }

            if (existingOwner) {
              await tx.abstinenceSession.update({
                where: { id: mut.entityId },
                data: {
                  ...(mut.payload.startedAt !== undefined
                    ? { startedAt: parseOptionalDate(mut.payload.startedAt) || new Date() }
                    : {}),
                  ...(mut.payload.endedAt !== undefined
                    ? { endedAt: parseOptionalDate(mut.payload.endedAt) }
                    : {}),
                  ...(mut.payload.durationSeconds !== undefined
                    ? { durationSeconds: mut.payload.durationSeconds }
                    : {}),
                  ...(mut.payload.relapseReason !== undefined
                    ? { relapseReason: mut.payload.relapseReason }
                    : {}),
                  ...(mut.payload.trigger !== undefined ? { trigger: mut.payload.trigger } : {}),
                  ...(mut.payload.notes !== undefined ? { notes: mut.payload.notes } : {}),
                },
              });
            } else {
              // If opening a new active session (endedAt == null), close any lingering active session first
              if (!mut.payload.endedAt) {
                const lingering = await tx.abstinenceSession.findFirst({
                  where: { abstinenceTrackerId: trackerId, userId, endedAt: null },
                });
                if (lingering) {
                  const endTime = parseOptionalDate(mut.payload.startedAt) || new Date();
                  const dur = Math.max(
                    0,
                    Math.floor((endTime.getTime() - lingering.startedAt.getTime()) / 1000)
                  );
                  await tx.abstinenceSession.update({
                    where: { id: lingering.id },
                    data: { endedAt: endTime, durationSeconds: dur },
                  });
                }
              }

              await tx.abstinenceSession.create({
                data: {
                  id: mut.entityId,
                  abstinenceTrackerId: trackerId,
                  userId,
                  startedAt: parseOptionalDate(mut.payload.startedAt) || new Date(),
                  endedAt: parseOptionalDate(mut.payload.endedAt),
                  durationSeconds: mut.payload.durationSeconds ?? null,
                  relapseReason: mut.payload.relapseReason ?? null,
                  trigger: mut.payload.trigger ?? null,
                  notes: mut.payload.notes ?? null,
                },
              });
            }
          } else if (mut.action === "delete") {
            await tx.abstinenceSession.deleteMany({
              where: { id: mut.entityId, userId },
            });
          }
        } else if (mut.entityType === "prayer_record") {
          if (mut.action === "create" || mut.action === "update") {
            if (!mut.payload.date || !mut.payload.prayerKey) {
              throw new PermanentSyncError("MISSING_REQUIRED_FIELD", "date and prayerKey required");
            }
            await tx.prayerRecord.upsert({
              where: {
                userId_date_prayerKey: {
                  userId,
                  date: mut.payload.date,
                  prayerKey: mut.payload.prayerKey,
                },
              },
              create: {
                userId,
                date: mut.payload.date,
                prayerKey: mut.payload.prayerKey,
                isCompleted: Boolean(mut.payload.isCompleted),
                completedAt: mut.payload.isCompleted
                  ? parseOptionalDate(mut.payload.completedAt) || new Date()
                  : null,
                location: mut.payload.location || null,
                withSunnah: Boolean(mut.payload.withSunnah),
                notes: mut.payload.notes || null,
              },
              update: {
                isCompleted: Boolean(mut.payload.isCompleted),
                completedAt: mut.payload.isCompleted
                  ? parseOptionalDate(mut.payload.completedAt) || new Date()
                  : null,
                ...(mut.payload.location !== undefined ? { location: mut.payload.location } : {}),
                ...(mut.payload.withSunnah !== undefined ? { withSunnah: Boolean(mut.payload.withSunnah) } : {}),
                ...(mut.payload.notes !== undefined ? { notes: mut.payload.notes } : {}),
              },
            });
          } else if (mut.action === "delete") {
            await tx.prayerRecord.deleteMany({
              where: { id: mut.entityId, userId },
            });
          }
        } else {
          throw new PermanentSyncError(
            "UNSUPPORTED_ENTITY_TYPE",
            `UNSUPPORTED_ENTITY_TYPE: ${mut.entityType}`
          );
        }

        // Write MutationReceipt atomically inside the SAME transaction
        await tx.mutationReceipt.create({
          data: {
            id: mut.mutationId,
            userId,
            entityType: mut.entityType,
            entityId: mut.entityId,
            action: mut.action,
          },
        });

        return {
          mutationId: mut.mutationId,
          entityId: mut.entityId,
          status: "applied" as const,
          ...(serverVersion !== undefined ? { serverVersion } : {}),
        };
      });

      results.push(itemResult);
    } catch (err: any) {
      // Handle race condition where another concurrent request committed the same mutationId
      if (err?.code === "P2002") {
        const existingReceipt = await prisma.mutationReceipt
          .findFirst({ where: { id: mut.mutationId, userId }, select: { id: true } })
          .catch(() => null);
        if (existingReceipt) {
          results.push({
            mutationId: mut.mutationId,
            entityId: mut.entityId,
            status: "duplicate",
          });
          continue;
        }
      }

      const isPermanent =
        err instanceof PermanentSyncError ||
        PERMANENT_ERROR_CODES.has(err?.code) ||
        PERMANENT_ERROR_CODES.has(err?.message);

      console.error(`Error processing mutation ${mut.mutationId} (${mut.entityType}:${mut.action}):`, err);
      results.push({
        mutationId: mut.mutationId,
        entityId: mut.entityId,
        status: "error",
        error: err?.message || "TRANSACTION_MUTATION_FAILED",
        permanent: isPermanent,
      });
    }
  }

  return {
    success: true,
    results,
    serverTimestamp: Date.now(),
  };
}
