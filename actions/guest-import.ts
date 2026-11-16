"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-session";
import { revalidatePath } from "next/cache";

export async function importGuestData(payload: {
  tasks?: any[];
  prayers?: any[];
  trackers?: any[];
  abstinenceTrackers?: any[];
  dailyNotes?: any[];
  gymWorkouts?: any[];
  mealEntries?: any[];
  expenseEntries?: any[];
}) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return { success: false, error: "يجب تسجيل الدخول لاستيراد البيانات" };
    }

    const userId = session.user.id;
    const {
      tasks = [],
      prayers = [],
      abstinenceTrackers = [],
      dailyNotes = [],
      gymWorkouts = [],
      mealEntries = [],
      expenseEntries = [],
    } = payload;

    const importedCounts: Record<string, number> = {
      tasks: 0,
      prayers: 0,
      abstinence: 0,
      dailyNotes: 0,
      gymWorkouts: 0,
      mealEntries: 0,
      expenseEntries: 0,
    };

    // Execute import in an atomic Prisma transaction
    await prisma.$transaction(async (tx) => {
      // 1. Import Tasks (Idempotent upsert by ID)
      for (const t of tasks) {
        if (!t.title) continue;
        const taskId = t.id || crypto.randomUUID();

        await tx.task.upsert({
          where: { id: taskId },
          create: {
            id: taskId,
            userId,
            title: t.title,
            description: t.description || null,
            dueDate: t.dueDate || null,
            startTime: t.startTime || null,
            durationMinutes: t.durationMinutes || null,
            priority: t.priority || "MEDIUM",
            status: t.status || "TODO",
            completedAt: t.status === "COMPLETED" ? new Date() : null,
            isPomodoro: Boolean(t.isPomodoro),
            workCycle: t.workCycle || 25,
            breakCycle: t.breakCycle || 5,
            isRecurring: Boolean(t.isRecurring),
            subtasks: t.subtasks || [],
            tags: t.tags || [],
            sortOrder: t.sortOrder || 0,
            version: (t.version || 1) + 1,
          },
          update: {
            title: t.title,
            description: t.description || null,
            dueDate: t.dueDate || null,
            status: t.status || "TODO",
            subtasks: t.subtasks || [],
            tags: t.tags || [],
          },
        });

        // Record receipt for idempotency
        await tx.mutationReceipt.upsert({
          where: {
            userId_id: {
              userId,
              id: `import_task_${taskId}`,
            },
          },
          create: {
            id: `import_task_${taskId}`,
            userId,
            entityType: "task",
            entityId: taskId,
            action: "guest_import",
          },
          update: {},
        });

        importedCounts.tasks++;
      }

      // 2. Import Daily Notes (Idempotent upsert by userId_localDate)
      for (const n of dailyNotes) {
        if (!n.localDate) continue;

        await tx.dailyNote.upsert({
          where: {
            userId_localDate: {
              userId,
              localDate: n.localDate,
            },
          },
          create: {
            userId,
            localDate: n.localDate,
            content: n.content || "",
            mood: n.mood || null,
            tags: n.tags || [],
          },
          update: {
            content: n.content || "",
            mood: n.mood || null,
            tags: n.tags || [],
          },
        });

        importedCounts.dailyNotes++;
      }

      // 3. Import Gym Workouts
      for (const g of gymWorkouts) {
        if (!g.title || !g.date) continue;
        const gymId = g.id || crypto.randomUUID();

        await tx.gymWorkout.upsert({
          where: { id: gymId },
          create: {
            id: gymId,
            userId,
            date: g.date,
            title: g.title,
            durationMinutes: g.durationMinutes || 60,
            muscleGroup: g.muscleGroup || null,
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

        importedCounts.gymWorkouts++;
      }

      // 4. Import Meal Entries
      for (const m of mealEntries) {
        if (!m.title || !m.date) continue;
        const mealId = m.id || crypto.randomUUID();

        await tx.mealEntry.upsert({
          where: { id: mealId },
          create: {
            id: mealId,
            userId,
            date: m.date,
            mealType: m.mealType || "lunch",
            title: m.title,
            calories: m.calories || 0,
            protein: m.protein || 0,
            carbs: m.carbs || 0,
            fat: m.fat || 0,
            notes: m.notes || null,
          },
          update: {
            title: m.title,
            calories: m.calories || 0,
            protein: m.protein || 0,
            carbs: m.carbs || 0,
            fat: m.fat || 0,
          },
        });

        importedCounts.mealEntries++;
      }

      // 5. Import Expense Entries
      for (const e of expenseEntries) {
        if (!e.title || !e.date) continue;
        const expId = e.id || crypto.randomUUID();

        await tx.expenseEntry.upsert({
          where: { id: expId },
          create: {
            id: expId,
            userId,
            date: e.date,
            title: e.title,
            amount: e.amount || 0,
            category: e.category || "عام",
            notes: e.notes || null,
          },
          update: {
            title: e.title,
            amount: e.amount || 0,
            category: e.category || "عام",
          },
        });

        importedCounts.expenseEntries++;
      }

      // 6. Import Prayer Records
      if (Array.isArray(prayers)) {
        for (const p of prayers) {
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
              completedAt: p.isCompleted ? new Date() : null,
              location: p.location || null,
              withSunnah: Boolean(p.withSunnah),
              notes: p.notes || null,
            },
            update: {
              isCompleted: Boolean(p.isCompleted),
              location: p.location || undefined,
              withSunnah: p.withSunnah !== undefined ? Boolean(p.withSunnah) : undefined,
            },
          });
          importedCounts.prayers = (importedCounts.prayers || 0) + 1;
        }
      }

      // 7. Import Abstinence Trackers & Sessions
      if (Array.isArray(abstinenceTrackers)) {
        for (const a of abstinenceTrackers) {
          if (!a.name) continue;
          const absId = a.id?.startsWith("guest_abs_") ? crypto.randomUUID() : a.id || crypto.randomUUID();

          const createdTracker = await tx.abstinenceTracker.upsert({
            where: { id: absId },
            create: {
              id: absId,
              userId,
              name: a.name,
              description: a.description || null,
              icon: a.icon || "ShieldCheck",
              color: a.color || "rose",
              targetDays: a.targetDays ? Number(a.targetDays) : 30,
              isArchived: false,
            },
            update: {
              name: a.name,
              description: a.description || null,
              targetDays: a.targetDays ? Number(a.targetDays) : 30,
            },
          });

          // Re-create active session if present
          const sessionStart = a.activeSession?.startedAt || a.startedAt;
          if (sessionStart) {
            const startedAt = new Date(sessionStart);
            const existingActive = await tx.abstinenceSession.findFirst({
              where: {
                abstinenceTrackerId: createdTracker.id,
                userId,
                endedAt: null,
              },
            });

            if (!existingActive) {
              await tx.abstinenceSession.create({
                data: {
                  abstinenceTrackerId: createdTracker.id,
                  userId,
                  startedAt,
                },
              });
            }
          }

          importedCounts.abstinence = (importedCounts.abstinence || 0) + 1;
        }
      }
    });

    revalidatePath("/");
    revalidatePath("/tasks");
    revalidatePath("/planner");
    revalidatePath("/journal");
    revalidatePath("/abstinence");

    return {
      success: true,
      importedCounts,
    };
  } catch (error: any) {
    console.error("Error importing guest data:", error);
    return {
      success: false,
      error: error.message || "فشل استيراد بيانات الضيف",
    };
  }
}

