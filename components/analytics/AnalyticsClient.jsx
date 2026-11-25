"use client";

import { useState, useEffect, useCallback } from "react";
import { getLocalDateString, addDaysToDateString, getDefaultTimezone } from "@/lib/dates";
import {
  calculateTrackerStreak,
  calculateTrackerMetrics,
  generateChartDataPoints,
} from "@/lib/analytics";
import { useLocalSession } from "@/hooks/useLocalSession";
import { useAthar } from "@/components/context/AtharContext";
import {
  localTaskRepo,
  localTrackerRepo,
  localEntryRepo,
  localLifeAreaRepo,
} from "@/lib/local-db";
import StockMarketChart from "@/components/charts/StockMarketChart";
import Link from "next/link";
import {
  Activity,
  Flame,
  Clock,
  CheckCircle2,
  Folder,
  Loader2,
  Plus,
  ShieldCheck,
} from "lucide-react";

const analyticsCache = new Map();

export default function AnalyticsClient({
  user: propUser,
  initialData = null,
  initialRange = 7,
}) {
  const { userPreferences } = useAthar();
  const { userId: sessionUserId } = useLocalSession();
  const effectiveUserId = propUser?.id || sessionUserId || "guest";
  const tz = userPreferences?.timezone || getDefaultTimezone();

  const [timeRange, setTimeRange] = useState(initialRange);
  const [analyticsData, setAnalyticsData] = useState(
    () => initialData || analyticsCache.get(`${effectiveUserId}:${initialRange}`) || null
  );
  const [selectedTrackerId, setSelectedTrackerId] = useState("composite");
  const [isLoading, setIsLoading] = useState(false);

  const computeLocalAnalytics = useCallback(
    async (range) => {
      const [tasks, allTrackers, entries, lifeAreas] = await Promise.all([
        localTaskRepo.getAllForUser(effectiveUserId, true).catch(() => []),
        localTrackerRepo.getAllForUser(effectiveUserId, false).catch(() => []),
        localEntryRepo.getAllForUser(effectiveUserId).catch(() => []),
        localLifeAreaRepo.getAllForUser(effectiveUserId, false).catch(() => []),
      ]);

      const activeTrackers = (allTrackers || []).filter((t) => !t.isArchived);
      const todayStr = getLocalDateString(new Date(), tz);
      const startDate = addDaysToDateString(todayStr, -(range - 1));
      const rangeEntries = (entries || []).filter(
        (e) => e.localDate && e.localDate >= startDate && e.localDate <= todayStr
      );

      const areaMap = new Map((lifeAreas || []).map((a) => [a.id, a]));
      const trackerAnalytics = activeTrackers.map((tracker) => {
        const tEntries = rangeEntries.filter((e) => e.trackerId === tracker.id);
        const streak = calculateTrackerStreak(tracker, tEntries, todayStr);
        const metrics = calculateTrackerMetrics(tracker, tEntries);
        const chartPoints = generateChartDataPoints(tracker, tEntries, range, todayStr);

        return {
          id: tracker.id,
          name: tracker.name,
          slug: tracker.slug,
          icon: tracker.icon,
          color: tracker.color,
          priority: tracker.priority,
          metricType: tracker.metricType,
          unit: tracker.unit,
          targetValue: tracker.targetValue,
          lifeArea: tracker.lifeAreaId ? areaMap.get(tracker.lifeAreaId) || null : null,
          streak,
          metrics,
          chartPoints,
        };
      });

      const lifeAreaStats = (lifeAreas || []).map((area) => {
        const areaTrackers = activeTrackers.filter((t) => t.lifeAreaId === area.id);
        const areaTrackerIds = new Set(areaTrackers.map((t) => t.id));
        const areaEntries = rangeEntries.filter((e) => areaTrackerIds.has(e.trackerId));
        return {
          id: area.id,
          name: area.name,
          color: area.color,
          icon: area.icon,
          trackersCount: areaTrackers.length,
          entriesCount: areaEntries.length,
        };
      });

      const completedTasksInRange = (tasks || []).filter((t) => {
        if (t.isArchived || t.status !== "COMPLETED") return false;
        const d = t.completedAt
          ? getLocalDateString(new Date(t.completedAt), tz)
          : t.dueDate || todayStr;
        return d >= startDate && d <= todayStr;
      }).length;

      const totalDurationSeconds = rangeEntries.reduce(
        (acc, e) => acc + (e.valueDuration || 0),
        0
      );
      const totalDurationHours = Number((totalDurationSeconds / 3600).toFixed(1));
      const activeStreaksCount = trackerAnalytics.filter(
        (t) => t.streak.currentStreak > 0
      ).length;
      const overallConsistencyPct =
        activeTrackers.length > 0
          ? Math.min(100, Math.round((activeStreaksCount / activeTrackers.length) * 100))
          : 0;

      const computed = {
        timeRangeDays: range,
        startDate,
        endDate: todayStr,
        todayStr,
        summary: {
          totalTrackers: activeTrackers.length,
          activeStreaksCount,
          totalDurationHours,
          completedTasksInRange,
          overallConsistencyPct,
        },
        trackers: trackerAnalytics,
        lifeAreas: lifeAreaStats,
      };

      analyticsCache.set(`${effectiveUserId}:${range}`, computed);
      setAnalyticsData(computed);
    },
    [effectiveUserId, tz]
  );

  const handleRangeChange = useCallback(
    async (range) => {
      setTimeRange(range);
      const memHit = analyticsCache.get(`${effectiveUserId}:${range}`);
      if (memHit) setAnalyticsData(memHit);
      try {
        await computeLocalAnalytics(range);
      } finally {
        setIsLoading(false);
      }
    },
    [effectiveUserId, computeLocalAnalytics]
  );

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void computeLocalAnalytics(timeRange);
    });
    const refresh = () => void computeLocalAnalytics(timeRange);
    window.addEventListener("athar_data_synced", refresh);
    window.addEventListener("athar_tasks_updated", refresh);
    return () => {
      active = false;
      window.removeEventListener("athar_data_synced", refresh);
      window.removeEventListener("athar_tasks_updated", refresh);
    };
  }, [computeLocalAnalytics, timeRange]);

  const trackers = analyticsData?.trackers || [];
  const summary = analyticsData?.summary || {
    totalTrackers: 0,
    activeStreaksCount: 0,
    totalDurationHours: 0,
    completedTasksInRange: 0,
    overallConsistencyPct: 0,
  };
  const lifeAreas = analyticsData?.lifeAreas || [];

  // Active Selected Tracker for Chart
  const activeTracker = trackers.find((t) => t.id === selectedTrackerId);

  // Generate chart props based on real selected tracker or composite
  let chartTitle = "مؤشر أثر العام للاتزان والإنتاجية";
  let chartSymbol = "ATHAR.INDEX";
  let chartMetricLabel = "معدل الالتزام";
  let chartCurrentValue = `${summary.overallConsistencyPct}%`;
  let chartUnit = "%";
  let chartPoints = [];

  if (activeTracker) {
    chartTitle = `مؤشر ${activeTracker.name}`;
    chartSymbol = `TRK.${activeTracker.metricType}`;
    chartMetricLabel = activeTracker.metrics.primaryStat;
    chartCurrentValue = activeTracker.metrics.primaryStat;
    chartUnit = activeTracker.unit || "";
    chartPoints = activeTracker.chartPoints || [];
  } else if (trackers.length > 0) {
    // Composite chart points (sum of activity across trackers)
    const pointsMap = new Map();
    for (const t of trackers) {
      for (const p of t.chartPoints || []) {
        const cur = pointsMap.get(p.date) || {
          label: p.label,
          date: p.date,
          val: 0,
          volume: 0,
        };
        cur.val += p.volume > 0 ? 1 : 0;
        cur.volume += p.volume;
        pointsMap.set(p.date, cur);
      }
    }
    chartPoints = Array.from(pointsMap.values());
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl  sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
            التحليلات ومعدلات التقدم
          </h1>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs">
          {[
            { days: 7, label: "٧ أيام" },
            { days: 14, label: "١٤ يوم" },
            { days: 30, label: "٣٠ يوم" },
          ].map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => handleRangeChange(r.days)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                timeRange === r.days
                  ? "bg-violet-600 text-white font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Guest Mode Informational Banner */}

      {isLoading ? (
        <div className="py-24 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
          <p className="text-xs text-zinc-500">
            جاري احتساب التحليلات وسلاسل الالتزام...
          </p>
        </div>
      ) : trackers.length === 0 ? (
        <div className="p-12 rounded-3xl bg-zinc-950/60 border border-zinc-800 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-400">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-100">
              لا توجد بيانات كافية لتوليد التحليلات
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
              تبدأ التحليلات في التوليد تلقائياً بمجرد إنشاء عاداتك وتدوين أولى
              جلساتك في التطبيق.
            </p>
          </div>
          <Link
            href="/habits"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>أنشئ أول عادة الآن</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>ساعات التركيز (آخر {timeRange} يوم)</span>
              </span>
              <div className="text-2xl font-black font-mono text-zinc-100">
                {summary.totalDurationHours}{" "}
                <span className="text-xs text-zinc-500 font-sans">ساعة</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>معدل الالتزام والاتزان</span>
              </span>
              <div className="text-2xl font-black font-mono text-emerald-400">
                {summary.overallConsistencyPct}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>السلاسل النشطة (Streaks)</span>
              </span>
              <div className="text-2xl font-black font-mono text-amber-300">
                {summary.activeStreaksCount}{" "}
                <span className="text-xs text-zinc-500 font-sans">عادات</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                <span>المهام المنجزة في الفترة</span>
              </span>
              <div className="text-2xl font-black font-mono text-sky-400">
                {summary.completedTasksInRange}{" "}
                <span className="text-xs text-zinc-500 font-sans">مهمة</span>
              </div>
            </div>
          </div>

          {/* Interactive Tracker Asset Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedTrackerId("composite")}
              className={`px-3.5 py-1.5 rounded-xl font-medium transition-all shrink-0 ${
                selectedTrackerId === "composite"
                  ? "bg-violet-600 text-white font-bold shadow-md shadow-violet-600/20"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              المؤشر العام للأنشطة
            </button>

            {trackers.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTrackerId(t.id)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  selectedTrackerId === t.id
                    ? "bg-zinc-800 text-zinc-100 font-bold border border-zinc-700 shadow-sm"
                    : "bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>{t.name}</span>
                {t.streak.currentStreak > 0 && (
                  <span className="text-[10px] text-amber-400 font-mono font-bold">
                    🔥{t.streak.currentStreak}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* SVG Financial-Style Chart */}
          <div className="rounded-3xl bg-zinc-950/80 border border-zinc-800/90 p-6 shadow-2xl">
            <StockMarketChart
              title={chartTitle}
              symbol={chartSymbol}
              metricLabel={chartMetricLabel}
              currentValue={chartCurrentValue}
              unit={chartUnit}
              data={chartPoints}
              isPositive={true}
              activeRangeDays={timeRange}
              onRangeDaysChange={handleRangeChange}
            />
          </div>

          {/* Tracker-Specific Metrics Grid */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-200">
              سجل أداء العادات وسلاسل الالتزام (Streaks)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {trackers.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-100">
                        {t.name}
                      </h4>
                      {t.lifeArea && (
                        <span className="text-[10px] text-zinc-500 block">
                          {t.lifeArea.name}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                      {t.metricType}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-lg font-mono font-extrabold text-zinc-200">
                      {t.metrics.primaryStat}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {t.metrics.secondaryStat}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1">
                      <Flame
                        className={`w-3.5 h-3.5 ${
                          t.streak.currentStreak > 0
                            ? "text-amber-400 fill-amber-400/20"
                            : "text-zinc-600"
                        }`}
                      />
                      <span className="text-zinc-400">السلسلة:</span>
                      <span className="font-mono font-bold text-zinc-200">
                        {t.streak.currentStreak} يوم
                      </span>
                    </div>

                    <span className="text-[10px] text-zinc-500">
                      أفضل إنجاز: {t.streak.bestStreak} يوم
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Life Areas Progress Breakdown */}
          {lifeAreas.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-200">
                توزيع الأنشطة حسب مجالات الحياة
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {lifeAreas.map((area) => (
                  <div
                    key={area.id}
                    className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-1"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                      <Folder className="w-3.5 h-3.5 text-violet-400" />
                      <span>{area.name}</span>
                    </div>
                    <div className="text-xs text-zinc-500 font-mono">
                      {area.trackersCount} عادات • {area.entriesCount} تدوينات
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
