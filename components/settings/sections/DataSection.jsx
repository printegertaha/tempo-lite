"use client";

import {
  ShieldCheck,
  Download,
  Check,
  RotateCcw,
  Loader2,
  AlertTriangle,
} from "lucide-react";

/**
 * Backup export, restore, and local/cloud data reset settings section.
 */
export default function DataSection({
  isCloudUser,
  isExporting,
  isRestoring,
  onExportData,
  onRestoreBackup,
  onOpenResetModal,
}) {
  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-base font-bold text-zinc-100">السيادة على البيانات والنسخ الاحتياطي</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              تصدير بياناتك كاملة أو استعادتها في أي وقت بأمان
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 self-start sm:self-auto" suppressHydrationWarning>
          {isCloudUser ? "سحابي ومحلي" : "محلي في المتصفح"}
        </span>
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed">
        تُحفظ سجلاتك وبياناتك تحت سيطرتك الكاملة. يمكنك تحميل نسخة احتياطية كاملة (JSON) تشمل المهام، العادات، المصروفات، التمارين، والإعدادات في أي لحظة.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onExportData}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-750 disabled:opacity-50 text-zinc-100 text-xs font-bold border border-zinc-700 transition-all cursor-pointer shadow-md hover:border-cyan-500/40"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          ) : (
            <Download className="w-4 h-4 text-cyan-400" />
          )}
          <span>{isExporting ? "جاري تجهيز النسخة..." : "تصدير نسخة احتياطية شاملة (JSON)"}</span>
        </button>

        <label className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-bold border border-zinc-750 transition-all cursor-pointer">
          {isRestoring ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400" />
          )}
          <span>{isRestoring ? "جاري الاستعادة..." : "استعادة نسخة احتياطية (JSON)"}</span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={onRestoreBackup}
            disabled={isRestoring}
            className="hidden"
          />
        </label>
      </div>

      {/* Danger Zone */}
      <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/15 border border-rose-800/30 space-y-3">
        <div className="flex items-center gap-2 text-rose-300">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <h3 className="text-xs font-bold">منطقة إعادة الضبط</h3>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          يمكنك مسح التخزين المحلي على هذا الجهاز فقط دون المساس بحسابك السحابي، أو مسح جميع بيانات الحساب وإعادة البدء من جديد.
        </p>
        <button
          type="button"
          onClick={onOpenResetModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-950/50 text-rose-300 text-xs font-bold border border-rose-800/40 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-rose-400" />
          <span>مسح البيانات وإعادة الضبط</span>
        </button>
      </div>
    </div>
  );
}
