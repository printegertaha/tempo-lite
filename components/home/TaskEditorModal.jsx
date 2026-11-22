"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import DatePickerModal from "@/components/ui/DatePickerModal";
import TimePickerModal from "@/components/ui/TimePickerModal";
import {
  Calendar,
  Clock,
  ListTree,
  Trash2,
  Timer,
  Check,
  Repeat,
  Moon,
} from "lucide-react";

export default function TaskEditorModal({
  isOpen,
  onClose,
  task,
  onSave,
  lifeAreas = [],
  todayStr,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState(todayStr);
  const [startTime, setStartTime] = useState(null);
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [lifeAreaId, setLifeAreaId] = useState("");
  const [isPomodoro, setIsPomodoro] = useState(false);
  const [workCycle, setWorkCycle] = useState(25);
  const [breakCycle, setBreakCycle] = useState(5);
  const [isRecurring, setIsRecurring] = useState(false);
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const isSleepConflict = Boolean(
    startTime && (() => {
      const [h] = startTime.split(":").map(Number);
      return !isNaN(h) && (h >= 23 || h < 6);
    })()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevTaskId, setPrevTaskId] = useState(task?.id);

  if (prevIsOpen !== isOpen || prevTaskId !== task?.id) {
    setPrevIsOpen(isOpen);
    setPrevTaskId(task?.id);
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setPriority(task.priority || "MEDIUM");
      setDueDate(task.dueDate || todayStr);
      setStartTime(task.startTime || null);
      setDurationMinutes(task.durationMinutes || 25);
      setLifeAreaId(task.lifeAreaId || "");
      setIsPomodoro(Boolean(task.isPomodoro));
      setWorkCycle(task.workCycle || 25);
      setBreakCycle(task.breakCycle || 5);
      setIsRecurring(Boolean(task.isRecurring));
      setSubtasks(Array.isArray(task.subtasks) ? task.subtasks : []);
    } else {
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setDueDate(todayStr);
      setStartTime(null);
      setDurationMinutes(25);
      setLifeAreaId("");
      setIsPomodoro(false);
      setWorkCycle(25);
      setBreakCycle(5);
      setIsRecurring(false);
      setSubtasks([]);
    }
  }

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: newSubtaskTitle.trim(),
        completed: false,
      },
    ]);
    setNewSubtaskTitle("");
  };

  const handleToggleSubtask = (id) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleDeleteSubtask = (id) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await onSave({
        id: task?.id,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        dueDate: dueDate || null,
        startTime: startTime || null,
        durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        lifeAreaId: lifeAreaId || null,
        isPomodoro,
        workCycle: Number(workCycle),
        breakCycle: Number(breakCycle),
        isRecurring,
        subtasks,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="lg"
        title={task ? "تعديل تفاصيل المهمة" : "إنشاء مهمة جديدة"}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-300">عنوان المهمة *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: مراجعة وثيقة معمارية النظام، حل تمارين الفيزياء..."
              maxLength={200}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-300">الوصف أو الملاحظات (اختياري)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="تفاصيل إضافية، روابط، متطلبات الإنجاز..."
              className="w-full px-3.5 py-2 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>

          {/* Date, Time, Duration Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Due Date Trigger */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">التاريخ</label>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 hover:border-zinc-700 transition-colors"
              >
                <span className="truncate">{dueDate || "بدون موعد"}</span>
                <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
              </button>
            </div>

            {/* Start Time Trigger */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">وقت البدء المجدول</label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsTimePickerOpen(true)}
                  className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 hover:border-zinc-700 transition-colors"
                >
                  <span className="truncate">{startTime || "غير محدد"}</span>
                  <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                </button>
                {startTime && (
                  <button
                    type="button"
                    onClick={() => setStartTime(null)}
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/40 transition-colors"
                    title="مسح وقت البدء"
                  >
                    ✕
                  </button>
                )}
              </div>
              {isSleepConflict && (
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px]">
                  <Moon className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>تنبيه: وقت البدء يقع ضمن ساعات النوم المعتادة (١١ م - ٦ ص).</span>
                </div>
              )}
            </div>

            {/* Duration Minutes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">المدة المخططة (دقيقة)</label>
              <input
                type="number"
                min={1}
                max={1440}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Priority & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Priority */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">الأولوية</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
              >
                <option value="LOW">منخفضة</option>
                <option value="MEDIUM">متوسطة</option>
                <option value="HIGH">عالية</option>
                <option value="URGENT">قصوى ⚡</option>
              </select>
            </div>

            {/* Life Area */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">التصنيف / مجال الحياة</label>
              <select
                value={lifeAreaId}
                onChange={(e) => setLifeAreaId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
              >
                <option value="">بدون تصنيف</option>
                {lifeAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subtasks Section */}
          <div className="space-y-2 pt-1 border-t border-zinc-850">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                <ListTree className="w-3.5 h-3.5 text-violet-400" />
                <span>المهام الفرعية ({subtasks.length})</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSubtask())}
                placeholder="إضافة خطوة فرعية..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
              >
                إضافة
              </button>
            </div>

            {subtasks.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-950/60 border border-zinc-850 text-xs"
                  >
                    <label className="flex items-center gap-2 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={st.completed}
                        onChange={() => handleToggleSubtask(st.id)}
                        className="rounded text-violet-600 focus:ring-violet-500 border-zinc-700 bg-zinc-800"
                      />
                      <span className={st.completed ? "line-through text-zinc-500" : "text-zinc-200"}>
                        {st.title}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(st.id)}
                      className="text-zinc-600 hover:text-red-400 p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pomodoro & Recurrence Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-zinc-850">
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800 cursor-pointer">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <Timer className="w-4 h-4 text-indigo-400" />
                <span>جلسات بومودورو</span>
              </div>
              <input
                type="checkbox"
                checked={isPomodoro}
                onChange={(e) => setIsPomodoro(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800 cursor-pointer">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <Repeat className="w-4 h-4 text-emerald-400" />
                <span>تكرار أسبوعي</span>
              </div>
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
            </label>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 text-xs font-semibold hover:bg-zinc-850 hover:text-white transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSaving}
              className="flex-1 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{task ? "حفظ التعديلات" : "إنشاء المهمة"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        value={dueDate}
        onChange={(newDate) => setDueDate(newDate)}
      />

      {/* Time Picker Modal */}
      <TimePickerModal
        isOpen={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        value={startTime}
        onChange={(newTime) => setStartTime(newTime)}
      />
    </>
  );
}
