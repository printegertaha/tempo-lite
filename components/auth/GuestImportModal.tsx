"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { localGuestManager, GuestDataSummary } from "@/lib/local-db";
import { importGuestData } from "@/actions/guest-import";
import { syncEngine } from "@/lib/sync/sync-engine";
import { soundManager } from "@/lib/audio";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  Sparkles,
  ArrowRight,
  Database,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  ListTodo,
  BookMarked,
  Dumbbell,
  Wallet,
  Compass,
  ShieldCheck,
} from "lucide-react";

export default function GuestImportModal() {
  const { data: sessionData, isPending } = useSession();
  const [summary, setSummary] = useState<GuestDataSummary | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Check if user is authenticated online and not dismissed in this session
    if (isPending || !sessionData?.user) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (sessionStorage.getItem("athar_guest_import_dismissed")) return;

    localGuestManager.getSummary().then((res) => {
      if (res.hasData) {
        setSummary(res);
        setIsOpen(true);
      }
    });
  }, [sessionData, isPending]);

  if (!isOpen || !summary || !summary.hasData) return null;

  const handleImport = async () => {
    setIsImporting(true);
    setErrorMessage("");

    try {
      const payload = await localGuestManager.getAllGuestPayload();
      const res = await importGuestData(payload);

      if (res.success) {
        // Safe: only clear guest data AFTER server confirmed atomic transaction success
        await localGuestManager.clearGuestData();
        if (typeof window !== "undefined") {
          localStorage.removeItem("athar_expenses");
          localStorage.removeItem("athar_nutrition");
          localStorage.removeItem("athar_gym");
          localStorage.removeItem("athar_state_v1");
        }

        setIsSuccess(true);
        soundManager.playTaskDone();
        await syncEngine.pullNow(true);

        setTimeout(() => {
          setIsOpen(false);
        }, 900);
      } else {
        setErrorMessage(res.error || "فشل استيراد البيانات، تم الاحتفاظ ببياناتك بأمان محلياً.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "حدث خطأ غير متوقع أثناء الاستيراد.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDiscard = () => {
    setConfirmDiscardOpen(true);
  };

  const handleConfirmDiscard = async () => {
    setIsDiscarding(true);
    try {
      await localGuestManager.clearGuestData();
      if (typeof window !== "undefined") {
        localStorage.removeItem("athar_expenses");
        localStorage.removeItem("athar_nutrition");
        localStorage.removeItem("athar_gym");
        localStorage.removeItem("athar_state_v1");
      }
      soundManager.playClick();
      setConfirmDiscardOpen(false);
      setIsOpen(false);
    } finally {
      setIsDiscarding(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem("athar_guest_import_dismissed", "true");
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg p-6 sm:p-7 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl text-right space-y-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          disabled={isImporting}
          className="absolute top-5 left-5 p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
          aria-label="إغلاق النافذة"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">
              تم العثور على بيانات سابقة في وضع الضيف
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              لقد سجلت وأنجزت بيانات كضيف على هذا الجهاز قبل تسجيل الدخول. هل ترغب في نقلها وربطها بحسابك الجديد (
              <span className="text-violet-300 font-mono">{sessionData?.user?.email}</span>)؟
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {isSuccess ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-base font-bold text-white">تم استيراد كافة البيانات بنجاح!</h3>
            <p className="text-xs text-zinc-400">جاري تحديث الصفحة لعرض بياناتك في حسابك...</p>
          </div>
        ) : (
          <>
            {/* Found Items Inventory */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2.5">
              <span className="text-xs font-bold text-zinc-300 block">
                محتويات بيانات الضيف ({summary.totalRecords} سجل):
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {summary.tasksCount > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950/60 border border-zinc-850 text-zinc-300">
                    <ListTodo className="w-4 h-4 text-violet-400" />
                    <span>{summary.tasksCount} مهمة</span>
                  </div>
                )}
                {summary.prayersCount > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950/60 border border-zinc-850 text-zinc-300">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <span>{summary.prayersCount} سجل صلاة</span>
                  </div>
                )}
                {summary.notesCount > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950/60 border border-zinc-855 text-zinc-300">
                    <BookMarked className="w-4 h-4 text-emerald-400" />
                    <span>{summary.notesCount} تدوينة يومية</span>
                  </div>
                )}
                {summary.gymCount > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950/60 border border-zinc-850 text-zinc-300">
                    <Dumbbell className="w-4 h-4 text-orange-400" />
                    <span>{summary.gymCount} جلسة تمرين</span>
                  </div>
                )}
                {summary.expensesCount > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950/60 border border-zinc-850 text-zinc-300">
                    <Wallet className="w-4 h-4 text-amber-400" />
                    <span>{summary.expensesCount} حركة مصروفات</span>
                  </div>
                )}
                {summary.trackersCount > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950/60 border border-zinc-850 text-zinc-300">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>{summary.trackersCount} عادة / متعقب</span>
                  </div>
                )}
                {summary.entriesCount > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950/60 border border-zinc-850 text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span>{summary.entriesCount} تسجيل عادة</span>
                  </div>
                )}
                {summary.mealsCount > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950/60 border border-zinc-850 text-zinc-300">
                    <ArrowRight className="w-4 h-4 text-lime-400" />
                    <span>{summary.mealsCount} وجبة</span>
                  </div>
                )}
                {summary.waterCount > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950/60 border border-zinc-850 text-zinc-300">
                    <ArrowRight className="w-4 h-4 text-teal-400" />
                    <span>{summary.waterCount} سجل ماء</span>
                  </div>
                )}
                {summary.abstinenceCount > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950/60 border border-zinc-850 text-zinc-300">
                    <ShieldCheck className="w-4 h-4 text-rose-400" />
                    <span>{summary.abstinenceCount} هدف امتناع</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting}
                className="w-full py-3 px-4 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-violet-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الاستيراد والدمج الذري...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>استيراد ونقل البيانات إلى حسابي</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={isImporting}
                  className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 text-xs font-semibold transition-colors"
                >
                  تأجيل القرار الآن
                </button>
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={isImporting}
                  className="py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>بدء حساب نظيف</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Custom Confirmation Dialog instead of browser confirm() */}
      <ConfirmDialog
        isOpen={confirmDiscardOpen}
        onClose={() => !isDiscarding && setConfirmDiscardOpen(false)}
        onConfirm={handleConfirmDiscard}
        title="تأكيد مسح بيانات الضيف"
        description="هل أنت متأكد من رغبتك في تجاهل ومسح بيانات الضيف المحلية والبدء بحساب نظيف تماماً؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="نعم، بدء حساب نظيف"
        cancelLabel="تراجع"
        isDestructive={true}
        isLoading={isDiscarding}
        zIndexClass="z-[140]"
      />
    </div>
  );
}

