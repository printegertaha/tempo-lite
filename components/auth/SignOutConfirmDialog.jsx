"use client";

import { useEffect, useId, useRef } from "react";
import { LogOut, Loader2, X } from "lucide-react";

/**
 * Accessible native <dialog> confirmation modal for signing out.
 */
export default function SignOutConfirmDialog({
  isOpen,
  isSigningOut = false,
  onCancel,
  onConfirm,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Fallback for browsers without native closedby="any" (e.g. Safari)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;

    let pressedOutside = false;
    const isOutside = (e) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    const handlePointerDown = (e) => {
      pressedOutside = isOutside(e);
    };
    const handlePointerUp = (e) => {
      if (pressedOutside && isOutside(e) && !isSigningOut) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", handlePointerDown);
    dialog.addEventListener("pointerup", handlePointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", handlePointerDown);
      dialog.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isSigningOut]);

  const handleClose = () => {
    const dialog = dialogRef.current;
    if (dialog) dialog.returnValue = "";
    onCancel?.();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descId}
      {...{ closedby: isSigningOut ? "none" : "any" }}
      onClose={handleClose}
      onCancel={(e) => {
        if (isSigningOut) e.preventDefault();
      }}
      className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-3xl bg-[#0c0e17] border border-zinc-800/90 text-zinc-100 shadow-2xl shadow-black/80 p-6 backdrop:bg-black/75 backdrop:backdrop-blur-sm"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <h1 id={titleId} className="text-base font-bold text-zinc-100">
              متأكد إنك عايز تسجل خروج؟
            </h1>
          </div>

          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            disabled={isSigningOut}
            aria-label="إغلاق"
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p id={descId} className="text-xs leading-relaxed text-zinc-400">
          هتحتاج تسجل دخول مرة تانية عشان تقدر تزامن بياناتك وتحفظها على السحابة وتوصل لحسابك من أي جهاز.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800/80">
          <button
            type="button"
            autoFocus
            disabled={isSigningOut}
            onClick={() => dialogRef.current?.close()}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/70 text-zinc-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
          >
            إلغاء
          </button>

          <button
            type="button"
            disabled={isSigningOut}
            onClick={onConfirm}
            className="min-h-[40px] flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSigningOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الخروج...</span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>تأكيد تسجيل الخروج</span>
              </>
            )}
          </button>
        </div>
      </div>
    </dialog>
  );
}
