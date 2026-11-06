"use client";

import { useState } from "react";
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
  const [todayTasks, setTodayTasks] = useState(initialTodayTasks);
  const [taskStats, setTaskStats] = useState(initialTaskStats);
  const [lifeAreas, setLifeAreas] = useState(initialLifeAreas);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [trackerModalOpen, setTrackerModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [quickLogModalOpen, setQuickLogModalOpen] = useState(false);
  const [logEntryModalOpen, setLogEntryModalOpen] = useState(false);
  const [detailedTracker, setDetailedTracker] = useState(null);

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
      if (tasksRes.success) setTodayTasks(tasksRes.data || []);
      if (statsRes.success && statsRes.data) setTaskStats(statsRes.data);
      if (areasRes.success) setLifeAreas(areasRes.data || []);
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


      {/* Localized non-blocking refresh indicator */}
      {isRefreshing && (
        <div className="py-1 text-center text-xs text-violet-400 flex items-center justify-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>جاري التحديث...</span>
        </div>
      )}

      {/* 2. Active Session Timer (Live Stopwatch wired to Duration Trackers) */}
      <ActiveTimerWidget
        durationTrackers={durationTrackers}
        dailyEntries={dailyEntries}
        selectedDate={selectedDate}
        onSessionLogged={() => refreshDashboardData()}
      />


      {/* 4. Today's Tasks Widget (Real tasks, 1-click completion, overdue warnings) */}
      <TodayTasksWidget
        tasks={todayTasks}
        stats={taskStats}
        selectedDate={selectedDate}
        onTaskUpdated={() => refreshDashboardData()}
        onOpenCreateTask={() => setTaskModalOpen(true)}
      />

      {/* 5. Today's Activity Grid (100% Real Trackers & 1-Click Quick Logging) */}
      {trackers.length > 0 && (
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
      )}

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

