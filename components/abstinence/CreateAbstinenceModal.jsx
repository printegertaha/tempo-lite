"use client";

import { useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  Calendar,
  Target,
  FileText,
  Loader2,
  Sparkles,
  Plus,
  Minus,
} from "lucide-react";
import { getLocalDateString, parseLocalDateTimeToUtc } from "@/lib/dates";
import { localAbstinenceRepo, localOutboxRepo } from "@/lib/local-db";
import { syncEngine } from "@/lib/sync/sync-engine";
import Modal from "@/components/ui/Modal";
import DatePickerField from "@/components/ui/DatePickerField";
import TimePickerField from "@/components/ui/TimePickerField";
import HorizontalFormCarousel from "@/components/ui/HorizontalFormCarousel";

const POPULAR_BEHAVIORS = [
  "مشاهدة الإباحية والمحتوى المثير",
  "التدخين والسجائر الإلكترونية",
  "إضاعة الوقت على السوشيال ميديا",
  "تناول السكريات والوجبات السريعة",
  "السهر والنوم المتأخر",
  "ألعاب الفيديو المفرطة",
];

const CAROUSEL_SECTIONS = [
  { id: "behavior", title: "١. السلوك المراد الامتناع عنه" },
  { id: "start", title: "٢. تاريخ ووقت البداية الدقيق" },
  { id: "goal", title: "٣. الهدف الزمني والدافع (اختياري)" },
];

function formatTargetDaysReadableAr(totalDays) {
  const safe = Math.max(0, Math.round(Number(totalDays || 0)));
  if (safe === 0) return "مفتوح (بدون هدف محدد)";

  const years = Math.floor(safe / 365);
  const remAfterYears = safe % 365;
  const months = Math.floor(remAfterYears / 30);
  const days = remAfterYears % 30;

  const parts = [];
  if (years > 0) {
    parts.push(
      years === 1 ? "سنة" : years === 2 ? "سنتان" : years <= 10 ? `${years} سنوات` : `${years} سنة`
    );
  }
  if (months > 0) {
    parts.push(
      months === 1 ? "شهر" : months === 2 ? "شهران" : months <= 10 ? `${months} أشهر` : `${months} شهراً`
    );
  }
  if (days > 0) {
    parts.push(
      days === 1 ? "يوم" : days === 2 ? "يومان" : days <= 10 ? `${days} أيام` : `${days} يوماً`
    );
  }
  return parts.join(" و ");
}

