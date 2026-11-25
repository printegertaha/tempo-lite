"use server";

import prisma from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const BackupPayloadSchema = z.object({
  exportMetadata: z.object({
    platform: z.string(),
    version: z.string(),
    exportedAt: z.string(),
  }),
  userSettings: z.record(z.string(), z.any()).optional().nullable(),
  lifeAreas: z.array(z.record(z.string(), z.any())).optional().default([]),
  trackers: z.array(z.record(z.string(), z.any())).optional().default([]),
  trackerEntries: z.array(z.record(z.string(), z.any())).optional().default([]),
  tasks: z.array(z.record(z.string(), z.any())).optional().default([]),
  dailyNotes: z.array(z.record(z.string(), z.any())).optional().default([]),
  prayerRecords: z.array(z.record(z.string(), z.any())).optional().default([]),
  abstinenceTrackers: z.array(z.record(z.string(), z.any())).optional().default([]),
  gymWorkouts: z.array(z.record(z.string(), z.any())).optional().default([]),
  mealEntries: z.array(z.record(z.string(), z.any())).optional().default([]),
  expenseEntries: z.array(z.record(z.string(), z.any())).optional().default([]),
});

/**
 * Export complete authenticated cloud snapshot across ALL supported domains.
 */
export async function exportCloudBackup() {
  try {
    const userId = await requireUserId();

    const [
      userSettings,
      lifeAreas,
      trackers,
      trackerEntries,
      tasks,
      dailyNotes,
      prayerRecords,
      abstinenceTrackers,
      gymWorkouts,
      mealEntries,
      expenseEntries,
    ] = await Promise.all([
      prisma.userSettings.findUnique({ where: { userId } }),
      prisma.lifeArea.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
      prisma.tracker.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
      prisma.trackerEntry.findMany({ where: { userId }, orderBy: { occurredAt: "asc" } }),
      prisma.task.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
      prisma.dailyNote.findMany({ where: { userId }, orderBy: { localDate: "asc" } }),
      prisma.prayerRecord.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      prisma.abstinenceTracker.findMany({
        where: { userId },
        include: { sessions: true },
      }),
      prisma.gymWorkout.findMany({ where: { userId }, orderBy: { date: "desc" } }),
      prisma.mealEntry.findMany({ where: { userId }, orderBy: { date: "desc" } }),
      prisma.expenseEntry.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    ]);

    return {
      success: true,
      data: {
        userSettings,
        lifeAreas,
        trackers,
        trackerEntries,
        tasks,
        dailyNotes,
        prayerRecords,
        abstinenceTrackers,
        gymWorkouts,
        mealEntries,
        expenseEntries,
      },
    };
  } catch (error: any) {
    console.error("[exportCloudBackup Error]:", error);
    return {
      success: false,
      error: error?.message || "تعذر تصدير النسخة الاحتياطية السحابية",
    };
  }
}

/**
 * Validate and restore a full JSON backup into PostgreSQL atomically.
 * Scoped strictly to the authenticated userId; skips/remaps conflicting cross-user IDs.
 */
