"use client";

import { useState, useSyncExternalStore } from "react";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { useLocalSession } from "@/hooks/useLocalSession";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  GitMerge,
  X,
} from "lucide-react";

const emptySubscribe = () => () => {};

export default function SyncStatusBadge() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const {
    status,
    pendingCount,
    failedCount,
    conflictCount,
    conflicts,
    error,
    flushNow,
    retryFailed,
    resolveConflict,
  } = useSyncStatus();
  const { user, isGuest, isPending } = useLocalSession();
  const [conflictModalOpen, setConflictModalOpen] = useState(false);

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
  if (!isPending && (isGuest || !user)) {
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

  // 2. Offline states (distinct: locally saved vs offline with pending changes)
  if (status === "offline") {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium"
        title={
          pendingCount > 0
            ? `أنت غير متصل وهناك ${pendingCount} تعديل معلق محفوظ محلياً وسيرتفع تلقائياً عند عودة الشبكة.`
            : "أنت غير متصل — بياناتك محفوظة محلياً بالكامل."
        }
      >
        <CloudOff className="w-3.5 h-3.5 text-amber-400" />
        <span>
          {pendingCount > 0
            ? `غير متصل (${pendingCount} تعديل معلق)`
            : "غير متصل (محفوظ محلياً)"}
        </span>
      </div>
    );
  }

  // 3. Conflict detected state (preserves both versions until safely resolved)
  if (conflictCount > 0) {
    return (
      <>
        <button
          type="button"
          onClick={() => setConflictModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-[11px] font-bold transition-colors cursor-pointer"
          title="توجد تعديلات متزامنة من جهاز آخر وتحتاج اختيار النسخة الآمنة"
        >
          <GitMerge className="w-3.5 h-3.5 text-amber-400" />
          <span>تعارض تعديلات ({conflictCount})</span>
        </button>

        {conflictModalOpen && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setConflictModalOpen(false)}
          >
            <div
              className="w-full max-w-lg rounded-3xl bg-[#0c0e17] border border-amber-500/30 p-6 shadow-2xl space-y-4 text-right"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <GitMerge className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-zinc-100">
                    حل تعارض التعديلات المتزامنة
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setConflictModalOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {conflicts.map((c) => {
                  const title =
                    c.localRecord?.title ||
                    c.localRecord?.name ||
                    c.serverRecord?.title ||
                    c.serverRecord?.name ||
                    c.entityId;
                  return (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3"
                    >
                      <div className="text-xs font-bold text-zinc-100">{title}</div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => resolveConflict(c.id, "keep_local")}
                          className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-bold cursor-pointer"
                        >
                          الاحتفاظ بنسختي المحلية
                        </button>
                        <button
                          type="button"
                          onClick={() => resolveConflict(c.id, "keep_remote")}
                          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold cursor-pointer"
                        >
                          اعتماد نسخة السحابة
                        </button>
                        {c.entityType === "task" && (
                          <button
                            type="button"
                            onClick={() => resolveConflict(c.id, "keep_both")}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold cursor-pointer"
                          >
                            الاحتفاظ بالنسختين معاً
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // 4. Syncing state
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

  // 5. Error / Failed mutations state
  if (status === "error" || failedCount > 0) {
    const totalAffected = failedCount + pendingCount;
    return (
      <button
        type="button"
        onClick={() => (failedCount > 0 ? retryFailed() : flushNow())}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-medium transition-colors cursor-pointer"
        title={
          error
            ? `تعذر مزامنة بعض التعديلات (${error}). انقر لإعادة المحاولة.`
            : "تعذر مزامنة بعض التعديلات. انقر لإعادة المحاولة."
        }
      >
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
        <span>فشل المزامنة</span>
        {totalAffected > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-200 text-[10px] font-mono font-bold">
            {totalAffected}
          </span>
        )}
      </button>
    );
  }

  // 6. Pending mutations awaiting cloud confirmation (distinct from cloud synced!)
  if (pendingCount > 0) {
    return (
      <button
        type="button"
        onClick={() => flushNow()}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-[11px] font-medium transition-colors cursor-pointer"
        title="تم الحفظ محلياً وفي انتظار تأكيد السحابة — انقر للمزامنة الفورية"
      >
        <Cloud className="w-3.5 h-3.5 text-indigo-400" />
        <span>محفوظ محلياً ({pendingCount} معلق)</span>
      </button>
    );
  }

  // 7. Fully synced state
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium"
      title="متصل ومتزامن بالكامل مع السحابة"
    >
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
      <span>متصل ومتزامن</span>
    </div>
  );
}
