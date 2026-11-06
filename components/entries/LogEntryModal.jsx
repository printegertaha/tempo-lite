"use client";

import { useState, useEffect } from "react";
import {
  X,
  Check,
  Plus,
  Trash2,
  Clock,
  Calendar,
  FileText,
  Loader2,
  AlertCircle,
  Timer,
  Hash,
  Scale,
} from "lucide-react";
import {
  logTrackerEntry,
  getTrackerDailyAggregate,
  deleteTrackerEntry,
} from "@/actions/entries";
import { getLocalDateString } from "@/lib/dates";

export default function LogEntryModal({
  isOpen,
  onClose,
  tracker,
  localDate: defaultLocalDate,
  onLogged,
  onToast,
}) {
  const [localDate, setLocalDate] = useState(defaultLocalDate || "");
  const [numericValue, setNumericValue] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [timeStart, setTimeStart] = useState("23:00");
  const [timeEnd, setTimeEnd] = useState("07:00");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync date when defaultLocalDate changes or on mount
  useEffect(() => {
    if (defaultLocalDate) {
      setLocalDate(defaultLocalDate);
    } else if (!localDate && typeof window !== "undefined") {
      setLocalDate(getLocalDateString());
    }
  }, [defaultLocalDate, localDate]);

  // Daily entries state
  const [dayEntries, setDayEntries] = useState([]);

  // Load existing entries for the chosen date
  useEffect(() => {
    let active = true;
    if (isOpen && tracker?.id && localDate) {
      getTrackerDailyAggregate(tracker.id, localDate).then((res) => {
        if (active && res.success && res.data) {
          setDayEntries(res.data.entries || []);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [isOpen, tracker?.id, localDate]);

  if (!isOpen || !tracker) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let payload = {
        trackerId: tracker.id,
        localDate,
        notes: notes.trim() || null,
      };

      if (tracker.metricType === "NUMBER" || tracker.metricType === "COUNTER") {
        if (!numericValue) {
          onToast?.("يرجى إدخال القيمة الرقمية", "error");
          setIsSubmitting(false);
          return;
        }
        payload.valueNumeric = Number(numericValue);
      } else if (tracker.metricType === "DURATION") {
        const mins = Number(durationMinutes) || 0;
        if (mins <= 0) {
          onToast?.("يرجى إدخال مدة صالحة بالدقائق", "error");
          setIsSubmitting(false);
          return;
        }
        payload.valueDuration = mins * 60;
        if (subject.trim()) {
          payload.entryPayload = { subject: subject.trim() };
        }
      } else if (tracker.metricType === "TIME_RANGE") {
        // Construct ISO timestamps
        const [sy, sm, sd] = localDate.split("-").map(Number);
        const [sh, smin] = timeStart.split(":").map(Number);
        const [eh, emin] = timeEnd.split(":").map(Number);

        const startDate = new Date(Date.UTC(sy, sm - 1, sd, sh, smin));
        const endDate = new Date(Date.UTC(sy, sm - 1, sd, eh, emin));

        // If end time is earlier than start time, it crossed midnight (next calendar day)
        if (endDate.getTime() <= startDate.getTime()) {
          endDate.setUTCDate(endDate.getUTCDate() + 1);
        }

        payload.timeRangeStart = startDate.toISOString();
        payload.timeRangeEnd = endDate.toISOString();
      }

      const res = await logTrackerEntry(payload);
      if (res.success) {
        onToast?.("تم حفظ السجل بنجاح ✨", "success");
        onLogged?.();
        // Refresh local day entries
        setDayEntries((prev) => [...prev, res.data]);
        setNumericValue("");
        setNotes("");
        onClose();
      } else {
        onToast?.(res.error || "تعذر حفظ السجل", "error");
      }
    } catch {
      onToast?.("حدث خطأ غير متوقع", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    try {
      const res = await deleteTrackerEntry(entryId);
      if (res.success) {
        setDayEntries((prev) => prev.filter((e) => e.id !== entryId));
        onLogged?.();
        onToast?.("تم حذف السجل بنجاح", "info");
      }
    } catch {
      onToast?.("تعذر حذف السجل", "error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-[#0c0e17] border border-zinc-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0">
          <div>
            <h3 className="text-base font-bold text-zinc-100">
              تسجيل نشاط: {tracker.name}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              أدخل القياسات الدقيقة والملاحظات وسجل وقت الإنجاز
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              تاريخ الإنجاز (التاريخ المحلي)
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={localDate}
                onChange={(e) => setLocalDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-violet-500 font-mono"
              />
            </div>
          </div>

          {/* NUMBER / COUNTER Input */}
          {(tracker.metricType === "NUMBER" || tracker.metricType === "COUNTER") && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                الكمية / القياس {tracker.unit ? `(${tracker.unit})` : ""}
              </label>
              <input
                type="number"
                step="any"
                required
                value={numericValue}
                onChange={(e) => setNumericValue(e.target.value)}
                placeholder="أدخل القيمة..."
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-violet-500 font-mono text-base font-bold"
              />
            </div>
          )}

          {/* DURATION Input */}
          {tracker.metricType === "DURATION" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  المدة المستغرقة (بالدقائق)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  الموضوع أو عنوان الجلسة (اختياري)
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="مثال: فصل الذكاء الاصطناعي، كتاب كذا..."
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          )}

          {/* TIME_RANGE Input */}
          {tracker.metricType === "TIME_RANGE" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  وقت البدء (HH:MM)
                </label>
                <input
                  type="time"
                  required
                  value={timeStart}
                  onChange={(e) => setTimeStart(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  وقت الانتهاء (HH:MM)
                </label>
                <input
                  type="time"
                  required
                  value={timeEnd}
                  onChange={(e) => setTimeEnd(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              ملاحظات أو خواطر إضافية (اختياري)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب أي ملاحظة أو تأمل حول إنجازك اليوم..."
              className="w-full px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>

          {/* Existing Logs for this date */}
          {dayEntries.length > 0 && (
            <div className="pt-3 border-t border-zinc-800 space-y-2">
              <h5 className="text-[11px] font-bold text-zinc-400">
                السجلات المسجلة لهذا اليوم ({dayEntries.length})
              </h5>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {dayEntries.map((ent) => (
                  <div
                    key={ent.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-400 text-[10px]">
                        {new Date(ent.occurredAt).toLocaleTimeString("ar-SA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="font-bold text-zinc-200">
                        {ent.valueNumeric !== null
                          ? `${ent.valueNumeric} ${tracker.unit || ""}`
                          : ent.valueDuration !== null
                          ? `${Math.round(ent.valueDuration / 60)} دقيقة`
                          : ent.valueBoolean !== null
                          ? ent.valueBoolean
                            ? "مكتمل"
                            : "غير مكتمل"
                          : "مسجل"}
                      </span>
                      {ent.notes && (
                        <span className="text-zinc-500 truncate max-w-[120px]">
                          ({ent.notes})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(ent.id)}
                      className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                      title="حذف هذا السجل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>حفظ السجل</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