export default function CreateAbstinenceModal({
  isOpen,
  onClose,
  userId = "guest",
  onCreated,
  timezone = "Asia/Riyadh",
}) {
  const todayStr = getLocalDateString(new Date(), timezone);

  const now = new Date();
  const defaultHour = String(now.getHours()).padStart(2, "0");
  const defaultMinute = String(now.getMinutes()).padStart(2, "0");
  const defaultTimeStr = `${defaultHour}:${defaultMinute}`;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(todayStr);
  const [startTime, setStartTime] = useState(defaultTimeStr);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [targetDays, setTargetDays] = useState("30");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [jumpToSlide, setJumpToSlide] = useState(null);
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const cur = new Date();
    setStartDate(getLocalDateString(cur, timezone));
    setStartTime(
      `${String(cur.getHours()).padStart(2, "0")}:${String(cur.getMinutes()).padStart(2, "0")}`
    );
    setIsCustomDate(false);
    setIsCustomTime(false);
  }, [isOpen, timezone]);

  const targetDaysRef = useRef(targetDays);
  useEffect(() => {
    targetDaysRef.current = targetDays;
  }, [targetDays]);
  const holdTimeoutRef = useRef(null);
  const repeatIntervalRef = useRef(null);
  const didRepeatRef = useRef(false);

  const stopTargetHold = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
  };

  useEffect(() => stopTargetHold, []);

  const applyTargetDelta = (delta) => {
    const cur = targetDaysRef.current ? parseInt(targetDaysRef.current, 10) : 0;
    const nextNum = Math.max(0, Math.min(3650, cur + delta));
    const nextStr = nextNum <= 0 ? "" : String(nextNum);
    targetDaysRef.current = nextStr;
    setTargetDays(nextStr);
  };

  const startTargetHold = (direction) => {
    stopTargetHold();
    didRepeatRef.current = false;
    holdTimeoutRef.current = setTimeout(() => {
      didRepeatRef.current = true;
      applyTargetDelta(direction * 1);
      repeatIntervalRef.current = setInterval(() => {
        applyTargetDelta(direction * 1);
      }, 65);
    }, 320);
  };

  const releaseTargetHold = (direction, wasClick) => {
    const repeated = didRepeatRef.current;
    stopTargetHold();
    if (wasClick && !repeated) {
      const cur = targetDaysRef.current ? parseInt(targetDaysRef.current, 10) : 0;
      if (direction > 0 && cur === 0) {
        applyTargetDelta(7);
      } else {
        applyTargetDelta(direction * 5);
      }
    }
    didRepeatRef.current = false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("يرجى كتابة اسم السلوك الممتنع عنه");
      setJumpToSlide({ index: 0, nonce: Date.now() });
      setTimeout(() => nameInputRef.current?.focus({ preventScroll: true }), 140);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const effectiveUserId = userId || "guest";
    const isGuest = effectiveUserId === "guest";
    const submitNow = new Date();
    let exactStartIso;
    if (!isCustomDate && !isCustomTime) {
      exactStartIso = submitNow.toISOString();
    } else {
      const effectiveDate = isCustomDate
        ? startDate
        : getLocalDateString(submitNow, timezone);
      const effectiveTime = isCustomTime
        ? startTime
        : `${String(submitNow.getHours()).padStart(2, "0")}:${String(submitNow.getMinutes()).padStart(2, "0")}`;
      exactStartIso = parseLocalDateTimeToUtc(
        effectiveDate,
        effectiveTime,
        timezone
      ).toISOString();
    }

    const saveLocalTracker = async () => {
      const trackerId = crypto.randomUUID();
      const sessionId = crypto.randomUUID();
      const localTracker = {
        id: trackerId,
        userId: effectiveUserId,
        name: name.trim(),
        description: description.trim() || null,
        targetDays: targetDays ? parseInt(targetDays, 10) : 30,
        color: "rose",
        icon: "ShieldCheck",
        isArchived: false,
        createdAt: new Date().toISOString(),
      };
      const localSession = {
        id: sessionId,
        abstinenceTrackerId: trackerId,
        trackerId,
        userId: effectiveUserId,
        startedAt: exactStartIso,
        endedAt: null,
        durationSeconds: null,
      };
      await localAbstinenceRepo.saveTracker(localTracker);
      await localAbstinenceRepo.saveSession(localSession);

      if (!isGuest) {
        await localOutboxRepo.add({
          mutationId: crypto.randomUUID(),
          userId: effectiveUserId,
          entityType: "abstinence",
          entityId: trackerId,
          action: "create",
          payload: {
            ...localTracker,
            startedAt: exactStartIso,
          },
          clientTimestamp: Date.now(),
          version: 1,
          status: "pending",
          retryCount: 0,
        });
        syncEngine.scheduleSync(5000);
      }
      return { ...localTracker, activeSession: localSession, sessions: [localSession] };
    };

    try {
      const createdLocal = await saveLocalTracker();
      setName("");
      setDescription("");
      onCreated?.(createdLocal);
      onClose();
    } catch (err) {
      setErrorMsg(err?.message || "حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <span className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldCheck className="w-4 h-4" />
          </span>
          <span>إنشاء هدف امتناع جديد</span>
        </span>
      }
      description="اسحب أفقياً أو تنقّل بين الخطوات لتحديد السلوك وبداية الرحلة"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            {errorMsg}
          </div>
        )}

        <HorizontalFormCarousel
          sections={CAROUSEL_SECTIONS}
          resetKey={isOpen}
          jumpToSlide={jumpToSlide}
        >
          {/* Slide 1: Behavior Name */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-zinc-300 block">
              اسم السلوك المراد الامتناع عنه <span className="text-rose-400">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg("");
              }}
              placeholder="مثال: مشاهدة الإباحية، التدخين، السكر..."
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30"
            />

            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {POPULAR_BEHAVIORS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setName(sug);
                    if (errorMsg) setErrorMsg("");
                  }}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Slide 2: Exact Start Date & Time */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              <span>تاريخ ووقت بداية الامتناع الدقيق</span>
            </span>
            <p className="text-[11px] text-zinc-400">
              يمكنك تحديد تاريخ ووقت من الماضي إذا كنت قد بدأت بالفعل، ليتم حساب إجمالي المدة بدقة.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 block">تاريخ البداية:</label>
                <DatePickerField
                  value={startDate}
                  onChange={(d) => {
                    setStartDate(d);
                    setIsCustomDate(true);
                  }}
                  title="تحديد تاريخ البداية"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 block">ساعة ودقيقة البداية:</label>
                <div className="flex items-center gap-2">
                  <TimePickerField
                    value={startTime}
                    onChange={(t) => {
                      setStartTime(t);
                      setIsCustomTime(true);
                    }}
                    title="تحديد وقت البداية"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cur = new Date();
                      setStartDate(getLocalDateString(cur, timezone));
                      setStartTime(
                        `${String(cur.getHours()).padStart(2, "0")}:${String(cur.getMinutes()).padStart(2, "0")}`
                      );
                      setIsCustomDate(false);
                      setIsCustomTime(false);
                    }}
                    className="px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 shrink-0 font-medium transition-colors cursor-pointer"
                  >
                    الآن
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Slide 3: Target Duration Stepper & Personal Motivation */}
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <span>الهدف الزمني (اختياري)</span>
                </label>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyTargetDelta(30)}
                    className="hidden sm:inline-flex px-2 py-0.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono font-bold text-violet-300 cursor-pointer"
                    aria-label="زيادة شهر (30 يوماً)"
                    title="زيادة شهر (30 يوماً)"
                  >
                    +شهر
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTargetDelta(-30)}
                    disabled={!targetDays}
                    className="hidden sm:inline-flex px-2 py-0.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono font-bold text-zinc-300 disabled:opacity-40 cursor-pointer"
                    aria-label="إنقاص شهر (30 يوماً)"
                    title="إنقاص شهر (30 يوماً)"
                  >
                    -شهر
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTargetDelta(1)}
                    className="px-2 py-0.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono font-bold text-violet-300 cursor-pointer"
                    aria-label="زيادة يوم واحد"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTargetDelta(-1)}
                    disabled={!targetDays}
                    className="px-2 py-0.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono font-bold text-zinc-300 disabled:opacity-40 cursor-pointer"
                    aria-label="إنقاص يوم واحد"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetDays("")}
                    className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold cursor-pointer ${
                      !targetDays
                        ? "bg-violet-600/25 border-violet-500/50 text-violet-200"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    مفتوح
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 select-none">
                <button
                  type="button"
                  onPointerDown={() => startTargetHold(1)}
                  onPointerUp={() => releaseTargetHold(1, true)}
                  onPointerLeave={() => releaseTargetHold(1, false)}
                  onPointerCancel={() => releaseTargetHold(1, false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      applyTargetDelta(1);
                    }
                  }}
                  className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-violet-300 flex items-center justify-center cursor-pointer active:scale-95"
                  aria-label="زيادة المدة (اضغط باستمرار للزيادة السريعة)"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <span className="text-sm font-black text-zinc-100">
                  {formatTargetDaysReadableAr(targetDays)}
                </span>

                <button
                  type="button"
                  onPointerDown={() => startTargetHold(-1)}
                  onPointerUp={() => releaseTargetHold(-1, true)}
                  onPointerLeave={() => releaseTargetHold(-1, false)}
                  onPointerCancel={() => releaseTargetHold(-1, false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      applyTargetDelta(-1);
                    }
                  }}
                  disabled={!targetDays}
                  className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 disabled:opacity-35 flex items-center justify-center cursor-pointer active:scale-95"
                  aria-label="إنقاص المدة (اضغط باستمرار للإنقاص السريع)"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            </div>

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
          </div>
        </HorizontalFormCarousel>

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 font-semibold transition-colors cursor-pointer"
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
                <span>بدء رحلة الامتناع</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
