"use client";

import { useState } from "react";
import { Flame, Check, Plus, Loader2 } from "lucide-react";
import { toggleChecklistItem } from "@/actions/entries";
import { createTracker } from "@/actions/trackers";

const PRAYER_ITEMS = [
  { id: "fajr", label: "الفجر", defaultTime: "05:00" },
  { id: "dhuhr", label: "الظهر", defaultTime: "12:15" },
  { id: "asr", label: "العصر", defaultTime: "15:30" },
  { id: "maghrib", label: "المغرب", defaultTime: "17:45" },
  { id: "isha", label: "العشاء", defaultTime: "19:15" },
];

export default function DynamicPrayerCard({
  prayerTracker,
  dailyEntries = [],
  selectedDate,
  onUpdated,
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState(null);

  // If user does not have a prayer tracker yet, give them 1-click option to activate it
  if (!prayerTracker) {
    const handleCreatePrayerTracker = async () => {
      setIsCreating(true);
      try {
        const res = await createTracker({
          name: "الصلوات الخمس",
          metricType: "CHECKLIST",
          icon: "Flame",
          color: "emerald",
          target: { type: "at_least", value: 5, unit: "صلوات" },
          configuration: {
            items: PRAYER_ITEMS.map((p) => ({ id: p.id, label: p.label })),
          },
        });
        if (res.success && onUpdated) {
          onUpdated();
        }
      } finally {
        setIsCreating(false);
      }
    };

    return (
      <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <Flame className="w-4 h-4 fill-emerald-400/20" />
          </span>
          <div>
            <h4 className="text-xs font-bold text-zinc-200">متابعة الصلوات الخمس اليومية</h4>
            <p className="text-[11px] text-zinc-500">
              يمكنك تفعيل قائمة تفاعلية لمتابعة أداء الصلوات الخمس في أوقاتها.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCreatePrayerTracker}
          disabled={isCreating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/20 transition-all active:scale-95 shrink-0"
        >
          {isCreating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          <span>تفعيل متابعة الصلوات</span>
        </button>
      </div>
    );
  }

  // Find daily checklist entry for this prayer tracker
  const trackerEntries = dailyEntries.filter((e) => e.trackerId === prayerTracker.id);
  const latestEntry = trackerEntries[trackerEntries.length - 1];
  const completedIds = latestEntry?.entryPayload?.completedItemIds || [];

  const handleTogglePrayer = async (itemId) => {
    if (togglingItemId) return;
    setTogglingItemId(itemId);
    try {
      const res = await toggleChecklistItem({
        trackerId: prayerTracker.id,
        itemId,
        localDate: selectedDate,
      });
      if (res.success && onUpdated) {
        onUpdated();
      }
    } finally {
      setTogglingItemId(null);
    }
  };

  const completedCount = completedIds.length;

  return (
    <div className="rounded-2xl bg-[#0c0e17]/90 border border-zinc-800/80 overflow-hidden shadow-lg shadow-black/40">
      {/* Card Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Flame className="w-4 h-4 fill-emerald-400/30" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-100">الصلوات الخمس</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {completedCount}/5
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {completedCount === 5 ? "اكتملت صلوات اليوم ✓ تقبل الله" : `${5 - completedCount} صلوات متبقية`}
            </p>
          </div>
        </div>
      </div>

      {/* Prayers Row */}
      <div className="grid grid-cols-5 divide-x divide-x-reverse divide-zinc-800/60 p-2 sm:p-3">
        {PRAYER_ITEMS.map((prayer) => {
          const isDone = completedIds.includes(prayer.id);
          const isToggling = togglingItemId === prayer.id;

          return (
            <button
              key={prayer.id}
              type="button"
              onClick={() => handleTogglePrayer(prayer.id)}
              disabled={isToggling}
              className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl transition-all ${
                isDone
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                  : "hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center mb-1.5 transition-all ${
                  isDone
                    ? "bg-emerald-500 text-black font-bold scale-105"
                    : "border border-zinc-700 bg-zinc-900"
                }`}
              >
                {isToggling ? (
                  <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                ) : isDone ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : null}
              </div>
              <span className="text-xs font-bold leading-none">{prayer.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

