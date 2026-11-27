"use client";

import { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import DatePickerModal from "@/components/ui/DatePickerModal";
import TimePickerModal from "@/components/ui/TimePickerModal";
import YouTubePreviewCard, {
  isValidHttpUrl,
  normalizeYouTubeMetaList,
} from "@/components/tasks/YouTubePreviewCard";
import PomodoroConfigPicker from "@/components/tasks/PomodoroConfigPicker";
import DurationStepper from "@/components/tasks/DurationStepper";
import HorizontalFormCarousel from "@/components/ui/HorizontalFormCarousel";
import SubtasksEditor from "@/components/tasks/SubtasksEditor";
import {
  Calendar,
  Clock,
  ListTree,
  Trash2,
  Timer,
  Check,
  Repeat,
  Moon,
  Video,
  Loader2,
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
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [youtubeUrlInput, setYoutubeUrlInput] = useState("");
  const [youtubeVideos, setYoutubeVideos] = useState([]);
  const [isFetchingYoutube, setIsFetchingYoutube] = useState(false);
  const [youtubeError, setYoutubeError] = useState("");
  const [isPomodoro, setIsPomodoro] = useState(false);
  const [workCycle, setWorkCycle] = useState(25);
  const [breakCycle, setBreakCycle] = useState(5);
  const [isRecurring, setIsRecurring] = useState(false);
  const [subtasks, setSubtasks] = useState([]);

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const isSleepConflict = Boolean(
    startTime && (() => {
      const [h] = startTime.split(":").map(Number);
      return !isNaN(h) && (h >= 23 || h < 6);
    })()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [jumpToSlide, setJumpToSlide] = useState(null);
  const titleInputRef = useRef(null);
  const youtubeInputRef = useRef(null);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevTaskId, setPrevTaskId] = useState(task?.id);

  if (prevIsOpen !== isOpen || prevTaskId !== task?.id) {
    setPrevIsOpen(isOpen);
    setPrevTaskId(task?.id);
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setPriority(task.priority === "URGENT" ? "HIGH" : task.priority || "MEDIUM");
      setDueDate(task.dueDate || todayStr);
      setStartTime(task.startTime || null);
      setDurationMinutes(task.durationMinutes || 60);
      setYoutubeVideos(normalizeYouTubeMetaList(task.youtubeMeta));
      setYoutubeUrlInput("");
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
      setDurationMinutes(60);
      setYoutubeVideos([]);
      setYoutubeUrlInput("");
      setIsPomodoro(false);
      setWorkCycle(25);
      setBreakCycle(5);
      setIsRecurring(false);
      setSubtasks([]);
    }
  }

  useEffect(() => {
    const trimmed = youtubeUrlInput.trim();
    if (!trimmed) {
      setYoutubeError("");
      return;
    }
    if (!/(youtube\.com|youtu\.be)/i.test(trimmed)) {
      setYoutubeError("");
      return;
    }
    const timer = setTimeout(async () => {
      setIsFetchingYoutube(true);
      setYoutubeError("");
      try {
        const res = await fetch(`/api/youtube/metadata?url=${encodeURIComponent(trimmed)}`);
        const json = await res.json();
        if (json.success && json.data) {
          const item = json.data;
          setYoutubeVideos((prev) =>
            prev.some((v) => v.videoId === item.videoId) ? prev : [...prev, item]
          );
          setYoutubeUrlInput("");
        } else {
          setYoutubeError(json.error || "تعذر جلب بيانات الفيديو");
        }
      } catch {
        setYoutubeError("تعذر الاتصال لجلب بيانات الفيديو");
      } finally {
        setIsFetchingYoutube(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [youtubeUrlInput]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    if (!title.trim()) {
      setJumpToSlide({ index: 0, nonce: Date.now() });
      setTimeout(() => titleInputRef.current?.focus({ preventScroll: true }), 140);
      return;
    }

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
        youtubeMeta:
          youtubeVideos.length === 0
            ? null
            : youtubeVideos.length === 1
              ? youtubeVideos[0]
              : youtubeVideos,
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
          <HorizontalFormCarousel
            resetKey={`${isOpen}-${task?.id || "new"}`}
            jumpToSlide={jumpToSlide}
            onSlideChange={(idx) => {
              if (idx === 0) {
                setTimeout(() => titleInputRef.current?.focus({ preventScroll: true }), 120);
              } else if (idx === 3) {
                setTimeout(() => youtubeInputRef.current?.focus({ preventScroll: true }), 120);
              }
            }}
            sections={[
              { id: "basics", title: "اسم المهمة والوصف" },
              { id: "schedule", title: "الميعاد والوقت والمدة" },
              { id: "priority-subtasks", title: "الأولوية وبومودورو والمهام الفرعية" },
              { id: "links", title: "الروابط والفيديوهات" },
            ]}
          >
            {/* Slide 1: Title & Description */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="inline-block mb-2 text-xs font-bold text-zinc-300">عنوان المهمة *</label>
                <input
                  ref={titleInputRef}
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: مراجعة وثيقة معمارية النظام، حل تمارين الفيزياء..."
                  maxLength={200}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300 mb-2 inline-block">الوصف أو الملاحظات (اختياري)</label>
                <textarea
                  rows={14}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="تفاصيل إضافية، روابط، متطلبات الإنجاز..."
                  className="w-full px-3.5 py-2 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>
            </div>

            {/* Slide 2: Date, Start Time, Duration, Pomodoro & Recurrence */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
              </div>

              <DurationStepper
                value={durationMinutes}
                onChange={(mins) => setDurationMinutes(mins)}
              />

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

            {/* Slide 3: Priority, Pomodoro & Subtasks */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">الأولوية</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "LOW", label: "منخفضة" },
                    { id: "MEDIUM", label: "متوسطة" },
                    { id: "HIGH", label: "عالية" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        priority === p.id
                          ? "bg-violet-600/20 border-violet-500/50 text-violet-200"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <PomodoroConfigPicker
                isPomodoro={isPomodoro}
                onToggle={setIsPomodoro}
                workCycle={workCycle}
                breakCycle={breakCycle}
                onSelectPreset={(w, b) => {
                  setWorkCycle(w);
                  setBreakCycle(b);
                }}
                durationMinutes={durationMinutes}
              />

              <SubtasksEditor subtasks={subtasks} onChange={setSubtasks} />
            </div>

            {/* Slide 4: YouTube Links */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-red-400" />
                <span>روابط فيديو يوتيوب (اختياري)</span>
              </label>
              <div className="relative">
                <input
                  ref={youtubeInputRef}
                  type="url"
                  dir="ltr"
                  value={youtubeUrlInput}
                  onChange={(e) => setYoutubeUrlInput(e.target.value)}
                  placeholder="الصق رابط يوتيوب أو أي رابط هنا..."
                  className="w-full pr-10 pl-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/50 text-left"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const trimmed = youtubeUrlInput.trim();
                    if (!isValidHttpUrl(trimmed)) {
                      setYoutubeError("يرجى إدخال رابط صالح");
                      return;
                    }
                    if (!/(youtube\.com|youtu\.be)/i.test(trimmed)) {
                      try {
                        const parsed = new URL(trimmed);
                        const linkItem = {
                          videoId: `link-${crypto.randomUUID().slice(0, 8)}`,
                          url: trimmed,
                          title: parsed.hostname.replace(/^www\./, ""),
                          channelName: trimmed,
                          thumbnailUrl: "",
                        };
                        setYoutubeVideos((prev) =>
                          prev.some((v) => v.url === trimmed) ? prev : [...prev, linkItem]
                        );
                        setYoutubeUrlInput("");
                        setYoutubeError("");
                      } catch {
                        setYoutubeError("يرجى إدخال رابط صالح");
                      }
                      return;
                    }
                    setIsFetchingYoutube(true);
                    setYoutubeError("");
                    try {
                      const res = await fetch(`/api/youtube/metadata?url=${encodeURIComponent(trimmed)}`);
                      const json = await res.json();
                      if (json.success && json.data) {
                        const item = json.data;
                        setYoutubeVideos((prev) =>
                          prev.some((v) => v.videoId === item.videoId) ? prev : [...prev, item]
                        );
                        setYoutubeUrlInput("");
                      } else {
                        setYoutubeError(json.error || "تعذر جلب بيانات الفيديو");
                      }
                    } catch {
                      setYoutubeError("تعذر الاتصال لجلب بيانات الفيديو");
                    } finally {
                      setIsFetchingYoutube(false);
                    }
                  }}
                  disabled={isFetchingYoutube || !isValidHttpUrl(youtubeUrlInput)}
                  aria-label="إضافة الرابط"
                  className={`absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${
                    isValidHttpUrl(youtubeUrlInput) && !isFetchingYoutube
                      ? "bg-emerald-600/25 hover:bg-emerald-600/40 border-emerald-500/50 text-emerald-300 cursor-pointer"
                      : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500 opacity-50 cursor-not-allowed"
                  }`}
                >
                  {isFetchingYoutube ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              {youtubeError && <p className="text-[11px] text-red-400">{youtubeError}</p>}
              {youtubeVideos.length > 0 && (
                <div className="space-y-1.5">
                  {youtubeVideos.map((yt) => (
                    <YouTubePreviewCard
                      key={yt.videoId}
                      meta={yt}
                      compact
                      readOnly
                      onRemove={() => {
                        setYoutubeVideos((prev) =>
                          prev.filter((v) => v.videoId !== yt.videoId)
                        );
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </HorizontalFormCarousel>

          {/* Submit Actions */}
          <div className="flex items-center justify-start gap-2.5 pt-3 border-t border-zinc-800/80">
            <button
              type="submit"
              aria-disabled={!title.trim() || isSaving}
              className={`py-2.5 px-5 rounded-xl bg-violet-600 text-white text-xs max-[400px]:text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                !title.trim() || isSaving
                  ? "opacity-45 cursor-not-allowed shadow-none"
                  : "hover:bg-violet-500 shadow-lg shadow-violet-600/25 cursor-pointer"
              }`}
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>{task ? "حفظ التعديلات" : "إنشاء المهمة"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="py-2.5 px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 text-xs max-[400px]:text-[11px] font-semibold hover:bg-zinc-850 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              إلغاء
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
