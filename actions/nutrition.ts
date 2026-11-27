"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-session";
import { recordDeletionTombstone } from "@/lib/sync/tombstone";

async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error("غير مصرح: يجب تسجيل الدخول للوصول لنظام التغذية");
  }
  return session.user.id;
}

export async function getMealEntries(date?: string) {
  try {
    const userId = await requireAuth();

    const where: any = { userId };
    if (date) {
      where.date = date;
    }

    const meals = await prisma.mealEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return { success: true, data: meals };
  } catch (error: any) {
    return { success: false, error: error.message || "فشل جلب سجلات التغذية" };
  }
}

export async function saveMealEntry(data: {
  id?: string;
  date: string;
  time?: string | null;
  mealType: string;
  title: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  items?: any[];
  dailyTargetsSnapshot?: any;
  notes?: string;
}) {
  try {
    const userId = await requireAuth();

    let meal;
    if (data.id) {
      const existing = await prisma.mealEntry.findUnique({
        where: { id: data.id },
        select: { id: true, userId: true },
      });
      if (existing && existing.userId !== userId) {
        return { success: false, error: "غير مصرح بتعديل هذه الوجبة" };
      }
      meal = existing
        ? await prisma.mealEntry.update({
            where: { id: data.id },
            data: {
              date: data.date,
              time: data.time ?? null,
              mealType: data.mealType,
              title: data.title,
              calories: Math.round(Number(data.calories || 0)),
              protein: Number(data.protein || 0),
              carbs: Number(data.carbs || 0),
              fat: Number(data.fat || 0),
              ...(Array.isArray(data.items) ? { items: data.items } : {}),
              ...(data.dailyTargetsSnapshot !== undefined
                ? { dailyTargetsSnapshot: data.dailyTargetsSnapshot }
                : {}),
              notes: data.notes || null,
            },
          })
        : await prisma.mealEntry.create({
            data: {
              id: data.id,
              userId,
              date: data.date,
              time: data.time ?? null,
              mealType: data.mealType,
              title: data.title,
              calories: Math.round(Number(data.calories || 0)),
              protein: Number(data.protein || 0),
              carbs: Number(data.carbs || 0),
              fat: Number(data.fat || 0),
              items: Array.isArray(data.items) ? data.items : [],
              dailyTargetsSnapshot: data.dailyTargetsSnapshot ?? undefined,
              notes: data.notes || null,
            },
          });
    } else {
      meal = await prisma.mealEntry.create({
        data: {
          userId,
          date: data.date,
          time: data.time ?? null,
          mealType: data.mealType,
          title: data.title,
          calories: Math.round(Number(data.calories || 0)),
          protein: Number(data.protein || 0),
          carbs: Number(data.carbs || 0),
          fat: Number(data.fat || 0),
          items: Array.isArray(data.items) ? data.items : [],
          dailyTargetsSnapshot: data.dailyTargetsSnapshot ?? undefined,
          notes: data.notes || null,
        },
      });
    }

    revalidatePath("/nutrition");
    return { success: true, data: meal };
  } catch (error: any) {
    return { success: false, error: error.message || "فشل حفظ الوجبة" };
  }
}

export async function deleteMealEntry(id: string) {
  try {
    const userId = await requireAuth();

    await prisma.mealEntry.deleteMany({
      where: { id, userId },
    });
    await recordDeletionTombstone(userId, "meal_entry", id);

    revalidatePath("/nutrition");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "فشل حذف الوجبة" };
  }
}

export async function getWaterEntries(date?: string) {
  try {
    const userId = await requireAuth();
    const where: any = { userId };
    if (date) where.date = date;

    const entries = await prisma.waterEntry.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: 300,
    });

    return { success: true, data: entries };
  } catch (error: any) {
    return { success: false, error: error.message || "فشل جلب سجلات الماء" };
  }
}

export async function saveWaterEntry(data: {
  id?: string;
  date: string;
  amountMl: number;
  occurredAt?: string;
  source?: string;
  notes?: string | null;
}) {
  try {
    const userId = await requireAuth();
    const amountMl = Math.max(1, Math.round(Number(data.amountMl || 0)));

    let entry;
    if (data.id) {
      const existing = await prisma.waterEntry.findUnique({
        where: { id: data.id },
        select: { id: true, userId: true },
      });
      if (existing && existing.userId !== userId) {
        return { success: false, error: "غير مصرح بتعديل سجل الماء" };
      }
      entry = existing
        ? await prisma.waterEntry.update({
            where: { id: data.id },
            data: {
              date: data.date,
              amountMl,
              ...(data.occurredAt ? { occurredAt: new Date(data.occurredAt) } : {}),
              ...(data.source ? { source: data.source } : {}),
              notes: data.notes ?? null,
            },
          })
        : await prisma.waterEntry.create({
            data: {
              id: data.id,
              userId,
              date: data.date,
              amountMl,
              occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
              source: data.source || "nutrition",
              notes: data.notes ?? null,
            },
          });
    } else {
      entry = await prisma.waterEntry.create({
        data: {
          userId,
          date: data.date,
          amountMl,
          occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
          source: data.source || "nutrition",
          notes: data.notes ?? null,
        },
      });
    }

    revalidatePath("/nutrition");
    revalidatePath("/habits");
    return { success: true, data: entry };
  } catch (error: any) {
    return { success: false, error: error.message || "فشل حفظ سجل الماء" };
  }
}

export async function deleteWaterEntry(id: string) {
  try {
    const userId = await requireAuth();

    await prisma.waterEntry.deleteMany({
      where: { id, userId },
    });
    await recordDeletionTombstone(userId, "water_entry", id);

    revalidatePath("/nutrition");
    revalidatePath("/habits");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "فشل حذف سجل الماء" };
  }
}
