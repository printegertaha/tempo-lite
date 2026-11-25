import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-session";

/**
 * Incremental & Full Pull Endpoint for Local-First Synchronization.
 * Returns only records changed since `since` (epoch ms) plus deletion tombstones.
 * Authenticated strictly via server session cookie; never cached in HTTP caches.
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

    const serverNow = Date.now();

    const [
      tasks,
      lifeAreas,
      trackers,
      trackerEntries,
      dailyNotes,
      prayerRecords,
      abstinenceTrackers,
      abstinenceSessions,
      gymWorkouts,
      mealEntries,
      expenseEntries,
      userSettings,
      userProfile,
      deletions,
    ] = await Promise.all([
      prisma.task.findMany({
        where: { userId, ...updatedFilter },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take: isFullSync ? 1000 : undefined,
      }),
      prisma.lifeArea.findMany({
        where: { userId, ...updatedFilter },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.tracker.findMany({
        where: { userId, ...updatedFilter },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.trackerEntry.findMany({
        where: { userId, ...updatedFilter },
        orderBy: { occurredAt: "desc" },
        take: isFullSync ? 2000 : undefined,
      }),
      prisma.dailyNote.findMany({
        where: { userId, ...updatedFilter },
        orderBy: { localDate: "desc" },
        take: isFullSync ? 365 : undefined,
      }),
      prisma.prayerRecord.findMany({
        where: { userId, ...updatedFilter },
        orderBy: { date: "desc" },
        take: isFullSync ? 1825 : undefined,
      }),
      prisma.abstinenceTracker.findMany({
        where: { userId, ...updatedFilter },
        orderBy: { createdAt: "asc" },
      }),
      prisma.abstinenceSession.findMany({
        where: { userId, ...updatedFilter },
        orderBy: { startedAt: "desc" },
      }),
      prisma.gymWorkout.findMany({
        where: { userId, ...updatedFilter },
        orderBy: { date: "desc" },
        take: isFullSync ? 500 : undefined,
      }),
      prisma.mealEntry.findMany({
        where: { userId, ...updatedFilter },
        orderBy: { date: "desc" },
        take: isFullSync ? 500 : undefined,
      }),
      prisma.expenseEntry.findMany({
        where: { userId, ...updatedFilter },
        orderBy: { date: "desc" },
        take: isFullSync ? 1000 : undefined,
      }),
      prisma.userSettings.findUnique({
        where: { userId },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, image: true },
      }),
      sinceDate
        ? prisma.mutationReceipt.findMany({
            where: {
              userId,
              action: "delete",
              createdAt: { gt: sinceDate },
            },
            select: {
              entityType: true,
              entityId: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
    ]);

    let safeSettings: any = null;
    if (
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
        changes: {
          tasks,
          lifeAreas,
          trackers,
          trackerEntries,
          dailyNotes,
          prayerRecords,
          abstinenceTrackers,
          abstinenceSessions,
          gymWorkouts,
          mealEntries,
          expenseEntries,
          userSettings: safeSettings,
        },
        deletions,
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
