"use client";

import {
  Flame,
  Dumbbell,
  BookMarked,
  Code2,
  Smartphone,
  Cigarette,
  Droplets,
  Wallet,
  Moon,
  Sparkles,
  Heart,
  Timer,
  Clock,
  ListTodo,
  ShieldAlert,
  Hash,
  ToggleLeft,
  Pin,
  PinOff,
  Pause,
  Play,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { METRIC_TYPE_METADATA } from "./TrackerModal";
import { COLOR_CONFIG } from "../settings/LifeAreasManager";
import QuickLogControls from "../entries/QuickLogControls";

const ICON_MAP = {
  Flame,
  Dumbbell,
  BookMarked,
  Code2,
  Smartphone,
  Cigarette,
  Droplets,
  Wallet,
  Moon,
  Sparkles,
  Heart,
  Timer,
  Clock,
  ListTodo,
  ShieldAlert,
  Hash,
  ToggleLeft,
};

export default function TrackerCard({
  tracker,
  index,
  totalCount,
  localDate,
  dailySummary,
  onLogged,
  onToast,
  onOpenDetailedModal,
  onMoveUp,
  onMoveDown,
  onTogglePin,
  onTogglePause,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}) {
  const IconComp = ICON_MAP[tracker.icon] || Flame;
  const colorCfg = COLOR_CONFIG[tracker.color] || COLOR_CONFIG.emerald;
  const typeMeta = METRIC_TYPE_METADATA[tracker.metricType] || METRIC_TYPE_METADATA.BOOLEAN;

  const isPinned = Boolean(tracker.displayPreferences?.isPinned);
  const isPaused = Boolean(tracker.isPaused);
  const isArchived = Boolean(tracker.isArchived);

  // Format target display
  let targetDisplay = "";
  if (tracker.metricType === "BOOLEAN") {
    targetDisplay = "إنجاز يومي";
  } else if (tracker.metricType === "CHECKLIST") {
    const itemsCount = tracker.trackerConfig?.items?.length || tracker.targetValue || 0;
    targetDisplay = `${itemsCount} بنود يومياً`;
  } else if (tracker.metricType === "AVOIDANCE") {
    targetDisplay = "سلسلة أيام نظيفة";
  } else if (tracker.targetValue) {
    targetDisplay = `${tracker.targetValue} ${tracker.unit || ""} ${
      tracker.targetFrequency === "WEEKLY" ? "أسبوعياً" : "يومياً"
    }`;
  }

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border transition-all ${
        isPaused
          ? "bg-zinc-950/40 border-zinc-800/50 opacity-60"
          : isPinned
          ? "bg-[#0d101d] border-violet-500/30 shadow-lg shadow-violet-950/20"
          : "bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700/80"
      }`}
    >
      {/* Right Side: Icon & Details */}
      <div className="flex items-center gap-4 min-w-0">
        <div
          className={`flex items-center justify-center w-12 h-12 rounded-2xl border ${colorCfg.bg} ${colorCfg.border} ${colorCfg.text} shrink-0 shadow-inner`}
        >
          <IconComp className="w-6 h-6" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm sm:text-base font-bold text-zinc-100 truncate">
              {tracker.name}
            </h4>

            {isPinned && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/25">
                <Pin className="w-2.5 h-2.5" />
                <span>مثبت</span>
              </span>
            )}

            {isPaused && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                متوقف مؤقتاً
              </span>
            )}

            {tracker.lifeArea && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                {tracker.lifeArea.name}
              </span>
            )}

            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800/60 text-zinc-400 border border-zinc-800">
              {typeMeta.shortLabel}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
            {targetDisplay && <span className="font-medium">{targetDisplay}</span>}
            {tracker._count?.entries !== undefined && (
              <span className="font-mono text-zinc-400">
                • {tracker._count.entries} تسجيل
              </span>
            )}
            {tracker.priority > 1 && (
              <span className="text-amber-400 font-bold">
                • أولوية {tracker.priority}
              </span>
            )}
          </div>

          {tracker.description && (
            <p className="text-xs text-zinc-400 mt-1 truncate">
              {tracker.description}
            </p>
          )}
        </div>
      </div>

      {/* Left Side: Quick Logging Controls & Management Actions */}
      <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
        {!isArchived && !isPaused && (
          <div className="pl-2 border-l border-zinc-800">
            <QuickLogControls
              tracker={tracker}
              localDate={localDate}
              dailySummary={dailySummary}
              onLogged={onLogged}
              onToast={onToast}
              onOpenDetailedModal={onOpenDetailedModal}
            />
          </div>
        )}

        {!isArchived && (
          <>
            {/* Reorder Buttons */}
            {onMoveUp && (
              <button
                type="button"
                onClick={onMoveUp}
                disabled={index === 0}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                title="تحريك لأعلى"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            )}
            {onMoveDown && (
              <button
                type="button"
                onClick={onMoveDown}
                disabled={index === totalCount - 1}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                title="تحريك لأسفل"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}

            {/* Pin Toggle */}
            <button
              type="button"
              onClick={onTogglePin}
              className={`p-2 rounded-xl transition-colors ${
                isPinned
                  ? "text-violet-400 bg-violet-500/10 hover:bg-violet-500/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
              title={isPinned ? "إلغاء التثبيت" : "تثبيت في اللوحة"}
            >
              {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>

            {/* Pause / Resume */}
            <button
              type="button"
              onClick={onTogglePause}
              className={`p-2 rounded-xl transition-colors ${
                isPaused
                  ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
              title={isPaused ? "استئناف المتعقب" : "إيقاف مؤقت"}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>

            {/* Edit */}
            <button
              type="button"
              onClick={onEdit}
              className="p-2 rounded-xl text-zinc-400 hover:text-violet-300 hover:bg-zinc-800 transition-colors"
              title="تعديل المتعقب"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            {/* Archive */}
            <button
              type="button"
              onClick={onArchive}
              className="p-2 rounded-xl text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition-colors"
              title="أرشفة المتعقب"
            >
              <Archive className="w-4 h-4" />
            </button>
          </>
        )}

        {isArchived && (
          <>
            {/* Restore */}
            <button
              type="button"
              onClick={onRestore}
              className="p-2 rounded-xl text-zinc-400 hover:text-emerald-300 hover:bg-zinc-800 transition-colors"
              title="استعادة المتعقب من الأرشيف"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Permanent Delete */}
            <button
              type="button"
              onClick={onDelete}
              className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
              title="حذف المتعقب"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

