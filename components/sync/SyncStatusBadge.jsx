"use client";

import { useSyncStatus } from "@/hooks/useSyncStatus";
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

export default function SyncStatusBadge() {
  const { status, pendingCount, flushNow } = useSyncStatus();

  if (status === "offline") {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium"
        title="أنت تعمل بدون اتصال بالإنترنت. التعديلات محفوظة محلياً بالكامل وستتم مزامنتها تلقائياً فور عودة الشبكة."
      >
        <CloudOff className="w-3.5 h-3.5 text-amber-400" />
        <span>غير متصل (محفوظ محلياً)</span>
        {pendingCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-200 text-[10px] font-mono font-bold">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  if (status === "syncing") {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] font-medium animate-pulse">
        <RefreshCw className="w-3.5 h-3.5 text-violet-400 animate-spin" />
        <span>جارٍ المزامنة...</span>
        {pendingCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-violet-500/20 text-violet-200 text-[10px] font-mono font-bold">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <button
        type="button"
        onClick={() => flushNow()}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-[11px] font-medium transition-colors cursor-pointer"
        title="انقر للمزامنة الفورية مع السحابة"
      >
        <Cloud className="w-3.5 h-3.5 text-indigo-400" />
        <span>محفوظ محلياً</span>
        <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-200 text-[10px] font-mono font-bold">
          {pendingCount} معلقة
        </span>
      </button>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium"
      title="كافة التغييرات متزامنة مع السحابة"
    >
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
      <span>متزامن</span>
    </div>
  );
}

