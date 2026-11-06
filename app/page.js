import { Suspense } from "react";
import { getServerSession } from "@/lib/auth-session";
import { getTrackers } from "@/actions/trackers";
import { getDailyEntries } from "@/actions/entries";
import { getTasks, getTaskStats } from "@/actions/tasks";
import { getLifeAreas } from "@/actions/life-areas";
import { getLocalDateString } from "@/lib/dates";
import DashboardClient from "@/components/dashboard/DashboardClient";
import UnauthenticatedWelcome from "@/components/dashboard/UnauthenticatedWelcome";
import { Loader2 } from "lucide-react";

async function DashboardServer({ searchParamsPromise }) {
  const session = await getServerSession();
  const searchParams = searchParamsPromise ? await searchParamsPromise : {};

  // If unauthenticated, render marketing/welcome view directly
  if (!session?.user) {
    return <UnauthenticatedWelcome authError={searchParams?.error} />;
  }

  const todayStr = getLocalDateString();

  // Concurrent server-side parallel fetching:
  // - Reuses singleton Prisma client & connection pool
  // - Avoids multiple client-side HTTP roundtrips
  // - Completely eliminates client waterfalls and layout shifts
  const [trackersRes, entriesRes, tasksRes, statsRes, areasRes] = await Promise.all([
    getTrackers({ isArchived: false, isPaused: false }),
    getDailyEntries(todayStr),
    getTasks({ view: "today", localDate: todayStr }),
    getTaskStats(todayStr),
    getLifeAreas(false),
  ]);

  return (
    <DashboardClient
      user={session.user}
      initialDate={todayStr}
      initialTrackers={trackersRes.success ? trackersRes.data || [] : []}
      initialDailyEntries={entriesRes.success ? entriesRes.data || [] : []}
      initialTodayTasks={tasksRes.success ? tasksRes.data || [] : []}
      initialTaskStats={
        statsRes.success && statsRes.data
          ? statsRes.data
          : { todayCount: 0, overdueCount: 0 }
      }
      initialLifeAreas={areasRes.success ? areasRes.data || [] : []}
    />
  );
}

export default function HomePage(props) {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
        </div>
      }
    >
      <DashboardServer searchParamsPromise={props.searchParams} />
    </Suspense>
  );
}
