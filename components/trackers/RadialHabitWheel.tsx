"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { soundManager } from "@/lib/audio";
import { useLocalSession } from "@/hooks/useLocalSession";
import {
  Flame,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Download,
  Share2,
  Trophy,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
} from "lucide-react";

// Types
export type CellStatus = "NONE" | "DONE" | "MISSED" | "REST";

export interface WheelHabit {
  id: string;
  name: string;
  color: string;
}

const DEFAULT_HABITS: WheelHabit[] = [
  { id: "h1", name: "ورد القرآن الكريم", color: "#10b981" },
  { id: "h2", name: "صلاة الفجر في المسجد", color: "#38bdf8" },
  { id: "h3", name: "أذكار الصباح والمساء", color: "#a855f7" },
  { id: "h4", name: "الرياضة والنشاط البدني", color: "#f59e0b" },
  { id: "h5", name: "قراءة وتطوير الذات", color: "#ec4899" },
];

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const STORAGE_KEY = "athar_radial_habits_v1";

interface RadialHabitWheelProps {
  existingTrackers?: any[];
  userId?: string;
}

const WHEEL_COLORS = ["#10b981", "#38bdf8", "#a855f7", "#f59e0b", "#ec4899"];

export default function RadialHabitWheel({
  existingTrackers = [],
  userId: propUserId,
}: RadialHabitWheelProps) {
  const { userId: sessionUserId } = useLocalSession();
  const userId = propUserId || sessionUserId || "guest";
  const storageKey = `${STORAGE_KEY}:${userId}`;
  // Current Date defaults
  const today = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-indexed

  // Habits config (5 habits)
  const [habits, setHabits] = useState<WheelHabit[]>(DEFAULT_HABITS);

  // Records map: key is `${year}-${month}-${habitId}-${day}`, value is CellStatus
  const [records, setRecords] = useState<Record<string, CellStatus>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Hover state
  const [hoveredCell, setHoveredCell] = useState<{
    habitIndex: number;
    day: number;
    status: CellStatus;
    x: number;
    y: number;
  } | null>(null);

  // Quick Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // Month Key for persistence
  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;

  // Days in selected month (28, 29, 30, 31)
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Is current month?
  const isCurrentMonth =
    today.getFullYear() === selectedYear && today.getMonth() === selectedMonth;
  const currentDayNumber = isCurrentMonth ? today.getDate() : null;

  // Load from localStorage on mount, seeding from real Athar trackers if not yet customized
  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      try {
        const stored =
          localStorage.getItem(storageKey) ||
          (userId === "guest" ? localStorage.getItem(STORAGE_KEY) : null);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!active) return;
          if (parsed.habits && Array.isArray(parsed.habits) && parsed.habits.length > 0) {
            setHabits(parsed.habits);
          }
          if (parsed.records) {
            setRecords(parsed.records);
          }
          setIsLoaded(true);
          return;
        }

        let sourceTrackers = existingTrackers;
        if (!sourceTrackers || sourceTrackers.length === 0) {
          try {
            const { localTrackerRepo } = await import("@/lib/local-db");
            const localTrackers = await localTrackerRepo.getAllForUser(userId || "guest");
            sourceTrackers = (localTrackers || []).filter((t: any) => !t.isArchived);
          } catch {}
        }

        if (!active) return;
        if (sourceTrackers && sourceTrackers.length > 0) {
          const seeded: WheelHabit[] = sourceTrackers.slice(0, 5).map((t: any, idx: number) => ({
            id: t.id || `h${idx + 1}`,
            name: t.name || `عادة ${idx + 1}`,
            color: WHEEL_COLORS[idx % WHEEL_COLORS.length],
          }));
          while (seeded.length < 5) {
            seeded.push(DEFAULT_HABITS[seeded.length]);
          }
          setHabits(seeded);
        }
      } catch (e) {
        console.error("Failed to load radial habits", e);
      }
      if (active) setIsLoaded(true);
    };

    queueMicrotask(() => {
      hydrate();
    });

    return () => {
      active = false;
    };
  }, [existingTrackers, userId, storageKey]);

  // Save to user-scoped localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ habits, records }));
    } catch (e) {
      console.error("Failed to save radial habits", e);
    }
  }, [habits, records, isLoaded, storageKey]);

  // Sync with Athar habits if available
  const importAtharHabits = () => {
    if (!existingTrackers || existingTrackers.length === 0) {
      showToast("لا توجد عادات مسجلة في أثر للاستيراد");
      return;
    }
    const imported: WheelHabit[] = existingTrackers
      .slice(0, 5)
      .map((t, idx) => ({
        id: t.id || `h${idx + 1}`,
        name: t.name || `عادة ${idx + 1}`,
        color: DEFAULT_HABITS[idx]?.color || "#10b981",
      }));

    // Pad if fewer than 5
    while (imported.length < 5) {
      const idx = imported.length;
      imported.push(DEFAULT_HABITS[idx]);
    }

    setHabits(imported);
    soundManager.playTaskDone();
    showToast("تم استيراد العادات من أثر بنجاح ✨");
  };

  // Toggle Cell
  const cycleCellStatus = (habitId: string, day: number) => {
    const key = `${monthKey}-${habitId}-${day}`;
    const current = records[key] || "NONE";
    let next: CellStatus = "DONE";

    if (current === "NONE") {
      next = "DONE"; // تمام فيها (أخضر)
      soundManager.playTaskDone();
    } else if (current === "DONE") {
      next = "MISSED"; // عكس المتوقع معملتهاش (أحمر)
      soundManager.playClick();
    } else if (current === "MISSED") {
      next = "REST"; // راحة / تخطي
      soundManager.playClick();
    } else {
      next = "NONE"; // فارغ
      soundManager.playClick();
    }

    setRecords((prev) => ({
      ...prev,
      [key]: next,
    }));
  };

  const setCellExplicit = (
    habitId: string,
    day: number,
    status: CellStatus,
  ) => {
    const key = `${monthKey}-${habitId}-${day}`;
    setRecords((prev) => ({
      ...prev,
      [key]: status,
    }));
    if (status === "DONE") soundManager.playTaskDone();
    else soundManager.playClick();
  };

  // Month navigation
  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Mark all habits for today as DONE
  const markTodayAllDone = () => {
    if (!currentDayNumber) return;
    const updates: Record<string, CellStatus> = {};
    habits.forEach((h) => {
      updates[`${monthKey}-${h.id}-${currentDayNumber}`] = "DONE";
    });
    setRecords((prev) => ({ ...prev, ...updates }));
    soundManager.playTaskDone();
    showToast(`تم تسجيل جميع العادات كمكتملة لليوم (${currentDayNumber})`);
  };

  // Update Habit Name
  const updateHabitName = (index: number, newName: string) => {
    setHabits((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], name: newName };
      return copy;
    });
  };

  // Monthly stats per habit
  const habitStats = useMemo(() => {
    return habits.map((h) => {
      let done = 0;
      let missed = 0;
      let rest = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const st = records[`${monthKey}-${h.id}-${d}`] || "NONE";
        if (st === "DONE") done++;
        else if (st === "MISSED") missed++;
        else if (st === "REST") rest++;
      }

      const activeDays = done + missed;
      const rate = activeDays > 0 ? Math.round((done / activeDays) * 100) : 0;
      return { done, missed, rest, rate };
    });
  }, [habits, records, monthKey, daysInMonth]);

  // Overall Month adherence
  const overallRate = useMemo(() => {
    let totalDone = 0;
    let totalMissed = 0;
    habitStats.forEach((st) => {
      totalDone += st.done;
      totalMissed += st.missed;
    });
    const total = totalDone + totalMissed;
    return total > 0 ? Math.round((totalDone / total) * 100) : 0;
  }, [habitStats]);

  // Geometry Parameters
  const cx = 530;
  const cy = 420;
  // 5 rings: habit 0 (innermost) to habit 4 (outermost)
  // In Image 2: top line is outer habit, bottom is inner habit
  const radii = [145, 180, 215, 250, 285, 320];

  // Sweep from -90 deg (straight up) around clockwise to +200 deg (31 days)
  const startDeg = -90.0;
  const endDeg = 200.0;
  const totalSweep = endDeg - startDeg; // 290 degrees
  const degPerDay = totalSweep / 31.0;

  return (
    <div className="w-full bg-[#08090d] text-zinc-100 rounded-3xl border border-zinc-800/80 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-sm font-bold animate-bounce border border-emerald-400/30">
          <Sparkles className="w-4 h-4 fill-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
 

        {/* Month Navigation */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-1.5 shadow-lg">
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors"
            title="الشهر القادم"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="px-4 py-1 text-center min-w-[130px]">
            <span className="text-sm font-black text-white block">
              {ARABIC_MONTHS[selectedMonth]} {selectedYear}
            </span>
            <span className="text-[10px] text-zinc-500">
              {daysInMonth} يوماً • التزام {overallRate}%
            </span>
          </div>

          <button
            onClick={prevMonth}
            className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors"
            title="الشهر السابق"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Color Legend */}
        <div className="flex items-center gap-4 bg-zinc-950/80 border border-zinc-850 px-4 py-2 rounded-2xl">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-zinc-300 font-medium">تم  </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-rose-500 shadow-sm shadow-rose-500/50" />
            <span className="text-zinc-300 font-medium">
             متمش
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-zinc-600" />
            <span className="text-zinc-400 font-medium">راحة / عذر</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isCurrentMonth && currentDayNumber && (
            <button
              onClick={markTodayAllDone}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>إنجاز عادات اليوم ({currentDayNumber})</span>
            </button>
          )}

          {existingTrackers.length > 0 && (
            <button
              onClick={importAtharHabits}
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold transition-colors"
            >
              استيراد عادات أثر
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors"
            title="طباعة العجلة"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Wheel View */}
      <div className="relative bg-zinc-950/70 border border-zinc-850/80 rounded-3xl p-2 sm:p-4 overflow-x-auto shadow-2xl">
        <div className="min-w-[780px] max-w-[940px] mx-auto relative select-none">
         f
          <svg
            viewBox="0 0 940 840"
            className="w-full h-auto overflow-visible"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Radial center glow */}
              <radialGradient id="wheelCenterGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(16, 185, 129, 0.08)" />
                <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
              </radialGradient>

              {/* Missed Hatch Pattern */}
              <pattern
                id="missedHatch"
                width="6"
                height="6"
                patternTransform="rotate(45 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="6"
                  stroke="#991b1b"
                  strokeWidth="1.5"
                />
              </pattern>
            </defs>

            {/* Center glow */}
            <circle cx={cx} cy={cy} r={radii[0]} fill="url(#wheelCenterGlow)" />

            {/* Inner Center Label */}
            <g
              transform={`translate(${cx}, ${cy})`}
              className="pointer-events-none text-center"
            >
              <text
                y="-10"
                textAnchor="middle"
                fill="#71717a"
                fontSize="12"
                fontWeight="600"
              >
                {ARABIC_MONTHS[selectedMonth]} {selectedYear}
              </text>
              <text
                y="16"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="22"
                fontWeight="900"
              >
                {overallRate}%
              </text>
              <text
                y="34"
                textAnchor="middle"
                fill="#10b981"
                fontSize="11"
                fontWeight="700"
              >
                نسبة الالتزام
              </text>
            </g>

            {/* --------------------------------------------------------- */}
            {/* 5 HORIZONTAL EXTENSION LINES FOR HABIT NAMES (Matching Image 2) */}
            {/* --------------------------------------------------------- */}
            <g id="horizontal-habit-lines">
              {radii.map((r, i) => {
                const y = cy - r;
                // Outer lines extend further to the left
                const xStart = 50 + i * 15;
                return (
                  <line
                    key={`hline-${i}`}
                    x1={xStart}
                    y1={y}
                    x2={cx}
                    y2={y}
                    stroke="#52525b"
                    strokeWidth="1.5"
                    strokeDasharray="none"
                  />
                );
              })}

              {/* Vertical closure line at Day 1 start */}
              <line
                x1={cx}
                y1={cy - radii[5]}
                x2={cx}
                y2={cy - radii[0]}
                stroke="#52525b"
                strokeWidth="2"
              />
            </g>

            {/* --------------------------------------------------------- */}
            {/* 31 DAYS AND ANNULAR CELLS */}
            {/* --------------------------------------------------------- */}
            <g id="wheel-cells">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const isOutOfMonth = day > daysInMonth;
                const isToday = day === currentDayNumber;

                const a1Deg = startDeg + (day - 1) * degPerDay;
                const a2Deg = startDeg + day * degPerDay;

                const a1 = (a1Deg * Math.PI) / 180;
                const a2 = (a2Deg * Math.PI) / 180;

                // Day Label coordinates outside outermost ring
                const labelR = radii[5] + 24;
                const midA = (a1 + a2) / 2;
                const lx = cx + labelR * Math.cos(midA);
                const ly = cy + labelR * Math.sin(midA) + 4;

                return (
                  <g key={`day-col-${day}`} opacity={isOutOfMonth ? 0.25 : 1}>
                    {/* Day Number text outside the wheel */}
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      fill={
                        isToday
                          ? "#10b981"
                          : isOutOfMonth
                            ? "#52525b"
                            : "#e4e4e7"
                      }
                      fontSize={isToday ? "14" : "11"}
                      fontWeight={isToday ? "900" : "700"}
                      className="cursor-default select-none"
                    >
                      {day}
                    </text>

                    {/* Today glowing indicator ring */}
                    {isToday && (
                      <circle
                        cx={lx}
                        cy={ly - 4}
                        r="12"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="1.8"
                        strokeDasharray="2 2"
                        className="animate-spin"
                        style={{ animationDuration: "8s" }}
                      />
                    )}

                    {/* 5 Cells for this Day (from ring 4 outer to ring 0 inner) */}
                    {habits.map((habit, habitIndex) => {
                      // Reverse order so habit 0 is outermost or innermost:
                      // In Image 2, the top-most line corresponds to the outermost circle!
                      // Outermost circle is ring 4 (between radii[4] and radii[5])
                      const ringIdx = 4 - habitIndex;
                      const rin = radii[ringIdx];
                      const rout = radii[ringIdx + 1];

                      const x1_out = cx + rout * Math.cos(a1);
                      const y1_out = cy + rout * Math.sin(a1);
                      const x2_out = cx + rout * Math.cos(a2);
                      const y2_out = cy + rout * Math.sin(a2);

                      const x1_in = cx + rin * Math.cos(a1);
                      const y1_in = cy + rin * Math.sin(a1);
                      const x2_in = cx + rin * Math.cos(a2);
                      const y2_in = cy + rin * Math.sin(a2);

                      // SVG Annular segment path
                      const pathData = `M ${x1_out} ${y1_out} A ${rout} ${rout} 0 0 1 ${x2_out} ${y2_out} L ${x2_in} ${y2_in} A ${rin} ${rin} 0 0 0 ${x1_in} ${y1_in} Z`;

                      const recordKey = `${monthKey}-${habit.id}-${day}`;
                      const status = records[recordKey] || "NONE";

                      // Cell Styling
                      let fill = "#12131a";
                      let stroke = "#27272a";
                      let strokeWidth = "1";

                      if (status === "DONE") {
                        fill = habit.color || "#10b981"; // تمام فيها
                        stroke = "#6ee7b7";
                        strokeWidth = "1.5";
                      } else if (status === "MISSED") {
                        fill = "#ef4444"; // عكس المتوقع معملتهاش
                        stroke = "#fca5a5";
                        strokeWidth = "1.5";
                      } else if (status === "REST") {
                        fill = "#52525b"; // راحة
                        stroke = "#71717a";
                      }

                      return (
                        <path
                          key={`cell-${day}-${habit.id}`}
                          d={pathData}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={strokeWidth}
                          onClick={() => {
                            if (!isOutOfMonth) cycleCellStatus(habit.id, day);
                          }}
                          onMouseEnter={(e) => {
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            setHoveredCell({
                              habitIndex,
                              day,
                              status,
                              x: rect.x + rect.width / 2,
                              y: rect.y,
                            });
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`transition-colors duration-150 ${
                            isOutOfMonth
                              ? "cursor-not-allowed"
                              : "cursor-pointer hover:opacity-80"
                          }`}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </g>
          </svg>
          {/* --------------------------------------------------------- */}
          {/* HABIT LABELS & INPUTS OVERLAY (Placed at the horizontal lines) */}
          {/* --------------------------------------------------------- */}
          <div
            className="absolute top-0 left-0 space-y-1.5"
            style={{
              top: "13%",
              left: "4%",
              width: "36%",
            }}
          >
            {habits.map((habit, index) => {
              const stat = habitStats[index];
              return (
                <div
                  key={habit.id}
                  className="flex items-center gap-2 bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 transition-all shadow-md group"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: habit.color }}
                  />

                  {/* Habit Name input */}
                  <input
                    type="text"
                    value={habit.name}
                    onChange={(e) => updateHabitName(index, e.target.value)}
                    className="bg-transparent text-xs font-bold text-zinc-100 focus:outline-none focus:text-emerald-400 w-full truncate text-right"
                    placeholder={`العادة ${index + 1}`}
                  />

                  {/* Rate badge */}
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 flex-shrink-0">
                    {stat.rate}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredCell && (
        <div
          className="fixed z-50 pointer-events-none bg-zinc-900/95 border border-zinc-700 shadow-2xl rounded-2xl px-3 py-2 text-right text-xs -translate-x-1/2 -translate-y-full mb-2"
          style={{
            left: hoveredCell.x,
            top: hoveredCell.y - 8,
          }}
        >
          <div className="font-bold text-white mb-0.5">
            اليوم {hoveredCell.day} • {habits[hoveredCell.habitIndex]?.name}
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            {hoveredCell.status === "DONE" && (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> تمام فيها (أُنجزت بنجاح)
              </span>
            )}
            {hoveredCell.status === "MISSED" && (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <X className="w-3 h-3" /> عكس المتوقع (لم أنجزها)
              </span>
            )}
            {hoveredCell.status === "REST" && (
              <span className="text-zinc-400 font-medium">راحة / عذر مسبق</span>
            )}
            {hoveredCell.status === "NONE" && (
              <span className="text-zinc-500">فارغ (انقر للتسجيل)</span>
            )}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2 text-right">
        {habits.map((habit, idx) => {
          const stat = habitStats[idx];
          return (
            <div
              key={`summary-${habit.id}`}
              className="bg-zinc-950/70 border border-zinc-850 rounded-2xl p-3.5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: habit.color }}
                />
                <span className="text-xs font-bold text-zinc-200 truncate max-w-[130px]">
                  {habit.name}
                </span>
              </div>

              <div className="flex items-baseline justify-between text-xs pt-1">
                <span className="text-zinc-400 text-[11px]">نسبة الالتزام</span>
                <span className="font-black text-emerald-400 text-sm">
                  {stat.rate}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[10px] pt-1 border-t border-zinc-850">
                <span className="text-emerald-400">✓ {stat.done} يوم</span>
                <span className="text-rose-400 text-left">
                  ✕ {stat.missed} يوم
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
