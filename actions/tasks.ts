"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-session";
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  PostponeTaskSchema,
  TaskQueryFiltersSchema,
  CreateTaskInput,
  UpdateTaskInput,
  TaskPriorityType,
  TaskStatusType,
} from "@/lib/validations/task";
import { getLocalDateString, addDaysToDateString } from "@/lib/dates";

/**
 * Helper to ensure the active user has a verified session.
 */
async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error("غير مصرح: يجب تسجيل الدخول للوصول للمهام");
  }
  return session.user.id;
}

/**
 * 1. Create a new Task
 */
export async function createTask(rawInput: CreateTaskInput) {
  try {
    const userId = await requireAuth();
    const validated = CreateTaskSchema.parse(rawInput);

    // Verify lifeAreaId belongs to user if provided
    if (validated.lifeAreaId) {
      const area = await prisma.lifeArea.findFirst({
        where: { id: validated.lifeAreaId, userId },
      });
      if (!area) {
        return { success: false, error: "مجال الحياة المحدد غير موجود أو غير تابع لك" };
      }
    }

    // Verify trackerId belongs to user if provided
    if (validated.trackerId) {
      const tracker = await prisma.tracker.findFirst({
        where: { id: validated.trackerId, userId },
      });
      if (!tracker) {
        return { success: false, error: "المتعقب المحدد غير موجود أو غير تابع لك" };
      }
    }

    // Find highest sortOrder to place task at bottom of its queue
    const lastTask = await prisma.task.findFirst({
      where: { userId, isArchived: false },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const nextOrder = (lastTask?.sortOrder ?? -1) + 1;

    const task = await prisma.task.create({
      data: {
        userId,
        title: validated.title,
        description: validated.description || null,
        dueDate: validated.dueDate || null,
        priority: validated.priority,
        status: validated.status,
        completedAt: validated.status === "COMPLETED" ? new Date() : null,
        lifeAreaId: validated.lifeAreaId || null,
        trackerId: validated.trackerId || null,
        tags: validated.tags,
        sortOrder: nextOrder,
      },
      include: {
        lifeArea: {
          select: { id: true, name: true, color: true, icon: true },
        },
        tracker: {
          select: { id: true, name: true, color: true, icon: true },
        },
      },
    });

    revalidatePath("/tasks");
    revalidatePath("/journal");
    revalidatePath("/");

    return { success: true, data: task };
  } catch (error: any) {
    console.error("Error creating task:", error);
    return {
      success: false,
      error: error?.message || "فشل إنشاء المهمة",
    };
  }
}

/**
 * 2. Get Tasks with View and Filter support
 */
export async function getTasks(filters: Record<string, any> = {}) {
  try {
    const userId = await requireAuth();
    const validated = TaskQueryFiltersSchema.parse(filters);

    // Get user timezone for local date bucket
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    const timezone = userSettings?.timezone || "Asia/Riyadh";
    const todayStr = validated.localDate || getLocalDateString(new Date(), timezone);

    // Build Prisma query condition
    const where: any = {
      userId,
    };

    // Life area & tracker filters
    if (validated.lifeAreaId) {
      where.lifeAreaId = validated.lifeAreaId;
    }
    if (validated.trackerId) {
      where.trackerId = validated.trackerId;
    }

    // Search query
    if (validated.searchQuery) {
      where.OR = [
        { title: { contains: validated.searchQuery, mode: "insensitive" } },
        { description: { contains: validated.searchQuery, mode: "insensitive" } },
      ];
    }

    // Views logic
    switch (validated.view) {
      case "today":
        where.isArchived = false;
        where.status = { not: "COMPLETED" };
        where.OR = [
          { dueDate: todayStr },
          { dueDate: null },
        ];
        break;

      case "overdue":
        where.isArchived = false;
        where.status = { notIn: ["COMPLETED", "CANCELLED"] };
        where.dueDate = { lt: todayStr, not: null };
        break;

      case "upcoming":
        where.isArchived = false;
        where.status = { not: "COMPLETED" };
        where.dueDate = { gt: todayStr };
        break;

      case "completed":
        where.isArchived = false;
        where.status = "COMPLETED";
        break;

      case "archived":
        where.isArchived = true;
        break;

      case "all":
      default:
        where.isArchived = false;
        break;
    }

    const page = validated.page || 1;
    const pageSize = validated.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        take: pageSize,
        skip,
        orderBy: [
          { sortOrder: "asc" },
          { dueDate: "asc" },
          { createdAt: "desc" },
        ],
        include: {
          lifeArea: {
            select: { id: true, name: true, color: true, icon: true },
          },
          tracker: {
            select: { id: true, name: true, color: true, icon: true },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: tasks,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      meta: { todayStr, timezone, view: validated.view },
    };
  } catch (error: any) {
    console.error("Error fetching tasks:", error);
    return {
      success: false,
      error: error?.message || "فشل استرجاع المهام",
      data: [],
    };
  }
}

/**
 * 3. Get Task Statistics (Counts for Today, Overdue, Upcoming, Completed)
 */
export async function getTaskStats(localDateInput?: string) {
  try {
    const userId = await requireAuth();

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    const timezone = userSettings?.timezone || "Asia/Riyadh";
    const todayStr = localDateInput || getLocalDateString(new Date(), timezone);

    const [todayCount, overdueCount, upcomingCount, completedCount, archivedCount] =
      await Promise.all([
        // Today's open tasks
        prisma.task.count({
          where: {
            userId,
            isArchived: false,
            status: { not: "COMPLETED" },
            OR: [{ dueDate: todayStr }, { dueDate: null }],
          },
        }),
        // Overdue tasks
        prisma.task.count({
          where: {
            userId,
            isArchived: false,
            status: { notIn: ["COMPLETED", "CANCELLED"] },
            dueDate: { lt: todayStr, not: null },
          },
        }),
        // Upcoming tasks
        prisma.task.count({
          where: {
            userId,
            isArchived: false,
            status: { not: "COMPLETED" },
            dueDate: { gt: todayStr },
          },
        }),
        // Completed tasks
        prisma.task.count({
          where: {
            userId,
            isArchived: false,
            status: "COMPLETED",
          },
        }),
        // Archived tasks
        prisma.task.count({
          where: {
            userId,
            isArchived: true,
          },
        }),
      ]);

    return {
      success: true,
      data: {
        todayCount,
        overdueCount,
        upcomingCount,
        completedCount,
        archivedCount,
        todayStr,
      },
    };
  } catch (error: any) {
    console.error("Error fetching task stats:", error);
    return {
      success: false,
      error: error?.message || "فشل استرجاع إحصائيات المهام",
      data: {
        todayCount: 0,
        overdueCount: 0,
        upcomingCount: 0,
        completedCount: 0,
        archivedCount: 0,
        todayStr: getLocalDateString(),
      },
    };
  }
}

/**
 * 4. Update an existing Task
 */
export async function updateTask(rawInput: UpdateTaskInput) {
  try {
    const userId = await requireAuth();
    const validated = UpdateTaskSchema.parse(rawInput);

    const existing = await prisma.task.findFirst({
      where: { id: validated.id, userId },
    });
    if (!existing) {
      return { success: false, error: "المهمة غير موجودة أو غير مصرح بتعديلها" };
    }

    if (validated.lifeAreaId) {
      const area = await prisma.lifeArea.findFirst({
        where: { id: validated.lifeAreaId, userId },
      });
      if (!area) {
        return { success: false, error: "مجال الحياة المحدد غير صالح" };
      }
    }

    if (validated.trackerId) {
      const tracker = await prisma.tracker.findFirst({
        where: { id: validated.trackerId, userId },
      });
      if (!tracker) {
        return { success: false, error: "المتعقب المحدد غير صالح" };
      }
    }

    let completedAt = existing.completedAt;
    if (validated.status) {
      if (validated.status === "COMPLETED" && existing.status !== "COMPLETED") {
        completedAt = new Date();
      } else if (validated.status !== "COMPLETED" && existing.status === "COMPLETED") {
        completedAt = null;
      }
    }

    const updated = await prisma.task.update({
      where: { id: validated.id },
      data: {
        title: validated.title !== undefined ? validated.title : undefined,
        description: validated.description !== undefined ? validated.description : undefined,
        dueDate: validated.dueDate !== undefined ? validated.dueDate : undefined,
        priority: validated.priority !== undefined ? validated.priority : undefined,
        status: validated.status !== undefined ? validated.status : undefined,
        completedAt,
        lifeAreaId: validated.lifeAreaId !== undefined ? validated.lifeAreaId : undefined,
        trackerId: validated.trackerId !== undefined ? validated.trackerId : undefined,
        tags: validated.tags !== undefined ? validated.tags : undefined,
        sortOrder: validated.sortOrder !== undefined ? validated.sortOrder : undefined,
        isArchived: validated.isArchived !== undefined ? validated.isArchived : undefined,
        archivedAt:
          validated.isArchived !== undefined
            ? validated.isArchived
              ? new Date()
              : null
            : undefined,
      },
      include: {
        lifeArea: {
          select: { id: true, name: true, color: true, icon: true },
        },
        tracker: {
          select: { id: true, name: true, color: true, icon: true },
        },
      },
    });

    revalidatePath("/tasks");
    revalidatePath("/journal");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating task:", error);
    return {
      success: false,
      error: error?.message || "فشل تحديث المهمة",
    };
  }
}

/**
 * 5. Quick Toggle Task Completion
 */
export async function toggleTaskStatus(taskId: string, targetStatus?: TaskStatusType) {
  try {
    const userId = await requireAuth();

    const existing = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });
    if (!existing) {
      return { success: false, error: "المهمة غير موجودة" };
    }

    let newStatus: TaskStatusType;
    let completedAt: Date | null;

    if (targetStatus) {
      newStatus = targetStatus;
      completedAt = newStatus === "COMPLETED" ? new Date() : null;
    } else {
      // Toggle logic
      if (existing.status === "COMPLETED") {
        newStatus = "TODO";
        completedAt = null;
      } else {
        newStatus = "COMPLETED";
        completedAt = new Date();
      }
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        completedAt,
      },
      include: {
        lifeArea: {
          select: { id: true, name: true, color: true, icon: true },
        },
        tracker: {
          select: { id: true, name: true, color: true, icon: true },
        },
      },
    });

    revalidatePath("/tasks");
    revalidatePath("/journal");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error toggling task status:", error);
    return {
      success: false,
      error: error?.message || "فشل تغيير حالة المهمة",
    };
  }
}

