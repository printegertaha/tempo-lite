"use client";

import {
  Calendar,
  Clock,
  RotateCcw,
  Trophy,
  History,
  AlertCircle,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { formatArabicDateTime, calculateAbstinenceDuration } from "@/lib/dates";

export default function AbstinenceHistoryList({
  tracker,
  timezone = "Asia/Riyadh",
}) {
  const pastSessions = tracker?.pastSessions || [];
  const longestStreakSeconds = tracker?.longestStreakSeconds || 0;

  if (pastSessions.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-zinc-950/60 border border-zinc-800/80 text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
          <History className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-zinc-200">لا توجد انتكاسات أو جلسات سابقة مسجلة</h4>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
          أنت في جولتك الأولى! عندما يتم تسجيل انتكاسة، ستُحفظ الجلسة بتفاصيلها ومدتها ومحفزاتها هنا لدراسة مسار التعافي.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-2">
            <History className="w-4 h-4 text-violet-400" />
            <span>سجل جلسات الامتناع السابقة</span>
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
            {pastSessions.length} جلسات سابقة
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {pastSessions.map((session, index) => {
          const sessionNum = pastSessions.length - index;
          const startFormatted = formatArabicDateTime(session.startedAt, timezone);
          const endFormatted = session.endedAt
            ? formatArabicDateTime(session.endedAt, timezone)
            : null;

          const dur = calculateAbstinenceDuration(
            session.startedAt,
            session.endedAt
          );

          const isLongest =
            dur.totalSeconds > 0 &&
            dur.totalSeconds === longestStreakSeconds &&
            pastSessions.length > 1;

          return (
            <div
              key={session.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isLongest
                  ? "bg-amber-950/10 border-amber-500/30 shadow-lg shadow-amber-950/10"
                  : "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700/80"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                      isLongest
                        ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400"
                    }`}
                  >
                    {isLongest ? (
                      <Trophy className="w-4 h-4 text-amber-400" />
                    ) : (
                      <span className="text-xs font-mono font-bold">#{sessionNum}</span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-zinc-200">
                        جلسة امتناع: {dur.formattedArabic}
                      </span>
                      {isLongest && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                          <Trophy className="w-2.5 h-2.5" />
                          <span>أطول رقم قياسي سابق</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span>من: {startFormatted.dateStr} ({startFormatted.timeStr})</span>
                      <span>←</span>
                      <span>إلى: {endFormatted?.dateStr} ({endFormatted?.timeStr})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trigger / Relapse details if available */}
              {(session.trigger || session.relapseReason || session.notes) && (
                <div className="mt-3 pt-3 border-t border-zinc-800/60 text-xs space-y-1">
                  {session.trigger && (
                    <div className="flex items-center gap-1.5 text-rose-300">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="font-semibold">المحفز المرصود:</span>
                      <span>{session.trigger}</span>
                    </div>
                  )}
                  {session.notes && (
                    <div className="flex items-start gap-1.5 text-zinc-400 mt-0.5">
                      <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{session.notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

