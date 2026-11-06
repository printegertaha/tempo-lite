import { z } from "zod";

/**
 * Valid color tokens aligned with Athar design tokens
 */
export const THEME_ACCENTS = ["violet", "emerald", "amber", "cyan", "rose", "blue", "indigo"] as const;

/**
 * Common Arabic & international week start days
 * 6 = Saturday (السبت - Default in Arab world)
 * 0 = Sunday (الأحد)
 * 1 = Monday (الاثنين - ISO standard)
 */
export const WEEK_START_DAYS = [0, 1, 6] as const;

export const DEFAULT_DASHBOARD_CONFIG = {
  density: "comfortable" as const,
  soundEffects: true,
  dailyQuote: true,
  country: "المملكة العربية السعودية",
  city: "الرياض",
  prayerCalc: "أم القرى - مكة المكرمة",
  asrMethod: "standard" as const,
  tagline: "",
  role: "",
  timeFormat: "12h" as const,
};

/**
 * Technical safe defaults for newly initialized user profiles
 */
export const DEFAULT_TECHNICAL_SETTINGS = {
  timezone: "Asia/Riyadh",
  language: "ar",
  weekStartDay: 6, // السبت
  themeAccent: "violet",
  dashboardConfig: DEFAULT_DASHBOARD_CONFIG,
} as const;

/**
 * Zod schema for updating user technical and interface preferences
 */
export const UserSettingsUpdateSchema = z.object({
  timezone: z
    .string()
    .min(1, "المنطقة الزمنية مطلوبة")
    .max(100)
    .default("Asia/Riyadh"),
  language: z.enum(["ar", "en"]).default("ar"),
  weekStartDay: z.number().int().min(0).max(6).default(6),
  themeAccent: z.enum(THEME_ACCENTS).default("violet"),
  dashboardConfig: z
    .object({
      density: z.enum(["comfortable", "compact"]).default("comfortable"),
      soundEffects: z.boolean().default(true),
      dailyQuote: z.boolean().default(true),
      country: z.string().max(100).default("المملكة العربية السعودية"),
      city: z.string().max(100).default("الرياض"),
      prayerCalc: z.string().max(150).default("أم القرى - مكة المكرمة"),
      asrMethod: z.enum(["standard", "hanafi"]).default("standard"),
      tagline: z.string().max(250).optional().default(""),
      role: z.string().max(150).optional().default(""),
      timeFormat: z.enum(["12h", "24h"]).default("12h"),
    })
    .default(DEFAULT_DASHBOARD_CONFIG),
});

export type UserSettingsUpdateInput = z.infer<typeof UserSettingsUpdateSchema>;
