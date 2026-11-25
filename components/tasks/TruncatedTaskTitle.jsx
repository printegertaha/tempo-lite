"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * Displays a task title cleanly on a single uniform line that adapts naturally
 * to Mobile, Tablet (iPad), and Laptop widths without layout distortion.
 * - Keeps the full string in the DOM for accessibility, search, and copy.
 * - Uses ResizeObserver to detect true visual overflow per viewport/container.
 * - Reveals the full title on hover/focus (floating tooltip, Escape-dismissible)
 *   AND via an unobtrusive toggle button for touch & explicit expand/collapse.
 */
export default function TruncatedTaskTitle({
  title,
  isCompleted = false,
  isExpanded = false,
  onToggleExpand,
  size = "md", // "sm" | "md"
  onTruncatedChange,
}) {
  const titleRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const el = titleRef.current;
    if (!el || isExpanded) return;

    const measure = () => {
      const truncated = el.scrollWidth > el.clientWidth + 1;
      setIsTruncated(truncated);
      if (onTruncatedChange) onTruncatedChange(truncated);
    };

    const rafId = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [title, isExpanded, onTruncatedChange]);

  useEffect(() => {
    if (!isHovered) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsHovered(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isHovered]);

  const showRevealControls = isTruncated || isExpanded;
  const textClass =
    size === "sm"
      ? "text-sm sm:text-[15px] font-semibold"
      : "text-base sm:text-[17px] font-bold";

  return (
    <div
      className="relative flex-1 min-w-0"
      onMouseEnter={() => {
        if (isTruncated && !isExpanded) setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-1.5 min-w-0">
        <h3
          ref={titleRef}
          onClick={() => {
            if (showRevealControls && onToggleExpand) {
              onToggleExpand();
            }
          }}
          className={`flex-1 min-w-0 leading-snug transition-colors select-text ${textClass} ${
            isExpanded
              ? "whitespace-normal break-words"
              : "truncate"
          } ${showRevealControls ? "cursor-pointer" : ""} ${
            isCompleted
              ? "line-through text-zinc-500"
              : "text-zinc-100 group-hover:text-white"
          }`}
        >
          {title}
        </h3>

        {showRevealControls && onToggleExpand && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsHovered(false);
              onToggleExpand();
            }}
            onFocus={() => {
              if (isTruncated && !isExpanded) setIsHovered(true);
            }}
            onBlur={() => setIsHovered(false)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "طي عنوان المهمة" : "عرض اسم المهمة بالكامل"}
            title={isExpanded ? "طي العنوان" : "عرض العنوان كاملاً"}
            className="shrink-0 mt-0.5 p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Hover/Focus full-title preview overlay (WCAG 1.4.13 hoverable + Escape-dismissible, zero layout shift) */}
      {isHovered && isTruncated && !isExpanded && (
        <div
          aria-hidden="true"
          className="hidden sm:block absolute right-0 top-full mt-1.5 z-40 w-max max-w-[min(22rem,80vw)] px-3 py-2 rounded-xl bg-zinc-900/95 border border-zinc-700/80 shadow-2xl backdrop-blur-md text-xs font-semibold text-zinc-100 leading-relaxed whitespace-normal break-words"
        >
          {title}
        </div>
      )}
    </div>
  );
}
