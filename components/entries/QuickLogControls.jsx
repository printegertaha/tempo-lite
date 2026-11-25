"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Plus,
  Minus,
  Timer,
  CheckCircle2,
  Circle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import {
  toggleBooleanEntryLocalFirst,
  incrementCounterLocalFirst,
  logDurationLocalFirst,
  toggleChecklistItemLocalFirst,
  logAvoidanceLocalFirst,
} from "@/lib/local-db/habit-ops";

export default function QuickLogControls({
  userId = "guest",
  tracker,
  localDate,
  dailySummary,
  onLogged,
  onToast,
  onOpenDetailedModal,
}) {
  // 1. BOOLEAN TRACKER
  if (tracker.metricType === "BOOLEAN") {
    return (
      <BooleanControls
        userId={userId}
        tracker={tracker}
        localDate={localDate}
        serverCompleted={Boolean(dailySummary?.isCompleted)}
        onLogged={onLogged}
        onToast={onToast}
      />
    );
  }

  // 2. COUNTER TRACKER
  if (tracker.metricType === "COUNTER") {
    return (
      <CounterControls
        userId={userId}
        tracker={tracker}
        localDate={localDate}
        serverCount={dailySummary?.totalNumeric || 0}
        onLogged={onLogged}
        onToast={onToast}
      />
    );
  }

  // 3. DURATION TRACKER
  if (tracker.metricType === "DURATION") {
    return (
      <DurationControls
        userId={userId}
        tracker={tracker}
        localDate={localDate}
        serverSeconds={dailySummary?.totalDurationSeconds || 0}
        onLogged={onLogged}
        onToast={onToast}
        onOpenDetailedModal={onOpenDetailedModal}
      />
    );
  }

  // 4. CHECKLIST TRACKER
  if (tracker.metricType === "CHECKLIST") {
    return (
      <ChecklistControls
        userId={userId}
        tracker={tracker}
        localDate={localDate}
        serverCompletedIds={dailySummary?.checklistCompletedIds || []}
        onLogged={onLogged}
        onToast={onToast}
      />
    );
  }

  // 5. AVOIDANCE TRACKER
  if (tracker.metricType === "AVOIDANCE") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <AvoidanceControls
          userId={userId}
          tracker={tracker}
          localDate={localDate}
          serverClean={dailySummary?.avoidanceState?.isClean ?? null}
          onLogged={onLogged}
          onToast={onToast}
        />
        <Link
          href="/abstinence"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
          <span>مركز التعافي</span>
        </Link>
      </div>
    );
  }

  // 6. NUMBER / TIME_RANGE / DEFAULT
  return (
    <button
      type="button"
      onClick={() => onOpenDetailedModal?.(tracker)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-bold transition-colors cursor-pointer"
    >
      <Plus className="w-3.5 h-3.5" />
      <span>تسجيل قياس</span>
    </button>
  );
}

// -----------------------------------------------------------------------------
// Subcomponents with Local Optimistic State & Local-First Persistence
// -----------------------------------------------------------------------------

