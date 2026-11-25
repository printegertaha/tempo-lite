"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-session";
import { recordDeletionTombstone } from "@/lib/sync/tombstone";

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
  currency?: string;
  type?: "expense" | "income";
  category: string;
  notes?: string;
}) {
  try {
    const userId = await requireAuth();

    let resolvedCurrency = data.currency ? String(data.currency).toUpperCase().trim() : undefined;
    if (!resolvedCurrency && !data.id) {
      const settings = await prisma.userSettings.findUnique({
        where: { userId },
        select: { currency: true, countryCode: true, timezone: true },
      });
      if (settings?.currency) {
        resolvedCurrency = settings.currency;
      } else {
        const { getCountryByCodeOrName, getCountryFromTimezone } = await import("@/lib/localization");
        const country =
          getCountryByCodeOrName(settings?.countryCode) ||
          getCountryFromTimezone(settings?.timezone);
        resolvedCurrency = country?.defaultCurrency || "EGP";
      }
    }

    const txType = data.type === "income" ? "income" : "expense";

    let expense;
    if (data.id) {
      const existing = await prisma.expenseEntry.findUnique({
        where: { id: data.id },
        select: { id: true, userId: true, currency: true, type: true },
      });
      if (existing && existing.userId !== userId) {
        return { success: false, error: "غير مصرح بتعديل هذا المصروف" };
      }
      expense = existing
        ? await prisma.expenseEntry.update({
            where: { id: data.id },
            data: {
              date: data.date,
              title: data.title,
              amount: data.amount,
              ...(resolvedCurrency ? { currency: resolvedCurrency } : {}),
              ...(data.type ? { type: txType } : {}),
              category: data.category,
              notes: data.notes || null,
            },
          })
        : await prisma.expenseEntry.create({
            data: {
              id: data.id,
              userId,
              date: data.date,
              title: data.title,
              amount: data.amount,
              currency: resolvedCurrency || "EGP",
              type: txType,
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
          currency: resolvedCurrency || "EGP",
          type: txType,
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
    await recordDeletionTombstone(userId, "expense_entry", id);

    revalidatePath("/expenses");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "فشل حذف المصروف" };
  }
}

