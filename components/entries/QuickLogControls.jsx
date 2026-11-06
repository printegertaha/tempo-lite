"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Check,
  Plus,
  Minus,
  Timer,
  Clock,
  CheckCircle2,
  Circle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Calendar,
} from "lucide-react";
import {
  toggleBooleanDaily,
  incrementCounterDaily,
  logDurationSession,
  toggleChecklistItem,
  logAvoidanceDay,
} from "@/actions/entries";

export default function QuickLogControls({
  tracker,
  localDate,
  dailySummary,
  onLogged,
  onToast,
  onOpenDetailedModal,
}) {
  // 1. BOOLEAN TRACKER (Safe Optimistic Toggle + Rollback)
  if (tracker.metricType === "BOOLEAN") {
    return (
      <BooleanControls
        tracker={tracker}
        localDate={localDate}
        serverCompleted={Boolean(dailySummary?.isCompleted)}
        onLogged={onLogged}
        onToast={onToast}
      />
    );
  }

  // 2. COUNTER TRACKER (Safe Optimistic Increment + Rollback)
  if (tracker.metricType === "COUNTER") {
    return (
      <CounterControls
        tracker={tracker}
        localDate={localDate}
        serverCount={dailySummary?.totalNumeric || 0}
        onLogged={onLogged}
        onToast={onToast}
      />
    );
  }

  // 3. DURATION TRACKER (Safe Optimistic Duration + Rollback)
  if (tracker.metricType === "DURATION") {
    return (
      <DurationControls
        tracker={tracker}
        localDate={localDate}
        serverSeconds={dailySummary?.totalDurationSeconds || 0}
        onLogged={onLogged}
        onToast={onToast}
        onOpenDetailedModal={onOpenDetailedModal}
      />
    );
  }

  // 4. CHECKLIST TRACKER (Safe Optimistic Item Toggle + Rollback)
  if (tracker.metricType === "CHECKLIST") {
    return (
      <ChecklistControls
        tracker={tracker}
        localDate={localDate}
        serverCompletedIds={dailySummary?.checklistCompletedIds || []}
        onLogged={onLogged}
        onToast={onToast}
      />
    );
  }

  // 5. AVOIDANCE TRACKER (Live Abstinence Tracking & Relapse Hub)
  if (tracker.metricType === "AVOIDANCE") {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/abstinence"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
          <span>سجل الامتناع والانتكاسات</span>
        </Link>
      </div>
    );
  }

  // 6. NUMBER / TIME_RANGE / DEFAULT: Detailed Entry Modal Button
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
// Subcomponents with Local Optimistic State & Rollback Handlers
// -----------------------------------------------------------------------------

