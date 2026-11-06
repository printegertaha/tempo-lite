"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Calendar,
  Clock,
  Target,
  FileText,
  X,
  Loader2,
  Sparkles,
} from "lucide-react";
import { createAbstinenceTracker } from "@/actions/abstinence";
import { getLocalDateString } from "@/lib/dates";

const POPULAR_BEHAVIORS = [
  "مشاهدة الإباحية والمحتوى المثير",
  "التدخين والسجائر الإلكترونية",
  "إضاعة الوقت على السوشيال ميديا",
  "تناول السكريات والوجبات السريعة",
  "السهر والنوم المتأخر",
  "ألعاب الفيديو المفرطة",
];

const TARGET_PRESETS = [
  { days: 7, label: "أسبوع (7 أيام)" },
  { days: 14, label: "أسبوعان (14 يوماً)" },
  { days: 30, label: "شهر (30 يوماً)" },
  { days: 90, label: "فصل كامل (90 يوماً)" },
  { days: 365, label: "سنة كاملة (365 يوماً)" },
];

export default function CreateAbstinenceModal({
  isOpen,
  onClose,
  onCreated,
  timezone = "Asia/Riyadh",
}) {
  const todayStr = getLocalDateString(new Date(), timezone);

  // Default time now formatted as HH:mm
  const now = new Date();
  const defaultHour = String(now.getHours()).padStart(2, "0");
  const defaultMinute = String(now.getMinutes()).padStart(2, "0");
  const defaultTimeStr = `${defaultHour}:${defaultMinute}`;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(todayStr);
  const [startTime, setStartTime] = useState(defaultTimeStr);
  const [targetDays, setTargetDays] = useState("30");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("يرجى كتابة اسم السلوك الممتنع عنه");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await createAbstinenceTracker({
        name: name.trim(),
        description: description.trim() || null,
        startDate,
        startTime,
        targetDays: targetDays ? parseInt(targetDays, 10) : null,
        timezone,
      });

      if (res.success) {
        setName("");
        setDescription("");
        onCreated?.(res.data);
        onClose();
      } else {
        setErrorMsg(res.error || "تعذر إنشاء هدف الامتناع");
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
        className="w-full max-w-lg rounded-3xl bg-[#0c0e17] border border-zinc-800 shadow-2xl p-6 sm:p-7 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">إنشاء هدف امتناع جديد</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                تحديد السلوك وتاريخ ووقت البداية الدقيق
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

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Behavior Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 block">
              اسم السلوك المراد الامتناع عنه <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: مشاهدة الإباحية، التدخين، السكر..."
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30"
              required
            />

            {/* Quick behavior suggestion chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {POPULAR_BEHAVIORS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setName(sug)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Start Date & Time (Dual-input allowing past timestamps) */}
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
            <span className="text-xs font-bold text-zinc-300 block flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              <span>تاريخ ووقت بداية الامتناع الدقيق</span>
            </span>
            <p className="text-[11px] text-zinc-400">
              يمكنك تحديد تاريخ ووقت من الماضي إذا كنت قد بدأت بالفعل، ليتم حساب إجمالي المدة بدقة.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 block">تاريخ البداية:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 block">ساعة ودقيقة البداية:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-rose-500 font-mono"
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

          {/* Optional Target Duration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-violet-400" />
                <span>الهدف الزمني المبدئي (اختياري)</span>
              </label>
              <span className="text-[11px] text-zinc-500 font-mono">
                {targetDays ? `${targetDays} يوماً` : "بدون هدف محدد"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {TARGET_PRESETS.map((p) => (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => setTargetDays(String(p.days))}
                  className={`text-[11px] px-3 py-1.5 rounded-xl border transition-colors font-medium ${
                    targetDays === String(p.days)
                      ? "bg-violet-600 text-white border-violet-500 shadow-sm"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTargetDays("")}
                className={`text-[11px] px-3 py-1.5 rounded-xl border transition-colors ${
                  !targetDays
                    ? "bg-zinc-800 text-white border-zinc-700"
                    : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:bg-zinc-800"
                }`}
              >
                مفتوح
              </button>
            </div>
          </div>

          {/* Optional Description / Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>الدافع أو السبب الشخصي للامتناع (اختياري)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب تذكيراً لنفسك عن سبب رغبتك في التوقف وما تطمح لتحقيقه..."
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 resize-none"
            />
          </div>

          {/* Action Footer */}
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
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/25 disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>بدء رحلة الامتناع</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
