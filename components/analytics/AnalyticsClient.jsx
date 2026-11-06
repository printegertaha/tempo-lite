"use client";

import { useState } from "react";
import { getAnalyticsOverview } from "@/actions/analytics";
import StockMarketChart from "@/components/charts/StockMarketChart";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Activity,
  Flame,
  Clock,
  CheckCircle2,
  Folder,
  Loader2,
  LogIn,
  Plus,
  ShieldCheck,
} from "lucide-react";

export default function AnalyticsClient({
  user,
  initialData = null,
  initialRange = 7,
}) {
  const [timeRange, setTimeRange] = useState(initialRange);
  const [analyticsData, setAnalyticsData] = useState(initialData);
  const [selectedTrackerId, setSelectedTrackerId] = useState("composite");
  const [isLoading, setIsLoading] = useState(false);

  const handleRangeChange = async (range) => {
    setTimeRange(range);
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await getAnalyticsOverview(range);
      if (res.success && res.data) {
        setAnalyticsData(res.data);
      }
    } catch (err) {
      console.error("Error loading analytics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center">
        <div className="p-8 rounded-3xl bg-zinc-950/80 border border-zinc-800 shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-400">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">سجل الدخول لاستعراض التحليلات</h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              استكشف مؤشرات أدائك، وسلاسل الالتزام الحقيقية، والرسوم البيانية المحسوبة بدقة من سجلاتك الفعلية.
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
        const cur = pointsMap.get(p.date) || { label: p.label, date: p.date, val: 0, volume: 0 };
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
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>لوحة المؤشرات والتحليلات الواقعية</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
            التحليلات ومعدلات التقدم
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            أرقام حقيقية مستخرجة بدقة من سجلاتك وقواعد البيانات، خالية من النسب الوهمية أو العقوبات القسرية.
          </p>
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

      {isLoading ? (
        <div className="py-24 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
          <p className="text-xs text-zinc-500">جاري احتساب التحليلات وسلاسل الالتزام...</p>
        </div>
      ) : trackers.length === 0 ? (
        <div className="p-12 rounded-3xl bg-zinc-950/60 border border-zinc-800 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-400">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-100">لا توجد بيانات كافية لتوليد التحليلات</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
              تبدأ التحليلات في التوليد تلقائياً بمجرد إنشاء عاداتك وتدوين أولى جلساتك في التطبيق.
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
                {summary.totalDurationHours} <span className="text-xs text-zinc-500 font-sans">ساعة</span>
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
                {summary.activeStreaksCount} <span className="text-xs text-zinc-500 font-sans">عادات</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                <span>المهام المنجزة في الفترة</span>
              </span>
              <div className="text-2xl font-black font-mono text-sky-400">
                {summary.completedTasksInRange} <span className="text-xs text-zinc-500 font-sans">مهمة</span>
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
            />
          </div>

          {/* Tracker-Specific Metrics Grid */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-200">سجل أداء العادات وسلاسل الالتزام (Streaks)</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {trackers.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-100">{t.name}</h4>
                      {t.lifeArea && (
                        <span className="text-[10px] text-zinc-500 block">{t.lifeArea.name}</span>
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
                    <div className="text-[11px] text-zinc-500">{t.metrics.secondaryStat}</div>
                  </div>

                  <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1">
                      <Flame
                        className={`w-3.5 h-3.5 ${
                          t.streak.currentStreak > 0 ? "text-amber-400 fill-amber-400/20" : "text-zinc-600"
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
              <h3 className="text-sm font-bold text-zinc-200">توزيع الأنشطة حسب مجالات الحياة</h3>

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

