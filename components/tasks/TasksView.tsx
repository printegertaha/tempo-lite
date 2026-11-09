"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Clock,
  AlertTriangle,
  Folder,
  Link2,
  Archive,
  Layers,
  Sparkles,
  Loader2,
  ListTodo,
  Volume2,
  VolumeX,
  Keyboard,
} from "lucide-react";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import ZenFocusModal from "@/components/planner/ZenFocusModal";
import SyncStatusBadge from "@/components/sync/SyncStatusBadge";
import { useLocalTasks } from "@/hooks/useLocalTasks";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { soundManager } from "@/lib/audio";
import { getLocalDateString } from "@/lib/dates";

interface TasksViewProps {
  userId?: string;
  initialLocalDate?: string;
  initialTasks?: any[];
  initialStats?: any;
  initialLifeAreas?: any[];
  initialTrackers?: any[];
}

export default function TasksView({
  userId,
  initialLocalDate,
  initialTasks = [],
  initialStats = null,
  initialLifeAreas = [],
  initialTrackers = [],
}: TasksViewProps) {
  const {
    tasks,
    isLoaded,
    addTask,
    updateTask,
    toggleTaskStatus,
    deleteTask,
    postponeTask,
  } = useLocalTasks(userId, initialTasks);

  const [lifeAreas] = useState<any[]>(initialLifeAreas);
  const [trackers] = useState<any[]>(initialTrackers);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState("today"); // "today" | "overdue" | "upcoming" | "completed" | "all" | "archived"
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [selectedTrackerId, setSelectedTrackerId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [localDate] = useState(initialLocalDate || getLocalDateString());

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [selectedTaskForZen, setSelectedTaskForZen] = useState<any>(null);

  // Quick Inline Task Adder
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [quickDueDate, setQuickDueDate] = useState<"today" | "tomorrow" | "none">("today");
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  // Sound toggle state
  const [soundEnabled, setSoundEnabled] = useState(() => soundManager.isEnabled());
  const toggleSound = () => {
    const next = !soundEnabled;
    soundManager.setEnabled(next);
    setSoundEnabled(next);
    if (next) soundManager.playClick();
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onQuickAdd: () => {
      const inputEl = document.getElementById("quick-task-input");
      inputEl?.focus();
    },
    onEscape: () => {
      setSelectedTaskForZen(null);
      setModalOpen(false);
    },
  });

  const todayStr = localDate || getLocalDateString();

  // Instant In-Memory Dynamic Statistics from local tasks
  const stats = useMemo(() => {
    let todayCount = 0;
    let overdueCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let archivedCount = 0;

    for (const t of tasks) {
      if (t.isArchived) {
        archivedCount++;
        continue;
      }
      if (t.status === "COMPLETED") {
        completedCount++;
        continue;
      }
      if (!t.dueDate) {
        continue;
      }
      if (t.dueDate === todayStr) {
        todayCount++;
      } else if (t.dueDate < todayStr) {
        overdueCount++;
      } else if (t.dueDate > todayStr) {
        upcomingCount++;
      }
    }

    return {
      todayCount,
      overdueCount,
      upcomingCount,
      completedCount,
      archivedCount,
    };
  }, [tasks, todayStr]);

  // Instant Filtered Tasks List
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // 2. Life Area Filter
      if (selectedAreaId && task.lifeAreaId !== selectedAreaId) {
        return false;
      }

      // 3. Linked Tracker Filter
      if (selectedTrackerId && task.trackerId !== selectedTrackerId) {
        return false;
      }

      // 4. View Tabs
      if (activeTab === "archived") {
        return task.isArchived;
      }
      if (task.isArchived) {
        return false;
      }

      if (activeTab === "completed") {
        return task.status === "COMPLETED";
      }

      if (activeTab === "today") {
        return task.dueDate === todayStr && task.status !== "COMPLETED";
      }

      if (activeTab === "overdue") {
        return (
          task.dueDate &&
          task.dueDate < todayStr &&
          task.status !== "COMPLETED"
        );
      }

      if (activeTab === "upcoming") {
        return (
          task.dueDate &&
          task.dueDate > todayStr &&
          task.status !== "COMPLETED"
        );
      }

      // "all"
      return task.status !== "COMPLETED";
    });
  }, [tasks, activeTab, selectedAreaId, selectedTrackerId, searchQuery, todayStr]);

  // Handle Quick Add
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || isQuickAdding) return;

    setIsQuickAdding(true);
    try {
      let targetDueDate: string | null = null;
      if (quickDueDate === "today") {
        targetDueDate = todayStr;
      } else if (quickDueDate === "tomorrow") {
        const [y, m, d] = todayStr.split("-").map(Number);
        const date = new Date(Date.UTC(y, m - 1, d));
        date.setUTCDate(date.getUTCDate() + 1);
        targetDueDate = date.toISOString().split("T")[0];
      }

      await addTask({
        title: quickTitle.trim(),
        dueDate: targetDueDate,
        priority: quickPriority,
        status: "TODO",
        lifeAreaId: selectedAreaId || null,
        trackerId: selectedTrackerId || null,
      });

      setQuickTitle("");
    } finally {
      setIsQuickAdding(false);
    }
  };

  // Handle Modal Save (both Create and Edit)
  const handleModalSave = async (data: any) => {
    if (editingTask) {
      await updateTask(editingTask.id, data);
    } else {
      await addTask(data);
    }
    setModalOpen(false);
    setEditingTask(null);
  };

  // Handle Subtask toggle
  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const subtasks = Array.isArray(task.subtasks) ? [...task.subtasks] : [];
    const updatedSubtasks = subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.completed);
    await updateTask(taskId, {
      subtasks: updatedSubtasks,
      status: allCompleted ? "COMPLETED" : "TODO",
    });
  };

  return (
    <div className="space-y-6 select-none">
      {/* Top Header Bar with Sync Status & Sound Toggle */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <SyncStatusBadge />
          <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
            تحديثات فورية 100% تعمل محلياً دون انتظار الخادم
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              soundEnabled
                ? "bg-violet-500/10 border-violet-500/30 text-violet-300"
                : "bg-zinc-900 border-zinc-800 text-zinc-500"
            }`}
            title={soundEnabled ? "كتم الأصوات" : "تفعيل الأصوات التفاعلية"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingTask(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>مهمة جديدة</span>
          </button>
        </div>
      </div>

      {/* 1. Quick Stats Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("today")}
          className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
            activeTab === "today"
              ? "bg-violet-500/10 border-violet-500/30 text-violet-300 shadow-lg shadow-violet-500/5"
              : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span>اليوم</span>
            <Calendar className="w-3.5 h-3.5 opacity-70" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100">{stats.todayCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("overdue")}
          className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
            activeTab === "overdue"
              ? "bg-red-500/10 border-red-500/30 text-red-300 shadow-lg shadow-red-500/5"
              : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span>المتأخرة</span>
            <AlertTriangle className="w-3.5 h-3.5 opacity-70 text-red-400" />
          </div>
          <div
            className={`text-xl font-bold font-mono ${
              stats.overdueCount > 0 ? "text-red-400" : "text-zinc-100"
            }`}
          >
            {stats.overdueCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("upcoming")}
          className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
            activeTab === "upcoming"
              ? "bg-sky-500/10 border-sky-500/30 text-sky-300 shadow-lg shadow-sky-500/5"
              : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span>القادمة</span>
            <Clock className="w-3.5 h-3.5 opacity-70" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100">{stats.upcomingCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
            activeTab === "completed"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-lg shadow-emerald-500/5"
              : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span>المكتملة</span>
            <CheckCircle2 className="w-3.5 h-3.5 opacity-70" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100">{stats.completedCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("archived")}
          className={`p-3.5 rounded-2xl border text-right transition-all col-span-2 sm:col-span-1 cursor-pointer ${
            activeTab === "archived"
              ? "bg-zinc-800 border-zinc-700 text-zinc-200"
              : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span>الأرشيف</span>
            <Archive className="w-3.5 h-3.5 opacity-70" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100">{stats.archivedCount}</div>
        </button>
      </div>

      {/* 2. Instant Inline Task Creator */}
      <form
        onSubmit={handleQuickAdd}
        className="p-4 sm:p-5 rounded-3xl bg-zinc-950/80 border border-zinc-800/90 shadow-xl space-y-3"
      >
        <div className="flex items-center gap-2">
          <input
            id="quick-task-input"
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="أضف مهمة جديدة فوراً... (اضغط Enter للحفظ السريع أو A)"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500/60 transition-all"
          />
          <button
            type="submit"
            disabled={!quickTitle.trim() || isQuickAdding}
            className="px-5 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/20 disabled:opacity-50 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            {isQuickAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة سريعة"}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-zinc-400 pt-1">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Priority Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-zinc-500">الأولوية:</span>
              <div className="flex items-center gap-1 bg-zinc-900/80 p-0.5 rounded-xl border border-zinc-800">
                {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setQuickPriority(p)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                      quickPriority === p
                        ? p === "URGENT"
                          ? "bg-red-500 text-white"
                          : p === "HIGH"
                          ? "bg-amber-500 text-black"
                          : p === "MEDIUM"
                          ? "bg-sky-500 text-white"
                          : "bg-zinc-700 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {p === "URGENT" ? "عاجلة" : p === "HIGH" ? "مرتفعة" : p === "MEDIUM" ? "متوسطة" : "منخفضة"}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-zinc-500">الموعد:</span>
              <div className="flex items-center gap-1 bg-zinc-900/80 p-0.5 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setQuickDueDate("today")}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
                    quickDueDate === "today" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDueDate("tomorrow")}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
                    quickDueDate === "tomorrow" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  غداً
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDueDate("none")}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
                    quickDueDate === "none" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  بلا موعد
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingTask(null);
              setModalOpen(true);
            }}
            className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>خيارات تفصيلية (بومودورو، وقت بداية، مهام فرعية)...</span>
          </button>
        </div>
      </form>

      {/* 3. Filter and View Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 w-full sm:w-auto overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("today")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "today"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            اليوم ({stats.todayCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("overdue")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "overdue"
                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                : stats.overdueCount > 0
                ? "text-red-400 hover:text-red-300 font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            المتأخرة ({stats.overdueCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "upcoming"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            القادمة ({stats.upcomingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "completed"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            المكتملة ({stats.completedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "all"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            الكل
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("archived")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "archived"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            الأرشيف ({stats.archivedCount})
          </button>
        </div>

        {/* Right Filter Controls & Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {lifeAreas.length > 0 && (
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 focus:outline-none"
            >
              <option value="">جميع المجالات</option>
              {lifeAreas.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}

          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في المهام..."
              className="w-full pr-8 pl-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>
      </div>

      {/* 4. Content-Aware Responsive Cards Grid (Part 5 Requirement) */}
      {!isLoaded ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
          <p className="text-xs text-zinc-500">جاري قراءة البيانات المحلية الفورية...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-10 rounded-3xl bg-zinc-950/60 border border-zinc-800/80 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
            {activeTab === "overdue" ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            ) : (
              <ListTodo className="w-7 h-7 text-violet-400" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200">
              {activeTab === "overdue"
                ? "ممتاز! لا توجد أية مهام متأخرة لديك"
                : activeTab === "today"
                ? "لا توجد مهام مستحقة لليوم"
                : activeTab === "completed"
                ? "لا توجد مهام مكتملة في هذا العرض"
                : activeTab === "archived"
                ? "الأرشيف فارغ"
                : "لا توجد مهام تطابق هذا الفلتر"}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
              {activeTab === "overdue"
                ? "جدولك يسير في موعده بدقة. واصل الحفاظ على زخم إنجازك!"
                : "أضف مهامك الجديدة أعلاه لتنظيم يومك بدقة والربط بين أهدافك وعاداتك."}
            </p>
          </div>
        </div>
      ) : (
        /* Responsive Card Grid: 1 col on mobile, 2 col on tablet, 3-4 col on desktop */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              todayStr={todayStr}
              onToggleStatus={toggleTaskStatus}
              onEdit={(t: any) => {
                setEditingTask(t);
                setModalOpen(true);
              }}
              onPostpone={(id: string, days: number) => postponeTask(id, days)}
              onDelete={deleteTask}
              onArchive={async (id: string, archived: boolean) => {
                await updateTask(id, { isArchived: archived });
              }}
              onOpenZen={(t: any) => setSelectedTaskForZen(t)}
              onToggleSubtask={handleToggleSubtask}
            />
          ))}
        </div>
      )}

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
        lifeAreas={lifeAreas}
        trackers={trackers}
        todayStr={todayStr}
        onSave={handleModalSave}
      />

      {/* Zen Focus Mode Overlay */}
      {selectedTaskForZen && (
        <ZenFocusModal
          isOpen={!!selectedTaskForZen}
          onClose={() => setSelectedTaskForZen(null)}
          task={selectedTaskForZen}
          onTaskCompleted={(id) => {
            toggleTaskStatus(id);
            setSelectedTaskForZen(null);
          }}
        />
      )}
    </div>
  );
}
