import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-session";

const DEFAULT_PAGE_SIZE = 400;
const MAX_PAGE_SIZE = 1000;

type CursorMap = Record<string, string | null | undefined>;

async function fetchKeysetPage<T extends { id: string }>(
  queryFn: (args: {
    take: number;
    skip?: number;
    cursor?: { id: string };
    orderBy: { id: "asc" };
  }) => Promise<T[]>,
  cursorId: string | null | undefined,
  pageSize: number
): Promise<{ items: T[]; nextCursor: string | null }> {
  const rows = await queryFn({
    take: pageSize + 1,
    ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    orderBy: { id: "asc" },
  });

  if (rows.length > pageSize) {
    const items = rows.slice(0, pageSize);
    return {
      items,
      nextCursor: items[items.length - 1]?.id ?? null,
    };
  }

  return {
    items: rows,
    nextCursor: null,
  };
}

function parseCursorsParam(raw: string | null): CursorMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Incremental & Full Paginated Pull Endpoint for Local-First Synchronization.
 * Uses stable keyset pagination so complete multi-year histories are retrieved
 * without arbitrary row truncation or partial-snapshot data loss.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED: Active session required." },
        { status: 401, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    const userId = session.user.id;
    const sinceRaw = req.nextUrl.searchParams.get("since");
    const sinceNum = sinceRaw ? Number(sinceRaw) : 0;
    const isFullSync = !Number.isFinite(sinceNum) || sinceNum <= 0;
    const sinceDate = isFullSync ? null : new Date(sinceNum);
    const updatedFilter = sinceDate ? { updatedAt: { gt: sinceDate } } : {};

    const limitRaw = Number(req.nextUrl.searchParams.get("limit"));
    const pageSize =
      Number.isFinite(limitRaw) && limitRaw >= 50
        ? Math.min(Math.floor(limitRaw), MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE;

    const cursors = parseCursorsParam(req.nextUrl.searchParams.get("cursors"));
    const isFirstPage = Object.values(cursors).every((v) => !v);
    const serverNow = Date.now();

    const shouldFetch = (key: string) => isFirstPage || Boolean(cursors[key]);

    const [
      tasksPage,
      taskSessionsPage,
      entityRevisionsPage,
      lifeAreasPage,
      trackersPage,
      trackerEntriesPage,
      dailyNotesPage,
      prayerRecordsPage,
      abstinenceTrackersPage,
      abstinenceSessionsPage,
      gymWorkoutsPage,
      mealEntriesPage,
      waterEntriesPage,
      expenseEntriesPage,
      userSettings,
      userProfile,
      deletionsPage,
    ] = await Promise.all([
      shouldFetch("tasks")
        ? fetchKeysetPage(
            (args) =>
              prisma.task.findMany({
                where: { userId, ...updatedFilter },
                ...args,
              }),
            cursors.tasks,
            pageSize
          )
        : Promise.resolve({ items: [], nextCursor: null }),
      shouldFetch("taskSessions")
        ? fetchKeysetPage(
            (args) =>
              prisma.taskSession.findMany({
                where: { userId, ...updatedFilter },
                ...args,
              }),
            cursors.taskSessions,
            pageSize
          )
        : Promise.resolve({ items: [], nextCursor: null }),
      shouldFetch("entityRevisions")
        ? fetchKeysetPage(
            (args) =>
              prisma.entityRevision.findMany({
                where: { userId, ...updatedFilter },
                ...args,
              }),
            cursors.entityRevisions,
            pageSize
          )
        : Promise.resolve({ items: [], nextCursor: null }),
      shouldFetch("lifeAreas")
        ? fetchKeysetPage(
            (args) =>
              prisma.lifeArea.findMany({
                where: { userId, ...updatedFilter },
                ...args,
              }),
            cursors.lifeAreas,
            pageSize
          )
        : Promise.resolve({ items: [], nextCursor: null }),
      shouldFetch("trackers")
        ? fetchKeysetPage(
            (args) =>
              prisma.tracker.findMany({
                where: { userId, ...updatedFilter },
                include: {
                  versions: {
                    orderBy: { versionNumber: "asc" },
                  },
                },
                ...args,
              }),
            cursors.trackers,
            pageSize
          )
        : Promise.resolve({ items: [], nextCursor: null }),
      shouldFetch("trackerEntries")
        ? fetchKeysetPage(
            (args) =>
              prisma.trackerEntry.findMany({
                where: { userId, ...updatedFilter },
                ...args,
              }),
            cursors.trackerEntries,
            pageSize
          )
        : Promise.resolve({ items: [], nextCursor: null }),
      shouldFetch("dailyNotes")
        ? fetchKeysetPage(
            (args) =>
              prisma.dailyNote.findMany({
                where: { userId, ...updatedFilter },
                ...args,
              }),
            cursors.dailyNotes,
            pageSize
          )
        : Promise.resolve({ items: [], nextCursor: null }),
      shouldFetch("prayerRecords")
        ? fetchKeysetPage(
            (args) =>
              prisma.prayerRecord.findMany({
                where: { userId, ...updatedFilter },
                ...args,
              }),
            cursors.prayerRecords,
            pageSize
          )
        : Promise.resolve({ items: [], nextCursor: null }),
      shouldFetch("abstinenceTrackers")
        ? fetchKeysetPage(
            (args) =>
              prisma.abstinenceTracker.findMany({
                where: { userId, ...updatedFilter },
                ...args,
              }),
            cursors.abstinenceTrackers,
            pageSize
          )
        : Promise.resolve({ items: [], nextCursor: null }),
      shouldFetch("abstinenceSessions")
        ? fetchKeysetPage(
            (args) =>
              prisma.abstinenceSession.findMany({
                where: { userId, ...updatedFilter },
                ...args,
              }),
            cursors.abstinenceSessions,
            pageSize
          )
        : Promise.resolve({ items: [], nextCursor: null }),
      shouldFetch("gymWorkouts")
        ? fetchKeysetPage(
            (args) =>
              prisma.gymWorkout.findMany({
                where: { userId, ...updatedFilter },
                ...args,
              }),
            cursors.gymWorkouts,
            pageSize
          )
        : Promise.resolve({ items: [], nextCursor: null }),
      shouldFetch("mealEntries")
        ? fetchKeysetPage(
            (args) =>
              prisma.mealEntry.findMany({
                where: { userId, ...updatedFilter },
                ...args,
              }),
            cursors.mealEntries,
            pageSize
          )
        : Promise.resolve({ items: [], nextCursor: null }),
      shouldFetch("waterEntries")
        ? fetchKeysetPage(
            (args) =>
              prisma.waterEntry.findMany({
                where: { userId, ...updatedFilter },
                ...args,
              }),
            cursors.waterEntries,
            pageSize
          )
        : Promise.resolve({ items: [], nextCursor: null }),
      shouldFetch("expenseEntries")
        ? fetchKeysetPage(
            (args) =>
              prisma.expenseEntry.findMany({
                where: { userId, ...updatedFilter },
                ...args,
              }),
            cursors.expenseEntries,
            pageSize
          )
        : Promise.resolve({ items: [], nextCursor: null }),
      isFirstPage
        ? prisma.userSettings.findUnique({ where: { userId } })
        : Promise.resolve(null),
      isFirstPage
        ? prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, image: true },
          })
        : Promise.resolve(null),
      sinceDate && shouldFetch("deletions")
        ? fetchKeysetPage(
            (args) =>
              prisma.mutationReceipt.findMany({
                where: {
                  userId,
                  action: "delete",
                  createdAt: { gt: sinceDate },
                },
                select: {
                  id: true,
                  entityType: true,
                  entityId: true,
                  createdAt: true,
                },
                ...args,
              }),
            cursors.deletions,
            pageSize
          )
        : Promise.resolve({ items: [], nextCursor: null }),
    ]);

    const nextCursors: Record<string, string> = {};
    const assignCursor = (key: string, val: string | null) => {
      if (val) nextCursors[key] = val;
    };

    assignCursor("tasks", tasksPage.nextCursor);
    assignCursor("taskSessions", taskSessionsPage.nextCursor);
    assignCursor("entityRevisions", entityRevisionsPage.nextCursor);
    assignCursor("lifeAreas", lifeAreasPage.nextCursor);
    assignCursor("trackers", trackersPage.nextCursor);
    assignCursor("trackerEntries", trackerEntriesPage.nextCursor);
    assignCursor("dailyNotes", dailyNotesPage.nextCursor);
    assignCursor("prayerRecords", prayerRecordsPage.nextCursor);
    assignCursor("abstinenceTrackers", abstinenceTrackersPage.nextCursor);
    assignCursor("abstinenceSessions", abstinenceSessionsPage.nextCursor);
    assignCursor("gymWorkouts", gymWorkoutsPage.nextCursor);
    assignCursor("mealEntries", mealEntriesPage.nextCursor);
    assignCursor("waterEntries", waterEntriesPage.nextCursor);
    assignCursor("expenseEntries", expenseEntriesPage.nextCursor);
    assignCursor("deletions", deletionsPage.nextCursor);

    const hasMore = Object.keys(nextCursors).length > 0;

    let safeSettings: any = null;
    if (
      isFirstPage &&
      userSettings &&
      (!sinceDate || userSettings.updatedAt.getTime() > sinceDate.getTime() || isFullSync)
    ) {
      const cfg =
        userSettings.dashboardConfig && typeof userSettings.dashboardConfig === "object"
          ? { ...(userSettings.dashboardConfig as Record<string, any>) }
          : {};
      delete cfg.avatarData;
      safeSettings = {
        ...userSettings,
        dashboardConfig: cfg,
        userProfile: userProfile || null,
      };
    }

    return NextResponse.json(
      {
        success: true,
        serverTimestamp: serverNow,
        isFullSync,
        hasMore,
        nextCursors: hasMore ? nextCursors : null,
        completeSnapshot: !hasMore,
        changes: {
          tasks: tasksPage.items,
          taskSessions: taskSessionsPage.items,
          entityRevisions: entityRevisionsPage.items,
          lifeAreas: lifeAreasPage.items,
          trackers: trackersPage.items,
          trackerEntries: trackerEntriesPage.items,
          dailyNotes: dailyNotesPage.items,
          prayerRecords: prayerRecordsPage.items,
          abstinenceTrackers: abstinenceTrackersPage.items,
          abstinenceSessions: abstinenceSessionsPage.items,
          gymWorkouts: gymWorkoutsPage.items,
          mealEntries: mealEntriesPage.items,
          waterEntries: waterEntriesPage.items,
          expenseEntries: expenseEntriesPage.items,
          userSettings: safeSettings,
        },
        deletions: deletionsPage.items,
      },
      {
        headers: {
          "Cache-Control": "no-store, private",
        },
      }
    );
  } catch (error: any) {
    console.error("Incremental pull sync error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "INTERNAL_PULL_ERROR",
      },
      { status: 500, headers: { "Cache-Control": "no-store, private" } }
    );
  }
}
