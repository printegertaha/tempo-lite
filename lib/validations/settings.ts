import { z } from "zod";

/**
 * Valid color tokens aligned with Athar design tokens
 */
export const THEME_ACCENTS = ["violet", "emerald", "amber", "cyan", "rose", "blue", "indigo"] as const;
export const SALUTATION_VALUES = ["بشمهندس", "بشمهندسة"] as const;
export const RELIGION_VALUES = ["muslim", "christian", "atheist"] as const;

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
  countryCode: "EG",
  country: "جمهورية مصر العربية",
  governorate: "القاهرة",
  city: "",
  timezoneAuto: true,
  currency: "EGP",
  currencyAuto: true,
  prayerTrackingEnabled: true,
  prayerPreferenceConfigured: false,
  prayerCalc: "الهيئة المصرية العامة للمساحة",
  asrMethod: "standard" as const,
  tagline: "",
  role: "",
  timeFormat: "12h" as const,
};

/**
 * Technical safe defaults for newly initialized user profiles
 */
export const DEFAULT_TECHNICAL_SETTINGS = {
  timezone: "Africa/Cairo",
  countryCode: "EG",
  governorate: "القاهرة",
  city: "",
  currency: "EGP",
  currencyAuto: true,
  prayerTrackingEnabled: true,
  language: "ar",
  weekStartDay: 6, // السبت
  themeAccent: "violet",
  dashboardConfig: DEFAULT_DASHBOARD_CONFIG,
} as const;

/**
 * Zod schema for updating user technical and interface preferences
 */
export const UserProfileUpdateSchema = z.object({
  name: z.string().trim().min(1, "يرجى إدخال الاسم المعروض").max(100).optional(),
  image: z
    .string()
    .max(750_000, "حجم الصورة يتجاوز الحد المسموح")
    .nullable()
    .optional(),
});

export const UserSettingsUpdateSchema = z.object({
  timezone: z
    .string()
    .min(1, "المنطقة الزمنية مطلوبة")
    .max(100)
    .optional(),
  countryCode: z.string().max(10).nullable().optional(),
  governorate: z.string().max(120).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  currency: z.string().max(10).nullable().optional(),
  currencyAuto: z.boolean().optional(),
  prayerTrackingEnabled: z.boolean().optional(),
  salutation: z.enum(SALUTATION_VALUES).nullable().optional(),
  religion: z.enum(RELIGION_VALUES).nullable().optional(),
  onboardingCompleted: z.boolean().optional(),
  onboardingStep: z.number().int().min(1).max(3).optional(),
  onboardingCompletedAt: z.string().nullable().optional(),
  language: z.enum(["ar", "en"]).optional(),
  weekStartDay: z.number().int().min(0).max(6).optional(),
  themeAccent: z.enum(THEME_ACCENTS).optional(),
  dashboardConfig: z
    .object({
      density: z.enum(["comfortable", "compact"]).optional(),
      soundEffects: z.boolean().optional(),
      dailyQuote: z.boolean().optional(),
      countryCode: z.string().max(10).optional(),
      country: z.string().max(100).optional(),
      governorate: z.string().max(120).optional(),
      city: z.string().max(120).optional(),
      timezoneAuto: z.boolean().optional(),
      currency: z.string().max(10).optional(),
      currencyAuto: z.boolean().optional(),
      monthlySalary: z.number().min(0).max(100_000_000).optional(),
      prayerTrackingEnabled: z.boolean().optional(),
      prayerPreferenceConfigured: z.boolean().optional(),
      preferencesUpdatedAt: z.string().max(60).optional(),
      prayerCalc: z.string().max(150).optional(),
      asrMethod: z.enum(["standard", "hanafi"]).optional(),
      tagline: z.string().max(250).optional(),
      role: z.string().max(150).optional(),
      timeFormat: z.enum(["12h", "24h"]).optional(),
    })
    .catchall(z.any())
    .optional(),
});

export type UserSettingsUpdateInput = z.infer<typeof UserSettingsUpdateSchema>;
