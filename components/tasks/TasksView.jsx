"use client";

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import {
  getTasks,
  getTaskStats,
  createTask,
  updateTask,
  toggleTaskStatus,
  postponeTask,
  archiveTask,
  deleteTask,
} from "@/actions/tasks";
import { getLifeAreas } from "@/actions/life-areas";
import { getTrackers } from "@/actions/trackers";
import { getLocalDateString } from "@/lib/dates";

export default function TasksView({
  initialLocalDate,
  initialTasks = [],
  initialStats = null,
  initialLifeAreas = [],
  initialTrackers = [],
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [stats, setStats] = useState(
    initialStats || {
      todayCount: 0,
      overdueCount: 0,
      upcomingCount: 0,
      completedCount: 0,
      archivedCount: 0,
    }
  );
  const [lifeAreas, setLifeAreas] = useState(initialLifeAreas);
  const [trackers, setTrackers] = useState(initialTrackers);
  const [isLoading, setIsLoading] = useState(
    initialTasks.length === 0 && !initialStats
  );

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState("today"); // "today" | "overdue" | "upcoming" | "completed" | "all" | "archived"
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [selectedTrackerId, setSelectedTrackerId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [localDate, setLocalDate] = useState(initialLocalDate || "");

  const isInitialMount = useRef(initialTasks.length > 0 || !!initialStats);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Inline Quick Task Adder
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState("MEDIUM");
  const [quickDueDate, setQuickDueDate] = useState("today"); // "today" | "tomorrow" | "none"
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState("");
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Safe client-side date initialization
  useEffect(() => {
    if (!localDate && typeof window !== "undefined") {
      setLocalDate(getLocalDateString());
    }
  }, [localDate]);

  // Load auxiliary data (life areas, trackers)
  useEffect(() => {
    let active = true;
    async function loadAuxData() {
      try {
        const [areasRes, trkRes] = await Promise.all([
          getLifeAreas(false),
          getTrackers({ isArchived: false }),
        ]);
        if (active) {
          if (areasRes.success) setLifeAreas(areasRes.data || []);
          if (trkRes.success) setTrackers(trkRes.data || []);
        }
      } catch (err) {
        console.error("Error loading auxiliary task data:", err);
      }
    }
    loadAuxData();
    return () => {
      active = false;
    };
  }, []);

  // Fetch tasks and stats based on current view/tab
  const loadTasksData = async () => {
    setIsLoading(true);
    const currentDate = localDate || (typeof window !== "undefined" ? getLocalDateString() : "");
    try {
      const [tasksRes, statsRes] = await Promise.all([
        getTasks({
          view: activeTab,
          lifeAreaId: selectedAreaId || undefined,
          trackerId: selectedTrackerId || undefined,
          searchQuery: searchQuery || undefined,
          localDate: currentDate || undefined,
        }),
        getTaskStats(currentDate || undefined),
      ]);

      if (tasksRes.success) {
        setTasks(tasksRes.data || []);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error("Error loading tasks:", err);
      showToast("حدث خطأ أثناء تحميل المهام");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadTasksData();
  }, [activeTab, selectedAreaId, selectedTrackerId, searchQuery, localDate]);

  // Handlers
  const handleToggleStatus = async (taskId) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const isDone = t.status === "COMPLETED";
          return {
            ...t,
            status: isDone ? "TODO" : "COMPLETED",
            completedAt: isDone ? null : new Date(),
          };
        }
        return t;
      })
    );

    const res = await toggleTaskStatus(taskId);
    if (!res.success) {
      showToast(res.error || "فشل تغيير حالة المهمة");
      loadTasksData(); // Revert
    } else {
      // Refresh stats in background
      getTaskStats(localDate).then((s) => s.success && setStats(s.data));
    }
  };

  const handlePostpone = async (taskId, days) => {
    const res = await postponeTask(taskId, days);
    if (res.success) {
      showToast("تم تأجيل المهمة بنجاح");
      loadTasksData();
    } else {
      showToast(res.error || "فشل تأجيل المهمة");
    }
  };

  const handleDelete = async (taskId) => {
    if (!confirm("هل أنت متأكد من حذف هذه المهمة نهائياً؟")) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    const res = await deleteTask(taskId);
    if (res.success) {
      showToast("تم حذف المهمة");
      loadTasksData();
    } else {
      showToast(res.error || "فشل حذف المهمة");
      loadTasksData();
    }
  };

  const handleArchive = async (taskId, isArchived) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    const res = await archiveTask(taskId, isArchived);
    if (res.success) {
      showToast(isArchived ? "تم أرشفة المهمة" : "تم استعادة المهمة من الأرشيف");
      loadTasksData();
    } else {
      showToast(res.error || "فشل تعديل حالة الأرشفة");
      loadTasksData();
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim() || isQuickAdding) return;

    setIsQuickAdding(true);
    const currentDate = localDate || (typeof window !== "undefined" ? getLocalDateString() : "");

    let resolvedDueDate = null;
    if (quickDueDate === "today") {
      resolvedDueDate = currentDate;
    } else if (quickDueDate === "tomorrow") {
      const [y, m, d] = (currentDate || "2026-11-05").split("-").map(Number);
      const nextD = new Date(Date.UTC(y, m - 1, d + 1));
      resolvedDueDate = nextD.toISOString().split("T")[0];
    }

    try {
      const res = await createTask({
        title: quickTitle.trim(),
        priority: quickPriority,
        dueDate: resolvedDueDate,
        status: "TODO",
        lifeAreaId: selectedAreaId || null,
        trackerId: selectedTrackerId || null,
      });

      if (res.success) {
        setQuickTitle("");
        showToast("تمت إضافة المهمة بنجاح");
        loadTasksData();
      } else {
        showToast(res.error || "فشل إنشاء المهمة");
      }
    } catch {
      showToast("حدث خطأ أثناء إضافة المهمة");
    } finally {
      setIsQuickAdding(false);
    }
  };

  const handleModalSave = async (payload) => {
    if (payload.id) {
      const res = await updateTask(payload);
      if (res.success) {
        showToast("تم تحديث المهمة بنجاح");
        loadTasksData();
      } else {
        throw new Error(res.error || "فشل تحديث المهمة");
      }
    } else {
      const res = await createTask(payload);
      if (res.success) {
        showToast("تم إنشاء المهمة بنجاح");
        loadTasksData();
      } else {
        throw new Error(res.error || "فشل إنشاء المهمة");
      }
    }
  };

  const todayStr = localDate || (typeof window !== "undefined" ? getLocalDateString() : "");

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-zinc-900 border border-violet-500/40 text-zinc-100 text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveTab("today")}
          className={`p-3 rounded-2xl border text-right transition-all ${
            activeTab === "today"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-lg shadow-amber-500/5"
              : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span>مهام اليوم</span>
            <Calendar className="w-3.5 h-3.5 opacity-70" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100">{stats.todayCount}</div>
        </button>

        <button
          onClick={() => setActiveTab("overdue")}
          className={`p-3 rounded-2xl border text-right transition-all ${
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
          onClick={() => setActiveTab("upcoming")}
          className={`p-3 rounded-2xl border text-right transition-all ${
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
          onClick={() => setActiveTab("completed")}
          className={`p-3 rounded-2xl border text-right transition-all ${
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
          onClick={() => setActiveTab("archived")}
          className={`p-3 rounded-2xl border text-right transition-all col-span-2 sm:col-span-1 ${
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

      {/* Inline Quick Task Creator */}
      <form
        onSubmit={handleQuickAdd}
        className="p-3 sm:p-4 rounded-3xl bg-zinc-950/80 border border-zinc-800/90 shadow-xl space-y-3"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="أضف مهمة جديدة سريعة... (مثال: حل امتحان الفيزياء، شراء كتاب)"
            className="flex-1 px-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
          />
          <button
            type="submit"
            disabled={isQuickAdding || !quickTitle.trim()}
            className="px-5 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0 transition-all active:scale-95"
          >
            {isQuickAdding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">إضافة مهمة</span>
              </>
            )}
          </button>
        </div>

        {/* Quick parameters bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-zinc-400">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-zinc-500">الموعد:</span>
            <button
              type="button"
              onClick={() => setQuickDueDate("today")}
              className={`px-2.5 py-1 rounded-xl text-[11px] border transition-colors ${
                quickDueDate === "today"
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold"
                  : "bg-zinc-900 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => setQuickDueDate("tomorrow")}
              className={`px-2.5 py-1 rounded-xl text-[11px] border transition-colors ${
                quickDueDate === "tomorrow"
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold"
                  : "bg-zinc-900 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              غداً
            </button>
            <button
              type="button"
              onClick={() => setQuickDueDate("none")}
              className={`px-2.5 py-1 rounded-xl text-[11px] border transition-colors ${
                quickDueDate === "none"
                  ? "bg-zinc-800 border-zinc-700 text-zinc-200"
                  : "bg-zinc-900 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              بدون موعد
            </button>

            <span className="text-[11px] text-zinc-500 mr-2">الأولوية:</span>
            <select
              value={quickPriority}
              onChange={(e) => setQuickPriority(e.target.value)}
              className="px-2 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 focus:outline-none"
            >
              <option value="LOW">منخفضة</option>
              <option value="MEDIUM">متوسطة</option>
              <option value="HIGH">مرتفعة</option>
              <option value="URGENT">عاجلة</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingTask(null);
              setModalOpen(true);
            }}
            className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 hover:underline"
          >
            <span>خيارات إضافية (وصف، وسوم، مجالات)...</span>
          </button>
        </div>
      </form>

      {/* Filter and View Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 w-full sm:w-auto overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab("today")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap ${
              activeTab === "today"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            اليوم ({stats.todayCount})
          </button>
          <button
            onClick={() => setActiveTab("overdue")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap ${
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
            onClick={() => setActiveTab("upcoming")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap ${
              activeTab === "upcoming"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            القادمة ({stats.upcomingCount})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap ${
              activeTab === "completed"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            المكتملة ({stats.completedCount})
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap ${
              activeTab === "all"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap ${
              activeTab === "archived"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            الأرشيف ({stats.archivedCount})
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Life Area Filter */}
          {lifeAreas.length > 0 && (
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 focus:outline-none"
            >
              <option value="">كل المجالات</option>
              {lifeAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          )}

          {/* Linked Tracker Filter */}
          {trackers.length > 0 && (
            <select
              value={selectedTrackerId}
              onChange={(e) => setSelectedTrackerId(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 focus:outline-none"
            >
              <option value="">كل المتعقبات</option>
              {trackers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          {/* Search Input */}
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
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

      {/* Tasks List Content */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
          <p className="text-xs text-zinc-500">جاري تحميل المهام...</p>
        </div>
      ) : tasks.length === 0 ? (
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
                : "لا توجد مهام تطابق هذا التصفية"}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
              {activeTab === "overdue"
                ? "جدولك يسير في موعده بدقة. واصل الحفاظ على زخم إنجازك!"
                : "أضف مهامك الجديدة أعلاه لتنظيم يومك بدقة والربط بين أهدافك وعاداتك."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              todayStr={todayStr}
              onToggleStatus={handleToggleStatus}
              onEdit={(t) => {
                setEditingTask(t);
                setModalOpen(true);
              }}
              onPostpone={handlePostpone}
              onDelete={handleDelete}
              onArchive={handleArchive}
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
    </div>
  );
}

