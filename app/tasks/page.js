import TasksView from "@/components/tasks/TasksView";
import { Sparkles } from "lucide-react";

export default function TasksPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div className="space-y-1">
  
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
            إدارة المهام والأولويات
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            مهام تنفيذية فردية مستقلة عن العادات المتكررة، تدعم التواريخ والأولوية والتأجيل اليدوي.
          </p>
        </div>
      </div>

      <TasksView />
    </div>
  );
}
