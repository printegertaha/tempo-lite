"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const maxWidthMap = {
  sm: "w-[calc(100%-2rem)] max-w-sm",
  md: "w-[calc(100%-2rem)] max-w-md",
  lg: "w-[calc(100%-2rem)] max-w-lg",
  xl: "w-[calc(100%-2rem)] max-w-xl",
  "2xl": "w-[calc(100%-2rem)] max-w-2xl",
  wide: "w-[94%] sm:w-[90%] md:w-[80%] lg:w-[75%] 2xl:w-[60%] max-w-6xl",
};

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {any} [props.title]
 * @param {any} [props.description]
 * @param {any} props.children
 * @param {'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'wide'} [props.maxWidth]
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

  // Light-dismiss when clicking outside the top-most open dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    const isTopMost = () => {
      const openDialogs = document.querySelectorAll("dialog[open]");
      return openDialogs.length > 0 && openDialogs[openDialogs.length - 1] === dialog;
    };

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
      pressedOutside = isTopMost() && e.target === dialog && isOutside(e);
    };
    const handlePointerUp = (e) => {
      if (pressedOutside && isTopMost() && e.target === dialog && isOutside(e)) {
        e.stopPropagation();
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

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={title ? titleId : undefined}
      aria-label={!title ? "نافذة حوارية" : undefined}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
      className={`athar-modal m-auto ${maxWidthMap[maxWidth] || maxWidthMap.lg} max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] rounded-3xl bg-[#0c0e17] border border-zinc-800 shadow-2xl p-0 text-right text-zinc-100 overflow-hidden open:flex open:flex-col animate-in fade-in duration-150`}
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
    </dialog>,
    document.body
  );
}
