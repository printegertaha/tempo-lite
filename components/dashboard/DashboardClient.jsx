"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getTrackers } from "@/actions/trackers";
import { getDailyEntries } from "@/actions/entries";
import { getTasks, getTaskStats } from "@/actions/tasks";
import { getLifeAreas } from "@/actions/life-areas";

import DashboardHeader from "./DashboardHeader";
import ActiveTimerWidget from "./ActiveTimerWidget";
import DynamicPrayerCard from "./DynamicPrayerCard";
import TodayTasksWidget from "./TodayTasksWidget";
import DynamicHabitsGrid from "./DynamicHabitsGrid";
import DynamicTimeline from "./DynamicTimeline";
import DynamicQuickLogModal from "./DynamicQuickLogModal";

import TrackerModal from "@/components/trackers/TrackerModal";
import TaskModal from "@/components/tasks/TaskModal";
import LogEntryModal from "@/components/entries/LogEntryModal";
import { Loader2 } from "lucide-react";
import { useLocalTasks } from "@/hooks/useLocalTasks";

export default function DashboardClient({
  user,
  initialDate,
  initialTrackers = [],
  initialDailyEntries = [],
  initialTodayTasks = [],
  initialTaskStats = { todayCount: 0, overdueCount: 0 },
  initialLifeAreas = [],
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [trackers, setTrackers] = useState(initialTrackers);
  const [dailyEntries, setDailyEntries] = useState(initialDailyEntries);
  const [taskStats, setTaskStats] = useState(initialTaskStats);
  const [lifeAreas, setLifeAreas] = useState(initialLifeAreas);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Local-First Tasks integration
  const localTasksHelper = useLocalTasks(user?.id, initialTodayTasks);

  // Filter tasks for selected date
  const currentDateTasks = localTasksHelper.tasks.filter((t) => {
    if (!t.dueDate) return false;
    const dStr =
      typeof t.dueDate === "string"
        ? t.dueDate.slice(0, 10)
        : new Date(t.dueDate).toISOString().slice(0, 10);
    return dStr === selectedDate;
  });

  const overdueCount = localTasksHelper.tasks.filter((t) => {
    if (t.status === "COMPLETED" || !t.dueDate) return false;
    const dStr =
      typeof t.dueDate === "string"
        ? t.dueDate.slice(0, 10)
        : new Date(t.dueDate).toISOString().slice(0, 10);
    return dStr < selectedDate;
  }).length;

  const currentStats = {
    todayCount: currentDateTasks.length,
    overdueCount: Math.max(overdueCount, taskStats.overdueCount || 0),
  };

  // Modals state
  const [trackerModalOpen, setTrackerModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [quickLogModalOpen, setQuickLogModalOpen] = useState(false);
  const [logEntryModalOpen, setLogEntryModalOpen] = useState(false);
  const [detailedTracker, setDetailedTracker] = useState(null);

  // Load guest trackers from IndexedDB on mount if guest mode
  useEffect(() => {
    if (user?.isGuest || !user?.id) {
      async function loadGuestTrackers() {
        try {
          const { getLocalDB } = await import("@/lib/local-db");
          const db = await getLocalDB();
          const guestTrackers = await db.getAllFromIndex("trackers", "by-user", "guest");
          if (guestTrackers && guestTrackers.length > 0) {
            setTrackers(guestTrackers);
          }
        } catch (err) {
          console.warn("Could not load guest trackers from IndexedDB:", err);
        }
      }
      loadGuestTrackers();
    }
  }, [user]);

  // Background refresh handler for mutations and date switching
  const refreshDashboardData = async (targetDate) => {
    const activeDate = targetDate || selectedDate;
    if (!activeDate) return;

    setIsRefreshing(true);
    try {
      const [trackersRes, entriesRes, tasksRes, statsRes, areasRes] = await Promise.all([
        getTrackers({ isArchived: false, isPaused: false }),
        getDailyEntries(activeDate),
        getTasks({ view: "today", localDate: activeDate }),
        getTaskStats(activeDate),
        getLifeAreas(false),
      ]);

      if (trackersRes.success) setTrackers(trackersRes.data || []);
      if (entriesRes.success) setDailyEntries(entriesRes.data || []);
      if (statsRes.success && statsRes.data) setTaskStats(statsRes.data);
      if (areasRes.success) setLifeAreas(areasRes.data || []);
      if (typeof localTasksHelper.refreshTasks === "function") {
        await localTasksHelper.refreshTasks();
      }
    } catch (err) {
      console.error("Error refreshing dashboard data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    refreshDashboardData(newDate);
  };

  // Find prayer tracker if user has created one
  const prayerTracker = trackers.find(
    (t) =>
      t.metricType === "CHECKLIST" &&
      (t.name.includes("صلاة") || t.name.includes("صلوات") || t.slug.includes("prayer"))
  );

  // Filter duration trackers for ActiveTimerWidget
  const durationTrackers = trackers.filter(
    (t) => t.metricType === "DURATION" || t.metricType === "TIME_RANGE"
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">
      {/* 1. Header with dynamic date + primary action buttons */}
      <DashboardHeader
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        user={user}
        onOpenCreateTracker={() => setTrackerModalOpen(true)}
        onOpenCreateTask={() => setTaskModalOpen(true)}
        onOpenQuickLog={() => setQuickLogModalOpen(true)}
      />

      {/* Guest Mode Informational Banner (Zero friction first visit) */}
      {user?.isGuest && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-zinc-950/50 border border-violet-500/20 text-xs">
          <div className="flex items-center gap-2.5 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse shrink-0" />
            <span>
              <b className="text-white">وضع الضيف المحلي (Offline-First):</b> جميع مهامك وعاداتك وتدويناتك محفوظة بالكامل على هذا الجهاز في متصفحك.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/register"
              className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md shadow-violet-600/20 transition-all active:scale-95"
            >
              إنشاء حساب لحفظ ومزامنة بياناتك
            </Link>
          </div>
        </div>
      )}

      {/* Localized non-blocking refresh indicator */}
      {isRefreshing && (
        <div className="py-1 text-center text-xs text-violet-400 flex items-center justify-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>جاري التحديث...</span>
        </div>
      )}

      {/* 2. Today's Tasks Widget (Primary Dominant Section - Part 5 Requirement) */}
      <TodayTasksWidget
        tasks={currentDateTasks}
        stats={currentStats}
        selectedDate={selectedDate}
        onTaskUpdated={() => refreshDashboardData()}
        onOpenCreateTask={() => setTaskModalOpen(true)}
        onToggleTask={localTasksHelper.toggleTaskStatus}
        onAddTask={localTasksHelper.addTask}
        onDeleteTask={localTasksHelper.deleteTask}
      />

      {/* 3. Compact Secondary Widgets Grid: Active Timer + Prayer Tracker */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Session Timer (Stopwatch wired to Duration Trackers) */}
        <ActiveTimerWidget
          durationTrackers={durationTrackers}
          dailyEntries={dailyEntries}
          selectedDate={selectedDate}
          onSessionLogged={() => refreshDashboardData()}
        />

        {/* Dynamic Prayer Checklist Card */}
        <DynamicPrayerCard
          prayerTracker={prayerTracker}
          dailyEntries={dailyEntries}
          selectedDate={selectedDate}
          onUpdated={() => refreshDashboardData()}
        />
      </div>

      {/* 4. Today's Activity Grid (Real Trackers & 1-Click Quick Logging) */}
      <DynamicHabitsGrid
        trackers={trackers}
        dailyEntries={dailyEntries}
        selectedDate={selectedDate}
        onEntryLogged={() => refreshDashboardData()}
        onOpenCreateTracker={() => setTrackerModalOpen(true)}
        onOpenDetailedLog={(tracker) => {
          setDetailedTracker(tracker);
          setLogEntryModalOpen(true);
        }}
      />

      {/* 6. Chronological Activity Timeline (Real database logs) */}
      <DynamicTimeline
        dailyEntries={dailyEntries}
        trackers={trackers}
        onEntryDeleted={() => refreshDashboardData()}
      />

      {/* Modals */}
      <TrackerModal
        isOpen={trackerModalOpen}
        onClose={() => setTrackerModalOpen(false)}
        lifeAreas={lifeAreas}
        onSaved={() => refreshDashboardData()}
      />

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        lifeAreas={lifeAreas}
        trackers={trackers}
        todayStr={selectedDate}
        onSave={() => refreshDashboardData()}
      />

      <DynamicQuickLogModal
        isOpen={quickLogModalOpen}
        onClose={() => setQuickLogModalOpen(false)}
        trackers={trackers}
        selectedDate={selectedDate}
        onEntryLogged={() => refreshDashboardData()}
        onOpenCreateTracker={() => setTrackerModalOpen(true)}
        onOpenDetailedModal={(tracker) => {
          setDetailedTracker(tracker);
          setLogEntryModalOpen(true);
        }}
      />

      <LogEntryModal
        isOpen={logEntryModalOpen}
        onClose={() => {
          setLogEntryModalOpen(false);
          setDetailedTracker(null);
        }}
        tracker={detailedTracker}
        localDate={selectedDate}
        onLogged={() => refreshDashboardData()}
      />
    </div>
  );
}

