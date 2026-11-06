import { Suspense } from "react";
import { getServerSession } from "@/lib/auth-session";
import TasksView from "@/components/tasks/TasksView";
import Link from "next/link";
import { ListTodo, LogIn, Sparkles, Loader2 } from "lucide-react";
import { getTasks, getTaskStats } from "@/actions/tasks";
import { getLifeAreas } from "@/actions/life-areas";
import { getTrackers } from "@/actions/trackers";
import { getLocalDateString } from "@/lib/dates";

async function TasksServer() {
  const session = await getServerSession();

  if (!session?.user) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="p-8 rounded-3xl bg-zinc-950/80 border border-zinc-800 shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-400">
            <ListTodo className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">سجل الدخول لإدارة مهامك</h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              تتيح لك منصة أثـر تنظيم مهامك اليومية والمستقبلية، وتحديد الأولويات، وربط المهام بمجالات حياتك وعاداتك اليومية.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/20 transition-all active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول عبر Google</span>
          </Link>
        </div>
      </div>
    );
  }

  const todayStr = getLocalDateString();

  // Server-side parallel fetch to eliminate client waterfall
  const [tasksRes, statsRes, areasRes, trackersRes] = await Promise.all([
    getTasks({ view: "today", localDate: todayStr }),
    getTaskStats(todayStr),
    getLifeAreas(false),
    getTrackers({ isArchived: false }),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>هندسة الوقت والأولويات</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
            إدارة المهام والأولويات
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            مهام تنفيذية فردية مستقلة عن العادات المتكررة، تدعم التواريخ والأولوية والتأجيل اليدوي.
          </p>
        </div>
      </div>

      {/* Main Tasks Hub with Server-Fetched Initial Props */}
      <TasksView
        initialLocalDate={todayStr}
        initialTasks={tasksRes.success ? tasksRes.data || [] : []}
        initialStats={statsRes.success ? statsRes.data : null}
        initialLifeAreas={areasRes.success ? areasRes.data || [] : []}
        initialTrackers={trackersRes.success ? trackersRes.data || [] : []}
      />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
        </div>
      }
    >
      <TasksServer />
    </Suspense>
  );
}
