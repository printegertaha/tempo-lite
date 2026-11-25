import { Suspense } from "react";
import { connection } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import { getServerUserTemporalContext } from "@/lib/server-user";
import { getTasks } from "@/actions/tasks";
import { getDailyPrayers } from "@/actions/prayers";
import { getLifeAreas } from "@/actions/life-areas";
import HomeView from "@/components/home/HomeView";
import { Loader2 } from "lucide-react";

async function HomeServer() {
  await connection();
  const session = await getServerSession();
  const { timezone, todayStr } = await getServerUserTemporalContext(session?.user?.id);

  // If unauthenticated, render Home in Guest Mode directly (Zero friction first visit)
  if (!session?.user) {
    const guestUser = {
      id: "guest",
      name: "ضيف أثـر",
      email: null,
      isGuest: true,
    };

    return (
      <HomeView
        user={guestUser}
        initialDate={todayStr}
        timezone={timezone}
        initialTodayTasks={[]}
        initialPrayers={[]}
        initialLifeAreas={[]}
      />
    );
  }

  // Parallel server fetch for authenticated user (includes active, overdue, open, upcoming, and today's completed tasks)
  const [tasksRes, prayersRes, areasRes] = await Promise.all([
    getTasks({ view: "home", localDate: todayStr, pageSize: 300 }),
    getDailyPrayers(todayStr),
    getLifeAreas(false),
  ]);

  return (
    <HomeView
      user={session.user}
      initialDate={todayStr}
      timezone={timezone}
      initialTodayTasks={tasksRes.success ? tasksRes.data || [] : []}
      initialPrayers={prayersRes.success ? prayersRes.data || [] : []}
      initialLifeAreas={areasRes.success ? areasRes.data || [] : []}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
        </div>
      }
    >
      <HomeServer />
    </Suspense>
  );
}
