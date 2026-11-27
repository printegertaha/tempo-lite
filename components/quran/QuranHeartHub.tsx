"use client";

import React, { useState, useEffect, useMemo, useRef, useId } from "react";
import { QURAN_SURAHS, TOTAL_QURAN_AYAHS, TOTAL_QURAN_SURAHS } from "@/lib/quranData";
import QuranHeartVisualizer from "./QuranHeartVisualizer";
import { soundManager } from "@/lib/audio";
import { useAthar } from "@/components/context/AtharContext";
import { useProgressRouter } from "@/hooks/useProgressRouter";
import { isIslamicFeatureVisible } from "@/lib/onboarding";
import {
  Heart,
  Sparkles,
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  RotateCcw,
  Download,
  Share2,
  Trophy,
  Check,
  X,
  Layers,
  ChevronDown,
  Info,
} from "lucide-react";

const STORAGE_KEY = "athar_quran_memorization_v1";

export default function QuranHeartHub() {
  const router = useProgressRouter();
  const { userPreferences } = (useAthar() || {}) as any;
  const showIslamic = isIslamicFeatureVisible(userPreferences);

  useEffect(() => {
    if (userPreferences?.onboardingCompleted && !showIslamic) {
      router.replace("/");
    }
  }, [userPreferences?.onboardingCompleted, showIslamic, router]);

  const [memorizedIds, setMemorizedIds] = useState<number[]>([]);
  const [selectedSurahId, setSelectedSurahId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "memorized" | "remaining" | "amma" | "tabarak">("all");
  const [isLoaded, setIsLoaded] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const resetDialogRef = useRef<HTMLDialogElement | null>(null);
  const resetTitleId = useId();
  const resetDescId = useId();

  useEffect(() => {
    const dialog = resetDialogRef.current;
    if (!dialog) return;
    if (resetConfirmOpen && !dialog.open) {
      dialog.showModal();
    } else if (!resetConfirmOpen && dialog.open) {
      dialog.close();
    }
  }, [resetConfirmOpen]);

  // Fallback for browsers without native closedby="any" (e.g. Safari)
  useEffect(() => {
    const dialog = resetDialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    const handlePointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
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
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setMemorizedIds(parsed);
          }
        }
      } catch (e) {
        console.error("Failed to load Quran memorization state", e);
      }
      setIsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Save to localStorage whenever memorizedIds changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memorizedIds));
    } catch (e) {
      console.error("Failed to persist Quran memorization state", e);
    }
  }, [memorizedIds, isLoaded]);

  const memorizedSet = useMemo(() => new Set(memorizedIds), [memorizedIds]);

  const toggleSurah = (id: number) => {
    setMemorizedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const markBatch = (ids: number[], markAs: boolean) => {
    setMemorizedIds((prev) => {
      const curSet = new Set(prev);
      ids.forEach((id) => {
        if (markAs) curSet.add(id);
        else curSet.delete(id);
      });
      return Array.from(curSet);
    });
    soundManager.playTaskDone();
  };

  const resetAll = () => {
    setResetConfirmOpen(true);
  };

  const confirmResetAll = () => {
    setMemorizedIds([]);
    setResetConfirmOpen(false);
  };

  // Calculations
  const stats = useMemo(() => {
    const memorizedSurahs = QURAN_SURAHS.filter((s) => memorizedSet.has(s.id));
    const memorizedAyahs = memorizedSurahs.reduce((sum, s) => sum + s.ayahCount, 0);
    const surahPercentage = Math.round((memorizedSurahs.length / TOTAL_QURAN_SURAHS) * 100);
    const ayahPercentage = Math.round((memorizedAyahs / TOTAL_QURAN_AYAHS) * 100);
    const ajzaEquivalent = ((memorizedAyahs / TOTAL_QURAN_AYAHS) * 30).toFixed(1);

    return {
      surahCount: memorizedSurahs.length,
      ayahCount: memorizedAyahs,
      surahPercentage,
      ayahPercentage,
      ajzaEquivalent,
    };
  }, [memorizedSet]);

  // Filtered Surahs List
  const filteredSurahs = useMemo(() => {
    return QURAN_SURAHS.filter((s) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        s.name.includes(searchQuery.trim()) ||
        s.id.toString() === searchQuery.trim();

      if (!matchesSearch) return false;

      if (activeFilter === "memorized") return memorizedSet.has(s.id);
      if (activeFilter === "remaining") return !memorizedSet.has(s.id);
      if (activeFilter === "amma") return s.id >= 78;
      if (activeFilter === "tabarak") return s.id >= 67 && s.id <= 77;
      return true;
    });
  }, [searchQuery, activeFilter, memorizedSet]);

  const selectedSurah = useMemo(() => {
    return QURAN_SURAHS.find((s) => s.id === selectedSurahId) || null;
  }, [selectedSurahId]);

  const ammaIds = useMemo(
    () => QURAN_SURAHS.filter((s) => s.id >= 78).map((s) => s.id),
    []
  );
  const tabarakIds = useMemo(
    () => QURAN_SURAHS.filter((s) => s.id >= 67 && s.id <= 77).map((s) => s.id),
    []
  );
  const isAmmaDone = useMemo(
    () => ammaIds.every((id) => memorizedSet.has(id)),
    [ammaIds, memorizedSet]
  );
  const isTabarakDone = useMemo(
    () => tabarakIds.every((id) => memorizedSet.has(id)),
    [tabarakIds, memorizedSet]
  );

  const metricCards = [
    {
      label: "السور المحفوظة",
      value: stats.surahCount,
      valueClass: "text-white",
      suffix: "/ 114",
      barClass: "bg-rose-500",
      width: `${stats.surahPercentage}%`,
    },
    {
      label: "الآيات المحفوظة",
      value: stats.ayahCount.toLocaleString("ar-EG"),
      valueClass: "text-white",
      suffix: "/ 6,236",
      barClass: "bg-red-500",
      width: `${stats.ayahPercentage}%`,
    },
    {
      label: "نسبة إحياء القلب",
      value: `${stats.surahPercentage}%`,
      valueClass: "text-rose-400",
      suffix: "مكتمل",
      barClass: "bg-gradient-to-r from-rose-500 to-red-600",
      width: `${stats.surahPercentage}%`,
    },
    {
      label: "ما يعادله من الأجزاء",
      value: stats.ajzaEquivalent,
      valueClass: "text-amber-400",
      suffix: "/ 30 جزء",
      barClass: "bg-amber-500",
      width: `${(parseFloat(stats.ajzaEquivalent) / 30) * 100}%`,
    },
  ];

  const renderQuickShortcuts = (extraClass = "") => (
    <div className={`flex flex-wrap items-center gap-2 ${extraClass}`}>
      <button
        type="button"
        onClick={() => markBatch(ammaIds, !isAmmaDone)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-xl transition-colors cursor-pointer ${
          isAmmaDone
            ? "bg-rose-600/20 border-rose-500/40 text-rose-200 hover:bg-rose-600/30"
            : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700 text-zinc-300"
        }`}
      >
        {isAmmaDone && <Check className="w-3.5 h-3.5 text-rose-400" />}
        <span>
          {isAmmaDone ? "تم حفظ جزء عمّ (37 سورة)" : "+ حفظ جزء عمّ (37 سورة)"}
        </span>
      </button>
      <button
        type="button"
        onClick={() => markBatch(tabarakIds, !isTabarakDone)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-xl transition-colors cursor-pointer ${
          isTabarakDone
            ? "bg-rose-600/20 border-rose-500/40 text-rose-200 hover:bg-rose-600/30"
            : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700 text-zinc-300"
        }`}
      >
        {isTabarakDone && <Check className="w-3.5 h-3.5 text-rose-400" />}
        <span>
          {isTabarakDone ? "تم حفظ جزء تبارك (11 سورة)" : "+ حفظ جزء تبارك (11 سورة)"}
        </span>
      </button>
      <button
        type="button"
        onClick={resetAll}
        title="إعادة ضبط القلب"
        className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 rounded-xl transition-colors cursor-pointer"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );

  if (userPreferences?.onboardingCompleted && !showIslamic) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#08090d] text-zinc-100 pb-24 selection:bg-rose-500/30">
      {/* Compact Hero Header */}
      <div className="relative border-b border-zinc-800/80 bg-gradient-to-b from-rose-950/20 via-zinc-900/40 to-transparent py-5 lg:py-4 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold tracking-wide">
            <Heart className="w-3.5 h-3.5 fill-rose-400" />
            <span>متتبع حفظ القرآن الكريم بالقلب النابض</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            « عالج روحك بالقرآن »
          </h1>

          <p className="max-w-2xl mx-auto text-zinc-400 text-xs sm:text-sm leading-relaxed">
            اجعل كل سورة تحفظها تنبض بالحياة داخل قلبك. كلما أتممت حفظ سورة، تلوّنت خانتها بالأحمر القاني ليفيض قلبك بنور كتاب الله.
          </p>

          {/* Mobile/Tablet Horizontal Scroll Stats Bar with visible slim scrollbar */}
          <div className="lg:hidden pt-3">
            <div className="flex sm:grid sm:grid-cols-4 gap-3 max-w-4xl mx-auto text-right overflow-x-auto sm:overflow-visible horizontal-scroll-indicator snap-x snap-proximity pb-2.5">
              {metricCards.map((m) => (
                <div
                  key={m.label}
                  className="shrink-0 w-[165px] sm:w-auto snap-start bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-3.5 flex flex-col justify-between"
                >
                  <span className="text-xs text-zinc-400 font-medium">{m.label}</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className={`text-2xl font-black ${m.valueClass}`}>
                      {m.value}
                    </span>
                    <span className="text-xs text-zinc-500">{m.suffix}</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div
                      className={`${m.barClass} h-full rounded-full transition-all duration-500`}
                      style={{ width: m.width }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 lg:py-6 space-y-8">
        {/* Mobile Quick Shortcuts */}
        {renderQuickShortcuts("lg:hidden justify-end")}

        {/* Top Row on Desktop: Vertical Stats on Right (4 cols) + Heart on Left (8 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Desktop Vertical Stats Column (Right in RTL) */}
          <div className="hidden lg:flex lg:col-span-4 flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 text-right">
              {metricCards.map((m) => (
                <div
                  key={m.label}
                  className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-3.5 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-400 font-medium">{m.label}</span>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl font-black ${m.valueClass}`}>
                        {m.value}
                      </span>
                      <span className="text-[11px] text-zinc-500">{m.suffix}</span>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div
                      className={`${m.barClass} h-full rounded-full transition-all duration-500`}
                      style={{ width: m.width }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Quick Shortcuts right below vertical stats */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-3.5 space-y-2.5 text-right">
              <span className="text-[11px] font-semibold text-zinc-400 block">
                اختصارات الحفظ السريعة
              </span>
              {renderQuickShortcuts("justify-start")}
            </div>
          </div>

          {/* Heart Column (Left of Stats on Desktop, Full Width on Mobile) */}
          <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-4 sm:p-5 backdrop-blur-sm">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400 mb-3 px-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-rose-600 border border-rose-400" />
                  <span>سورة محفوظة (أحمر)</span>
                  <span className="w-3 h-3 rounded-md bg-zinc-800 border border-zinc-700 mr-2" />
                  <span>سورة لم تُحفظ بعد</span>
                </div>
                <span className="text-[11px] text-zinc-500">انقر على أي سورة لتلوينها أو تفريغها</span>
              </div>

              <QuranHeartVisualizer
                memorizedIds={memorizedIds}
                onToggleSurah={toggleSurah}
                selectedSurahId={selectedSurahId}
                onSelectSurah={setSelectedSurahId}
              />
            </div>
          </div>
        </div>

        {/* Bottom Section: Surah Index & Selected Surah Details */}
        <div className="space-y-4">
          {/* Selected Surah Detail Card */}
          {selectedSurah ? (
            <div className="bg-gradient-to-br from-rose-950/30 to-zinc-900 border border-rose-500/30 rounded-3xl p-5 shadow-xl text-right">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => toggleSurah(selectedSurah.id)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    memorizedSet.has(selectedSurah.id)
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-600/40"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {memorizedSet.has(selectedSurah.id) ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>محفوظة في القلب</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-3.5 h-3.5" />
                      <span>تحديد كمحفوظة</span>
                    </>
                  )}
                </button>
                <div className="text-right">
                  <span className="text-xs text-rose-400 font-bold">سورة رقم {selectedSurah.id}</span>
                  <h3 className="text-xl font-black text-white">سورة {selectedSurah.name}</h3>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs bg-zinc-950/50 rounded-2xl p-3 border border-zinc-800">
                <div>
                  <span className="text-zinc-500 block text-[10px]">الآيات</span>
                  <span className="font-bold text-zinc-200">{selectedSurah.ayahCount}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">النزول</span>
                  <span className="font-bold text-zinc-200">{selectedSurah.type}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">الجزء</span>
                  <span className="font-bold text-zinc-200">{selectedSurah.juz}</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Search and Filters */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4 text-right">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium">
                المعروض: {filteredSurahs.length} سورة
              </span>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>فهرس السور القرآني</span>
                <BookOpen className="w-4 h-4 text-rose-400" />
              </h3>
            </div>

            {/* Search Box */}
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث باسم السورة (كالكهف، يس، الملك)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-2.5 pr-10 pl-4 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-rose-500"
              />
              <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-3 top-3 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "all", label: "الكل (114)" },
                { id: "memorized", label: `المحفوظة (${stats.surahCount})` },
                { id: "remaining", label: `المتبقية (${114 - stats.surahCount})` },
                { id: "amma", label: "جزء عمّ" },
                { id: "tabarak", label: "جزء تبارك" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    activeFilter === tab.id
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-850"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable Surah Cards Grid */}
            <div className="max-h-[420px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pr-1 custom-scrollbar">
              {filteredSurahs.map((surah) => {
                const isDone = memorizedSet.has(surah.id);
                const isSelected = selectedSurahId === surah.id;

                return (
                  <div
                    key={surah.id}
                    onClick={() => setSelectedSurahId(surah.id)}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-zinc-800/80 border-rose-500/50 shadow-md"
                        : "bg-zinc-950/60 hover:bg-zinc-900/60 border-zinc-850"
                    }`}
                  >
                    {/* Checkbox toggle button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSurah(surah.id);
                      }}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                        isDone
                          ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                          : "bg-zinc-850 text-zinc-600 hover:text-zinc-400 border border-zinc-750"
                      }`}
                    >
                      {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : null}
                    </button>

                    {/* Info */}
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-zinc-500 font-mono">#{surah.id}</span>
                        <span className={`text-sm font-bold ${isDone ? "text-rose-300" : "text-white"}`}>
                          سورة {surah.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500">
                        {surah.ayahCount} آية • {surah.type} • الجزء {surah.juz}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Reset Confirmation Dialog */}
      <dialog
        ref={resetDialogRef}
        aria-labelledby={resetTitleId}
        aria-describedby={resetDescId}
        {...({ closedby: "any" } as Record<string, string>)}
        onClose={() => {
          if (resetDialogRef.current) resetDialogRef.current.returnValue = "";
          setResetConfirmOpen(false);
        }}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-3xl bg-[#0c0e17] border border-rose-500/30 text-zinc-100 shadow-2xl shadow-black/80 p-6 backdrop:bg-black/75 backdrop:backdrop-blur-sm"
      >
        <div className="space-y-4 text-right">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h1 id={resetTitleId} className="text-base font-bold text-zinc-100">
                إعادة ضبط القلب
              </h1>
            </div>

            <button
              type="button"
              onClick={() => resetDialogRef.current?.close()}
              aria-label="إغلاق"
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p id={resetDescId} className="text-xs leading-relaxed text-zinc-400">
            هل أنت متأكد من رغبتك في إعادة ضبط جميع السور المحفوظة في القلب؟ سيتم مسح تحديد جميع السور المحفوظة.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              autoFocus
              onClick={() => resetDialogRef.current?.close()}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/70 text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={confirmResetAll}
              className="min-h-[40px] flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>تأكيد إعادة الضبط</span>
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
