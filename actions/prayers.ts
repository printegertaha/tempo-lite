"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-session";
import { getLocalDateString } from "@/lib/dates";
import {
  PRAYER_KEYS,
  PrayerKey,
  PrayerItem,
  PRAYER_NAMES_ARABIC,
  TogglePrayerSchema,
  TogglePrayerInput,
} from "@/lib/validations/prayer";

/**
 * Retrieve the 5 prayer records for a specific date and active user.
 */
export async function getDailyPrayers(dateStr?: string) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return { success: false, error: "غير مصرح: يرجى تسجيل الدخول", data: [] };
    }
    const userId = session.user.id;
    const targetDate = dateStr || getLocalDateString();

    const existingRecords = await prisma.prayerRecord.findMany({
      where: {
        userId,
        date: targetDate,
      },
    });

    const recordsMap = new Map(existingRecords.map((r) => [r.prayerKey, r]));

    const fullPrayers: PrayerItem[] = PRAYER_KEYS.map((key) => {
      const rec = recordsMap.get(key);
      return {
        id: rec?.id || `${targetDate}_${key}`,
        prayerKey: key,
        nameArabic: PRAYER_NAMES_ARABIC[key],
        date: targetDate,
        isCompleted: Boolean(rec?.isCompleted),
        completedAt: rec?.completedAt ? rec.completedAt.toISOString() : null,
        location: rec?.location || null,
        withSunnah: Boolean(rec?.withSunnah),
        notes: rec?.notes || null,
      };
    });

    const completedCount = fullPrayers.filter((p) => p.isCompleted).length;

    return {
      success: true,
      data: fullPrayers,
      completedCount,
      totalCount: 5,
      date: targetDate,
    };
  } catch (error: any) {
    console.error("Error in getDailyPrayers:", error);
    return {
      success: false,
      error: error?.message || "فشل استرجاع سجل الصلوات",
      data: [],
      completedCount: 0,
      totalCount: 5,
    };
  }
}

/**
 * Toggle or update a specific prayer record idempotently with upsert.
 */
export async function togglePrayer(input: TogglePrayerInput) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return { success: false, error: "غير مصرح: يرجى تسجيل الدخول" };
    }
    const userId = session.user.id;
    const validated = TogglePrayerSchema.parse(input);

    const record = await prisma.prayerRecord.upsert({
      where: {
        userId_date_prayerKey: {
          userId,
          date: validated.date,
          prayerKey: validated.prayerKey,
        },
      },
      create: {
        userId,
        date: validated.date,
        prayerKey: validated.prayerKey,
        isCompleted: validated.isCompleted,
        completedAt: validated.isCompleted ? new Date() : null,
        location: validated.location || null,
        withSunnah: validated.withSunnah,
        notes: validated.notes || null,
      },
      update: {
        isCompleted: validated.isCompleted,
        completedAt: validated.isCompleted ? new Date() : null,
        location: validated.location !== undefined ? validated.location : undefined,
        withSunnah: validated.withSunnah !== undefined ? validated.withSunnah : undefined,
        notes: validated.notes !== undefined ? validated.notes : undefined,
      },
    });

    revalidatePath("/");
    revalidatePath("/calendar");
    revalidatePath("/journal");

    return {
      success: true,
      data: {
        id: record.id,
        prayerKey: record.prayerKey as PrayerKey,
        nameArabic: PRAYER_NAMES_ARABIC[record.prayerKey as PrayerKey],
        date: record.date,
        isCompleted: record.isCompleted,
        completedAt: record.completedAt ? record.completedAt.toISOString() : null,
        location: record.location,
        withSunnah: record.withSunnah,
        notes: record.notes,
      },
    };
  } catch (error: any) {
    console.error("Error toggling prayer:", error);
    return {
      success: false,
      error: error?.message || "فشل تحديث حالة الصلاة",
    };
  }
}
