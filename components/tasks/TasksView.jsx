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
  Archive,
  Layers,
  Sparkles,
  Loader2,
  ListTodo,
  Volume2,
  VolumeX,
  Trash2,
} from "lucide-react";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import ZenFocusModal from "@/components/planner/ZenFocusModal";
import SyncStatusBadge from "@/components/sync/SyncStatusBadge";
import { useLocalTasks } from "@/hooks/useLocalTasks";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { soundManager } from "@/lib/audio";
import { getLocalDateString } from "@/lib/dates";

export default function TasksView({
  userId,
  initialLocalDate,
  initialTasks = [],
  initialStats = null,
  initialLifeAreas = [],
  initialTrackers = [],
}) {
  const {
    tasks,
    isLoaded,
    addTask,
    updateTask,
    toggleTaskStatus,
    deleteTask,
    deleteAllTasks,
    postponeTask,
  } = useLocalTasks(userId, initialTasks);

  const [lifeAreas] = useState(initialLifeAreas);
  const [trackers] = useState(initialTrackers);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState("today"); // "today" | "overdue" | "upcoming" | "completed" | "all" | "archived"
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [selectedTrackerId, setSelectedTrackerId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [localDate] = useState(initialLocalDate || getLocalDateString());

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTaskForZen, setSelectedTaskForZen] = useState(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

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
      setEditingTask(null);
      setModalOpen(true);
    },
    onEscape: () => {
      setSelectedTaskForZen(null);
      setModalOpen(false);
    },
  });

  const todayStr = localDate || getLocalDateString();

  // Deduplicate tasks and compute in-memory dynamic statistics
  const { uniqueTaskList, stats } = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const t of tasks) {
      if (t && t.id && !seen.has(t.id)) {
        seen.add(t.id);
        list.push(t);
      }
    }

    let todayCount = 0;
    let overdueCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let allActiveCount = 0;
    let archivedCount = 0;

    for (const t of list) {
      if (t.isArchived) {
        archivedCount++;
        continue;
      }
      if (t.status === "COMPLETED") {
        completedCount++;
        continue;
      }
      allActiveCount++;
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
      uniqueTaskList: list,
      stats: {
        todayCount,
        overdueCount,
        upcomingCount,
        completedCount,
        allActiveCount,
        archivedCount,
      },
    };
  }, [tasks, todayStr]);

  // Instant Filtered Tasks List
  const filteredTasks = useMemo(() => {
    return uniqueTaskList.filter((task) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title?.toLowerCase().includes(query);
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
  }, [uniqueTaskList, activeTab, selectedAreaId, selectedTrackerId, searchQuery, todayStr]);

  // Handle Delete All Tasks
  const handleDeleteAll = async () => {
    if (!confirmDeleteAll) {
      setConfirmDeleteAll(true);
      setTimeout(() => setConfirmDeleteAll(false), 4000);
      return;
    }
    setIsDeletingAll(true);
    await deleteAllTasks();
    setIsDeletingAll(false);
    setConfirmDeleteAll(false);
  };

  // Handle Modal Save (both Create and Edit)
  const handleModalSave = async (data) => {
    if (editingTask) {
      await updateTask(editingTask.id, data);
    } else {
      await addTask(data);
    }
    setModalOpen(false);
    setEditingTask(null);
  };

  // Handle Subtask toggle
  const handleToggleSubtask = async (taskId, subtaskId) => {
    const task = uniqueTaskList.find((t) => t.id === taskId);
    if (!task) return;

    const subtasks = Array.isArray(task.subtasks) ? [...task.subtasks] : [];
    const updatedSubtasks = subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    const allCompleted =
      updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.completed);
    await updateTask(taskId, {
      subtasks: updatedSubtasks,
      status: allCompleted ? "COMPLETED" : "TODO",
    });
  };

  // Tabs Configuration for Unified Header
  const FILTER_TABS = [
    {
      id: "today",
      label: "اليوم",
      count: stats.todayCount,
      icon: Calendar,
      activeColor: "bg-violet-600/20 text-violet-300 border-violet-500/40 shadow-sm",
      badgeColor: "bg-violet-500/25 text-violet-200",
    },
    {
      id: "overdue",
      label: "المتأخرة",
      count: stats.overdueCount,
      icon: AlertTriangle,
      activeColor: "bg-red-500/20 text-red-300 border-red-500/40 shadow-sm",
      badgeColor: stats.overdueCount > 0 ? "bg-red-500/30 text-red-200 font-black animate-pulse" : "bg-zinc-800 text-zinc-400",
    },
    {
      id: "upcoming",
      label: "القادمة",
      count: stats.upcomingCount,
      icon: Clock,
      activeColor: "bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm",
      badgeColor: "bg-sky-500/25 text-sky-200",
    },
    {
      id: "completed",
      label: "المكتملة",
      count: stats.completedCount,
      icon: CheckCircle2,
      activeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm",
      badgeColor: "bg-emerald-500/25 text-emerald-200",
    },
    {
      id: "all",
      label: "الكل",
      count: stats.allActiveCount,
      icon: ListTodo,
      activeColor: "bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm",
      badgeColor: "bg-zinc-850 text-zinc-300",
    },
    {
      id: "archived",
      label: "الأرشيف",
      count: stats.archivedCount,
      icon: Archive,
      activeColor: "bg-zinc-800 text-zinc-300 border-zinc-700 shadow-sm",
      badgeColor: "bg-zinc-850 text-zinc-400",
    },
  ];

  return (
    <div className="space-y-5 select-none">
      {/* 1. Sleek Compact Top Bar: Sync Status, Sound Toggle & New Task Button */}
      <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <SyncStatusBadge />
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
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={handleDeleteAll}
            disabled={isDeletingAll || uniqueTaskList.length === 0}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              confirmDeleteAll
                ? "bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-lg shadow-red-600/30 animate-pulse"
                : "bg-zinc-900 hover:bg-red-900/40 text-zinc-400 hover:text-red-300 border-zinc-800 hover:border-red-800"
            }`}
            title={confirmDeleteAll ? "اضغط مجدداً للتأكيد والحذف النهائي" : "حذف جميع المهام"}
          >
            {isDeletingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {confirmDeleteAll ? "تأكيد الحذف؟" : "حذف الكل"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingTask(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>مهمة جديدة</span>
          </button>
        </div>
      </div>

      {/* 10. Unified Compact Interactive Filter Bar (Replaces redundant stat cards & horizontal tabs) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Unified Filter Tabs Grid/Bar */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1 rounded-2xl bg-zinc-950/80 border border-zinc-800/80">
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  soundManager.playClick();
                }}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border transition-all text-xs font-semibold cursor-pointer ${
                  isActive
                    ? tab.activeColor
                    : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive
                      ? ""
                      : tab.id === "overdue" && tab.count > 0
                      ? "text-red-400"
                      : "text-zinc-500"
                  }`}
                />
                <span className="truncate">{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold ${
                    isActive ? tab.badgeColor : "text-zinc-500 bg-zinc-900"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter by Life Area & Instant Search */}
        <div className="flex items-center gap-2">
          {lifeAreas.length > 0 && (
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 focus:outline-none shrink-0 cursor-pointer"
            >
              <option value="">جميع المجالات</option>
              {lifeAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}

          <div className="relative flex-1 md:w-48">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في المهام..."
              className="w-full pr-8 pl-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>
      </div>

      {/* 2. Tasks Content Cards: Starts Immediately without scrolling */}
      {!isLoaded ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
          <p className="text-xs text-zinc-500">جاري قراءة البيانات المحلية...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-zinc-950/60 border border-zinc-800/80 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
            {activeTab === "overdue" ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            ) : (
              <ListTodo className="w-6 h-6 text-violet-400" />
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
                : "أضف مهامك الجديدة لتنظيم يومك بدقة والربط بين أهدافك وعاداتك."}
            </p>
          </div>
        </div>
      ) : (
        /* Responsive Card Grid with unique keys */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              todayStr={todayStr}
              onToggleStatus={toggleTaskStatus}
              onEdit={(t) => {
                setEditingTask(t);
                setModalOpen(true);
              }}
              onPostpone={(id, days) => postponeTask(id, days)}
              onDelete={deleteTask}
              onArchive={async (id, archived) => {
                await updateTask(id, { isArchived: archived });
              }}
              onOpenZen={(t) => setSelectedTaskForZen(t)}
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
