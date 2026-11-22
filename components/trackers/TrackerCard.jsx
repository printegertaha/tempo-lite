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
  const typeMeta =
    METRIC_TYPE_METADATA[tracker.metricType] || METRIC_TYPE_METADATA.BOOLEAN;

  const isPinned = Boolean(tracker.displayPreferences?.isPinned);
  const isPaused = Boolean(tracker.isPaused);
  const isArchived = Boolean(tracker.isArchived);

  // Format target display
  let targetDisplay = "";
  if (tracker.metricType === "BOOLEAN") {
    targetDisplay = "إنجاز يومي";
  } else if (tracker.metricType === "CHECKLIST") {
    const itemsCount =
      tracker.trackerConfig?.items?.length || tracker.targetValue || 0;
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
      className={`rounded-2xl border transition-all p-4 sm:p-5 space-y-3.5 ${
        isPaused
          ? "bg-zinc-950/40 border-zinc-800/50 opacity-60"
          : isPinned
          ? "bg-[#0d101d] border-violet-500/30 shadow-lg shadow-violet-950/20"
          : "bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700/80"
      }`}
    >
      {/* Top Row: Icon, Tracker Info & Action Buttons */}
      <div className="flex items-start justify-between gap-3">
        {/* Right Side: Icon & Details */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border ${colorCfg.bg} ${colorCfg.border} ${colorCfg.text} shrink-0 shadow-inner`}
          >
            <IconComp className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
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
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400 flex-wrap">
              <span className="px-1.5 py-0.5 rounded bg-zinc-800/60 text-[10px] font-medium text-zinc-400">
                {typeMeta.shortLabel}
              </span>
              {targetDisplay && (
                <span className="font-medium text-[11px] text-zinc-300">
                  {targetDisplay}
                </span>
              )}
              {tracker._count?.entries !== undefined && (
                <span className="font-mono text-[11px] text-zinc-400">
                  • {tracker._count.entries} تسجيل
                </span>
              )}
              {tracker.priority > 1 && (
                <span className="text-amber-400 font-bold text-[11px]">
                  • أولوية {tracker.priority}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Left Side: Sleek Card Action Controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          {!isArchived && (
            <>
              {onMoveUp && (
                <button
                  type="button"
                  onClick={onMoveUp}
                  disabled={index === 0}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  title="تحريك لأعلى"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              )}
              {onMoveDown && (
                <button
                  type="button"
                  onClick={onMoveDown}
                  disabled={index === totalCount - 1}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  title="تحريك لأسفل"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Pin Toggle */}
              <button
                type="button"
                onClick={onTogglePin}
                className={`p-1.5 rounded-lg transition-colors ${
                  isPinned
                    ? "text-violet-400 bg-violet-500/10 hover:bg-violet-500/20"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
                title={isPinned ? "إلغاء التثبيت" : "تثبيت في اللوحة"}
              >
                {isPinned ? (
                  <PinOff className="w-3.5 h-3.5" />
                ) : (
                  <Pin className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Pause / Resume */}
              <button
                type="button"
                onClick={onTogglePause}
                className={`p-1.5 rounded-lg transition-colors ${
                  isPaused
                    ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
                title={isPaused ? "استئناف المتعقب" : "إيقاف مؤقت"}
              >
                {isPaused ? (
                  <Play className="w-3.5 h-3.5" />
                ) : (
                  <Pause className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Edit */}
              <button
                type="button"
                onClick={onEdit}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-violet-300 hover:bg-zinc-800 transition-colors"
                title="تعديل المتعقب"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              {/* Archive */}
              <button
                type="button"
                onClick={onArchive}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition-colors"
                title="أرشفة المتعقب"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {isArchived && (
            <>
              {/* Restore */}
              <button
                type="button"
                onClick={onRestore}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-300 hover:bg-zinc-800 transition-colors"
                title="استعادة المتعقب من الأرشيف"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Permanent Delete */}
              <button
                type="button"
                onClick={onDelete}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                title="حذف المتعقب"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Description if present */}
      {tracker.description && (
        <p className="text-xs text-zinc-400 leading-relaxed">
          {tracker.description}
        </p>
      )}

      {/* Bottom Interactive Logging Section (Full Width on Mobile & Desktop) */}
      {!isArchived && !isPaused && (
        <div className="pt-2.5 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <span className="text-[11px] font-semibold text-zinc-400 shrink-0">
            تسجيل اليومية:
          </span>
          <div className="flex-1 flex sm:justify-end">
            <QuickLogControls
              tracker={tracker}
              localDate={localDate}
              dailySummary={dailySummary}
              onLogged={onLogged}
              onToast={onToast}
              onOpenDetailedModal={onOpenDetailedModal}
            />
          </div>
        </div>
      )}
    </div>
  );
}
