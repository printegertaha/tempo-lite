"use client";

import { useState } from "react";
import {
  Clock,
  Flame,
  CheckCircle2,
  Trash2,
  ChevronDown,
  Sparkles,
  Tag,
  Loader2,
} from "lucide-react";
import { deleteTrackerEntry } from "@/actions/entries";

function formatTime(occurredAt) {
  if (!occurredAt) return "";
  try {
    const d = new Date(occurredAt);
    return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function getEntrySummary(entry) {
  if (entry.valueDuration) {
    const mins = Math.round(entry.valueDuration / 60);
    const subject = entry.entryPayload?.subject;
    return subject ? `${mins} دقيقة (${subject})` : `${mins} دقيقة`;
  }
  if (entry.valueNumeric !== null && entry.valueNumeric !== undefined) {
    const unit = entry.entryPayload?.unit || "";
    return `${entry.valueNumeric} ${unit}`.trim();
  }
  if (entry.valueBoolean !== null && entry.valueBoolean !== undefined) {
    return entry.valueBoolean ? "إنجاز مكتمل ✓" : "غير مكتمل";
  }
  if (entry.entryPayload?.completedItemIds) {
    const count = entry.entryPayload.completedItemIds.length;
    return `تم إنجاز ${count} بنود`;
  }
  if (entry.entryPayload?.avoided !== undefined) {
    return entry.entryPayload.avoided ? "يوم نظيف ونجاح في التجنب" : "تم تسجيل انتكاسة";
  }
  return "سجل نشاط";
}

export default function DynamicTimeline({
  dailyEntries = [],
  trackers = [],
  onEntryDeleted,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const trackerMap = new Map(trackers.map((t) => [t.id, t]));

  // Sort chronological
  const sortedEntries = [...dailyEntries].sort((a, b) => {
    const timeA = new Date(a.occurredAt || a.createdAt).getTime();
    const timeB = new Date(b.occurredAt || b.createdAt).getTime();
    return timeB - timeA; // Most recent first
  });

  const handleDelete = async (entryId) => {
    if (!confirm("هل أنت متأكد من حذف هذا السجل؟")) return;
    setDeletingId(entryId);
    try {
      const res = await deleteTrackerEntry(entryId);
      if (res.success && onEntryDeleted) {
        onEntryDeleted();
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-2xl bg-zinc-950/70 border border-zinc-800/80 p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-bold text-zinc-100">سجل الأنشطة واليوميات</h3>
        </div>
        <span className="text-xs text-zinc-500 font-mono">
          {sortedEntries.length} سجلات اليوم
        </span>
      </div>

      {sortedEntries.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <p className="text-xs text-zinc-400 font-medium">لا توجد أنشطة مسجلة لهذا اليوم</p>
          <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
            ستظهر هنا سجلات عاداتك وجلساتك بالترتيب الزمني فور تدوينها عبر بطاقات العادات أعلاه.
          </p>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {sortedEntries.map((entry) => {
            const tracker = trackerMap.get(entry.trackerId);
            const timeStr = formatTime(entry.occurredAt || entry.createdAt);
            const summary = getEntrySummary(entry);
            const isExpanded = expandedId === entry.id;
            const isDeleting = deletingId === entry.id;

            return (
              <div key={entry.id} className="relative flex gap-3 group">
                {/* Timeline node */}
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full border border-violet-500/30 bg-violet-500/10 flex items-center justify-center shrink-0 z-10 text-violet-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-px flex-1 bg-zinc-800/60 mt-1" />
                </div>

                {/* Entry Card */}
                <div className="flex-1 pb-3">
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="p-3 rounded-xl bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/60 hover:border-zinc-700/80 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                          {timeStr}
                        </span>
                        <h4 className="text-xs font-semibold text-zinc-200 truncate">
                          {tracker?.name || "نشاط"}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/50 text-zinc-300 font-mono">
                          {summary}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(entry.id);
                          }}
                          disabled={isDeleting}
                          className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="حذف السجل"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded notes */}
                    {entry.notes && (
                      <p className="text-[11px] text-zinc-400 mt-2 pt-2 border-t border-zinc-800/60">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