function BooleanControls({ userId, tracker, localDate, serverCompleted, onLogged, onToast }) {
  const [optimisticCompleted, setOptimisticCompleted] = useState(serverCompleted);
  const [isSyncing, setIsSyncing] = useState(false);
  const [prevServerCompleted, setPrevServerCompleted] = useState(serverCompleted);

  if (prevServerCompleted !== serverCompleted) {
    setPrevServerCompleted(serverCompleted);
    setOptimisticCompleted(serverCompleted);
  }

  const handleToggle = async () => {
    if (isSyncing) return;
    const previous = optimisticCompleted;
    const nextState = !previous;

    setOptimisticCompleted(nextState);
    setIsSyncing(true);

    try {
      const res = await toggleBooleanEntryLocalFirst(userId, tracker, localDate);
      if (res.success) {
        onLogged?.();
        onToast?.(
          nextState ? "تم تسجيل الإنجاز اليومي بنجاح ✨" : "تم إلغاء تحديد الإنجاز",
          "success"
        );
      } else {
        setOptimisticCompleted(previous);
        onToast?.(res.error || "تعذر حفظ الإنجاز", "error");
      }
    } catch {
      setOptimisticCompleted(previous);
      onToast?.("حدث خطأ في الاتصال، تم التراجع", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isSyncing}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
        optimisticCompleted
          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10"
          : "bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-violet-500/40"
      }`}
    >
      {isSyncing ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
      ) : optimisticCompleted ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      ) : (
        <Circle className="w-4 h-4 text-zinc-400" />
      )}
      <span>
        {optimisticCompleted
          ? tracker.trackerConfig?.trueLabel || "تم الإنجاز"
          : tracker.trackerConfig?.falseLabel || "إنجاز اليوم"}
      </span>
    </button>
  );
}

function CounterControls({ userId, tracker, localDate, serverCount, onLogged, onToast }) {
  const [optimisticCount, setOptimisticCount] = useState(serverCount);
  const [isSyncing, setIsSyncing] = useState(false);
  const [prevServerCount, setPrevServerCount] = useState(serverCount);

  if (prevServerCount !== serverCount) {
    setPrevServerCount(serverCount);
    setOptimisticCount(serverCount);
  }

  const step = tracker.trackerConfig?.step || 1;
  const target = tracker.targetValue || 1;

  const handleAdjust = async (delta) => {
    if (isSyncing) return;
    if (optimisticCount + delta < 0 && !tracker.trackerConfig?.allowNegative) return;

    const previous = optimisticCount;
    const nextVal = Math.max(0, previous + delta);

    setOptimisticCount(nextVal);
    setIsSyncing(true);

    try {
      const res = await incrementCounterLocalFirst(userId, tracker, delta, localDate);
      if (res.success) {
        onLogged?.();
      } else {
        setOptimisticCount(previous);
        onToast?.(res.error || "تعذر تحديث العداد", "error");
      }
    } catch {
      setOptimisticCount(previous);
      onToast?.("تعذر حفظ العداد، تم التراجع", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const progress = Math.min(100, Math.round((optimisticCount / target) * 100));

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-xl p-1">
        <button
          type="button"
          onClick={() => handleAdjust(-step)}
          disabled={optimisticCount <= 0 || isSyncing}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 transition-colors cursor-pointer"
          title="إنقاص"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <div className="px-2.5 text-center min-w-[60px]">
          <span className="font-mono text-xs font-bold text-zinc-100">
            {optimisticCount}
          </span>
          <span className="text-[10px] text-zinc-500 mr-1">
            / {target} {tracker.unit || ""}
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleAdjust(step)}
          disabled={isSyncing}
          className="p-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 transition-colors cursor-pointer"
          title={`إضافة +${step}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {progress >= 100 && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          اكتمل الهدف ✓
        </span>
      )}
    </div>
  );
}

