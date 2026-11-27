"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

const maxWidthMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {any} [props.title]
 * @param {any} [props.description]
 * @param {any} props.children
 * @param {'sm' | 'md' | 'lg' | 'xl' | '2xl'} [props.maxWidth]
 * @param {boolean} [props.showCloseButton]
 * @param {string} [props.zIndexClass]
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "lg",
  showCloseButton = true,
  zIndexClass: _zIndexClass = "z-50",
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [isOpen]);

  // Fallback light-dismiss for browsers without native <dialog closedby="any">
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog || "closedBy" in HTMLDialogElement.prototype) return;

    const isOutside = (e) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    let pressedOutside = false;
    const handlePointerDown = (e) => {
      pressedOutside = isOutside(e);
    };
    const handlePointerUp = (e) => {
      if (pressedOutside && isOutside(e)) {
        onClose();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", handlePointerDown);
    dialog.addEventListener("pointerup", handlePointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", handlePointerDown);
      dialog.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      {...{ closedby: "any" }}
      aria-labelledby={title ? titleId : undefined}
      aria-label={!title ? "نافذة حوارية" : undefined}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={`athar-modal m-auto w-[calc(100%-2rem)] ${maxWidthMap[maxWidth] || maxWidthMap.lg} max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] rounded-3xl bg-[#0c0e17] border border-zinc-800 shadow-2xl p-0 text-right text-zinc-100 overflow-hidden open:flex open:flex-col animate-in fade-in duration-150`}
    >
      {/* Header */}
      {(title || showCloseButton) && (
        <div className="shrink-0 flex items-start justify-between gap-4 border-b border-zinc-850 px-5 sm:px-7 pt-5 sm:pt-6 pb-4">
          <div className="space-y-1">
            {title && (
              <h1
                id={titleId}
                className="text-lg font-bold text-zinc-100 tracking-tight"
              >
                {title}
              </h1>
            )}
            {description && (
              <p
                id={descriptionId}
                className="text-xs text-zinc-400 leading-relaxed"
              >
                {description}
              </p>
            )}
          </div>

          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors shrink-0 cursor-pointer"
              aria-label="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-4 overscroll-contain">
        {children}
      </div>
    </dialog>
  );
}
