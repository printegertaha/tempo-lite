"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Activity, Sparkles, Flame, ShieldAlert } from "lucide-react";

export default function StockMarketChart({
  symbol = "ATHAR.COMPOSITE",
  title = "مؤشر أثر العام للحياة والإنتاجية",
  metricLabel = "معدل الإنجاز التراكمي",
  currentValue = "94.2",
  unit = "نقطة",
  change = "+4.8%",
  isPositive = true,
  data = [
    { label: "السبت", date: "10-31", val: 82, volume: 4 },
    { label: "الأحد", date: "11-01", val: 86, volume: 5 },
    { label: "الاثنين", date: "11-02", val: 84, volume: 3 },
    { label: "الثلاثاء", date: "11-03", val: 91, volume: 6 },
    { label: "الأربعاء", date: "11-04", val: 89, volume: 5 },
    { label: "الخميس", date: "11-05", val: 95, volume: 7 },
    { label: "اليوم", date: "11-06", val: 94.2, volume: 8 },
  ],
  supportLevel = "84.0",
  resistanceLevel = "96.0",
  trendStatus = "اتجاه صاعد قوي (Bullish Momentum)",
}) {
  const [activeRange, setActiveRange] = useState("7D");
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const values = data.map((d) => Number(d.val) || 0);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 100);
  const range = maxVal - minVal || 1;

  // Chart dimensions
  const width = 640;
  const height = 180;
  const paddingBottom = 40;
  const paddingTop = 20;
  const usableHeight = height - paddingTop - paddingBottom;

  // Calculate coordinates
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * (width - 40) + 20;
    const norm = (d.val - minVal) / range;
    const y = height - paddingBottom - norm * usableHeight;
    return { x, y, ...d };
  });

  // Construct SVG path for line and area fill
  const linePath = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
    : "";

  // Moving average (simple 3-day window)
  const maPoints = points.map((p, idx) => {
    const start = Math.max(0, idx - 2);
    const windowVals = points.slice(start, idx + 1);
    const avgY = windowVals.reduce((acc, item) => acc + item.y, 0) / windowVals.length;
    return { x: p.x, y: avgY };
  });

  const maLinePath = maPoints.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const activePoint = hoveredPoint || points[points.length - 1];

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c0f1a] via-[#101424] to-[#0c0f1a] border border-zinc-800/80 shadow-2xl overflow-hidden relative group">
      
      {/* 1. Market Ticker Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-black tracking-widest text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
              {symbol}
            </span>
            <span className="text-xs font-semibold text-zinc-400">
              {title}
            </span>
          </div>

          <div className="flex items-baseline gap-3 mt-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-100">
              {activePoint ? activePoint.val : currentValue}
            </span>
            <span className="text-xs font-mono text-zinc-400">{unit}</span>
            
            <div className={`flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${
              isPositive 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}>
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{change}</span>
            </div>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto text-xs font-mono">
          {["7D", "1M", "3M", "YTD"].map((rangeTab) => (
            <button
              key={rangeTab}
              type="button"
              onClick={() => setActiveRange(rangeTab)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeRange === rangeTab
                  ? "bg-violet-600 text-white font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {rangeTab}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Interactive SVG Stock Chart */}
      <div className="relative mt-4">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-44 sm:h-52 overflow-visible select-none"
        >
          <defs>
            <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isPositive ? "#10b981" : "#f43f5e"} stopOpacity="0.3" />
              <stop offset="85%" stopColor={isPositive ? "#10b981" : "#f43f5e"} stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id={`bar-grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Horizontal Level Grid Lines */}
          {[0.2, 0.5, 0.8].map((ratio, idx) => {
            const y = paddingTop + ratio * usableHeight;
            const levelVal = Math.round(maxVal - ratio * range);
            return (
              <g key={idx}>
                <line 
                  x1="20" 
                  y1={y} 
                  x2={width - 20} 
                  y2={y} 
                  stroke="#27272a" 
                  strokeDasharray="4 4" 
                  strokeWidth="1"
                />
                <text 
                  x={width - 15} 
                  y={y + 3} 
                  fill="#71717a" 
                  fontSize="9" 
                  fontFamily="monospace"
                  textAnchor="start"
                >
                  {levelVal}
                </text>
              </g>
            );
          })}

          {/* Volume Bars Underneath (Histogram) */}
          {points.map((p, idx) => {
            const barH = (p.volume || 3) * 3;
            const barY = height - paddingBottom - barH;
            return (
              <rect
                key={idx}
                x={p.x - 6}
                y={barY}
                width="12"
                height={barH}
                fill={`url(#bar-grad-${symbol})`}
                rx="2"
              />
            );
          })}

          {/* Gradient Area Fill */}
          <path d={areaPath} fill={`url(#grad-${symbol})`} />

          {/* Moving Average Line (7-period trend line) */}
          <path
            d={maLinePath}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity="0.65"
          />

          {/* Main Price Trend Line */}
          <path
            d={linePath}
            fill="none"
            stroke={isPositive ? "#10b981" : "#f43f5e"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points and Interactivity */}
          {points.map((p, idx) => {
            const isHovered = activePoint?.x === p.x;
            return (
              <g 
                key={idx}
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer"
              >
                {/* Vertical guide when hovered */}
                {isHovered && (
                  <line
                    x1={p.x}
                    y1={paddingTop}
                    x2={p.x}
                    y2={height - paddingBottom}
                    stroke="#a1a1aa"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Point circle */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5 : 3}
                  fill={isHovered ? "#ffffff" : isPositive ? "#10b981" : "#f43f5e"}
                  stroke="#090b11"
                  strokeWidth="2"
                />

                {/* X Axis Label */}
                <text
                  x={p.x}
                  y={height - paddingBottom + 16}
                  fill={isHovered ? "#e4e4e7" : "#71717a"}
                  fontSize="10"
                  fontFamily="sans-serif"
                  fontWeight={isHovered ? "bold" : "normal"}
                  textAnchor="middle"
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend & Meta */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isPositive ? "bg-emerald-400" : "bg-rose-400"}`} />
              <span>منحنى الأداء الفعلي</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-amber-400 border-b border-dashed border-amber-300" />
              <span>متوسط المسار (Moving Avg)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-violet-500/50" />
              <span>كثافة النشاط (Volume)</span>
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <span>مستوى الدعم: <b className="text-zinc-200">{supportLevel}</b></span>
            <span>•</span>
            <span>المقاومة: <b className="text-zinc-200">{resistanceLevel}</b></span>
          </div>
        </div>

        {/* Technical Status Pill */}
        <div className="mt-3 p-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>الحالة الفنية للمسار:</span>
            <b className={isPositive ? "text-emerald-400" : "text-rose-400"}>{trendStatus}</b>
          </span>
          <span className="text-[10px] font-mono text-zinc-500">محدث وفق سجلاتك المحلية</span>
        </div>
      </div>

    </div>
  );
}

