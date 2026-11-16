"use client";

import { useState, useEffect, useCallback } from "react";
import { soundManager } from "@/lib/audio";
import {
  Compass,
  CheckCircle2,
  Circle,
  MapPin,
  Sparkles,
  ChevronDown,
  X,
} from "lucide-react";
import { togglePrayer } from "@/actions/prayers";
import {
  PRAYER_NAMES_ARABIC,
  PrayerKey,
  PrayerItem,
} from "@/lib/validations/prayer";
import { localPrayerRepo, LocalPrayerRecord } from "@/lib/local-db";

interface HomePrayerBarProps {
  userId?: string;
  dateStr: string;
  initialPrayers?: PrayerItem[];
}

const ORDERED_PRAYERS: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export default function HomePrayerBar({
  userId,
  dateStr,
  initialPrayers = [],
}: HomePrayerBarProps) {
  const isGuest = !userId || userId === "guest";

  const [prayers, setPrayers] = useState<PrayerItem[]>(() => {
    if (initialPrayers && initialPrayers.length === 5) {
      return initialPrayers;
    }
    return ORDERED_PRAYERS.map((key) => ({
      id: `${dateStr}_${key}`,
      prayerKey: key,
      nameArabic: PRAYER_NAMES_ARABIC[key],
      date: dateStr,
      isCompleted: false,
      completedAt: null,
      location: null,
      withSunnah: false,
      notes: null,
    }));
  });

  const [detailModalPrayer, setDetailModalPrayer] = useState<PrayerItem | null>(null);

  // Load guest records from IndexedDB if in guest mode
  useEffect(() => {
    if (isGuest) {
      localPrayerRepo.getByDate("guest", dateStr).then((records) => {
        if (records && records.length > 0) {
          const recMap = new Map(records.map((r) => [r.prayerKey, r]));
          setPrayers((prev) =>
            prev.map((p) => {
              const r = recMap.get(p.prayerKey);
              if (r) {
                return {
                  ...p,
                  id: r.id,
                  isCompleted: r.isCompleted,
                  location: r.location || null,
                  withSunnah: Boolean(r.withSunnah),
                  notes: r.notes || null,
                };
              }
              return p;
            })
          );
        }
      });
    }
  }, [isGuest, dateStr]);

  const completedCount = prayers.filter((p) => p.isCompleted).length;

  const handleToggle = useCallback(
    async (prayer: PrayerItem, e?: React.MouseEvent) => {
      e?.stopPropagation();
      const newStatus = !prayer.isCompleted;

      // Optimistic UI update
      setPrayers((prev) =>
        prev.map((p) =>
          p.prayerKey === prayer.prayerKey
            ? {
                ...p,
                isCompleted: newStatus,
                completedAt: newStatus ? new Date().toISOString() : null,
              }
            : p
        )
      );

      if (newStatus) {
        soundManager.playTaskDone();
      } else {
        soundManager.playClick();
      }

      if (isGuest) {
        const localRec: LocalPrayerRecord = {
          id: prayer.id,
          userId: "guest",
          date: dateStr,
          prayerKey: prayer.prayerKey,
          isCompleted: newStatus,
          completedAt: newStatus ? new Date().toISOString() : null,
          location: prayer.location as any,
          withSunnah: prayer.withSunnah,
          notes: prayer.notes,
          clientUpdatedAt: Date.now(),
        };
        await localPrayerRepo.save(localRec);
        return;
      }

      // Server Action for authenticated user
      try {
        await togglePrayer({
          date: dateStr,
          prayerKey: prayer.prayerKey,
          isCompleted: newStatus,
          location: prayer.location as any,
          withSunnah: prayer.withSunnah,
          notes: prayer.notes || undefined,
        });
      } catch (err) {
        console.warn("Failed to update prayer state:", err);
      }
    },
    [isGuest, dateStr]
  );

  const handleSaveDetails = useCallback(
    async (location: string | null, withSunnah: boolean, notes: string) => {
      if (!detailModalPrayer) return;

      const updatedItem = {
        ...detailModalPrayer,
        location,
        withSunnah,
        notes: notes || null,
      };

      setPrayers((prev) =>
        prev.map((p) => (p.prayerKey === updatedItem.prayerKey ? updatedItem : p))
      );

      setDetailModalPrayer(null);

      if (isGuest) {
        const localRec: LocalPrayerRecord = {
          id: updatedItem.id,
          userId: "guest",
          date: dateStr,
          prayerKey: updatedItem.prayerKey,
          isCompleted: updatedItem.isCompleted,
          completedAt: updatedItem.completedAt,
          location: location as any,
          withSunnah,
          notes: notes || null,
          clientUpdatedAt: Date.now(),
        };
        await localPrayerRepo.save(localRec);
      } else {
        await togglePrayer({
          date: dateStr,
          prayerKey: updatedItem.prayerKey,
          isCompleted: updatedItem.isCompleted,
          location: location as any,
          withSunnah,
          notes: notes || undefined,
        });
      }
    },
    [detailModalPrayer, isGuest, dateStr]
  );

  return (
    <>
      <div className="w-full p-3 sm:p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Header & Counter */}
          <div className="flex items-center justify-between sm:justify-start gap-2.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Compass className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold text-zinc-200">الصلوات الخمس</span>
            </div>

            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800/80 text-[11px] font-mono font-bold text-zinc-300">
              <span className={completedCount === 5 ? "text-emerald-400 font-extrabold" : "text-zinc-100"}>
                {completedCount}
              </span>
              <span className="text-zinc-500">/</span>
              <span className="text-zinc-400">5</span>
            </div>
          </div>

          {/* Prayers Buttons Grid */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {prayers.map((p) => {
              const isDone = p.isCompleted;

              return (
                <div
                  key={p.prayerKey}
                  className={`group relative flex items-center justify-between px-2 sm:px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    isDone
                      ? "bg-emerald-950/25 border-emerald-500/35 text-emerald-200 shadow-sm shadow-emerald-950/30"
                      : "bg-zinc-950/50 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                  onClick={(e) => handleToggle(p, e)}
                  role="button"
                  tabIndex={0}
                  aria-label={`صلاة ${p.nameArabic}: ${isDone ? "تمت" : "لم تتم"}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-zinc-600 shrink-0 group-hover:text-zinc-400" />
                    )}
                    <span className="text-[11px] font-semibold truncate tracking-tight">
                      {p.nameArabic}
                    </span>
                  </div>

                  {/* Tiny trigger for detail modal */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailModalPrayer(p);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-white p-0.5 rounded transition-opacity"
                    title="تفاصيل الصلاة (المسجد، السنة، الملاحظات)"
                  >
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Prayer Detail Quick Modal */}
      {detailModalPrayer && (
        <PrayerDetailQuickModal
          prayer={detailModalPrayer}
          onClose={() => setDetailModalPrayer(null)}
          onSave={handleSaveDetails}
        />
      )}
    </>
  );
}

function PrayerDetailQuickModal({
  prayer,
  onClose,
  onSave,
}: {
  prayer: PrayerItem;
  onClose: () => void;
  onSave: (location: string | null, withSunnah: boolean, notes: string) => void;
}) {
  const [location, setLocation] = useState<string>(prayer.location || "mosque");
  const [withSunnah, setWithSunnah] = useState<boolean>(prayer.withSunnah);
  const [notes, setNotes] = useState<string>(prayer.notes || "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-[#0c0e17] border border-zinc-800 shadow-2xl p-5 space-y-4 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-zinc-100">
              تفاصيل صلاة {prayer.nameArabic}
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Location selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">مكان الصلاة</label>
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            {[
              { id: "mosque", label: "مسجد" },
              { id: "home", label: "منزل" },
              { id: "work", label: "عمل" },
              { id: "other", label: "آخر" },
            ].map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => setLocation(loc.id)}
                className={`py-1.5 rounded-xl border font-medium transition-all ${
                  location === loc.id
                    ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-300 font-bold"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {loc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sunnah Toggle */}
        <label className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 cursor-pointer">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-200">صلاة السنن الرواتب</span>
          </div>
          <input
            type="checkbox"
            checked={withSunnah}
            onChange={(e) => setWithSunnah(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-700 bg-zinc-800"
          />
        </label>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">ملاحظات إضافية (اختياري)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثال: إدراك تكبيرة الإحرام، قراءة سورة..."
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold hover:text-white"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onSave(location, withSunnah, notes)}
            className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
          >
            حفظ التفاصيل
          </button>
        </div>
      </div>
    </div>
  );
}
