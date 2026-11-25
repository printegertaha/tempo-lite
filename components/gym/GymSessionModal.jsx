"use client";

import { useState } from "react";
import { Dumbbell, Check, X, Clock, MapPin } from "lucide-react";

export default function GymSessionModal({
  isOpen,
  initialDurationMinutes = 60,
  onSaveSession,
  onClose,
}) {
  const [gymName, setGymName] = useState("");
  const [workoutType, setWorkoutType] = useState("Push Day (صدر وأكتاف وترايسبس)");
  const [durationMinutes, setDurationMinutes] = useState(initialDurationMinutes || 60);
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseWeight, setExerciseWeight] = useState("");
  const [exerciseReps, setExerciseReps] = useState("");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const workoutTypes = [
    "Push Day (صدر وأكتاف وترايسبس)",
    "Pull Day (ظهر وبايسبس وعقلة)",
    "Leg Day (أرجل وبطات ومعدة)",
    "Upper Body (جزء علوي شامل)",
    "Lower Body (جزء سفلي شامل)",
    "Full Body (تمرين كامل للجسم)",
    "Cardio & Core (كارديو وعضلات بطن)",
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const end = new Date();
    const durationNum = Math.max(1, Number(durationMinutes) || 0);
    const start = new Date(end.getTime() - durationNum * 60000);

    const parsedWeight = Number(exerciseWeight);
    const parsedReps = Number(exerciseReps);
    const exercises = exerciseName.trim()
      ? [
          {
            name: exerciseName.trim(),
            weightKg: Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : 0,
            reps: Number.isFinite(parsedReps) && parsedReps > 0 ? parsedReps : 0,
          },
        ]
      : [];

    onSaveSession({
      gymName: gymName.trim() || "النادي الرياضي",
      workoutType,
      durationMinutes: durationNum,
      startTime: start.toLocaleTimeString("ar-u-nu-latn", { hour: "2-digit", minute: "2-digit" }),
      endTime: end.toLocaleTimeString("ar-u-nu-latn", { hour: "2-digit", minute: "2-digit" }),
      exercises,
      notes: notes.trim(),
    });
    setGymName("");
    setExerciseName("");
    setExerciseWeight("");
    setExerciseReps("");
    setNotes("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-[#0e111a] border border-orange-500/30 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Dumbbell className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-zinc-100 font-bold text-base">توثيق جلسة تمرين حديد</h3>
              <p className="text-zinc-400 text-xs">سجل نوع التمرين والنادي والأحمال التدريبية</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              اسم النادي الرياضي أو المكان (اختياري)
            </label>
            <input
              type="text"
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              placeholder="مثال: النادي الرياضي، الجيم المنزلي"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              نوع التمرين (Split / Routine)
            </label>
            <select
              value={workoutType}
              onChange={(e) => setWorkoutType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-200 focus:outline-none focus:border-orange-500"
            >
              {workoutTypes.map((t, idx) => (
                <option key={idx} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Optional main exercise & weight log — defaults to empty without auto-saving 0 */}
          <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-2.5">
            <span className="text-[11px] font-bold text-zinc-400 block">
              تمرين أساسي بالوزن (اختياري)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
                placeholder="اسم التمرين (مثلاً Bench Press)"
                className="sm:col-span-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
              />
              <input
                type="number"
                min="0"
                step="0.5"
                value={exerciseWeight}
                onChange={(e) => setExerciseWeight(e.target.value)}
                placeholder="الوزن (كجم)"
                className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100"
              />
              <input
                type="number"
                min="0"
                step="1"
                value={exerciseReps}
                onChange={(e) => setExerciseReps(e.target.value)}
                placeholder="العدات"
                className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              مدة التمرين الفعلية (دقائق)
            </label>
            <input
              type="number"
              min="10"
              max="240"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 font-mono text-zinc-100 text-sm focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              ملاحظات أو أوزان قياسية (اختياري)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تحسن في أوزان الكتف والتحكم بالنزول السلبي"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-200 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-orange-600/30 transition-all"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>توثيق التمرين</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

