"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-session";
import {
  CreateLifeAreaSchema,
  UpdateLifeAreaSchema,
  ReorderLifeAreasSchema,
  slugify,
} from "@/lib/validations/life-area";

export type ActionResponse<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Retrieve all life areas belonging exclusively to the authenticated user.
 * Supports filtering active vs archived areas.
 */
export async function getLifeAreas(
  includeArchived = false
): Promise<ActionResponse<any[]>> {
  try {
    const userId = await requireUserId();

    const areas = await prisma.lifeArea.findMany({
      where: {
        userId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        _count: {
          select: {
            trackers: true,
            tasks: true,
          },
        },
      },
    });

    return { success: true, data: areas };
  } catch (err: any) {
    if (err?.message?.includes("UNAUTHORIZED") || err?.digest?.includes("NEXT_REDIRECT")) {
      return { success: false, error: "يجب تسجيل الدخول لاستعراض مجالات الحياة" };
    }
    console.error("[getLifeAreas Error]:", err);
    return { success: false, error: "تعذر استرجاع مجالات الحياة" };
  }
}

/**
 * Create a new user-scoped Life Area with custom icon, color, priority, and order.
 * A new account starts with 0 areas; users have complete freedom to define their own.
 */
export async function createLifeArea(
  rawInput: unknown
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();

    const validation = CreateLifeAreaSchema.safeParse(rawInput);
    if (!validation.success) {
      const fieldErrors: Record<string, string[]> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        fieldErrors[path] = fieldErrors[path] || [];
        fieldErrors[path].push(issue.message);
      });
      return {
        success: false,
        error: "بيانات إنشاء المجال غير صحيحة",
        fieldErrors,
      };
    }

    const { name, description, icon, color, priority, hiddenOnDashboard } =
      validation.data;

    // Generate unique slug scoped to this user
    let slug = slugify(name);
    let counter = 1;
    while (true) {
      const existing = await prisma.lifeArea.findUnique({
        where: {
          userId_slug: {
            userId,
            slug,
          },
        },
        select: { id: true },
      });
      if (!existing) break;
      counter += 1;
      slug = `${slugify(name)}-${counter}`;
    }

    // Determine the next sort order value
    const aggregate = await prisma.lifeArea.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (aggregate._max.sortOrder ?? -1) + 1;

    const area = await prisma.lifeArea.create({
      data: {
        userId,
        name,
        slug,
        description: description || null,
        icon,
        color,
        priority,
        sortOrder: nextSortOrder,
        hiddenOnDashboard,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/");

    return { success: true, data: area };
  } catch (err: any) {
    console.error("[createLifeArea Error]:", err);
    return { success: false, error: "تعذر إنشاء مجال الحياة، يرجى المحاولة لاحقاً" };
  }
}

/**
 * Update an existing life area.
 * Tenant isolation enforced: user can only modify areas matching their userId.
 */
export async function updateLifeArea(
  rawInput: unknown
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();

    const validation = UpdateLifeAreaSchema.safeParse(rawInput);
    if (!validation.success) {
      const fieldErrors: Record<string, string[]> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        fieldErrors[path] = fieldErrors[path] || [];
        fieldErrors[path].push(issue.message);
      });
      return {
        success: false,
        error: "بيانات تعديل المجال غير صحيحة",
        fieldErrors,
      };
    }

    const { id, name, description, icon, color, priority, hiddenOnDashboard } =
      validation.data;

    // Verify ownership
    const existing = await prisma.lifeArea.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return { success: false, error: "مجال الحياة غير موجود أو لا تملك صلاحية تعديله" };
    }

    const updated = await prisma.lifeArea.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(icon !== undefined ? { icon } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(hiddenOnDashboard !== undefined ? { hiddenOnDashboard } : {}),
      },
    });

    revalidatePath("/settings");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (err: any) {
    console.error("[updateLifeArea Error]:", err);
    return { success: false, error: "تعذر تحديث مجال الحياة" };
  }
}

/**
 * Reorder display position of multiple life areas.
 * Employs transaction with strict user-scoping for each item.
 */
export async function reorderLifeAreas(
  rawInput: unknown
): Promise<ActionResponse<{ count: number }>> {
  try {
    const userId = await requireUserId();

    const validation = ReorderLifeAreasSchema.safeParse(rawInput);
    if (!validation.success) {
      return { success: false, error: "بيانات إعادة الترتيب غير صالحة" };
    }

    const { items } = validation.data;

    await prisma.$transaction(
      items.map((item) =>
        prisma.lifeArea.updateMany({
          where: {
            id: item.id,
            userId, // Crucial: prevents modifying other users' records
          },
          data: {
            sortOrder: item.sortOrder,
          },
        })
      )
    );

    revalidatePath("/settings");
    revalidatePath("/");

    return { success: true, data: { count: items.length } };
  } catch (err: any) {
    console.error("[reorderLifeAreas Error]:", err);
    return { success: false, error: "تعذر حفظ الترتيب الجديد" };
  }
}

/**
 * Toggle whether a life area is visible on the primary dashboard.
 */
export async function toggleLifeAreaDashboardVisibility(
  id: string
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();

    const area = await prisma.lifeArea.findFirst({
      where: { id, userId },
    });

    if (!area) {
      return { success: false, error: "مجال الحياة غير موجود" };
    }

    const updated = await prisma.lifeArea.update({
      where: { id },
      data: {
        hiddenOnDashboard: !area.hiddenOnDashboard,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (err: any) {
    console.error("[toggleLifeAreaDashboardVisibility Error]:", err);
    return { success: false, error: "تعذر تغيير حالة ظهور المجال" };
  }
}

/**
 * Archive a life area.
 * Preserves all underlying trackers and historical entries completely intact.
 */
export async function archiveLifeArea(
  id: string
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();

    const area = await prisma.lifeArea.findFirst({
      where: { id, userId },
    });

    if (!area) {
      return { success: false, error: "مجال الحياة غير موجود" };
    }

    const updated = await prisma.lifeArea.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    revalidatePath("/settings");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (err: any) {
    console.error("[archiveLifeArea Error]:", err);
    return { success: false, error: "تعذر أرشفة مجال الحياة" };
  }
}

/**
 * Restore an archived life area back to active state.
 */
export async function restoreLifeArea(
  id: string
): Promise<ActionResponse<any>> {
  try {
    const userId = await requireUserId();

    const area = await prisma.lifeArea.findFirst({
      where: { id, userId },
    });

    if (!area) {
      return { success: false, error: "مجال الحياة غير موجود" };
    }

    const updated = await prisma.lifeArea.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (err: any) {
    console.error("[restoreLifeArea Error]:", err);
    return { success: false, error: "تعذر استعادة مجال الحياة" };
  }
}

/**
 * Safely delete an unneeded life area.
 * Underlying trackers are preserved with their lifeAreaId set to null.
 */
export async function deleteLifeArea(
  id: string
): Promise<ActionResponse<boolean>> {
  try {
    const userId = await requireUserId();

    const area = await prisma.lifeArea.findFirst({
      where: { id, userId },
    });

    if (!area) {
      return { success: false, error: "مجال الحياة غير موجود" };
    }

    await prisma.lifeArea.delete({
      where: { id },
    });

    revalidatePath("/settings");
    revalidatePath("/");

    return { success: true, data: true };
  } catch (err: any) {
    console.error("[deleteLifeArea Error]:", err);
    return { success: false, error: "تعذر حذف مجال الحياة" };
  }
}
