import { z } from "zod";

export const CreateAbstinenceTrackerSchema = z.object({
  name: z.string().trim().min(1, "اسم السلوك مطلوب").max(100),
  description: z.string().trim().max(500).optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ غير صالح (YYYY-MM-DD)"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "وقت غير صالح (HH:MM)"),
  targetDays: z.coerce.number().int().positive("الهدف يجب أن يكون عدداً موجباً").optional().nullable(),
  icon: z.string().default("ShieldCheck"),
  color: z.string().default("rose"),
  timezone: z.string().optional(),
});

export type CreateAbstinenceTrackerInput = z.infer<typeof CreateAbstinenceTrackerSchema>;

export const LogRelapseSchema = z.object({
  trackerId: z.string().min(1, "معرف الهدف مطلوب"),
  relapseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ الانتكاسة غير صالح"),
  relapseTime: z.string().regex(/^\d{2}:\d{2}$/, "وقت الانتكاسة غير صالح"),
  startNewSessionFromRelapse: z.boolean().default(true),
  newStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  newStartTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  relapseReason: z.string().trim().max(500).optional().nullable(),
  trigger: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  timezone: z.string().optional(),
});

export type LogRelapseInput = z.infer<typeof LogRelapseSchema>;

export const UpdateStartTimeSchema = z.object({
  trackerId: z.string().min(1, "معرف الهدف مطلوب"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ غير صالح"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "وقت غير صالح"),
  timezone: z.string().optional(),
});

export type UpdateStartTimeInput = z.infer<typeof UpdateStartTimeSchema>;

export const UpdateAbstinenceTrackerSchema = z.object({
  trackerId: z.string().min(1, "معرف الهدف مطلوب"),
  name: z.string().trim().min(1, "اسم السلوك مطلوب").max(100),
  description: z.string().trim().max(500).optional().nullable(),
  targetDays: z.coerce.number().int().positive().optional().nullable(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export type UpdateAbstinenceTrackerInput = z.infer<typeof UpdateAbstinenceTrackerSchema>;