/**
 * 6. Postpone Task (Manual Postponing: +1 day, +3 days, +1 week, or explicit date)
 * Does NOT duplicate the task. Updates dueDate in place.
 */
export async function postponeTask(taskId: string, daysOrDate: number | string) {
  try {
    const userId = await requireAuth();

    const existing = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });
    if (!existing) {
      return { success: false, error: "المهمة غير موجودة" };
    }

    let nextDueDate: string;

    if (typeof daysOrDate === "number") {
      // Get base date: existing dueDate or today's local date
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId },
        select: { timezone: true },
      });
      const todayStr = getLocalDateString(new Date(), userSettings?.timezone || "Asia/Riyadh");
      const baseDate = existing.dueDate && existing.dueDate >= todayStr ? existing.dueDate : todayStr;
      nextDueDate = addDaysToDateString(baseDate, daysOrDate);
    } else {
      // Explicit YYYY-MM-DD
      nextDueDate = daysOrDate;
    }

    const validated = PostponeTaskSchema.parse({
      id: taskId,
      newDueDate: nextDueDate,
    });

    const updated = await prisma.task.update({
      where: { id: validated.id },
      data: {
        dueDate: validated.newDueDate,
      },
      include: {
        lifeArea: {
          select: { id: true, name: true, color: true, icon: true },
        },
        tracker: {
          select: { id: true, name: true, color: true, icon: true },
        },
      },
    });

    revalidatePath("/tasks");
    revalidatePath("/journal");
    revalidatePath("/");

    return { success: true, data: updated, newDueDate: validated.newDueDate };
  } catch (error: any) {
    console.error("Error postponing task:", error);
    return {
      success: false,
      error: error?.message || "فشل تأجيل المهمة",
    };
  }
}

