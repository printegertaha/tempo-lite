"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-session";
import {
  UserSettingsUpdateSchema,
  DEFAULT_TECHNICAL_SETTINGS,
  type UserSettingsUpdateInput,
} from "@/lib/validations/settings";

export type ActionResponse<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export { DEFAULT_TECHNICAL_SETTINGS };

/**
 * Fetch or auto-initialize technical settings for the authenticated user.
 * Strictly guarantees that no default habits, goals, or tasks are created.
 */
export async function getUserSettings(): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();

    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          timezone: DEFAULT_TECHNICAL_SETTINGS.timezone,
          language: DEFAULT_TECHNICAL_SETTINGS.language,
          weekStartDay: DEFAULT_TECHNICAL_SETTINGS.weekStartDay,
          themeAccent: DEFAULT_TECHNICAL_SETTINGS.themeAccent,
          dashboardConfig: DEFAULT_TECHNICAL_SETTINGS.dashboardConfig,
        },
      });
    }

    return { success: true, data: settings };
  } catch (err: any) {
    if (err?.message?.includes("UNAUTHORIZED") || err?.digest?.includes("NEXT_REDIRECT")) {
      return { success: false, error: "يجب تسجيل الدخول أولاً للوصول إلى الإعدادات" };
    }
    console.error("[getUserSettings Error]:", err);
    return { success: false, error: "تعذر تحميل إعدادات الحساب" };
  }
}

/**
 * Update authenticated user settings and dashboard preferences.
 * All updates are strictly validated via Zod runtime schemas.
 */
export async function updateUserSettings(
  rawInput: unknown
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();

    const validation = UserSettingsUpdateSchema.safeParse(rawInput);
    if (!validation.success) {
      const fieldErrors: Record<string, string[]> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        fieldErrors[path] = fieldErrors[path] || [];
        fieldErrors[path].push(issue.message);
      });
      return {
        success: false,
        error: "بيانات الإعدادات غير صالحة",
        fieldErrors,
      };
    }

    const { timezone, language, weekStartDay, themeAccent, dashboardConfig } =
      validation.data;

    const updated = await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        timezone,
        language,
        weekStartDay,
        themeAccent,
        dashboardConfig,
      },
      update: {
        timezone,
        language,
        weekStartDay,
        themeAccent,
        dashboardConfig,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (err: any) {
    console.error("[updateUserSettings Error]:", err);
    return { success: false, error: "تعذر حفظ الإعدادات، يرجى المحاولة مرة أخرى" };
  }
}
