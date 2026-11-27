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
  Check,
} from "lucide-react";
import { PRAYER_NAMES_ARABIC } from "@/lib/validations/prayer";
import { localPrayerRepo, localOutboxRepo } from "@/lib/local-db";
import { syncEngine } from "@/lib/sync/sync-engine";

const ORDERED_PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

function buildDefaultDayPrayers(dateStr) {
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
}

const PRAYER_NUMBERS = {
  fajr: 1,
  dhuhr: 2,
  asr: 3,
  maghrib: 4,
  isha: 5,
};

export default function HomePrayerBar({
  userId,
  dateStr,
  initialPrayers = [],
  pendingOnly = false,
  onDisablePrayerTracking,
}) {
  const isGuest = !userId || userId === "guest";

  const [prayers, setPrayers] = useState(() => {
    if (initialPrayers && initialPrayers.length === 5) {
      return initialPrayers;
    }
    return buildDefaultDayPrayers(dateStr);
  });

  const [detailModalPrayer, setDetailModalPrayer] = useState(null);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  // Load local records from IndexedDB on mount / date change / sync pull
  useEffect(() => {
    let active = true;
    const effectiveUserId = isGuest ? "guest" : userId;

    const loadPrayersFromIdb = () => {
      localPrayerRepo
        .getByDate(effectiveUserId, dateStr)
        .then((records) => {
          if (!active) return;
          if (!records || records.length === 0) {
            if (!initialPrayers || initialPrayers.length !== 5) {
              setPrayers(buildDefaultDayPrayers(dateStr));
            }
            return;
          }
          const recMap = new Map(records.map((r) => [r.prayerKey, r]));
          setPrayers(
            buildDefaultDayPrayers(dateStr).map((p) => {
              const r = recMap.get(p.prayerKey);
              if (!r) return p;
              return {
                ...p,
                id: r.id,
                isCompleted: Boolean(r.isCompleted),
                completedAt: r.completedAt || null,
                location: r.location || null,
                withSunnah: Boolean(r.withSunnah),
                notes: r.notes || null,
              };
            })
          );
        })
        .catch(() => {});
    };

    loadPrayersFromIdb();
    const onSynced = (ev) => {
      const types = ev?.detail?.changedTypes || [];
      if (types.includes("prayer_record")) loadPrayersFromIdb();
    };
    window.addEventListener("athar_data_synced", onSynced);
    return () => {
      active = false;
      window.removeEventListener("athar_data_synced", onSynced);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest, userId, dateStr]);

  const completedCount = prayers.filter((p) => p.isCompleted).length;

  const persistPrayerLocalFirst = useCallback(
    async (record) => {
      const effectiveUserId = isGuest ? "guest" : userId;
      const localRec = {
        id:
          record.id && record.id !== `${dateStr}_${record.prayerKey}`
            ? record.id
            : `${effectiveUserId}_${dateStr}_${record.prayerKey}`,
        userId: effectiveUserId,
        date: dateStr,
        prayerKey: record.prayerKey,
        isCompleted: Boolean(record.isCompleted),
        completedAt: record.completedAt || null,
        location: record.location || null,
        withSunnah: Boolean(record.withSunnah),
        notes: record.notes || null,
        clientUpdatedAt: Date.now(),
      };
      await localPrayerRepo.save(localRec);

      if (!isGuest) {
        await localOutboxRepo.add({
          mutationId: crypto.randomUUID(),
          userId: effectiveUserId,
          entityType: "prayer_record",
          entityId: localRec.id,
          action: "update",
          payload: {
            date: dateStr,
            prayerKey: localRec.prayerKey,
            isCompleted: localRec.isCompleted,
            completedAt: localRec.completedAt,
            location: localRec.location,
            withSunnah: localRec.withSunnah,
            notes: localRec.notes,
          },
          clientTimestamp: Date.now(),
          version: 1,
          status: "pending",
          retryCount: 0,
        });
        syncEngine.scheduleSync(500);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("athar_prayers_updated", { detail: { userId: effectiveUserId, dateStr } })
        );
      }
    },
    [isGuest, userId, dateStr]
  );

  const handleToggle = useCallback(
    async (prayer, e) => {
      e?.stopPropagation();
      const newStatus = !prayer.isCompleted;
      const completedAt = newStatus ? new Date().toISOString() : null;

      setPrayers((prev) =>
        prev.map((p) =>
          p.prayerKey === prayer.prayerKey
            ? {
                ...p,
                isCompleted: newStatus,
                completedAt,
              }
            : p
        )
      );

      if (newStatus) {
        soundManager.playTaskDone();
      } else {
        soundManager.playClick();
      }

      await persistPrayerLocalFirst({
        ...prayer,
        isCompleted: newStatus,
        completedAt,
      });
    },
    [persistPrayerLocalFirst]
  );

  const handleSaveDetails = useCallback(
    async (location, withSunnah, notes) => {
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
      await persistPrayerLocalFirst(updatedItem);
    },
    [detailModalPrayer, persistPrayerLocalFirst]
  );

  const displayedPrayers = pendingOnly
    ? prayers.filter((p) => !p.isCompleted)
    : prayers;

  if (pendingOnly && displayedPrayers.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={`group relative w-full p-3 sm:p-3.5 ${
          onDisablePrayerTracking ? "pr-9 sm:pr-10" : ""
        } rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md shadow-sm`}
      >
        {onDisablePrayerTracking && (
          <button
            type="button"
            onClick={onDisablePrayerTracking}
            data-testid="disable-prayer-tracker-btn"
            aria-label="إخفاء متابعة الصلوات"
            title="إخفاء متابعة الصلوات (يمكنك إعادة تفعيلها من الإعدادات)"
            className="absolute top-2.5 right-2.5 p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/70 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100 transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Header & Counter & Mobile Accordion Toggle */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Compass className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold text-zinc-200">
                {pendingOnly ? "الصلوات المتبقية اليوم" : "الصلوات الخمس"}
              </span>

              {/* Mobile toggleable accordion arrow to expand/show full prayer names */}
              <button
                type="button"
                onClick={() => setIsMobileExpanded((prev) => !prev)}
                className="md:hidden flex items-center gap-1 p-1 pr-1.5 pl-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
                aria-label={isMobileExpanded ? "إخفاء أسماء الصلوات" : "عرض أسماء الصلوات"}
                title={isMobileExpanded ? "إخفاء الأسماء" : "عرض أسماء الصلوات"}
              >
                <span className="text-[10px] text-zinc-400 font-medium">
                  {isMobileExpanded ? "إخفاء" : "الأسماء"}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isMobileExpanded ? "rotate-180 text-emerald-400" : ""
                  }`}
                />
              </button>
            </div>

            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800/80 text-[11px] font-mono font-bold text-zinc-300">
              <span className={completedCount === 5 ? "text-emerald-400 font-extrabold" : "text-zinc-100"}>
                {completedCount}
              </span>
              <span className="text-zinc-500">/</span>
              <span className="text-zinc-400">5</span>
            </div>
          </div>

          {/* 1. Mobile (< md): Clean Numbered Pills/Circles (1 to 5) or Expanded View */}
          <div className="md:hidden">
            {!isMobileExpanded ? (
              /* Clean Numbered Pills/Circles 1 to 5 in order */
              <div className={`grid gap-2 pt-1 ${displayedPrayers.length <= 3 ? "grid-cols-3" : "grid-cols-5"}`}>
                {displayedPrayers.map((p) => {
                  const num = PRAYER_NUMBERS[p.prayerKey];
                  const isDone = p.isCompleted;

                  return (
                    <button
                      key={p.prayerKey}
                      type="button"
                      onClick={(e) => handleToggle(p, e)}
                      className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl border transition-all active:scale-95 cursor-pointer ${
                        isDone
                          ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-950/40"
                          : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
                      }`}
                      aria-label={`صلاة ${p.nameArabic} (${num}): ${isDone ? "تمت" : "لم تتم"}`}
                      title={`${num}. صلاة ${p.nameArabic}`}
                    >
                      <div className="flex items-center justify-center w-7 h-7 rounded-xl mb-0.5">
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <span className="font-mono text-xs font-bold text-zinc-400">
                            {num}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-medium tracking-tight">
                        {isDone ? p.nameArabic : `${num}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Mobile Expanded View: Full prayer names with detail trigger */
              <div className="space-y-1.5 pt-1 animate-in fade-in slide-in-from-top-2 duration-150">
                {displayedPrayers.map((p) => {
                  const num = PRAYER_NUMBERS[p.prayerKey];
                  const isDone = p.isCompleted;

                  return (
                    <div
                      key={p.prayerKey}
                      className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                        isDone
                          ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                          : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
                      }`}
                      onClick={(e) => handleToggle(p, e)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-mono font-bold border ${
                            isDone
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                              : "bg-zinc-900 border-zinc-800 text-zinc-400"
                          }`}
                        >
                          {num}
                        </span>
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-zinc-600 shrink-0" />
                        )}
                        <span className="text-xs font-bold text-zinc-200">
                          صلاة {p.nameArabic}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailModalPrayer(p);
                        }}
                        className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors text-xs flex items-center gap-1"
                        title="تفاصيل الصلاة"
                      >
                        <span className="text-[10px] text-zinc-400">التفاصيل</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Desktop (md:flex): Full prayer names always visible */}
          <div className={`hidden md:grid gap-2 ${pendingOnly ? "md:grid-cols-5 flex-1" : "md:grid-cols-5"}`}>
            {displayedPrayers.map((p) => {
              const isDone = p.isCompleted;

              return (
                <div
                  key={p.prayerKey}
                  className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
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

function PrayerDetailQuickModal({ prayer, onClose, onSave }) {
  const [location, setLocation] = useState(prayer.location || "mosque");
  const [withSunnah, setWithSunnah] = useState(Boolean(prayer.withSunnah));
  const [notes, setNotes] = useState(prayer.notes || "");

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
            className="p-1 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1.5 font-medium">موقع الصلاة</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLocation("mosque")}
                className={`py-2 px-3 rounded-xl border font-bold transition-colors ${
                  location === "mosque"
                    ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-300"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400"
                }`}
              >
                في المسجد / جماعة
              </button>
              <button
                type="button"
                onClick={() => setLocation("home")}
                className={`py-2 px-3 rounded-xl border font-bold transition-colors ${
                  location === "home"
                    ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-300"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400"
                }`}
              >
                في البيت / منفرد
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="text-zinc-300 font-medium">مع السنن الرواتب</label>
            <button
              type="button"
              onClick={() => setWithSunnah(!withSunnah)}
              className={`w-10 h-6 rounded-full transition-colors relative ${
                withSunnah ? "bg-emerald-600" : "bg-zinc-800"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  withSunnah ? "right-5" : "right-1"
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">ملاحظات أو خواطر</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="تدوين أي شعور أو ملاحظة..."
              rows={2}
              className="w-full p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-semibold transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onSave(location, withSunnah, notes)}
            className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-lg shadow-emerald-600/20"
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}
