"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Check,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  Video,
} from "lucide-react";
import { addDaysToDateString, getLocalDateString } from "@/lib/dates";
import DatePickerField from "@/components/ui/DatePickerField";
import TimePickerField from "@/components/ui/TimePickerField";
import DurationStepper from "@/components/tasks/DurationStepper";
import PomodoroConfigPicker from "@/components/tasks/PomodoroConfigPicker";
import HorizontalFormCarousel from "@/components/ui/HorizontalFormCarousel";
import YouTubePreviewCard, {
  isValidHttpUrl,
  normalizeYouTubeMetaList,
  type YouTubeMeta,
} from "@/components/tasks/YouTubePreviewCard";

const PRIORITIES = [
  { id: "LOW", label: "منخفضة", color: "border-zinc-700 text-zinc-300" },
  {
    id: "MEDIUM",
    label: "متوسطة",
    color: "border-sky-500/40 text-sky-300 bg-sky-500/10",
  },
  {
    id: "HIGH",
    label: "عالية",
    color: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  },
];

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: any;
  lifeAreas?: any[];
  trackers?: any[];
  todayStr?: string;
  onSave?: (data: any) => Promise<any> | void;
}

export default function TaskModal({
  isOpen,
  onClose,
  task = null,
  todayStr,
  onSave,
}: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [priority, setPriority] = useState("MEDIUM");
  const [isPomodoro, setIsPomodoro] = useState(false);
  const [workCycle, setWorkCycle] = useState(25);
  const [breakCycle, setBreakCycle] = useState(5);

  const [youtubeUrlInput, setYoutubeUrlInput] = useState("");
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeMeta[]>([]);
  const [isFetchingYoutube, setIsFetchingYoutube] = useState(false);
  const [youtubeError, setYoutubeError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [jumpToSlide, setJumpToSlide] = useState<{ index: number; nonce: number } | null>(null);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevTaskId, setPrevTaskId] = useState(task?.id);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const youtubeInputRef = useRef<HTMLInputElement | null>(null);

  if (prevIsOpen !== isOpen || prevTaskId !== task?.id) {
    setPrevIsOpen(isOpen);
    setPrevTaskId(task?.id);
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setDueDate(task.dueDate || "");
      setStartTime(task.startTime || "");
      setDurationMinutes(Number(task.durationMinutes || 60));
      setPriority(
        task.priority === "URGENT" ? "HIGH" : task.priority || "MEDIUM",
      );
      setIsPomodoro(Boolean(task.isPomodoro));
      setWorkCycle(Number(task.workCycle || 25));
      setBreakCycle(Number(task.breakCycle || 5));
      setYoutubeVideos(normalizeYouTubeMetaList(task.youtubeMeta));
      setYoutubeUrlInput("");
    } else {
      setTitle("");
      setDescription("");
      setDueDate(todayStr || "");
      setStartTime("");
      setDurationMinutes(60);
      setPriority("MEDIUM");
      setIsPomodoro(false);
      setWorkCycle(25);
      setBreakCycle(5);
      setYoutubeVideos([]);
      setYoutubeUrlInput("");
    }
    setYoutubeError("");
    setErrorMessage("");
  }

  const addYoutubeUrl = async (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!isValidHttpUrl(trimmed)) {
      setYoutubeError("يرجى إدخال رابط صالح");
      return;
    }
    if (!/(youtube\.com|youtu\.be)/i.test(trimmed)) {
      try {
        const parsed = new URL(trimmed);
        const linkItem: YouTubeMeta = {
          videoId: `link-${crypto.randomUUID().slice(0, 8)}`,
          url: trimmed,
          title: parsed.hostname.replace(/^www\./, ""),
          channelName: trimmed,
          thumbnailUrl: "",
        };
        setYoutubeVideos((prev) =>
          prev.some((v) => v.url === trimmed) ? prev : [...prev, linkItem],
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
      const res = await fetch(
        `/api/youtube/metadata?url=${encodeURIComponent(trimmed)}`,
      );
      const json = await res.json();
      if (json.success && json.data) {
        const item: YouTubeMeta = json.data;
        setYoutubeVideos((prev) =>
          prev.some((v) => v.videoId === item.videoId) ? prev : [...prev, item],
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
  };

  // Auto-fetch YouTube metadata when user pastes or types a valid YouTube link, save & clear input
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
        const res = await fetch(
          `/api/youtube/metadata?url=${encodeURIComponent(trimmed)}`,
        );
        const json = await res.json();
        if (json.success && json.data) {
          const item: YouTubeMeta = json.data;
          setYoutubeVideos((prev) =>
            prev.some((v) => v.videoId === item.videoId)
              ? prev
              : [...prev, item],
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!title.trim()) {
      setJumpToSlide({ index: 0, nonce: Date.now() });
      setTimeout(() => titleInputRef.current?.focus({ preventScroll: true }), 140);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        dueDate: dueDate || null,
        startTime: startTime || null,
        durationMinutes: durationMinutes,
        priority,
        isPomodoro,
        workCycle: Number(workCycle),
        breakCycle: Number(breakCycle),
        status: task?.id ? task.status || "TODO" : "TODO",
        youtubeMeta:
          youtubeVideos.length === 0
            ? null
            : youtubeVideos.length === 1
              ? youtubeVideos[0]
              : youtubeVideos,
      };

      if (task?.id) {
        payload.id = task.id;
      }

      if (onSave) {
        await onSave(payload);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "حدث خطأ أثناء حفظ المهمة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setRelativeDueDate = (days: number) => {
    const base =
      todayStr || (typeof window !== "undefined" ? getLocalDateString() : "");
    if (days === 0) setDueDate(base);
    else if (days === 1) setDueDate(addDaysToDateString(base, 1));
    else if (days === 3) setDueDate(addDaysToDateString(base, 3));
    else if (days === 7) setDueDate(addDaysToDateString(base, 7));
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">
                {task ? "تعديل المهمة" : "مهمة جديدة"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <HorizontalFormCarousel
            resetKey={`${isOpen}-${task?.id || "new"}`}
            jumpToSlide={jumpToSlide}
            onSlideChange={(idx) => {
              if (idx === 0) {
                setTimeout(
                  () => titleInputRef.current?.focus({ preventScroll: true }),
                  120,
                );
              } else if (idx === 3) {
                setTimeout(
                  () => youtubeInputRef.current?.focus({ preventScroll: true }),
                  120,
                );
              }
            }}
            sections={[
              { id: "basics", title: "اسم المهمة والوصف" },
              { id: "schedule", title: "الميعاد والوقت والمدة" },
              { id: "priority", title: "الأولوية ونظام بومودورو" },
              { id: "links", title: "الروابط والفيديوهات" },
            ]}
          >
            {/* Slide 1: Title & Description */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  اسم المهمة <span className="text-red-400">*</span>
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: أكل البهايم, مذاكرة برمجة.."
                  className="w-full px-4 py-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  الوصف (اختياري)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثلا هنوصل الغيط نسرق درة عشان نشويه وناكله..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>
            </div>

            {/* Slide 2: Date, Start Time, Duration & Pomodoro */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span>التاريخ</span>
                    </label>
                    {dueDate && (
                      <button
                        type="button"
                        onClick={() => setDueDate("")}
                        className="text-[11px] text-zinc-500 hover:text-red-400 cursor-pointer"
                      >
                        إزالة
                      </button>
                    )}
                  </div>
                  <DatePickerField
                    value={dueDate}
                    onChange={(d) => setDueDate(d)}
                    placeholder="اختر التاريخ"
                    title="تحديد تاريخ المهمة"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>هتبدأ الساعة كام؟</span>
                    </label>
                    {startTime && (
                      <button
                        type="button"
                        onClick={() => setStartTime("")}
                        className="text-[11px] text-zinc-500 hover:text-red-400 cursor-pointer"
                      >
                        إزالة
                      </button>
                    )}
                  </div>
                  <TimePickerField
                    value={startTime}
                    onChange={(t) => setStartTime(t)}
                    placeholder="اختر وقت البدء"
                    title="تحديد وقت بدء المهمة"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="text-zinc-500">تاريخ سريع:</span>
                <button
                  type="button"
                  onClick={() => setRelativeDueDate(0)}
                  className="px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => setRelativeDueDate(1)}
                  className="px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
                >
                  غداً
                </button>
                <button
                  type="button"
                  onClick={() => setRelativeDueDate(3)}
                  className="px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
                >
                  +3 أيام
                </button>
                <button
                  type="button"
                  onClick={() => setRelativeDueDate(7)}
                  className="px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
                >
                  +أسبوع
                </button>
              </div>

              <DurationStepper
                value={durationMinutes}
                onChange={setDurationMinutes}
              />
            </div>

            {/* Slide 3: Priority & Pomodoro */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-300">
                  مستوى الأولوية
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer whitespace-nowrap ${
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
            </div>

            {/* Slide 4: YouTube Links */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-zinc-300 flex items-center gap-1.5">
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
                  className="w-full pr-10 pl-3.5 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/50 text-left"
                />
                <button
                  type="button"
                  onClick={() => void addYoutubeUrl(youtubeUrlInput)}
                  disabled={
                    isFetchingYoutube || !isValidHttpUrl(youtubeUrlInput)
                  }
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

              {youtubeError && (
                <p className="text-[11px] text-red-400">{youtubeError}</p>
              )}

              {youtubeVideos.length > 0 && (
                <div className="space-y-2">
                  {youtubeVideos.map((yt) => (
                    <YouTubePreviewCard
                      key={yt.videoId}
                      meta={yt}
                      readOnly
                      onRemove={() => {
                        setYoutubeVideos((prev) =>
                          prev.filter((v) => v.videoId !== yt.videoId),
                        );
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </HorizontalFormCarousel>
        </form>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-start gap-2.5 px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs max-[400px]:text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            aria-disabled={isSubmitting || !title.trim()}
            className={`px-5 py-2 rounded-xl text-xs max-[400px]:text-[11px] font-semibold bg-violet-600 text-white flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              isSubmitting || !title.trim()
                ? "opacity-45 cursor-not-allowed shadow-none"
                : "hover:bg-violet-500 shadow-lg shadow-violet-600/20 active:scale-95 cursor-pointer"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
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

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
