"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-session";
import {
  UserSettingsUpdateSchema,
  UserProfileUpdateSchema,
  DEFAULT_TECHNICAL_SETTINGS,
  type UserSettingsUpdateInput,
} from "@/lib/validations/settings";

export type ActionResponse<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Fetch or auto-initialize technical settings for the authenticated user.
 * Strictly guarantees that no default habits, goals, or tasks are created.
 */
export async function getUserSettings(): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();

    const [foundSettings, userRecord] = await Promise.all([
      prisma.userSettings.findUnique({ where: { userId } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, image: true },
      }),
    ]);

    let settings = foundSettings;

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          timezone: DEFAULT_TECHNICAL_SETTINGS.timezone,
          countryCode: DEFAULT_TECHNICAL_SETTINGS.countryCode,
          governorate: DEFAULT_TECHNICAL_SETTINGS.governorate,
          city: DEFAULT_TECHNICAL_SETTINGS.city,
          currency: DEFAULT_TECHNICAL_SETTINGS.currency,
          currencyAuto: DEFAULT_TECHNICAL_SETTINGS.currencyAuto,
          prayerTrackingEnabled: false,
          language: DEFAULT_TECHNICAL_SETTINGS.language,
          weekStartDay: DEFAULT_TECHNICAL_SETTINGS.weekStartDay,
          themeAccent: DEFAULT_TECHNICAL_SETTINGS.themeAccent,
          dashboardConfig: {
            ...DEFAULT_TECHNICAL_SETTINGS.dashboardConfig,
            prayerTrackingEnabled: false,
            prayerPreferenceConfigured: false,
          },
        },
      });
    }

    const safeDashboardConfig =
      settings.dashboardConfig && typeof settings.dashboardConfig === "object"
        ? { ...(settings.dashboardConfig as Record<string, any>) }
        : {};
    delete safeDashboardConfig.avatarData;

    return {
      success: true,
      data: {
        ...settings,
        dashboardConfig: safeDashboardConfig,
        userProfile: userRecord || null,
      },
    };
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

    const {
      timezone,
      countryCode,
      governorate,
      city,
      currency,
      currencyAuto,
      prayerTrackingEnabled,
      salutation,
      religion,
      onboardingCompleted,
      onboardingStep,
      onboardingCompletedAt,
      language,
      weekStartDay,
      themeAccent,
      dashboardConfig,
    } = validation.data;

    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { dashboardConfig: true, onboardingCompletedAt: true },
    });
    const prevConfig =
      existingSettings?.dashboardConfig && typeof existingSettings.dashboardConfig === "object"
        ? (existingSettings.dashboardConfig as Record<string, any>)
        : {};
    const mergedDashboardConfig = dashboardConfig
      ? { ...prevConfig, ...dashboardConfig }
      : prevConfig;
    // Strip transient large fields before saving settings JSON unless explicitly managed by updateUserProfile
    if (prevConfig.avatarData) {
      mergedDashboardConfig.avatarData = prevConfig.avatarData;
    }
    delete mergedDashboardConfig.profileImage;
    delete mergedDashboardConfig.image;

    if (countryCode !== undefined) mergedDashboardConfig.countryCode = countryCode;
    if (governorate !== undefined) mergedDashboardConfig.governorate = governorate;
    if (city !== undefined) mergedDashboardConfig.city = city;
    if (currency !== undefined) mergedDashboardConfig.currency = currency;
    if (currencyAuto !== undefined) mergedDashboardConfig.currencyAuto = currencyAuto;
    if (prayerTrackingEnabled !== undefined) {
      mergedDashboardConfig.prayerTrackingEnabled = prayerTrackingEnabled;
    }
    if (salutation !== undefined) mergedDashboardConfig.salutation = salutation;
    if (religion !== undefined) mergedDashboardConfig.religion = religion;
    if (onboardingCompleted !== undefined) {
      mergedDashboardConfig.onboardingCompleted = onboardingCompleted;
    }
    if (onboardingStep !== undefined) mergedDashboardConfig.onboardingStep = onboardingStep;

    const resolvedCompletedAt =
      onboardingCompletedAt !== undefined
        ? onboardingCompletedAt
          ? new Date(onboardingCompletedAt)
          : null
        : onboardingCompleted === true && !existingSettings?.onboardingCompletedAt
          ? new Date()
          : undefined;

    const updated = await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        timezone: timezone || DEFAULT_TECHNICAL_SETTINGS.timezone,
        countryCode: countryCode ?? DEFAULT_TECHNICAL_SETTINGS.countryCode,
        governorate: governorate ?? DEFAULT_TECHNICAL_SETTINGS.governorate,
        city: city ?? null,
        currency: currency ? currency.toUpperCase() : DEFAULT_TECHNICAL_SETTINGS.currency,
        currencyAuto: currencyAuto ?? true,
        prayerTrackingEnabled:
          prayerTrackingEnabled ?? (religion === "muslim" ? true : false),
        salutation: salutation ?? null,
        religion: religion ?? null,
        onboardingCompleted: onboardingCompleted ?? false,
        onboardingStep: onboardingStep ?? 1,
        onboardingCompletedAt:
          resolvedCompletedAt ?? (onboardingCompleted ? new Date() : null),
        language: language || DEFAULT_TECHNICAL_SETTINGS.language,
        weekStartDay: weekStartDay ?? DEFAULT_TECHNICAL_SETTINGS.weekStartDay,
        themeAccent: themeAccent || DEFAULT_TECHNICAL_SETTINGS.themeAccent,
        dashboardConfig: mergedDashboardConfig,
      },
      update: {
        ...(timezone !== undefined ? { timezone } : {}),
        ...(countryCode !== undefined ? { countryCode } : {}),
        ...(governorate !== undefined ? { governorate } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(currency !== undefined ? { currency: currency ? currency.toUpperCase() : null } : {}),
        ...(currencyAuto !== undefined ? { currencyAuto } : {}),
        ...(prayerTrackingEnabled !== undefined ? { prayerTrackingEnabled } : {}),
        ...(salutation !== undefined ? { salutation } : {}),
        ...(religion !== undefined ? { religion } : {}),
        ...(onboardingCompleted !== undefined ? { onboardingCompleted } : {}),
        ...(onboardingStep !== undefined ? { onboardingStep } : {}),
        ...(resolvedCompletedAt !== undefined
          ? { onboardingCompletedAt: resolvedCompletedAt }
          : {}),
        ...(language !== undefined ? { language } : {}),
        ...(weekStartDay !== undefined ? { weekStartDay } : {}),
        ...(themeAccent !== undefined ? { themeAccent } : {}),
        dashboardConfig: mergedDashboardConfig,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/expenses");
    revalidatePath("/journal");
    revalidatePath("/calendar");
    revalidatePath("/quran");
    revalidatePath("/welcome");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (err: any) {
    console.error("[updateUserSettings Error]:", err);
    return { success: false, error: "تعذر حفظ الإعدادات، يرجى المحاولة مرة أخرى" };
  }
}

/**
 * Update authenticated user's profile name and avatar image in the `user` table.
 */
export async function updateUserProfile(
  rawInput: unknown
): Promise<ActionResponse<{ id: string; name: string; email: string; image: string | null }>> {
  try {
    const userId = await requireUserId();
    const validation = UserProfileUpdateSchema.safeParse(rawInput);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "بيانات الملف الشخصي غير صالحة",
      };
    }

    const { name, image } = validation.data;
    let storedImageUrl: string | null | undefined =
      image === undefined ? undefined : image || null;

    if (typeof image === "string" && image.length > 0) {
      const isHttp = /^https?:\/\//i.test(image) || image.startsWith("/api/avatar/");
      const isSafeDataImage = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(
        image
      );
      if (!isHttp && !isSafeDataImage) {
        return { success: false, error: "صيغة رابط أو ملف الصورة غير مدعومة" };
      }

      // Store raw base64 image in userSettings.dashboardConfig.avatarData and put lightweight URL in user.image
      // so Better Auth's session cookie never bloats or splits into chunks!
      if (isSafeDataImage) {
        const existingSettings = await prisma.userSettings.findUnique({
          where: { userId },
          select: { dashboardConfig: true },
        });
        const prevCfg =
          existingSettings?.dashboardConfig &&
          typeof existingSettings.dashboardConfig === "object"
            ? (existingSettings.dashboardConfig as Record<string, any>)
            : {};
        await prisma.userSettings.upsert({
          where: { userId },
          create: {
            userId,
            dashboardConfig: { avatarData: image },
          },
          update: {
            dashboardConfig: { ...prevCfg, avatarData: image },
          },
        });
        storedImageUrl = `/api/avatar/${userId}?v=${Date.now()}`;
      }
    } else if (image === null || image === "") {
      const existingSettings = await prisma.userSettings.findUnique({
        where: { userId },
        select: { dashboardConfig: true },
      });
      if (
        existingSettings?.dashboardConfig &&
        typeof existingSettings.dashboardConfig === "object"
      ) {
        const nextCfg = { ...(existingSettings.dashboardConfig as Record<string, any>) };
        delete nextCfg.avatarData;
        await prisma.userSettings.update({
          where: { userId },
          data: { dashboardConfig: nextCfg },
        });
      }
      storedImageUrl = null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(storedImageUrl !== undefined ? { image: storedImageUrl } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    revalidatePath("/");
    revalidatePath("/settings");

    return { success: true, data: updatedUser };
  } catch (err: any) {
    console.error("[updateUserProfile Error]:", err);
    return { success: false, error: "تعذر تحديث الملف الشخصي، يرجى المحاولة مرة أخرى" };
  }
}
