"use client";

import { useState } from "react";
import {
  RotateCcw,
  Calendar,
  Clock,
  AlertTriangle,
  HelpCircle,
  FileText,
  X,
  Loader2,
  HeartHandshake,
} from "lucide-react";
import { logRelapse } from "@/actions/abstinence";
import { getLocalDateString } from "@/lib/dates";

const COMMON_TRIGGERS = [
  "توتر وضغوط العمل",
  "فراغ وملل",
  "سهو واستخدام الهاتف في السرير",
  "إغراء ومحتوى عارض",
  "غضب أو إحباط",
  "تعب وإرهاق وقلة نوم",
];

export default function LogRelapseModal({
  isOpen,
  onClose,
  tracker,
  timezone = "Asia/Riyadh",
  onRelapseLogged,
}) {
  const todayStr = getLocalDateString(new Date(), timezone);
  const now = new Date();
  const defaultHour = String(now.getHours()).padStart(2, "0");
  const defaultMinute = String(now.getMinutes()).padStart(2, "0");
  const defaultTimeStr = `${defaultHour}:${defaultMinute}`;

  const [relapseDate, setRelapseDate] = useState(todayStr);
  const [relapseTime, setRelapseTime] = useState(defaultTimeStr);
  const [startNewFromRelapse, setStartNewFromRelapse] = useState(true);
  const [newStartDate, setNewStartDate] = useState(todayStr);
  const [newStartTime, setNewStartTime] = useState(defaultTimeStr);
  const [trigger, setTrigger] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen || !tracker) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await logRelapse({
        trackerId: tracker.id,
        relapseDate,
        relapseTime,
        startNewSessionFromRelapse: startNewFromRelapse,
        newStartDate: startNewFromRelapse ? undefined : newStartDate,
        newStartTime: startNewFromRelapse ? undefined : newStartTime,
        trigger: trigger.trim() || null,
        relapseReason: trigger.trim() || null,
        notes: notes.trim() || null,
        timezone,
      });

      if (res.success) {
        onRelapseLogged?.();
        onClose();
      } else {
        setErrorMsg(res.error || "تعذر تسجيل الانتكاسة");
      }
    } catch (err) {
      setErrorMsg(err?.message || "حدث خطأ أثناء حفظ الانتكاسة");
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
        className="w-full max-w-lg rounded-3xl bg-[#0c0e17] border border-rose-500/30 shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">تسجيل انتكاسة</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                هدف: <span className="text-rose-300 font-semibold">{tracker.name}</span>
              </p>
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

        {/* Supportive Reminder Card */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 flex items-start gap-3 leading-relaxed">
          <HeartHandshake className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-zinc-100 block mb-0.5">الانتكاسة جزء من مسار التعافي، وليست نهاية الطريق.</span>
            سجل الجلسة السابقة محفوظ بالكامل وستبدأ جلسة جديدة الآن. رصد المحفز والتعلم منه هو أقصر طريق للثبات.
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Relapse Date & Time */}
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
            <span className="text-xs font-bold text-zinc-300 block flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              <span>تاريخ ووقت حدوث الانتكاسة الفعلي</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 block">التاريخ:</label>
                <input
                  type="date"
                  value={relapseDate}
                  onChange={(e) => setRelapseDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 block">الوقت:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={relapseTime}
                    onChange={(e) => setRelapseTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-rose-500 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cur = new Date();
                      setRelapseDate(getLocalDateString(cur, timezone));
                      setRelapseTime(
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

          {/* New Session Start Option */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 block">
              بداية جلسة الامتناع الجديدة:
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStartNewFromRelapse(true)}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-colors ${
                  startNewFromRelapse
                    ? "bg-violet-600 text-white border-violet-500 shadow-sm"
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850"
                }`}
              >
                من وقت الانتكاسة مباشرة
              </button>
              <button
                type="button"
                onClick={() => setStartNewFromRelapse(false)}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-colors ${
                  !startNewFromRelapse
                    ? "bg-violet-600 text-white border-violet-500 shadow-sm"
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850"
                }`}
              >
                تحديد وقت مخصص
              </button>
            </div>

            {!startNewFromRelapse && (
              <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
                />
                <input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono"
                />
              </div>
            )}
          </div>

          {/* Trigger / Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 block">
              المحفز أو السبب الرئيسي للانتكاسة (اختياري)
            </label>
            <input
              type="text"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="اكتب المحفز أو اختر من الاقتراحات أدناه..."
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
            />
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {COMMON_TRIGGERS.map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTrigger(t)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Notes / Reflections */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 block">
              ملاحظات أو وقفة تأمل (اختياري)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ما الذي ستفعله بشكل مختلف في المرة القادمة عند مواجهة نفس المحفز؟"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/80">
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/25 disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>تأكيد وبدء جلسة جديدة</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
