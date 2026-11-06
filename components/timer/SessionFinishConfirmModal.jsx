"use client";

import { useState, useEffect } from "react";
import { formatDurationDetailed } from "../data/storage";
import { Check, X, Clock, Plus, Minus, AlertCircle, FileText } from "lucide-react";

export default function SessionFinishConfirmModal({
  isOpen,
  initialSeconds,
  sessionType = "programming",
  initialProject = "",
  initialTask = "",
  onConfirm,
  onCancel,
  onResume,
}) {
  const [adjustedSeconds, setAdjustedSeconds] = useState(initialSeconds || 60);
  const [projectName, setProjectName] = useState(initialProject || "");
  const [taskName, setTaskName] = useState(initialTask || "");
  const [notes, setNotes] = useState("");

  // Keep in sync whenever opened with new elapsed time
  useEffect(() => {
    if (isOpen) {
      setAdjustedSeconds(Math.max(60, initialSeconds || 60));
      setProjectName(initialProject || (sessionType === "gym" ? "جلسة تمرين" : "مشروع البرمجة"));
      setTaskName(initialTask || "");
      setNotes("");
    }
  }, [isOpen, initialSeconds, initialProject, initialTask, sessionType]);

  if (!isOpen) return null;

  const hours = Math.floor(adjustedSeconds / 3600);
  const minutes = Math.floor((adjustedSeconds % 3600) / 60);

  const handleAdjust = (deltaMinutes) => {
    setAdjustedSeconds((prev) => Math.max(60, prev + deltaMinutes * 60));
  };

  const handleManualHours = (val) => {
    const h = Math.max(0, parseInt(val, 10) || 0);
    setAdjustedSeconds(h * 3600 + minutes * 60);
  };

  const handleManualMinutes = (val) => {
    const m = Math.max(0, Math.min(59, parseInt(val, 10) || 0));
    setAdjustedSeconds(hours * 3600 + m * 60);
  };

  const handleFinalConfirm = (e) => {
    e.preventDefault();
    onConfirm({
      durationSeconds: adjustedSeconds,
      projectName: projectName.trim() || (sessionType === "gym" ? "تمرين رياضي" : "عمل عميق"),
      task: taskName.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onResume || onCancel}
    >
      <div 
        className="relative w-full max-w-lg rounded-3xl bg-[#0e111a] border border-cyan-500/30 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Clock className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-zinc-100 font-bold text-base">تأكيد توثيق مدة الجلسة</h3>
              <p className="text-zinc-400 text-xs">راجع الوقت الفعلي قبل حفظه في سجلك التاريخي</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onResume}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="متابعة المؤقت"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleFinalConfirm} className="p-6 space-y-5">
          {/* Main duration prompt */}
          <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 text-center">
            <span className="text-xs text-zinc-300 block mb-1">
              الوقت المسجل في هذه الجلسة:
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-400">
              {formatDurationDetailed(adjustedSeconds)}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              هل هذه المدة دقيقة وصحيحة لإضافتها إلى رصيدك اليومي؟
            </p>
          </div>

          {/* Quick Adjustment Controls */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              تعديل المدة المسجلة (زيادة أو إنقاص وقت الاستراحة):
            </label>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleAdjust(-15)}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono font-bold border border-zinc-750 transition-colors"
              >
                - 15 د
              </button>
              <button
                type="button"
                onClick={() => handleAdjust(-5)}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono font-bold border border-zinc-750 transition-colors"
              >
                - 5 د
              </button>
              <button
                type="button"
                onClick={() => handleAdjust(5)}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/30 transition-colors"
              >
                + 5 د
              </button>
              <button
                type="button"
                onClick={() => handleAdjust(15)}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/30 transition-colors"
              >
                + 15 د
              </button>
            </div>

            {/* Direct manual inputs */}
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={hours}
                  onChange={(e) => handleManualHours(e.target.value)}
                  className="w-16 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-750 text-center font-mono text-zinc-100 text-sm focus:outline-none focus:border-cyan-500"
                />
                <span className="text-xs text-zinc-400">ساعة</span>
              </div>
              <span className="text-zinc-600 font-bold">:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => handleManualMinutes(e.target.value)}
                  className="w-16 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-750 text-center font-mono text-zinc-100 text-sm focus:outline-none focus:border-cyan-500"
                />
                <span className="text-xs text-zinc-400">دقيقة</span>
              </div>
            </div>
          </div>

          {/* Project & Task Details */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                اسم المشروع / المسار
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="مثال: منصة أثر، تعلم الخوارزميات، كتاب القراءة"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                المهمة المنجزة (اختياري)
              </label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="مثال: برمجة واجهة المستخدم وحل أخطاء التزامن"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                ملاحظات أو انطباع شخصي (اختياري)
              </label>
              <textarea
                rows="2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="كيف كان مستوى تركيزك؟ هل واجهت تشتتاً؟"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition-colors"
            >
              إلغاء وحذف الجلسة
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onResume}
                className="px-4 py-2 rounded-xl text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-750 transition-colors"
              >
                متابعة المؤقت
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition-all active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>تأكيد وتوثيق الجلسة</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

