"use client";

import { useEffect } from "react";

export interface ShortcutHandlers {
  onNextTask?: () => void;
  onPrevTask?: () => void;
  onToggleDone?: () => void;
  onToggleTimer?: () => void;
  onQuickAdd?: () => void;
  onEscape?: () => void;
  onToggleHelp?: () => void;
}

export function useKeyboardShortcuts(
  handlers: ShortcutHandlers,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keystrokes when typing inside input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        if (e.key === "Escape" && handlers.onEscape) {
          handlers.onEscape();
        }
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case "j":
          e.preventDefault();
          handlers.onNextTask?.();
          break;
        case "k":
          e.preventDefault();
          handlers.onPrevTask?.();
          break;
        case "d":
          e.preventDefault();
          handlers.onToggleDone?.();
          break;
        case "p":
          e.preventDefault();
          handlers.onToggleTimer?.();
          break;
        case "a":
          e.preventDefault();
          handlers.onQuickAdd?.();
          break;
        case "escape":
          e.preventDefault();
          handlers.onEscape?.();
          break;
        case "?":
          e.preventDefault();
          handlers.onToggleHelp?.();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers, enabled]);
}

