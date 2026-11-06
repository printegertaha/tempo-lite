import { z } from "zod";
import { LocalDateSchema } from "./entry";

export const MoodEnum = z.enum(["great", "good", "neutral", "tired", "stressed"]);
export type MoodType = z.infer<typeof MoodEnum>;

/**
 * Daily Note / Reflection Save Schema
 */
export const DailyNoteSaveSchema = z.object({
  localDate: LocalDateSchema,
  title: z.string().trim().max(150, "العنوان طويل جداً").optional().nullable(),
  content: z.string().trim().min(1, "محتوى اليومية مطلوب").max(10000, "المحتوى طويل جداً"),
  mood: MoodEnum.optional().nullable(),
  tags: z.array(z.string().trim().max(40)).default([]),
});

export type DailyNoteSaveInput = z.infer<typeof DailyNoteSaveSchema>;

/**
 * Daily Overview Query Schema
 */
export const DailyOverviewQuerySchema = z.object({
  localDate: LocalDateSchema,
});

export type DailyOverviewQuery = z.infer<typeof DailyOverviewQuerySchema>;

/**
 * Calendar Month Query Schema
 */
export const CalendarMonthQuerySchema = z.object({
  year: z.number().int().min(2020).max(2050),
  month: z.number().int().min(1).max(12),
});

export type CalendarMonthQuery = z.infer<typeof CalendarMonthQuerySchema>;

