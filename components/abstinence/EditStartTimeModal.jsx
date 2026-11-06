"use client";

import { useState, useEffect } from "react";
import { Clock, Calendar, X, Loader2, Edit3, Check } from "lucide-react";
import { updateAbstinenceStartTime } from "@/actions/abstinence";
import { splitUtcToLocalDateTime, getLocalDateString } from "@/lib/dates";

export default function EditStartTimeModal({
  isOpen,
  onClose,
  tracker,
  timezone = "Asia/Riyadh",
  onUpdated,
}) {
  const activeSession = tracker?.activeSession;
  const startedAt = activeSession?.startedAt;

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Sync initial date & time when opened
  useEffect(() => {
    if (startedAt) {
      const { localDate, localTime } = splitUtcToLocalDateTime(startedAt, timezone);
      setStartDate(localDate);
      setStartTime(localTime);
    } else {
      const today = getLocalDateString(new Date(), timezone);
      setStartDate(today);
      setStartTime("00:00");
    }
  }, [startedAt, timezone, isOpen]);

  if (!isOpen || !tracker || !activeSession) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !startTime) {
      setErrorMsg("يرجى تحديد التاريخ والوقت");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await updateAbstinenceStartTime({
        trackerId: tracker.id,
        startDate,
        startTime,
        timezone,
      });

      if (res.success) {
        onUpdated?.();
        onClose();
      } else {
        setErrorMsg(res.error || "تعذر تعديل وقت البداية");
      }
    } catch (err) {
      setErrorMsg(err?.message || "حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-[#0c0e17] border border-violet-500/30 shadow-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">تعديل تاريخ ووقت البداية</h2>
              <p className="text-xs text-zinc-400 mt-0.5">{tracker.name}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-3">
            <p className="text-xs text-zinc-400 leading-relaxed">
              عدّل التاريخ والوقت الفعلي الذي بدأت فيه الامتناع، وسيتم إعادة حساب العداد فوراً.
            </p>

            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300 block">تاريخ البداية:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300 block">ساعة ودقيقة البداية:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-violet-500 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cur = new Date();
                      setStartDate(getLocalDateString(cur, timezone));
                      setStartTime(
                        `${String(cur.getHours()).padStart(2, "0")}:${String(cur.getMinutes()).padStart(2, "0")}`
                      );
                    }}
                    className="px-2.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 shrink-0 font-medium transition-colors"
                  >
                    الآن
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 font-semibold transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-violet-600/25 disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>تحديث العداد</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
