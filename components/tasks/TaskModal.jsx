"use client";

import { useState, useEffect } from "react";
import {
  X,
  Check,
  Calendar,
  AlertCircle,
  Flame,
  Tag,
  Link2,
  Folder,
  Loader2,
  Plus,
} from "lucide-react";
import { addDaysToDateString, getLocalDateString } from "@/lib/dates";

const PRIORITIES = [
  { id: "LOW", label: "منخفضة", color: "border-zinc-700 text-zinc-300" },
  { id: "MEDIUM", label: "متوسطة", color: "border-sky-500/40 text-sky-300 bg-sky-500/10" },
  { id: "HIGH", label: "مرتفعة", color: "border-amber-500/40 text-amber-300 bg-amber-500/10" },
  { id: "URGENT", label: "عاجلة جداً", color: "border-red-500/50 text-red-300 bg-red-500/15" },
];

const STATUSES = [
  { id: "TODO", label: "قيد الانتظار" },
  { id: "IN_PROGRESS", label: "جارية الآن" },
  { id: "COMPLETED", label: "مكتملة" },
  { id: "CANCELLED", label: "ملغاة" },
];

export default function TaskModal({
  isOpen,
  onClose,
  task = null,
  lifeAreas = [],
  trackers = [],
  todayStr,
  onSave,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [status, setStatus] = useState("TODO");
  const [lifeAreaId, setLifeAreaId] = useState("");
  const [trackerId, setTrackerId] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Populate state on open or change
  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setDueDate(task.dueDate || "");
      setPriority(task.priority || "MEDIUM");
      setStatus(task.status || "TODO");
      setLifeAreaId(task.lifeAreaId || "");
      setTrackerId(task.trackerId || "");
      setTags(Array.isArray(task.tags) ? task.tags : []);
    } else {
      setTitle("");
      setDescription("");
      setDueDate(todayStr || "");
      setPriority("MEDIUM");
      setStatus("TODO");
      setLifeAreaId("");
      setTrackerId("");
      setTags([]);
    }
    setErrorMessage("");
  }, [task, isOpen, todayStr]);

  if (!isOpen) return null;

  const handleAddTag = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmed = tagInput.trim().replace(/^#/, "");
      if (trimmed && !tags.includes(trimmed)) {
        setTags([...tags, trimmed]);
        setTagInput("");
      }
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage("يرجى كتابة عنوان المهمة");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        dueDate: dueDate || null,
        priority,
        status,
        lifeAreaId: lifeAreaId || null,
        trackerId: trackerId || null,
        tags,
      };

      if (task?.id) {
        payload.id = task.id;
      }

      await onSave(payload);
      onClose();
    } catch (err) {
      setErrorMessage(err?.message || "حدث خطأ أثناء حفظ المهمة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setRelativeDueDate = (days) => {
    const base = todayStr || (typeof window !== "undefined" ? getLocalDateString() : "");
    if (days === 0) setDueDate(base);
    else if (days === 1) setDueDate(addDaysToDateString(base, 1));
    else if (days === 3) setDueDate(addDaysToDateString(base, 3));
    else if (days === 7) setDueDate(addDaysToDateString(base, 7));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">
                {task ? "تعديل المهمة" : "مهمة جديدة"}
              </h2>
              <p className="text-[11px] text-zinc-500">
                مهام مستقلة تدعم التاريخ والأولوية ومجالات الحياة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              عنوان المهمة <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: مراجعة الفصل الثالث من الفيزياء، شراء مستلزمات..."
              className="w-full px-4 py-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
              autoFocus
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              الوصف أو الملاحظات (اختياري)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="تفاصيل إضافية عن المهمة أو خطوات التنفيذ..."
              className="w-full px-4 py-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>

          {/* Due Date & Quick Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>تاريخ الاستحقاق</span>
              </label>
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate("")}
                  className="text-[11px] text-zinc-500 hover:text-red-400"
                >
                  إزالة التاريخ
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 mb-2">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Quick relative buttons */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
              <span className="text-zinc-500">سريع:</span>
              <button
                type="button"
                onClick={() => setRelativeDueDate(0)}
                className="px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
              >
                اليوم
              </button>
              <button
                type="button"
                onClick={() => setRelativeDueDate(1)}
                className="px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
              >
                غداً
              </button>
              <button
                type="button"
                onClick={() => setRelativeDueDate(3)}
                className="px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
              >
                +3 أيام
              </button>
              <button
                type="button"
                onClick={() => setRelativeDueDate(7)}
                className="px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
              >
                +أسبوع
              </button>
            </div>
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Priority */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">الأولوية</label>
              <div className="grid grid-cols-2 gap-1.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-medium border text-center transition-all ${
                      priority === p.id
                        ? `${p.color} shadow-sm font-semibold`
                        : "border-zinc-800 text-zinc-400 bg-zinc-900/40 hover:bg-zinc-900"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">الحالة</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
              >
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Life Area & Linked Tracker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Life Area */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-zinc-400" />
                <span>مجال الحياة (اختياري)</span>
              </label>
              <select
                value={lifeAreaId}
                onChange={(e) => setLifeAreaId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
              >
                <option value="">-- بدون تصنيف --</option>
                {lifeAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Linked Tracker */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-violet-400" />
                <span>ربط بمتعقب (اختياري)</span>
              </label>
              <select
                value={trackerId}
                onChange={(e) => setTrackerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
              >
                <option value="">-- بدون ربط --</option>
                {trackers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-zinc-400" />
              <span>الوسوم والتصنيفات (اضغط Enter بعد كل وسم)</span>
            </label>
            <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 min-h-[42px] flex items-center gap-1.5 flex-wrap">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700"
                >
                  <span>#{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-zinc-400 hover:text-red-400 ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder={tags.length === 0 ? "اكتب وسم ثم اضغط Enter..." : "وسم آخر..."}
                className="bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none min-w-[120px] flex-1 px-1"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <span>{task ? "تحديث المهمة" : "حفظ المهمة"}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

