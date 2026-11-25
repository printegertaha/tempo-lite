"use client";

import { useSyncExternalStore } from "react";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { useSession } from "@/lib/auth-client";
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

const emptySubscribe = () => () => {};

export default function SyncStatusBadge() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const { status, pendingCount, failedCount, error, flushNow, retryFailed } = useSyncStatus();
  const { data: sessionData, isPending } = useSession();

  if (!mounted) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/40 border border-zinc-700/40 text-transparent text-[11px] font-medium select-none pointer-events-none opacity-0"
        aria-hidden="true"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
        <span>المزامنة</span>
      </div>
    );
  }

  // 1. Guest mode state (Unauthenticated user)
  if (!isPending && !sessionData?.user) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] font-medium"
        title="أنت تتصفح في وضع الضيف المحلي. جميع المهام والعادات والتدوينات محفوظة محلياً بالكامل على هذا الجهاز في متصفحك."
      >
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
        <span>محفوظ محلياً (ضيف)</span>
      </div>
    );
  }

  // 2. Offline state
  if (status === "offline") {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium"
        title="أنت تعمل بدون اتصال بالإنترنت. التعديلات محفوظة محلياً بالكامل وستتم مزامنتها تلقائياً فور عودة الشبكة."
      >
        <CloudOff className="w-3.5 h-3.5 text-amber-400" />
        <span>غير متصل (محفوظ محلياً)</span>
        {pendingCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 text-[10px] font-mono font-bold">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  // 3. Syncing state
  if (status === "syncing") {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] font-medium animate-pulse">
        <RefreshCw className="w-3.5 h-3.5 text-violet-400 animate-spin" />
        <span>جارٍ المزامنة...</span>
        {pendingCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-200 text-[10px] font-mono font-bold">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  // 4. Error / Failed mutations state (never report synced when errors exist!)
  if (status === "error" || failedCount > 0) {
    const totalAffected = failedCount + pendingCount;
    return (
      <button
        type="button"
        onClick={() => (failedCount > 0 ? retryFailed() : flushNow())}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-medium transition-colors cursor-pointer"
        title={error ? `تعذر مزامنة بعض التعديلات (${error}). انقر لإعادة المحاولة.` : "تعذر مزامنة بعض التعديلات. انقر لإعادة المحاولة."}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
        <span>تعذر المزامنة</span>
        {totalAffected > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-200 text-[10px] font-mono font-bold">
            {totalAffected}
          </span>
        )}
      </button>
    );
  }

  // 5. Pending mutations state
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
        <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 text-[10px] font-mono font-bold">
          {pendingCount} معلقة
        </span>
      </button>
    );
  }

  // 6. Fully synced state
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
