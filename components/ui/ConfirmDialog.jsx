"use client";

import Modal from "./Modal";
import { AlertTriangle } from "lucide-react";

/**
 * @param {{
 *   isOpen: boolean;
 *   onClose: () => void;
 *   onConfirm: () => void | Promise<void>;
 *   title: string;
 *   description?: string;
 *   confirmLabel?: string;
 *   cancelLabel?: string;
 *   isDestructive?: boolean;
 *   isLoading?: boolean;
 *   icon?: any;
 *   zIndexClass?: string;
 * }} props
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  isDestructive = false,
  isLoading = false,
  icon = null,
  zIndexClass = "z-50",
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" showCloseButton={false} zIndexClass={zIndexClass}>
      <div className="space-y-4 text-center">
        <div
          className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ${
            isDestructive
              ? "bg-red-500/10 text-red-400 border border-red-500/20"
              : "bg-violet-500/10 text-violet-400 border border-violet-500/20"
          }`}
        >
          {icon || <AlertTriangle className="w-6 h-6" />}
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-zinc-100">{title}</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`flex-1 py-2.5 px-4 rounded-xl border text-xs transition-all cursor-pointer ${
              isDestructive
                ? "bg-zinc-800/90 hover:bg-zinc-700 border-zinc-600/70 text-zinc-100 font-bold shadow-sm"
                : "bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300 hover:text-white font-semibold"
            }`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isDestructive
                ? "bg-rose-500/12 hover:bg-rose-600 border border-rose-500/35 hover:border-rose-500 text-rose-300 hover:text-white"
                : "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20"
            }`}
          >
            {isLoading ? "جاري التنفيذ..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
