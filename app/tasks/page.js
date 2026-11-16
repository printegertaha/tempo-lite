import { Suspense } from "react";
import { connection } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import TasksView from "@/components/tasks/TasksView";
import Link from "next/link";
import { ListTodo, LogIn, Sparkles, Loader2 } from "lucide-react";
import { getTasks, getTaskStats } from "@/actions/tasks";
import { getLifeAreas } from "@/actions/life-areas";
import { getTrackers } from "@/actions/trackers";
import { getLocalDateString } from "@/lib/dates";

async function TasksServer() {
  await connection();
  const session = await getServerSession();
  const todayStr = getLocalDateString();

  // Guest Mode: Allow immediate full offline task management
  if (!session?.user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <TasksView
          userId="guest"
          initialLocalDate={todayStr}
          initialTasks={[]}
          initialStats={{ todayCount: 0, overdueCount: 0 }}
          initialLifeAreas={[]}
          initialTrackers={[]}
        />
      </div>
    );
  }

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
        userId={session.user.id}
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
