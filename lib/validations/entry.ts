import { z } from "zod";

/**
 * Validate standard calendar date in format "YYYY-MM-DD"
 */
export const LocalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "صيغة التاريخ يجب أن تكون YYYY-MM-DD");

/**
 * Generic Entry Input Schema
 */
export const CreateEntrySchema = z.object({
  trackerId: z.string().min(1, "معرف المتعقب مطلوب"),
  localDate: LocalDateSchema.optional(),
  occurredAt: z.union([z.string().datetime(), z.date()]).optional(),
  valueBoolean: z.boolean().optional().nullable(),
  valueNumeric: z.number().optional().nullable(),
  valueDuration: z.number().int().min(0).optional().nullable(),
  timeRangeStart: z.union([z.string().datetime(), z.date()]).optional().nullable(),
  timeRangeEnd: z.union([z.string().datetime(), z.date()]).optional().nullable(),
  entryPayload: z.record(z.string(), z.any()).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type CreateEntryInput = z.infer<typeof CreateEntrySchema>;

/**
 * Quick Increment for Counter Trackers
 */
export const QuickCounterLogSchema = z.object({
  trackerId: z.string().min(1),
  amount: z.number().default(1),
  localDate: LocalDateSchema.optional(),
  notes: z.string().trim().max(300).optional().nullable(),
});

export type QuickCounterLogInput = z.infer<typeof QuickCounterLogSchema>;

/**
 * Quick Duration Session Logging
 */
export const QuickDurationLogSchema = z.object({
  trackerId: z.string().min(1),
  durationSeconds: z.number().int().min(1, "المدة يجب أن تكون ثانية واحدة على الأقل"),
  localDate: LocalDateSchema.optional(),
  subject: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type QuickDurationLogInput = z.infer<typeof QuickDurationLogSchema>;

/**
 * Quick Checklist Item Toggle
 */
export const QuickChecklistToggleSchema = z.object({
  trackerId: z.string().min(1),
  itemId: z.string().min(1, "معرف البند مطلوب"),
  localDate: LocalDateSchema.optional(),
});

export type QuickChecklistToggleInput = z.infer<typeof QuickChecklistToggleSchema>;

/**
 * Quick Avoidance Day Logging
 */
export const QuickAvoidanceLogSchema = z.object({
  trackerId: z.string().min(1),
  isClean: z.boolean(),
  localDate: LocalDateSchema.optional(),
  urgeRating: z.number().int().min(1).max(10).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type QuickAvoidanceLogInput = z.infer<typeof QuickAvoidanceLogSchema>;

/**
 * Time Range Validation (ensures valid timestamps and end >= start)
 */
export const TimeRangeLogSchema = z
  .object({
    trackerId: z.string().min(1),
    timeRangeStart: z.union([z.string().datetime(), z.date()]),
    timeRangeEnd: z.union([z.string().datetime(), z.date()]),
    localDate: LocalDateSchema.optional(),
    notes: z.string().trim().max(500).optional().nullable(),
    entryPayload: z.record(z.string(), z.any()).optional().nullable(),
  })
  .refine(
    (data) => {
      const start = new Date(data.timeRangeStart).getTime();
      const end = new Date(data.timeRangeEnd).getTime();
      return end > start;
    },
    {
      message: "وقت النهاية يجب أن يكون بعد وقت البداية",
      path: ["timeRangeEnd"],
    }
  );

export type TimeRangeLogInput = z.infer<typeof TimeRangeLogSchema>;

/**
 * Update Existing Tracker Entry
 */
export const UpdateEntrySchema = z.object({
  id: z.string().min(1, "معرف السجل مطلوب"),
  valueBoolean: z.boolean().optional().nullable(),
  valueNumeric: z.number().optional().nullable(),
  valueDuration: z.number().int().min(0).optional().nullable(),
  timeRangeStart: z.union([z.string().datetime(), z.date()]).optional().nullable(),
  timeRangeEnd: z.union([z.string().datetime(), z.date()]).optional().nullable(),
  entryPayload: z.record(z.string(), z.any()).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type UpdateEntryInput = z.infer<typeof UpdateEntrySchema>;

