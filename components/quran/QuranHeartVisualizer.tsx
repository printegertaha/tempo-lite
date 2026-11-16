"use client";

import React, { useState, useMemo } from "react";
import { QURAN_SURAHS, Surah } from "@/lib/quranData";
import { soundManager } from "@/lib/audio";
import { Heart, Sparkles, Check, Info } from "lucide-react";

interface QuranHeartVisualizerProps {
  memorizedIds: number[];
  onToggleSurah: (id: number) => void;
  selectedSurahId: number | null;
  onSelectSurah: (id: number) => void;
}

export default function QuranHeartVisualizer({
  memorizedIds,
  onToggleSurah,
  selectedSurahId,
  onSelectSurah,
}: QuranHeartVisualizerProps) {
  const [hoveredSurah, setHoveredSurah] = useState<Surah | null>(null);

  const memorizedSet = useMemo(() => new Set(memorizedIds), [memorizedIds]);

  const handleCellClick = (surah: Surah) => {
    soundManager.playTaskDone();
    onToggleSurah(surah.id);
    onSelectSurah(surah.id);
  };

  return (
    <div className="relative w-full max-w-[680px] mx-auto select-none">
      {/* SVG Container */}
      <svg
        viewBox="0 0 600 930"
        className="w-full h-auto drop-shadow-2xl overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Crimson Red Gradient for Memorized Cells */}
          <linearGradient id="crimsonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="60%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#be123c" />
          </linearGradient>

          {/* Deep Heart Glow Gradient */}
          <radialGradient id="heartGlow" cx="50%" cy="55%" r="50%">
            <stop offset="0%" stopColor="rgba(225, 29, 72, 0.15)" />
            <stop offset="100%" stopColor="rgba(225, 29, 72, 0)" />
          </radialGradient>

          {/* Golden Flower Center Gradient */}
          <radialGradient id="flowerGold" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#eab308" />
          </radialGradient>

          {/* Cell Shadow Filter */}
          <filter id="cellShadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.4" />
          </filter>

          {/* Red Glow Filter */}
          <filter id="redGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f43f5e" floodOpacity="0.75" />
          </filter>
        </defs>

        {/* Background Heart Soft Ambient Glow */}
        <ellipse cx="300" cy="520" rx="240" ry="320" fill="url(#heartGlow)" />

        {/* ------------------------------------------------------------- */}
        {/* FLORAL CROWN AT TOP OF THE HEART (Matching Image 1 flowers) */}
        {/* ------------------------------------------------------------- */}
        <g id="floral-crown" className="pointer-events-none opacity-90 transition-opacity hover:opacity-100">
          {/* Foliage / Greenery */}
          <path
            d="M 120 130 C 140 90, 220 80, 280 110 C 230 115, 170 125, 120 130 Z"
            fill="#10b981"
            fillOpacity="0.5"
          />
          <path
            d="M 480 130 C 460 90, 380 80, 320 110 C 370 115, 430 125, 480 130 Z"
            fill="#10b981"
            fillOpacity="0.5"
          />
          <path
            d="M 230 70 C 260 40, 340 40, 370 70 C 330 65, 270 65, 230 70 Z"
            fill="#059669"
            fillOpacity="0.6"
          />

          {/* Soft Pink & Blue Blossoms */}
          {/* Flower 1 - Left */}
          <circle cx="150" cy="110" r="14" fill="#f472b6" fillOpacity="0.85" />
          <circle cx="150" cy="110" r="5" fill="url(#flowerGold)" />
          <circle cx="135" cy="100" r="10" fill="#fb7185" fillOpacity="0.75" />
          <circle cx="165" cy="100" r="10" fill="#38bdf8" fillOpacity="0.7" />

          {/* Flower 2 - Center Left */}
          <circle cx="220" cy="80" r="16" fill="#f43f5e" fillOpacity="0.85" />
          <circle cx="220" cy="80" r="6" fill="url(#flowerGold)" />
          <circle cx="205" cy="70" r="11" fill="#f9a8d4" fillOpacity="0.8" />
          <circle cx="235" cy="70" r="11" fill="#38bdf8" fillOpacity="0.75" />

          {/* Flower 3 - Center Top */}
          <circle cx="300" cy="60" r="18" fill="#ec4899" fillOpacity="0.9" />
          <circle cx="300" cy="60" r="7" fill="url(#flowerGold)" />
          <circle cx="282" cy="50" r="12" fill="#f472b6" fillOpacity="0.8" />
          <circle cx="318" cy="50" r="12" fill="#60a5fa" fillOpacity="0.8" />

          {/* Flower 4 - Center Right */}
          <circle cx="380" cy="80" r="16" fill="#fb7185" fillOpacity="0.85" />
          <circle cx="380" cy="80" r="6" fill="url(#flowerGold)" />
          <circle cx="365" cy="70" r="11" fill="#f472b6" fillOpacity="0.8" />
          <circle cx="395" cy="70" r="11" fill="#38bdf8" fillOpacity="0.75" />

          {/* Flower 5 - Right */}
          <circle cx="450" cy="110" r="14" fill="#f472b6" fillOpacity="0.85" />
          <circle cx="450" cy="110" r="5" fill="url(#flowerGold)" />
          <circle cx="435" cy="100" r="10" fill="#60a5fa" fillOpacity="0.7" />
          <circle cx="465" cy="100" r="10" fill="#fb7185" fillOpacity="0.75" />
        </g>

        {/* ------------------------------------------------------------- */}
        {/* ANATOMICAL HEART OUTLINE & VESSEL CONTOURS */}
        {/* ------------------------------------------------------------- */}
        <g id="heart-frame" className="pointer-events-none">
          {/* Main outer anatomical heart contour */}
          <path
            d="M 175 195 
               C 130 200, 105 240, 110 280
               C 70 330, 40 400, 40 470
               C 40 560, 80 660, 150 750
               C 210 820, 270 880, 290 895
               C 297 900, 303 900, 310 895
               C 330 880, 390 820, 450 750
               C 520 660, 560 560, 560 470
               C 560 390, 530 330, 480 300
               C 510 260, 490 200, 440 195
               C 410 195, 370 215, 350 240
               C 330 200, 290 180, 250 190
               Z"
            fill="none"
            stroke="#52525b"
            strokeWidth="3.5"
            strokeDasharray="6 4"
            className="opacity-40"
          />

          {/* Left Aortic Arch tube */}
          <path
            d="M 140 210 C 130 240, 140 270, 150 290"
            fill="none"
            stroke="#71717a"
            strokeWidth="2.5"
            className="opacity-50"
          />
          {/* Right Pulmonary Artery branch */}
          <path
            d="M 450 210 C 470 230, 480 260, 485 290"
            fill="none"
            stroke="#71717a"
            strokeWidth="2.5"
            className="opacity-50"
          />
        </g>

        {/* ------------------------------------------------------------- */}
        {/* THE 114 SURAH CELLS (Interactive compartments) */}
        {/* ------------------------------------------------------------- */}
        <g id="surah-cells">
          {QURAN_SURAHS.map((surah) => {
            const isMemorized = memorizedSet.has(surah.id);
            const isSelected = selectedSurahId === surah.id;
            const isHovered = hoveredSurah?.id === surah.id;

            const rx = surah.pos.x - surah.pos.w / 2;
            const ry = surah.pos.y - surah.pos.h / 2;
            const rw = surah.pos.w;
            const rh = surah.pos.h;

            return (
              <g
                key={surah.id}
                onClick={() => handleCellClick(surah)}
                onMouseEnter={() => setHoveredSurah(surah)}
                onMouseLeave={() => setHoveredSurah(null)}
                className="cursor-pointer transition-all duration-200"
                style={{
                  transformOrigin: `${surah.pos.x}px ${surah.pos.y}px`,
                  transform: isHovered || isSelected ? "scale(1.08)" : "scale(1)",
                }}
              >
                {/* Cell Background / Shape */}
                <rect
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  rx="7"
                  ry="7"
                  filter={isMemorized ? "url(#redGlow)" : "url(#cellShadow)"}
                  fill={
                    isMemorized
                      ? "url(#crimsonGradient)"
                      : isHovered
                      ? "#27272a"
                      : "#18181b"
                  }
                  stroke={
                    isSelected
                      ? "#fbbf24"
                      : isMemorized
                      ? "#fda4af"
                      : isHovered
                      ? "#a1a1aa"
                      : "#3f3f46"
                  }
                  strokeWidth={isSelected ? "2.5" : isMemorized ? "1.8" : "1"}
                  className="transition-colors duration-200"
                />

                {/* Subtle heartbeat pulse indicator for memorized */}
                {isMemorized && (
                  <circle
                    cx={surah.pos.x - rw / 2 + 8}
                    cy={surah.pos.y - rh / 2 + 8}
                    r="2.5"
                    fill="#ffffff"
                    className="animate-pulse"
                  />
                )}

                {/* Surah Name (Arabic Text) */}
                <text
                  x={surah.pos.x}
                  y={surah.pos.y + 4}
                  textAnchor="middle"
                  fill={isMemorized ? "#ffffff" : "#f4f4f5"}
                  fontSize={surah.name.length > 7 ? 10 : surah.name.length > 5 ? 11 : 12}
                  fontWeight={isMemorized ? "700" : "500"}
                  className="font-arabic pointer-events-none select-none transition-colors duration-200"
                  style={{
                    letterSpacing: "-0.2px",
                    textShadow: isMemorized ? "0 1px 3px rgba(0,0,0,0.6)" : "none",
                  }}
                >
                  {surah.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Tooltip when hovering over a Surah */}
      {hoveredSurah && (
        <div
          className="absolute z-30 pointer-events-none bg-zinc-900/95 border border-zinc-700/80 shadow-2xl backdrop-blur-md rounded-2xl p-3 text-right text-xs transition-all duration-150 transform -translate-x-1/2 -translate-y-full"
          style={{
            left: `${(hoveredSurah.pos.x / 600) * 100}%`,
            top: `${(hoveredSurah.pos.y / 930) * 100 - 4}%`,
          }}
        >
          <div className="flex items-center justify-between gap-3 mb-1">
            <span
              className={`px-1.5 py-0.5 rounded-md font-bold text-[10px] ${
                memorizedSet.has(hoveredSurah.id)
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {memorizedSet.has(hoveredSurah.id) ? "محفوظة ❤️" : "لم تُحفظ بعد"}
            </span>
            <span className="font-bold text-white text-sm">
              سورة {hoveredSurah.name} ({hoveredSurah.id})
            </span>
          </div>

          <div className="text-zinc-400 space-y-0.5 text-[11px]">
            <p>
              عدد الآيات: <span className="text-zinc-200 font-semibold">{hoveredSurah.ayahCount}</span> آية
            </p>
            <p>
              النوع: <span className="text-zinc-200 font-semibold">{hoveredSurah.type}</span> • الجزء:{" "}
              <span className="text-zinc-200 font-semibold">{hoveredSurah.juz}</span>
            </p>
          </div>

          <div className="mt-2 pt-1.5 border-t border-zinc-800 text-[10px] text-rose-400 font-medium">
            انقر للتبديل بين الحفظ والإفراغ 👆
          </div>
        </div>
      )}
    </div>
  );
}
