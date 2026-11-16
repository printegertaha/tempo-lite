"use client";

import { useEffect, useRef, ReactNode } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

const maxWidthMap = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
};

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "lg",
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidthMap[maxWidth]} rounded-t-3xl sm:rounded-3xl bg-[#0c0e17] border-t sm:border border-zinc-800 shadow-2xl p-5 sm:p-7 space-y-4 text-right max-h-[85vh] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-250 sm:slide-in-from-bottom-0 sm:zoom-in-95`}
      >
        {/* Swipe drag handle for mobile */}
        <div className="w-12 h-1.5 rounded-full bg-zinc-700/60 mx-auto -mt-1 sm:hidden mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
          {title && (
            <h3 className="text-base sm:text-lg font-bold text-zinc-100">
              {title}
            </h3>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}