function DurationControls({
  userId,
  tracker,
  localDate,
  serverSeconds,
  onLogged,
  onToast,
  onOpenDetailedModal,
}) {
  const [optimisticSeconds, setOptimisticSeconds] = useState(serverSeconds);
  const [isSyncing, setIsSyncing] = useState(false);
  const [prevServerSeconds, setPrevServerSeconds] = useState(serverSeconds);

  if (prevServerSeconds !== serverSeconds) {
    setPrevServerSeconds(serverSeconds);
    setOptimisticSeconds(serverSeconds);
  }

  const handleQuickDuration = async (minutes) => {
    if (isSyncing) return;
    const secs = minutes * 60;
    const previous = optimisticSeconds;

    setOptimisticSeconds(previous + secs);
    setIsSyncing(true);

    try {
      const res = await logDurationLocalFirst(userId, tracker, secs, localDate);
      if (res.success) {
        onLogged?.();
        onToast?.(`تم تسجيل +${minutes} دقيقة بنجاح ⏱️`, "success");
      } else {
        setOptimisticSeconds(previous);
        onToast?.(res.error || "تعذر تسجيل الوقت", "error");
      }
    } catch {
      setOptimisticSeconds(previous);
      onToast?.("خطأ في الاتصال، تم التراجع", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const totalMins = Math.round(optimisticSeconds / 60);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
        <Timer className="w-3.5 h-3.5 text-cyan-400" />
        <span>{totalMins} دقيقة</span>
      </div>

      <button
        type="button"
        onClick={() => handleQuickDuration(15)}
        disabled={isSyncing}
        className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 text-[11px] font-bold transition-colors cursor-pointer"
      >
        +15د
      </button>

      <button
        type="button"
        onClick={() => handleQuickDuration(30)}
        disabled={isSyncing}
        className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition-colors cursor-pointer"
      >
        +30د
      </button>

      <button
        type="button"
        onClick={() => onOpenDetailedModal?.(tracker)}
        className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-[11px] transition-colors cursor-pointer"
        title="تسجيل مدة مخصصة وملاحظات"
      >
        مخصص...
      </button>
    </div>
  );
}

function ChecklistControls({
  userId,
  tracker,
  localDate,
  serverCompletedIds,
  onLogged,
  onToast,
}) {
  const items = tracker.trackerConfig?.items || [];
  const [optimisticIds, setOptimisticIds] = useState(serverCompletedIds);
  const [prevCompletedIds, setPrevCompletedIds] = useState(serverCompletedIds);

  if (prevCompletedIds !== serverCompletedIds) {
    setPrevCompletedIds(serverCompletedIds);
    setOptimisticIds(serverCompletedIds);
  }

  const handleToggleItem = async (itemId) => {
    const previous = [...optimisticIds];
    const isDone = previous.includes(itemId);
    const nextIds = isDone
      ? previous.filter((id) => id !== itemId)
      : [...previous, itemId];

    setOptimisticIds(nextIds);

    try {
      const res = await toggleChecklistItemLocalFirst(userId, tracker, itemId, localDate);
      if (res.success) {
        onLogged?.();
      } else {
        setOptimisticIds(previous);
        onToast?.(res.error || "تعذر تحديث البند", "error");
      }
    } catch {
      setOptimisticIds(previous);
      onToast?.("حدث خطأ في الاتصال، تم التراجع", "error");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((item) => {
        const isDone = optimisticIds.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleToggleItem(item.id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
              isDone
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                : "bg-zinc-800/80 text-zinc-400 border-zinc-750 hover:text-zinc-200"
            }`}
          >
            {isDone ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Circle className="w-3 h-3 text-zinc-500" />
            )}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function AvoidanceControls({
  userId,
  tracker,
  localDate,
  serverClean,
  onLogged,
  onToast,
}) {
  const [optimisticClean, setOptimisticClean] = useState(serverClean);
  const [isSyncing, setIsSyncing] = useState(false);
  const [prevServerClean, setPrevServerClean] = useState(serverClean);

  if (prevServerClean !== serverClean) {
    setPrevServerClean(serverClean);
    setOptimisticClean(serverClean);
  }

  const handleLogAvoidance = async (clean) => {
    if (isSyncing) return;
    const previous = optimisticClean;

    setOptimisticClean(clean);
    setIsSyncing(true);

    try {
      const res = await logAvoidanceLocalFirst(userId, tracker, clean, localDate);
      if (res.success) {
        onLogged?.();
        onToast?.(
          clean
            ? "تم تسجيل يوم نظيف بنجاح ✨ استمر!"
            : "تم تسجيل زلة، البدايات الجديدة تصنع الأثر 💪",
          clean ? "success" : "info"
        );
      } else {
        setOptimisticClean(previous);
        onToast?.(res.error || "تعذر التسجيل", "error");
      }
    } catch {
      setOptimisticClean(previous);
      onToast?.("حدث خطأ، تم التراجع", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => handleLogAvoidance(true)}
        disabled={isSyncing}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
          optimisticClean === true
            ? "bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-sm"
            : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-emerald-500/40 hover:text-emerald-300"
        }`}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>يوم نظيف ✨</span>
      </button>

      <button
        type="button"
        onClick={() => handleLogAvoidance(false)}
        disabled={isSyncing}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
          optimisticClean === false
            ? "bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-sm"
            : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-rose-500/40 hover:text-rose-300"
        }`}
      >
        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
        <span>حدثت زلة</span>
      </button>
    </div>
  );
}
