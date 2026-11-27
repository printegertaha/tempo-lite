"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

export interface HorizontalSectionMeta {
  id: string;
  title: string;
}

interface HorizontalFormCarouselProps {
  sections: HorizontalSectionMeta[];
  resetKey?: string | number | boolean | null;
  jumpToSlide?: { index: number; nonce: number } | null;
  onSlideChange?: (index: number) => void;
  children: React.ReactNode;
}

export default function HorizontalFormCarousel({
  sections,
  resetKey,
  jumpToSlide,
  onSlideChange,
  children,
}: HorizontalFormCarouselProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const onSlideChangeRef = useRef(onSlideChange);
  onSlideChangeRef.current = onSlideChange;

  useEffect(() => {
    setActiveSlide(0);
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = 0;
    }
    onSlideChangeRef.current?.(0);
  }, [resetKey]);

  useEffect(() => {
    if (!jumpToSlide) return;
    const clamped = Math.max(0, Math.min(sections.length - 1, jumpToSlide.index));
    setActiveSlide(clamped);
    onSlideChangeRef.current?.(clamped);
    slideRefs.current[clamped]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [jumpToSlide, sections.length]);

  const goToSlide = (index: number) => {
    const clamped = Math.max(0, Math.min(sections.length - 1, index));
    if (clamped !== activeSlide) {
      setActiveSlide(clamped);
      onSlideChangeRef.current?.(clamped);
    }
    slideRefs.current[clamped]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  };

  const handleScroll = () => {
    const container = carouselRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    let closestIdx = 0;
    let closestDist = Infinity;
    slideRefs.current.forEach((slide, idx) => {
      if (!slide) return;
      const rect = slide.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const dist = Math.abs(center - containerCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });
    if (closestIdx !== activeSlide) {
      setActiveSlide(closestIdx);
      onSlideChangeRef.current?.(closestIdx);
    }
  };

  const slides = React.Children.toArray(children);

  return (
    <div className="space-y-2.5">
      {/* Current Section Title */}
      <div className="px-1">
        <span className="text-xs font-bold text-zinc-200 truncate block">
          {sections[activeSlide]?.title}
        </span>
      </div>

      {/* Horizontal Snap-Scroll Container */}
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-3 scroll-smooth horizontal-scroll-indicator items-start"
      >
        {slides.map((child, idx) => (
          <div
            key={sections[idx]?.id || idx}
            ref={(el) => {
              slideRefs.current[idx] = el;
            }}
            className="w-full shrink-0 snap-center p-4 rounded-2xl bg-zinc-900/35 border border-zinc-800/70 space-y-3.5"
          >
            {child}
          </div>
        ))}
      </div>

      {/* Bottom Controls: Arrows on the Right, "X من Y" on the Far Left */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => goToSlide(activeSlide - 1)}
            disabled={activeSlide === 0}
            aria-label="القسم السابق"
            className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => goToSlide(activeSlide + 1)}
            disabled={activeSlide === sections.length - 1}
            aria-label="القسم التالي"
            className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <span className="px-2.5 py-0.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-[11px] font-mono font-bold text-violet-300 shrink-0 whitespace-nowrap">
          {activeSlide + 1} من {sections.length}
        </span>
      </div>
    </div>
  );
}
