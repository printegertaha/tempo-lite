"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-session";

async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error("غير مصرح: يجب تسجيل الدخول للوصول لنظام المصروفات");
  }
  return session.user.id;
}

export async function getExpenseEntries(date?: string) {
  try {
    const userId = await requireAuth();

    const where: any = { userId };
    if (date) {
      where.date = date;
    }

    const expenses = await prisma.expenseEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return { success: true, data: expenses };
  } catch (error: any) {
    return { success: false, error: error.message || "فشل جلب سجلات المصروفات" };
  }
}

export async function saveExpenseEntry(data: {
  id?: string;
  date: string;
  title: string;
  amount: number;
  category: string;
  notes?: string;
}) {
  try {
    const userId = await requireAuth();

    let expense;
    if (data.id) {
      expense = await prisma.expenseEntry.update({
        where: { id: data.id, userId },
        data: {
          date: data.date,
          title: data.title,
          amount: data.amount,
          category: data.category,
          notes: data.notes || null,
        },
      });
    } else {
      expense = await prisma.expenseEntry.create({
        data: {
          userId,
          date: data.date,
          title: data.title,
          amount: data.amount,
          category: data.category,
          notes: data.notes || null,
        },
      });
    }

    revalidatePath("/expenses");
    return { success: true, data: expense };
  } catch (error: any) {
    return { success: false, error: error.message || "فشل حفظ المصروف" };
  }
}

export async function deleteExpenseEntry(id: string) {
  try {
    const userId = await requireAuth();

    await prisma.expenseEntry.deleteMany({
      where: { id, userId },
    });

    revalidatePath("/expenses");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "فشل حذف المصروف" };
  }
}