function BooleanControls({ tracker, localDate, serverCompleted, onLogged, onToast }) {
  const [optimisticCompleted, setOptimisticCompleted] = useState(serverCompleted);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setOptimisticCompleted(serverCompleted);
  }, [serverCompleted]);

  const handleToggle = async () => {
    if (isSyncing) return;
    const previous = optimisticCompleted;
    const nextState = !previous;

    // 1. Optimistic immediate update (<16ms response)
    setOptimisticCompleted(nextState);
    setIsSyncing(true);

    try {
      const res = await toggleBooleanDaily(tracker.id, localDate);
      if (res.success) {
        onLogged?.();
        onToast?.(
          nextState ? "تم تسجيل الإنجاز اليومي بنجاح ✨" : "تم إلغاء تحديد الإنجاز",
          "success"
        );
      } else {
        // Rollback on failure
        setOptimisticCompleted(previous);
        onToast?.(res.error || "تعذر حفظ الإنجاز", "error");
      }
    } catch {
      // Rollback on network/execution exception
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
      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
        optimisticCompleted
          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
          : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-emerald-500/40 hover:text-emerald-300"
      }`}
    >
      {isSyncing ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : optimisticCompleted ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Circle className="w-3.5 h-3.5 text-zinc-400" />
      )}
      <span>{optimisticCompleted ? "مُكتمل اليوم" : "تسجيل إنجاز"}</span>
    </button>
  );
}

function CounterControls({ tracker, localDate, serverCount, onLogged, onToast }) {
  const [optimisticCount, setOptimisticCount] = useState(serverCount);
  const [isSyncing, setIsSyncing] = useState(false);
  const step = tracker.trackerConfig?.step || 1;

  useEffect(() => {
    setOptimisticCount(serverCount);
  }, [serverCount]);

  const handleIncrement = async (amount) => {
    if (isSyncing) return;
    const previous = optimisticCount;
    const nextCount = previous + amount;

    // 1. Optimistic immediate update
    setOptimisticCount(nextCount);
    setIsSyncing(true);

    try {
      const res = await incrementCounterDaily({
        trackerId: tracker.id,
        amount,
        localDate,
      });

      if (res.success) {
        onLogged?.();
        onToast?.(`تمت الإضافة: +${amount} ${tracker.unit || ""}`, "success");
      } else {
        // Rollback
        setOptimisticCount(previous);
        onToast?.(res.error || "تعذر زيادة العداد", "error");
      }
    } catch {
      // Rollback
      setOptimisticCount(previous);
      onToast?.("حدث خطأ، تم التراجع", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-xs font-bold text-zinc-200 px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700">
        {optimisticCount} {tracker.unit || ""}
      </span>
      <button
        type="button"
        onClick={() => handleIncrement(step)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm active:scale-95"
        title={`إضافة ${step}`}
      >
        {isSyncing ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Plus className="w-3 h-3" />
        )}
        <span>+{step}</span>
      </button>
    </div>
  );
}

function DurationControls({
  tracker,
  localDate,
  serverSeconds,
  onLogged,
  onToast,
  onOpenDetailedModal,
}) {
  const [optimisticSeconds, setOptimisticSeconds] = useState(serverSeconds);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setOptimisticSeconds(serverSeconds);
  }, [serverSeconds]);

  const totalMinutes = Math.round(optimisticSeconds / 60);

  const handleQuickMinutes = async (mins) => {
    if (isSyncing) return;
    const previous = optimisticSeconds;
    const addedSeconds = mins * 60;
    const nextSeconds = previous + addedSeconds;

    // 1. Optimistic update
    setOptimisticSeconds(nextSeconds);
    setIsSyncing(true);

    try {
      const res = await logDurationSession({
        trackerId: tracker.id,
        durationSeconds: addedSeconds,
        localDate,
      });

      if (res.success) {
        onLogged?.();
        onToast?.(`تم تسجيل جلسة ${mins} دقيقة بنجاح ⏱️`, "success");
      } else {
        setOptimisticSeconds(previous);
        onToast?.(res.error || "تعذر تسجيل الجلسة", "error");
      }
    } catch {
      setOptimisticSeconds(previous);
      onToast?.("حدث خطأ، تم التراجع", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-xs font-bold text-cyan-300 px-2 py-1 rounded-lg bg-cyan-950/40 border border-cyan-800/40">
        {totalMinutes} دقيقة
      </span>
      <button
        type="button"
        onClick={() => handleQuickMinutes(15)}
        disabled={isSyncing}
        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-bold transition-colors cursor-pointer active:scale-95"
      >
        +15د
      </button>
      <button
        type="button"
        onClick={() => handleQuickMinutes(30)}
        disabled={isSyncing}
        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-bold transition-colors cursor-pointer active:scale-95"
      >
        +30د
      </button>
      <button
        type="button"
        onClick={() => onOpenDetailedModal?.(tracker)}
        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
        title="تسجيل مخصص مع موضوع وملاحظات"
      >
        <Timer className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ChecklistControls({
  tracker,
  localDate,
  serverCompletedIds,
  onLogged,
  onToast,
}) {
  const items = tracker.trackerConfig?.items || [];
  const [optimisticIds, setOptimisticIds] = useState(serverCompletedIds);

  useEffect(() => {
    setOptimisticIds(serverCompletedIds);
  }, [serverCompletedIds]);

  const handleToggleItem = async (itemId) => {
    const previous = [...optimisticIds];
    const isDone = previous.includes(itemId);
    const nextIds = isDone
      ? previous.filter((id) => id !== itemId)
      : [...previous, itemId];

    // 1. Optimistic immediate state update
    setOptimisticIds(nextIds);

    try {
      const res = await toggleChecklistItem({
        trackerId: tracker.id,
        itemId,
        localDate,
      });

      if (res.success) {
        onLogged?.();
      } else {
        // Rollback
        setOptimisticIds(previous);
        onToast?.(res.error || "تعذر تحديث البند", "error");
      }
    } catch {
      // Rollback
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
  tracker,
  localDate,
  serverClean,
  onLogged,
  onToast,
}) {
  const [optimisticClean, setOptimisticClean] = useState(serverClean);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setOptimisticClean(serverClean);
  }, [serverClean]);

  const handleLogAvoidance = async (clean) => {
    if (isSyncing) return;
    const previous = optimisticClean;

    // 1. Optimistic update
    setOptimisticClean(clean);
    setIsSyncing(true);

    try {
      const res = await logAvoidanceDay({
        trackerId: tracker.id,
        isClean: clean,
        localDate,
      });

      if (res.success) {
        onLogged?.();
        onToast?.(
          clean
            ? "تم تسجيل يوم نظيف بنجاح ✨ استمر!"
            : "تم تسجيل زلة، البدايات الجديدة تصنع الأثر 💪",
          clean ? "success" : "info"
        );
      } else {
        // Rollback
        setOptimisticClean(previous);
        onToast?.(res.error || "تعذر التسجيل", "error");
      }
    } catch {
      // Rollback
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
