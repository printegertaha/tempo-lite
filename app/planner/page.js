import { Suspense } from "react";
import { getServerSession } from "@/lib/auth-session";
import WeeklyPlannerView from "@/components/planner/WeeklyPlannerView";
import { getTasks } from "@/actions/tasks";
import { getLifeAreas } from "@/actions/life-areas";
import { getLocalDateString } from "@/lib/dates";
import Link from "next/link";
import { CalendarRange, LogIn, Loader2 } from "lucide-react";

async function PlannerServer() {
  const session = await getServerSession();

  if (!session?.user) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="p-8 rounded-3xl bg-zinc-950/80 border border-zinc-800 shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-400">
            <CalendarRange className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">سجل الدخول للمُخَطِّط الأسبوعي</h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              خطط لأسبوعك مسبقاً، وازن مهامك وأولوياتك، وركّز بعمق بفضل مؤقت بومودورو ووضع Zen Mode دون انقطاع.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/20 transition-all active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول إلى حسابك</span>
          </Link>
        </div>
      </div>
    );
  }

  const todayStr = getLocalDateString();

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

