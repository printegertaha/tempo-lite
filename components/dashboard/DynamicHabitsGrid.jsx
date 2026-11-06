"use client";

import Link from "next/link";
import {
  Flame,
  Dumbbell,
  BookMarked,
  Code2,
  Smartphone,
  Cigarette,
  Droplets,
  Wallet,
  Moon,
  Sparkles,
  Heart,
  Timer,
  Clock,
  ListTodo,
  ShieldAlert,
  Hash,
  ToggleLeft,
  ChevronRight,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import QuickLogControls from "../entries/QuickLogControls";

const ICON_MAP = {
  Flame,
  Dumbbell,
  BookMarked,
  Code2,
  Smartphone,
  Cigarette,
  Droplets,
  Wallet,
  Moon,
  Sparkles,
  Heart,
  Timer,
  Clock,
  ListTodo,
  ShieldAlert,
  Hash,
  ToggleLeft,
};

function calculateProgress(tracker, trackerEntries) {
  if (!trackerEntries || trackerEntries.length === 0) {
    return { current: 0, target: tracker.targetValue || 0, percent: 0, isDone: false };
  }

  const metricType = tracker.metricType;

  if (metricType === "BOOLEAN") {
    const isDone = Boolean(trackerEntries[0]?.valueBoolean);
    return { current: isDone ? 1 : 0, target: 1, percent: isDone ? 100 : 0, isDone };
  }

  if (metricType === "COUNTER" || metricType === "NUMBER") {
    const total = trackerEntries.reduce((sum, e) => sum + (e.valueNumeric || 0), 0);
    const target = tracker.targetValue || 1;
    const percent = Math.min(100, Math.round((total / target) * 100));
    return { current: total, target, percent, isDone: total >= target };
  }

  if (metricType === "DURATION" || metricType === "TIME_RANGE") {
    const totalSeconds = trackerEntries.reduce((sum, e) => sum + (e.valueDuration || 0), 0);
    const targetSeconds = (tracker.targetValue || 0) * 60; // target in minutes
    const percent = targetSeconds > 0 ? Math.min(100, Math.round((totalSeconds / targetSeconds) * 100)) : 0;
    return {
      current: Math.round(totalSeconds / 60), // display in minutes
      target: tracker.targetValue || 0,
      percent,
      isDone: targetSeconds > 0 && totalSeconds >= targetSeconds,
    };
  }

  if (metricType === "CHECKLIST") {
    const latest = trackerEntries[trackerEntries.length - 1];
    const completedIds = (latest?.entryPayload?.completedItemIds) || [];
    const totalItems = (tracker.trackerConfig?.items?.length) || 1;
    const percent = Math.min(100, Math.round((completedIds.length / totalItems) * 100));
    return {
      current: completedIds.length,
      target: totalItems,
      percent,
      isDone: completedIds.length >= totalItems,
    };
  }

  if (metricType === "AVOIDANCE") {
    const latest = trackerEntries[trackerEntries.length - 1];
    const isClean = Boolean(latest?.valueBoolean ?? true);
    return {
      current: isClean ? 1 : 0,
      target: 1,
      percent: isClean ? 100 : 0,
      isDone: isClean,
    };
  }

  return { current: 0, target: tracker.targetValue || 0, percent: 0, isDone: false };
}

export default function DynamicHabitsGrid({
  trackers = [],
  dailyEntries = [],
  selectedDate,
  onEntryLogged,
  onOpenCreateTracker,
  onOpenDetailedLog,
}) {
  if (!trackers || trackers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-zinc-200">الأنشطة والعادات النشطة</h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">
            {trackers.length} عادات
          </span>
        </div>

        <Link
          href="/habits"
          className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          <span>إدارة العادات</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {trackers.map((tracker) => {
            const Icon = ICON_MAP[tracker.icon] || Flame;
            const trackerEntries = dailyEntries.filter((e) => e.trackerId === tracker.id);
            const progress = calculateProgress(tracker, trackerEntries);

            return (
              <div
                key={tracker.id}
                className="flex flex-col justify-between p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 transition-all group shadow-sm hover:shadow-lg hover:shadow-black/40"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 shrink-0">
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-zinc-100 group-hover:text-white truncate">
                          {tracker.name}
                        </h3>
                        {tracker.lifeArea && (
                          <span className="text-[10px] text-zinc-400 block truncate">
                            {tracker.lifeArea.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/habits`}
                      className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg transition-colors"
                      title="تفاصيل العادة"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Target & Progress bar */}
                  {tracker.targetValue ? (
                    <div className="mb-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>الإنجاز:</span>
                        <span className="font-mono font-bold text-zinc-200">
                          {progress.current} / {progress.target} {tracker.unit || ""}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-zinc-900 border border-zinc-800/60 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            progress.isDone ? "bg-emerald-500" : "bg-violet-500"
                          }`}
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* 1-Click Interactive Quick Log Controls */}
                <div className="pt-2 border-t border-zinc-900">
                  <QuickLogControls
                    tracker={tracker}
                    localDate={selectedDate}
                    onLogged={onEntryLogged}
                    onOpenDetailedModal={() => onOpenDetailedLog && onOpenDetailedLog(tracker)}
                  />
                </div>
              </div>
            );
          })}
        </div>
    </div>
  );
}

