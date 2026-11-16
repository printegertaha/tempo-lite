import { Suspense } from "react";
import { connection } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import WeeklyPlannerView from "@/components/planner/WeeklyPlannerView";
import { getTasks } from "@/actions/tasks";
import { getLifeAreas } from "@/actions/life-areas";
import { getLocalDateString } from "@/lib/dates";
import Link from "next/link";
import { CalendarRange, LogIn, Loader2 } from "lucide-react";

async function PlannerServer() {
  await connection();
  const session = await getServerSession();
  const todayStr = getLocalDateString();

  // Guest Mode: Allow immediate full offline weekly planning
  if (!session?.user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WeeklyPlannerView
          userId="guest"
          initialLocalDate={todayStr}
          initialTasks={[]}
          initialLifeAreas={[]}
        />
      </div>
    );
  }

  // Server-side parallel fetch to eliminate client waterfall
  const [tasksRes, areasRes] = await Promise.all([
    getTasks({ view: "all" }),
    getLifeAreas(false),
  ]);

  const initialTasks = tasksRes.success ? tasksRes.data || [] : [];
  const lifeAreas = areasRes.success ? areasRes.data || [] : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <WeeklyPlannerView
        user={session.user}
        initialTasks={initialTasks}
        initialDate={todayStr}
        lifeAreas={lifeAreas}
      />
    </div>
  );
}

export default function PlannerPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
        </div>
      }
    >
      <PlannerServer />
    </Suspense>
  );
}

