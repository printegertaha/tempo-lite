"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-session";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/validations/life-area";

export async function importGuestData(payload: {
  tasks?: any[];
  taskSessions?: any[];
  entityRevisions?: any[];
  prayers?: any[];
  trackers?: any[];
  trackerEntries?: any[];
  abstinenceTrackers?: any[];
  abstinenceSessions?: any[];
  dailyNotes?: any[];
  gymWorkouts?: any[];
  mealEntries?: any[];
  waterEntries?: any[];
  expenseEntries?: any[];
  preferences?: any;
  onboarding?: any;
}) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return { success: false, error: "يجب تسجيل الدخول لاستيراد البيانات" };
    }

    const userId = session.user.id;
    const {
      tasks = [],
      taskSessions = [],
      entityRevisions = [],
      prayers = [],
      trackers = [],
      trackerEntries = [],
      abstinenceTrackers = [],
      abstinenceSessions = [],
      dailyNotes = [],
      gymWorkouts = [],
      mealEntries = [],
      waterEntries = [],
      expenseEntries = [],
      preferences = null,
      onboarding = null,
    } = payload;

    const importedCounts: Record<string, number> = {
      tasks: 0,
      taskSessions: 0,
      entityRevisions: 0,
      prayers: 0,
      trackers: 0,
      trackerEntries: 0,
      abstinence: 0,
      dailyNotes: 0,
      gymWorkouts: 0,
      mealEntries: 0,
      waterEntries: 0,
      expenseEntries: 0,
    };

    // Execute import in an atomic Prisma transaction with ownership & idempotency checks
    await prisma.$transaction(async (tx) => {
      // 1. Import Trackers first so tasks/entries referencing them can remap IDs cleanly
      const trackerIdMap = new Map<string, string>();
      for (const tr of trackers) {
        if (!tr?.name) continue;
        const origId = tr.id || crypto.randomUUID();
        const existingById = await tx.tracker.findUnique({
          where: { id: origId },
          select: { id: true, userId: true },
        });
        const targetId =
          origId.startsWith("guest_") || (existingById && existingById.userId !== userId)
            ? crypto.randomUUID()
            : origId;

        trackerIdMap.set(origId, targetId);

        // Ensure unique slug for this user
        const baseSlug = tr.slug || slugify(tr.name);
        let finalSlug = baseSlug;
        let slugCounter = 1;
        while (
          await tx.tracker.findFirst({
            where: { userId, slug: finalSlug, id: { not: targetId } },
            select: { id: true },
          })
        ) {
          slugCounter++;
          finalSlug = `${baseSlug}-${slugCounter}`;
        }

        const existingTarget = await tx.tracker.findUnique({
          where: { id: targetId },
          select: { id: true, userId: true },
        });

        if (existingTarget && existingTarget.userId === userId) {
          await tx.tracker.update({
            where: { id: targetId },
            data: {
              name: tr.name,
              description: tr.description || null,
              icon: tr.icon || "Flame",
              color: tr.color || "emerald",
              targetValue: tr.targetValue ?? null,
              scheduleConfig: tr.scheduleConfig ?? {},
              trackerConfig: tr.trackerConfig ?? {},
              displayPreferences: tr.displayPreferences ?? {},
              isPaused: Boolean(tr.isPaused),
              isArchived: Boolean(tr.isArchived),
            },
          });
        } else {
          await tx.tracker.create({
            data: {
              id: targetId,
              userId,
              name: tr.name,
              slug: finalSlug,
              description: tr.description || null,
              icon: tr.icon || "Flame",
              color: tr.color || "emerald",
              priority: tr.priority ?? 1,
              metricType: tr.metricType || "BOOLEAN",
              unit: tr.unit || null,
              targetValue: tr.targetValue ?? null,
              targetFrequency: tr.targetFrequency || "DAILY",
              scheduleConfig: tr.scheduleConfig ?? {},
              trackerConfig: tr.trackerConfig ?? {},
              displayPreferences: tr.displayPreferences ?? {},
              sortOrder: tr.sortOrder ?? 0,
              version: tr.version || 1,
              isPaused: Boolean(tr.isPaused),
              isArchived: Boolean(tr.isArchived),
            },
          });
        }

        importedCounts.trackers++;
      }

      // 2. Import Tracker Entries (mapping old guest trackerId -> imported trackerId)
      for (const entry of trackerEntries) {
        if (!entry?.trackerId || !entry?.localDate) continue;
        const mappedTrackerId = trackerIdMap.get(entry.trackerId) || entry.trackerId;
        const ownsTracker = await tx.tracker.findFirst({
          where: { id: mappedTrackerId, userId },
          select: { id: true },
        });
        if (!ownsTracker) continue;

        const origEntryId = entry.id || crypto.randomUUID();
        const existingEntry = await tx.trackerEntry.findUnique({
          where: { id: origEntryId },
          select: { id: true, userId: true },
        });
        if (existingEntry && existingEntry.userId !== userId) continue;

        await tx.trackerEntry.upsert({
          where: { id: origEntryId },
          create: {
            id: origEntryId,
            userId,
            trackerId: mappedTrackerId,
            localDate: entry.localDate,
            occurredAt: entry.occurredAt ? new Date(entry.occurredAt) : new Date(),
            valueBoolean: entry.valueBoolean ?? null,
            valueNumeric: entry.valueNumeric ?? null,
            valueDuration: entry.valueDuration ?? null,
            timeRangeStart: entry.timeRangeStart ? new Date(entry.timeRangeStart) : null,
            timeRangeEnd: entry.timeRangeEnd ? new Date(entry.timeRangeEnd) : null,
            entryPayload: entry.entryPayload ?? undefined,
            notes: entry.notes ?? null,
            trackerVersion: entry.trackerVersion ?? 1,
          },
          update: {
            valueBoolean: entry.valueBoolean ?? null,
            valueNumeric: entry.valueNumeric ?? null,
            valueDuration: entry.valueDuration ?? null,
            entryPayload: entry.entryPayload ?? undefined,
            notes: entry.notes ?? null,
          },
        });
        importedCounts.trackerEntries++;
      }

      // 3. Import Tasks (Idempotent upsert with ownership verification)
      const taskIdMap = new Map<string, string>();
      for (const t of tasks) {
        if (!t.title) continue;
        const origTaskId = t.id || crypto.randomUUID();
        const existingTask = await tx.task.findUnique({
          where: { id: origTaskId },
          select: { id: true, userId: true },
        });
        const taskId =
          existingTask && existingTask.userId !== userId ? crypto.randomUUID() : origTaskId;
        taskIdMap.set(origTaskId, taskId);

        const mappedTrackerId = t.trackerId
          ? trackerIdMap.get(t.trackerId) || t.trackerId
          : null;

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
            completedAt:
              t.status === "COMPLETED"
                ? t.completedAt
                  ? new Date(t.completedAt)
                  : new Date()
                : null,
            isPomodoro: Boolean(t.isPomodoro),
            workCycle: t.workCycle || 25,
            breakCycle: t.breakCycle || 5,
            isRecurring: Boolean(t.isRecurring),
            subtasks: t.subtasks || [],
            tags: t.tags || [],
            sortOrder: t.sortOrder || 0,
            version: (t.version || 1) + 1,
            trackerId: mappedTrackerId,
          },
          update: {
            title: t.title,
            description: t.description || null,
            dueDate: t.dueDate || null,
            status: t.status || "TODO",
            completedAt:
              t.status === "COMPLETED"
                ? t.completedAt
                  ? new Date(t.completedAt)
                  : new Date()
                : null,
            subtasks: t.subtasks || [],
            tags: t.tags || [],
          },
        });

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

      // 3b. Import Task Execution Sessions (preserving timestamps & untracked flags)
      if (Array.isArray(taskSessions)) {
        for (const s of taskSessions) {
          if (!s?.taskTitleSnapshot || !s?.localDate) continue;
          const origSessId = s.id || crypto.randomUUID();
          const existingSess = await tx.taskSession.findUnique({
            where: { id: origSessId },
            select: { id: true, userId: true },
          });
          const sessId =
            existingSess && existingSess.userId !== userId
              ? crypto.randomUUID()
              : origSessId;
          const mappedTaskId = s.taskId ? taskIdMap.get(s.taskId) || s.taskId : origSessId;
          const mappedTrackerId = s.trackerId
            ? trackerIdMap.get(s.trackerId) || s.trackerId
            : null;

          await tx.taskSession.upsert({
            where: { id: sessId },
            create: {
              id: sessId,
              userId,
              taskId: mappedTaskId,
              trackerId: mappedTrackerId,
              localDate: s.localDate,
              startedAt: s.startedAt ? new Date(s.startedAt) : null,
              endedAt: s.endedAt ? new Date(s.endedAt) : null,
              durationSeconds: s.durationSeconds ?? null,
              status: s.status || "completed",
              completionSource: s.completionSource || "timer",
              isEstimated: Boolean(s.isEstimated),
              completedCycles: Number(s.completedCycles) || 0,
              taskTitleSnapshot: s.taskTitleSnapshot,
              taskDescriptionSnapshot: s.taskDescriptionSnapshot ?? null,
              subtasksSnapshot: Array.isArray(s.subtasksSnapshot) ? s.subtasksSnapshot : [],
              lifeAreaIdSnapshot: s.lifeAreaIdSnapshot ?? null,
              lifeAreaNameSnapshot: s.lifeAreaNameSnapshot ?? null,
              notes: s.notes ?? null,
            },
            update: {
              taskTitleSnapshot: s.taskTitleSnapshot,
              notes: s.notes ?? undefined,
            },
          });
          importedCounts.taskSessions++;
        }
      }

      // 3c. Import Historical Entity Revisions
      if (Array.isArray(entityRevisions)) {
        for (const r of entityRevisions) {
          if (!r?.entityType || !r?.entityId) continue;
          const origRevId = r.id || crypto.randomUUID();
          const existingRev = await tx.entityRevision.findUnique({
            where: { id: origRevId },
            select: { id: true, userId: true },
          });
          if (existingRev && existingRev.userId !== userId) continue;
          const mappedEntityId =
            r.entityType === "task"
              ? taskIdMap.get(r.entityId) || r.entityId
              : r.entityType === "tracker"
                ? trackerIdMap.get(r.entityId) || r.entityId
                : r.entityId;

          await tx.entityRevision.upsert({
            where: { id: origRevId },
            create: {
              id: origRevId,
              userId,
              entityType: r.entityType,
              entityId: mappedEntityId,
              localDate: r.localDate ?? null,
              revisionNumber: Number(r.revisionNumber) || 1,
              previousValues: r.previousValues || {},
              newValues: r.newValues || {},
              editedBy: r.editedBy || "guest",
              editedAt: r.editedAt ? new Date(r.editedAt) : new Date(),
              reason: r.reason ?? null,
            },
            update: {},
          });
          importedCounts.entityRevisions++;
        }
      }

      // 4. Import Daily Notes
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
            title: n.title || null,
            content: n.content || "",
            mood: n.mood || null,
            tags: n.tags || [],
          },
          update: {
            title: n.title || undefined,
            content: n.content || "",
            mood: n.mood || null,
            tags: n.tags || [],
          },
        });

        importedCounts.dailyNotes++;
      }

      // 5. Import Gym Workouts
      for (const g of gymWorkouts) {
        if (!g.title || !g.date) continue;
        const origGymId = g.id || crypto.randomUUID();
        const existingGym = await tx.gymWorkout.findUnique({
          where: { id: origGymId },
          select: { id: true, userId: true },
        });
        const gymId =
          existingGym && existingGym.userId !== userId ? crypto.randomUUID() : origGymId;

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

      // 6. Import Meal Entries
      for (const m of mealEntries) {
        if (!m.title || !m.date) continue;
        const origMealId = m.id || crypto.randomUUID();
        const existingMeal = await tx.mealEntry.findUnique({
          where: { id: origMealId },
          select: { id: true, userId: true },
        });
        const mealId =
          existingMeal && existingMeal.userId !== userId ? crypto.randomUUID() : origMealId;

        await tx.mealEntry.upsert({
          where: { id: mealId },
          create: {
            id: mealId,
            userId,
            date: m.date,
            time: m.time || null,
            mealType: m.mealType || "lunch",
            title: m.title,
            calories: Math.round(Number(m.calories || 0)),
            protein: Number(m.protein || 0),
            carbs: Number(m.carbs || 0),
            fat: Number(m.fat || 0),
            items: Array.isArray(m.items) ? m.items : [],
            dailyTargetsSnapshot: m.dailyTargetsSnapshot ?? undefined,
            notes: m.notes || null,
          },
          update: {
            title: m.title,
            time: m.time || null,
            calories: Math.round(Number(m.calories || 0)),
            protein: Number(m.protein || 0),
            carbs: Number(m.carbs || 0),
            fat: Number(m.fat || 0),
            items: Array.isArray(m.items) ? m.items : [],
          },
        });

        importedCounts.mealEntries++;
      }

      // 6b. Import Water Entries
      for (const w of waterEntries) {
        const amountMl = Math.round(Number(w?.amountMl || 0));
        if (!w?.date || amountMl <= 0) continue;
        const origWaterId = w.id || crypto.randomUUID();
        const existingWater = await tx.waterEntry.findUnique({
          where: { id: origWaterId },
          select: { id: true, userId: true },
        });
        const waterId =
          existingWater && existingWater.userId !== userId ? crypto.randomUUID() : origWaterId;

        await tx.waterEntry.upsert({
          where: { id: waterId },
          create: {
            id: waterId,
            userId,
            date: w.date,
            amountMl,
            occurredAt: w.occurredAt ? new Date(w.occurredAt) : new Date(),
            source: w.source || "nutrition",
            notes: w.notes || null,
          },
          update: {
            amountMl,
            date: w.date,
          },
        });

        importedCounts.waterEntries++;
      }

      // 7. Import Expense Entries
      for (const e of expenseEntries) {
        if (!e.title || !e.date) continue;
        const origExpId = e.id || crypto.randomUUID();
        const existingExp = await tx.expenseEntry.findUnique({
          where: { id: origExpId },
          select: { id: true, userId: true },
        });
        const expId =
          existingExp && existingExp.userId !== userId ? crypto.randomUUID() : origExpId;

        const txCurrency = e.currency
          ? String(e.currency).toUpperCase().trim()
          : preferences?.currency
            ? String(preferences.currency).toUpperCase().trim()
            : "EGP";
        const txType = e.type === "income" ? "income" : "expense";

        await tx.expenseEntry.upsert({
          where: { id: expId },
          create: {
            id: expId,
            userId,
            date: e.date,
            title: e.title,
            amount: e.amount || 0,
            currency: txCurrency,
            type: txType,
            category: e.category || "عام",
            notes: e.notes || null,
          },
          update: {
            title: e.title,
            amount: e.amount || 0,
            currency: txCurrency,
            type: txType,
            category: e.category || "عام",
          },
        });

        importedCounts.expenseEntries++;
      }

      // 7b. Merge explicit guest localization/prayer/onboarding preferences safely without clobbering existing non-empty account prefs
      if ((preferences && typeof preferences === "object") || (onboarding && typeof onboarding === "object")) {
        const existingSettings = await tx.userSettings.findUnique({
          where: { userId },
          select: {
            id: true,
            dashboardConfig: true,
            countryCode: true,
            salutation: true,
            religion: true,
            onboardingCompleted: true,
            onboardingStep: true,
            onboardingCompletedAt: true,
          },
        });
        const prevCfg =
          existingSettings?.dashboardConfig && typeof existingSettings.dashboardConfig === "object"
            ? (existingSettings.dashboardConfig as Record<string, any>)
            : {};

        const guestSalutation =
          onboarding?.salutation || preferences?.salutation || null;
        const guestReligion =
          onboarding?.religion || preferences?.religion || null;
        const resolvedSalutation = existingSettings?.salutation || guestSalutation;
        const resolvedReligion = existingSettings?.religion || guestReligion;
        const resolvedOnboarded = Boolean(
          existingSettings?.onboardingCompleted || onboarding?.completed || preferences?.onboardingCompleted
        );
        const resolvedStep = existingSettings?.onboardingCompleted
          ? 3
          : onboarding?.currentStep || existingSettings?.onboardingStep || 1;
        const resolvedCompletedAt =
          existingSettings?.onboardingCompletedAt ||
          (resolvedOnboarded
            ? onboarding?.completedAt
              ? new Date(onboarding.completedAt)
              : new Date()
            : null);

        await tx.userSettings.upsert({
          where: { userId },
          create: {
            userId,
            timezone: preferences?.timezone || "Africa/Cairo",
            countryCode: preferences?.countryCode || "EG",
            governorate: preferences?.governorate || "القاهرة",
            city: preferences?.city || null,
            currency: preferences?.currency || "EGP",
            currencyAuto: preferences?.currencyAuto ?? true,
            prayerTrackingEnabled:
              preferences?.prayerTrackingEnabled ??
              (resolvedReligion ? resolvedReligion === "muslim" : true),
            salutation: resolvedSalutation,
            religion: resolvedReligion,
            onboardingCompleted: resolvedOnboarded,
            onboardingStep: resolvedStep,
            onboardingCompletedAt: resolvedCompletedAt,
            dashboardConfig: {
              ...prevCfg,
              ...(preferences?.country ? { country: preferences.country } : {}),
              ...(preferences?.countryCode ? { countryCode: preferences.countryCode } : {}),
              ...(preferences?.governorate ? { governorate: preferences.governorate } : {}),
              ...(preferences?.city !== undefined ? { city: preferences.city } : {}),
              ...(preferences?.prayerCalc ? { prayerCalc: preferences.prayerCalc } : {}),
              ...(preferences?.prayerPreferenceConfigured !== undefined
                ? { prayerPreferenceConfigured: Boolean(preferences.prayerPreferenceConfigured) }
                : {}),
              ...(resolvedSalutation ? { salutation: resolvedSalutation } : {}),
              ...(resolvedReligion ? { religion: resolvedReligion } : {}),
              onboardingCompleted: resolvedOnboarded,
            },
          },
          update: {
            ...(preferences?.timezone ? { timezone: preferences.timezone } : {}),
            ...(preferences?.countryCode ? { countryCode: preferences.countryCode } : {}),
            ...(preferences?.governorate ? { governorate: preferences.governorate } : {}),
            ...(preferences?.city !== undefined ? { city: preferences.city } : {}),
            ...(preferences?.currency ? { currency: preferences.currency } : {}),
            ...(preferences?.currencyAuto !== undefined
              ? { currencyAuto: Boolean(preferences.currencyAuto) }
              : {}),
            ...(preferences?.prayerTrackingEnabled !== undefined && !existingSettings?.religion
              ? { prayerTrackingEnabled: Boolean(preferences.prayerTrackingEnabled) }
              : {}),
            ...(resolvedSalutation && !existingSettings?.salutation
              ? { salutation: resolvedSalutation }
              : {}),
            ...(resolvedReligion && !existingSettings?.religion
              ? { religion: resolvedReligion }
              : {}),
            ...(resolvedOnboarded && !existingSettings?.onboardingCompleted
              ? {
                  onboardingCompleted: true,
                  onboardingStep: 3,
                  onboardingCompletedAt: resolvedCompletedAt,
                }
              : {}),
            dashboardConfig: {
              ...prevCfg,
              ...(preferences?.country ? { country: preferences.country } : {}),
              ...(preferences?.countryCode ? { countryCode: preferences.countryCode } : {}),
              ...(preferences?.governorate ? { governorate: preferences.governorate } : {}),
              ...(preferences?.city !== undefined ? { city: preferences.city } : {}),
              ...(preferences?.prayerCalc ? { prayerCalc: preferences.prayerCalc } : {}),
              ...(preferences?.prayerPreferenceConfigured !== undefined
                ? { prayerPreferenceConfigured: Boolean(preferences.prayerPreferenceConfigured) }
                : {}),
              ...(resolvedSalutation ? { salutation: resolvedSalutation } : {}),
              ...(resolvedReligion ? { religion: resolvedReligion } : {}),
              onboardingCompleted: resolvedOnboarded,
            },
          },
        });
      }

      // 8. Import Prayer Records
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
              completedAt: p.isCompleted
                ? p.completedAt
                  ? new Date(p.completedAt)
                  : new Date()
                : null,
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

      // 9. Import Abstinence Trackers & All Sessions (active + relapse history)
      if (Array.isArray(abstinenceTrackers)) {
        const absIdMap = new Map<string, string>();
        for (const a of abstinenceTrackers) {
          if (!a.name) continue;
          const origAbsId = a.id || crypto.randomUUID();
          const existingAbs = await tx.abstinenceTracker.findUnique({
            where: { id: origAbsId },
            select: { id: true, userId: true },
          });
          const absId =
            origAbsId.startsWith("guest_abs_") || (existingAbs && existingAbs.userId !== userId)
              ? crypto.randomUUID()
              : origAbsId;
          absIdMap.set(origAbsId, absId);

          const mappedLinkTrackerId = a.trackerId
            ? trackerIdMap.get(a.trackerId) || null
            : null;

          const createdTracker = await tx.abstinenceTracker.upsert({
            where: { id: absId },
            create: {
              id: absId,
              userId,
              trackerId: mappedLinkTrackerId,
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

          const trackerSessions = abstinenceSessions.filter(
            (s) => s.abstinenceTrackerId === origAbsId || s.trackerId === origAbsId
          );

          if (trackerSessions.length > 0) {
            for (const s of trackerSessions) {
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
                  abstinenceTrackerId: createdTracker.id,
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
          } else {
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
          }

          importedCounts.abstinence = (importedCounts.abstinence || 0) + 1;
        }
      }
    });

    revalidatePath("/");
    revalidatePath("/tasks");
    revalidatePath("/habits");
    revalidatePath("/journal");
    revalidatePath("/abstinence");
    revalidatePath("/expenses");
    revalidatePath("/nutrition");
    revalidatePath("/gym");

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