export async function restoreCloudBackup(rawBackup: unknown) {
  try {
    const userId = await requireUserId();
    const parsed = BackupPayloadSchema.safeParse(rawBackup);

    if (!parsed.success) {
      return {
        success: false,
        error: "ملف النسخة الاحتياطية غير صالح أو تالف البنية",
      };
    }

    const data = parsed.data;
    const restoredCounts: Record<string, number> = {
      lifeAreas: 0,
      trackers: 0,
      trackerEntries: 0,
      tasks: 0,
      dailyNotes: 0,
      prayerRecords: 0,
      abstinenceTrackers: 0,
      gymWorkouts: 0,
      mealEntries: 0,
      expenseEntries: 0,
    };

    await prisma.$transaction(async (tx) => {
      // 1. UserSettings
      if (data.userSettings) {
        const s = data.userSettings;
        await tx.userSettings.upsert({
          where: { userId },
          create: {
            userId,
            timezone: s.timezone || "UTC",
            countryCode: s.countryCode || null,
            governorate: s.governorate || null,
            city: s.city || null,
            currency: s.currency || null,
            currencyAuto: s.currencyAuto ?? true,
            prayerTrackingEnabled: s.prayerTrackingEnabled ?? true,
            language: s.language || "ar",
            weekStartDay: Number(s.weekStartDay ?? 6),
            themeAccent: s.themeAccent || "violet",
            dashboardConfig: s.dashboardConfig || {},
            audioEnabled: s.audioEnabled ?? true,
            audioVolume: Number(s.audioVolume ?? 0.7),
            plannerConfig: s.plannerConfig || {},
          },
          update: {
            timezone: s.timezone || undefined,
            countryCode: s.countryCode !== undefined ? s.countryCode : undefined,
            governorate: s.governorate !== undefined ? s.governorate : undefined,
            city: s.city !== undefined ? s.city : undefined,
            currency: s.currency !== undefined ? s.currency : undefined,
            currencyAuto: s.currencyAuto !== undefined ? Boolean(s.currencyAuto) : undefined,
            prayerTrackingEnabled:
              s.prayerTrackingEnabled !== undefined
                ? Boolean(s.prayerTrackingEnabled)
                : undefined,
            language: s.language || undefined,
            weekStartDay: s.weekStartDay !== undefined ? Number(s.weekStartDay) : undefined,
            themeAccent: s.themeAccent || undefined,
            dashboardConfig: s.dashboardConfig || undefined,
          },
        });
      }

      // 2. LifeAreas
      const areaIdMap = new Map<string, string>();
      for (const a of data.lifeAreas) {
        if (!a.name || !a.slug) continue;
        const origId = a.id || crypto.randomUUID();
        const existingOwner = await tx.lifeArea.findUnique({
          where: { id: origId },
          select: { id: true, userId: true },
        });
        const targetId =
          existingOwner && existingOwner.userId !== userId ? crypto.randomUUID() : origId;
        areaIdMap.set(origId, targetId);

        const existingBySlug = await tx.lifeArea.findUnique({
          where: { userId_slug: { userId, slug: a.slug } },
          select: { id: true },
        });
        const finalId = existingBySlug ? existingBySlug.id : targetId;
        areaIdMap.set(origId, finalId);

        await tx.lifeArea.upsert({
          where: { id: finalId },
          create: {
            id: finalId,
            userId,
            name: a.name,
            slug: a.slug,
            description: a.description || null,
            icon: a.icon || "Sparkles",
            color: a.color || "violet",
            priority: Number(a.priority ?? 1),
            sortOrder: Number(a.sortOrder ?? 0),
            hiddenOnDashboard: Boolean(a.hiddenOnDashboard),
            isArchived: Boolean(a.isArchived),
          },
          update: {
            name: a.name,
            description: a.description || null,
            icon: a.icon || "Sparkles",
            color: a.color || "violet",
            priority: Number(a.priority ?? 1),
            sortOrder: Number(a.sortOrder ?? 0),
            hiddenOnDashboard: Boolean(a.hiddenOnDashboard),
            isArchived: Boolean(a.isArchived),
          },
        });
        restoredCounts.lifeAreas++;
      }

      // 3. Trackers
      const trackerIdMap = new Map<string, string>();
      for (const t of data.trackers) {
        if (!t.name || !t.slug) continue;
        const origId = t.id || crypto.randomUUID();
        const existingOwner = await tx.tracker.findUnique({
          where: { id: origId },
          select: { id: true, userId: true },
        });
        const targetId =
          existingOwner && existingOwner.userId !== userId ? crypto.randomUUID() : origId;

        const existingBySlug = await tx.tracker.findUnique({
          where: { userId_slug: { userId, slug: t.slug } },
          select: { id: true },
        });
        const finalId = existingBySlug ? existingBySlug.id : targetId;
        trackerIdMap.set(origId, finalId);

        const mappedAreaId = t.lifeAreaId ? areaIdMap.get(t.lifeAreaId) || null : null;

        await tx.tracker.upsert({
          where: { id: finalId },
          create: {
            id: finalId,
            userId,
            lifeAreaId: mappedAreaId,
            name: t.name,
            slug: t.slug,
            description: t.description || null,
            icon: t.icon || "Flame",
            color: t.color || "emerald",
            priority: Number(t.priority ?? 1),
            metricType: t.metricType || "BOOLEAN",
            unit: t.unit || null,
            targetValue: t.targetValue ?? null,
            targetFrequency: t.targetFrequency || "DAILY",
            scheduleConfig: t.scheduleConfig ?? {},
            trackerConfig: t.trackerConfig ?? {},
            displayPreferences: t.displayPreferences ?? {},
            sortOrder: Number(t.sortOrder ?? 0),
            version: Number(t.version ?? 1),
            isPaused: Boolean(t.isPaused),
            isArchived: Boolean(t.isArchived),
          },
          update: {
            name: t.name,
            description: t.description || null,
            targetValue: t.targetValue ?? null,
            scheduleConfig: t.scheduleConfig ?? {},
            trackerConfig: t.trackerConfig ?? {},
            isPaused: Boolean(t.isPaused),
            isArchived: Boolean(t.isArchived),
          },
        });
        restoredCounts.trackers++;
      }

      // 4. Tracker Entries
      for (const e of data.trackerEntries) {
        if (!e.trackerId || !e.localDate) continue;
        const mappedTrackerId = trackerIdMap.get(e.trackerId) || e.trackerId;
        const ownsTracker = await tx.tracker.findFirst({
          where: { id: mappedTrackerId, userId },
          select: { id: true },
        });
        if (!ownsTracker) continue;

        const entryId = e.id || crypto.randomUUID();
        const existingOwner = await tx.trackerEntry.findUnique({
          where: { id: entryId },
          select: { id: true, userId: true },
        });
        if (existingOwner && existingOwner.userId !== userId) continue;

        await tx.trackerEntry.upsert({
          where: { id: entryId },
          create: {
            id: entryId,
            userId,
            trackerId: mappedTrackerId,
            localDate: e.localDate,
            occurredAt: e.occurredAt ? new Date(e.occurredAt) : new Date(),
            valueBoolean: e.valueBoolean ?? null,
            valueNumeric: e.valueNumeric ?? null,
            valueDuration: e.valueDuration ?? null,
            timeRangeStart: e.timeRangeStart ? new Date(e.timeRangeStart) : null,
            timeRangeEnd: e.timeRangeEnd ? new Date(e.timeRangeEnd) : null,
            entryPayload: e.entryPayload ?? undefined,
            notes: e.notes ?? null,
            trackerVersion: Number(e.trackerVersion ?? 1),
          },
          update: {
            valueBoolean: e.valueBoolean ?? null,
            valueNumeric: e.valueNumeric ?? null,
            valueDuration: e.valueDuration ?? null,
            notes: e.notes ?? null,
          },
        });
        restoredCounts.trackerEntries++;
      }

      // 5. Tasks
      for (const t of data.tasks) {
        if (!t.title) continue;
        const origId = t.id || crypto.randomUUID();
        const existingOwner = await tx.task.findUnique({
          where: { id: origId },
          select: { id: true, userId: true },
        });
        const taskId =
          existingOwner && existingOwner.userId !== userId ? crypto.randomUUID() : origId;

        await tx.task.upsert({
          where: { id: taskId },
          create: {
            id: taskId,
            userId,
            lifeAreaId: t.lifeAreaId ? areaIdMap.get(t.lifeAreaId) || null : null,
            trackerId: t.trackerId ? trackerIdMap.get(t.trackerId) || null : null,
            title: t.title,
            description: t.description || null,
            dueDate: t.dueDate || null,
            startTime: t.startTime || null,
            durationMinutes: t.durationMinutes || null,
            priority: t.priority || "MEDIUM",
            status: t.status || "TODO",
            completedAt: t.completedAt ? new Date(t.completedAt) : null,
            isPomodoro: Boolean(t.isPomodoro),
            workCycle: Number(t.workCycle ?? 25),
            breakCycle: Number(t.breakCycle ?? 5),
            isRecurring: Boolean(t.isRecurring),
            subtasks: t.subtasks ?? [],
            tags: t.tags ?? [],
            sortOrder: Number(t.sortOrder ?? 0),
            isArchived: Boolean(t.isArchived),
          },
          update: {
            title: t.title,
            description: t.description || null,
            dueDate: t.dueDate || null,
            status: t.status || "TODO",
            completedAt: t.completedAt ? new Date(t.completedAt) : null,
            subtasks: t.subtasks ?? [],
            tags: t.tags ?? [],
            isArchived: Boolean(t.isArchived),
          },
        });
        restoredCounts.tasks++;
      }

      // 6. Daily Notes
      for (const n of data.dailyNotes) {
        if (!n.localDate) continue;
        await tx.dailyNote.upsert({
          where: { userId_localDate: { userId, localDate: n.localDate } },
          create: {
            userId,
            localDate: n.localDate,
            title: n.title || null,
            content: n.content || "",
            mood: n.mood || null,
            tags: n.tags ?? [],
          },
          update: {
            title: n.title || undefined,
            content: n.content || "",
            mood: n.mood || null,
            tags: n.tags ?? [],
          },
        });
        restoredCounts.dailyNotes++;
      }

      // 7. Prayer Records
      for (const p of data.prayerRecords) {
        if (!p.date || !p.prayerKey) continue;
        await tx.prayerRecord.upsert({
          where: {
            userId_date_prayerKey: {
              userId,
              date: p.date,
              prayerKey: p.prayerKey,
            },
          },
          create: {
            userId,
            date: p.date,
            prayerKey: p.prayerKey,
            isCompleted: Boolean(p.isCompleted),
            completedAt: p.completedAt ? new Date(p.completedAt) : null,
            location: p.location || null,
            withSunnah: Boolean(p.withSunnah),
            notes: p.notes || null,
          },
          update: {
            isCompleted: Boolean(p.isCompleted),
            location: p.location || null,
            withSunnah: Boolean(p.withSunnah),
            notes: p.notes || null,
          },
        });
        restoredCounts.prayerRecords++;
      }

      // 8. Abstinence Trackers + Sessions
      for (const a of data.abstinenceTrackers) {
        if (!a.name) continue;
        const origId = a.id || crypto.randomUUID();
        const existingOwner = await tx.abstinenceTracker.findUnique({
          where: { id: origId },
          select: { id: true, userId: true },
        });
        const absId =
          existingOwner && existingOwner.userId !== userId ? crypto.randomUUID() : origId;

        await tx.abstinenceTracker.upsert({
          where: { id: absId },
          create: {
            id: absId,
            userId,
            name: a.name,
            description: a.description || null,
            icon: a.icon || "ShieldCheck",
            color: a.color || "rose",
            targetDays: a.targetDays ?? 30,
            isArchived: Boolean(a.isArchived),
          },
          update: {
            name: a.name,
            description: a.description || null,
            targetDays: a.targetDays ?? 30,
          },
        });

        for (const s of a.sessions || []) {
          const sessId = s.id || crypto.randomUUID();
          const existingSess = await tx.abstinenceSession.findUnique({
            where: { id: sessId },
            select: { id: true, userId: true },
          });
          if (existingSess && existingSess.userId !== userId) continue;
          await tx.abstinenceSession.upsert({
            where: { id: sessId },
            create: {
              id: sessId,
              abstinenceTrackerId: absId,
              userId,
              startedAt: s.startedAt ? new Date(s.startedAt) : new Date(),
              endedAt: s.endedAt ? new Date(s.endedAt) : null,
              durationSeconds: s.durationSeconds ?? null,
              trigger: s.trigger ?? null,
              relapseReason: s.relapseReason ?? null,
              notes: s.notes ?? null,
            },
            update: {
              endedAt: s.endedAt ? new Date(s.endedAt) : null,
              durationSeconds: s.durationSeconds ?? null,
            },
          });
        }
        restoredCounts.abstinenceTrackers++;
      }

      // 9. Gym Workouts, Meals, Expenses
      for (const g of data.gymWorkouts) {
        if (!g.title || !g.date) continue;
        const id = g.id || crypto.randomUUID();
        const owner = await tx.gymWorkout.findUnique({ where: { id }, select: { userId: true } });
        const safeId = owner && owner.userId !== userId ? crypto.randomUUID() : id;
        await tx.gymWorkout.upsert({
          where: { id: safeId },
          create: {
            id: safeId,
            userId,
            date: g.date,
            title: g.title,
            muscleGroup: g.muscleGroup || null,
            durationMinutes: g.durationMinutes || 60,
            exercises: g.exercises || [],
            notes: g.notes || null,
          },
          update: {
            title: g.title,
            durationMinutes: g.durationMinutes || 60,
            exercises: g.exercises || [],
            notes: g.notes || null,
          },
        });
        restoredCounts.gymWorkouts++;
      }

      for (const m of data.mealEntries) {
        if (!m.title || !m.date) continue;
        const id = m.id || crypto.randomUUID();
        const owner = await tx.mealEntry.findUnique({ where: { id }, select: { userId: true } });
        const safeId = owner && owner.userId !== userId ? crypto.randomUUID() : id;
        await tx.mealEntry.upsert({
          where: { id: safeId },
          create: {
            id: safeId,
            userId,
            date: m.date,
            mealType: m.mealType || "lunch",
            title: m.title,
            calories: Number(m.calories) || 0,
            protein: Number(m.protein) || 0,
            carbs: Number(m.carbs) || 0,
            fat: Number(m.fat) || 0,
            notes: m.notes || null,
          },
          update: {
            title: m.title,
            calories: Number(m.calories) || 0,
            protein: Number(m.protein) || 0,
            carbs: Number(m.carbs) || 0,
            fat: Number(m.fat) || 0,
          },
        });
        restoredCounts.mealEntries++;
      }

      for (const e of data.expenseEntries) {
        if (!e.title || !e.date) continue;
        const id = e.id || crypto.randomUUID();
        const owner = await tx.expenseEntry.findUnique({ where: { id }, select: { userId: true } });
        const safeId = owner && owner.userId !== userId ? crypto.randomUUID() : id;
        await tx.expenseEntry.upsert({
          where: { id: safeId },
          create: {
            id: safeId,
            userId,
            date: e.date,
            title: e.title,
            amount: Number(e.amount) || 0,
            currency: e.currency ? String(e.currency).toUpperCase().trim() : "SAR",
            type: e.type === "income" ? "income" : "expense",
            category: e.category || "عام",
            notes: e.notes || null,
          },
          update: {
            title: e.title,
            amount: Number(e.amount) || 0,
            currency: e.currency ? String(e.currency).toUpperCase().trim() : undefined,
            type: e.type ? (e.type === "income" ? "income" : "expense") : undefined,
            category: e.category || "عام",
          },
        });
        restoredCounts.expenseEntries++;
      }
    });

    revalidatePath("/");
    revalidatePath("/tasks");
    revalidatePath("/habits");
    revalidatePath("/journal");
    revalidatePath("/abstinence");
    revalidatePath("/settings");
    revalidatePath("/expenses");
    revalidatePath("/nutrition");
    revalidatePath("/gym");

    return { success: true, restoredCounts };
  } catch (error: any) {
    console.error("[restoreCloudBackup Error]:", error);
    return {
      success: false,
      error: error?.message || "فشل استعادة النسخة الاحتياطية",
    };
  }
}

