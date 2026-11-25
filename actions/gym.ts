"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-session";

async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error("غير مصرح: يجب تسجيل الدخول للوصول لنظام التمارين");
  }
  return session.user.id;
}

export async function getGymWorkouts(date?: string) {
  try {
    const userId = await requireAuth();

    const where: any = { userId };
    if (date) {
      where.date = date;
    }

    const workouts = await prisma.gymWorkout.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return { success: true, data: workouts };
  } catch (error: any) {
    return { success: false, error: error.message || "فشل جلب بيانات التمارين" };
  }
}

export async function saveGymWorkout(data: {
  id?: string;
  date: string;
  title: string;
  muscleGroup?: string;
  durationMinutes?: number;
  exercises?: any;
  notes?: string;
}) {
  try {
    const userId = await requireAuth();

    let workout;
    if (data.id) {
      const existing = await prisma.gymWorkout.findUnique({
        where: { id: data.id },
        select: { id: true, userId: true },
      });
      if (existing && existing.userId !== userId) {
        return { success: false, error: "غير مصرح بتعديل هذا التمرين" };
      }
      workout = existing
        ? await prisma.gymWorkout.update({
            where: { id: data.id },
            data: {
              date: data.date,
              title: data.title,
              muscleGroup: data.muscleGroup || null,
              durationMinutes: data.durationMinutes || 60,
              exercises: data.exercises || [],
              notes: data.notes || null,
            },
          })
        : await prisma.gymWorkout.create({
            data: {
              id: data.id,
              userId,
              date: data.date,
              title: data.title,
              muscleGroup: data.muscleGroup || null,
              durationMinutes: data.durationMinutes || 60,
              exercises: data.exercises || [],
              notes: data.notes || null,
            },
          });
    } else {
      workout = await prisma.gymWorkout.create({
        data: {
          userId,
          date: data.date,
          title: data.title,
          muscleGroup: data.muscleGroup || null,
          durationMinutes: data.durationMinutes || 60,
          exercises: data.exercises || [],
          notes: data.notes || null,
        },
      });
    }

    revalidatePath("/gym");
    return { success: true, data: workout };
  } catch (error: any) {
    return { success: false, error: error.message || "فشل حفظ التمرين" };
  }
}

export async function deleteGymWorkout(id: string) {
  try {
    const userId = await requireAuth();

    await prisma.gymWorkout.deleteMany({
      where: { id, userId },
    });

    revalidatePath("/gym");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "فشل حذف التمرين" };
  }
}

