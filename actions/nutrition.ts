"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-session";

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
      take: 100,
    });

    return { success: true, data: meals };
  } catch (error: any) {
    return { success: false, error: error.message || "فشل جلب سجلات التغذية" };
  }
}

export async function saveMealEntry(data: {
  id?: string;
  date: string;
  mealType: string;
  title: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  notes?: string;
}) {
  try {
    const userId = await requireAuth();

    let meal;
    if (data.id) {
      meal = await prisma.mealEntry.update({
        where: { id: data.id, userId },
        data: {
          date: data.date,
          mealType: data.mealType,
          title: data.title,
          calories: data.calories || 0,
          protein: data.protein || 0,
          carbs: data.carbs || 0,
          fat: data.fat || 0,
          notes: data.notes || null,
        },
      });
    } else {
      meal = await prisma.mealEntry.create({
        data: {
          userId,
          date: data.date,
          mealType: data.mealType,
          title: data.title,
          calories: data.calories || 0,
          protein: data.protein || 0,
          carbs: data.carbs || 0,
          fat: data.fat || 0,
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

    revalidatePath("/nutrition");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "فشل حذف الوجبة" };
  }
}