/**
 * Explicitly delete all cloud-synchronized domain records for the authenticated user
 * while keeping the user account & active session intact.
 */
export async function clearCloudUserData() {
  try {
    const userId = await requireUserId();

    await prisma.$transaction([
      prisma.trackerEntry.deleteMany({ where: { userId } }),
      prisma.task.deleteMany({ where: { userId } }),
      prisma.abstinenceSession.deleteMany({ where: { userId } }),
      prisma.abstinenceTracker.deleteMany({ where: { userId } }),
      prisma.trackerVersion.deleteMany({ where: { userId } }),
      prisma.tracker.deleteMany({ where: { userId } }),
      prisma.lifeArea.deleteMany({ where: { userId } }),
      prisma.dailyNote.deleteMany({ where: { userId } }),
      prisma.prayerRecord.deleteMany({ where: { userId } }),
      prisma.gymWorkout.deleteMany({ where: { userId } }),
      prisma.mealEntry.deleteMany({ where: { userId } }),
      prisma.expenseEntry.deleteMany({ where: { userId } }),
      prisma.mutationReceipt.deleteMany({ where: { userId } }),
    ]);

    revalidatePath("/");
    revalidatePath("/tasks");
    revalidatePath("/habits");
    revalidatePath("/journal");
    revalidatePath("/abstinence");
    revalidatePath("/calendar");
    revalidatePath("/analytics");
    revalidatePath("/settings");
    revalidatePath("/expenses");
    revalidatePath("/nutrition");
    revalidatePath("/gym");

    return { success: true };
  } catch (error: any) {
    console.error("[clearCloudUserData Error]:", error);
    return {
      success: false,
      error: error?.message || "تعذر مسح البيانات السحابية",
    };
  }
}
