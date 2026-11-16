import { z } from "zod";

export const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type PrayerKey = (typeof PRAYER_KEYS)[number];

export const PrayerKeyEnum = z.enum(["fajr", "dhuhr", "asr", "maghrib", "isha"]);

export const TogglePrayerSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ غير صالح (YYYY-MM-DD)"),
  prayerKey: PrayerKeyEnum,
  isCompleted: z.boolean(),
  location: z.enum(["mosque", "home", "work", "other"]).optional().nullable(),
  withSunnah: z.boolean().default(false),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type TogglePrayerInput = z.infer<typeof TogglePrayerSchema>;

export interface PrayerItem {
  id: string;
  prayerKey: PrayerKey;
  nameArabic: string;
  date: string;
  isCompleted: boolean;
  completedAt: string | null;
  location: string | null;
  withSunnah: boolean;
  notes: string | null;
}

export const PRAYER_NAMES_ARABIC: Record<PrayerKey, string> = {
  fajr: "الفجر",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

