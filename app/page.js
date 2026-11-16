import { Suspense } from "react";
import { connection } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import { getTasks } from "@/actions/tasks";
import { getDailyPrayers } from "@/actions/prayers";
import { getLifeAreas } from "@/actions/life-areas";
import { getLocalDateString } from "@/lib/dates";
import HomeView from "@/components/home/HomeView";
import { Loader2 } from "lucide-react";

async function HomeServer() {
  await connection();
  const session = await getServerSession();
  const todayStr = getLocalDateString();

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
        initialTodayTasks={[]}
        initialPrayers={[]}
        initialLifeAreas={[]}
      />
    );
  }

  // Parallel server fetch for authenticated user
  const [tasksRes, prayersRes, areasRes] = await Promise.all([
    getTasks({ view: "today", localDate: todayStr }),
    getDailyPrayers(todayStr),
    getLifeAreas(false),
  ]);

  return (
    <HomeView
      user={session.user}
      initialDate={todayStr}
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