/**
 * 7. Archive / Restore Task
 */
export async function archiveTask(taskId: string, isArchived: boolean = true) {
  try {
    const userId = await requireAuth();

    const existing = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });
    if (!existing) {
      return { success: false, error: "المهمة غير موجودة" };
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        isArchived,
        archivedAt: isArchived ? new Date() : null,
      },
    });

    revalidatePath("/tasks");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error archiving task:", error);
    return {
      success: false,
      error: error?.message || "فشل أرشفة المهمة",
    };
  }
}

/**
 * 8. Permanently Delete Task
 */
export async function deleteTask(taskId: string) {
  try {
    const userId = await requireAuth();

    const existing = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });
    if (!existing) {
      return { success: false, error: "المهمة غير موجودة أو غير مصرح بحذفها" };
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    revalidatePath("/tasks");
    revalidatePath("/journal");
    revalidatePath("/");

    return { success: true, message: "تم حذف المهمة بنجاح" };
  } catch (error: any) {
    console.error("Error deleting task:", error);
    return {
      success: false,
      error: error?.message || "فشل حذف المهمة",
    };
  }
}

/**
 * 9. Reorder Tasks Array
 */
export async function reorderTasks(taskIds: string[]) {
  try {
    const userId = await requireAuth();

    // Verify all tasks belong to user
    const userTasks = await prisma.task.findMany({
      where: { id: { in: taskIds }, userId },
      select: { id: true },
    });

    if (userTasks.length !== taskIds.length) {
      return { success: false, error: "بعض المهام المحددة غير صالحة" };
    }

    // Update in atomic transaction
    await prisma.$transaction(
      taskIds.map((id, index) =>
        prisma.task.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    revalidatePath("/tasks");

    return { success: true };
  } catch (error: any) {
    console.error("Error reordering tasks:", error);
    return {
      success: false,
      error: error?.message || "فشل إعادة ترتيب المهام",
    };
  }
}

