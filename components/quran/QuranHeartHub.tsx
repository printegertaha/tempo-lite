"use client";

import React, { useState, useEffect, useMemo } from "react";
import { QURAN_SURAHS, TOTAL_QURAN_AYAHS, TOTAL_QURAN_SURAHS, Surah } from "@/lib/quranData";
import QuranHeartVisualizer from "./QuranHeartVisualizer";
import { soundManager } from "@/lib/audio";
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
  const [memorizedIds, setMemorizedIds] = useState<number[]>([]);
  const [selectedSurahId, setSelectedSurahId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "memorized" | "remaining" | "amma" | "tabarak">("all");
  const [viewMode, setViewMode] = useState<"vector" | "poster">("vector");
  const [isLoaded, setIsLoaded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const memorizedSet = useMemo(() => new Set(memorizedIds), [memorizedIds]);

  const toggleSurah = (id: number) => {
    setMemorizedIds((prev) => {
      const isAlready = prev.includes(id);
      const surah = QURAN_SURAHS.find((s) => s.id === id);
      if (isAlready) {
        showToast(`تم إزالة سورة ${surah?.name || ""} من المحفوظات`);
        return prev.filter((item) => item !== id);
      } else {
        showToast(`مبارك! حفظت سورة ${surah?.name || ""} بنجاح ❤️`);
        return [...prev, id];
      }
    });
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
    showToast(markAs ? "تم تحديد السور كمحفوظة بنجاح ✨" : "تم إلغاء تحديد السور");
  };

  const resetAll = () => {
    if (confirm("هل أنت متأكد من رغبتك في إعادة ضبط جميع السور المحفوظة في القلب؟")) {
      setMemorizedIds([]);
      showToast("تمت إعادة ضبط القلب");
    }
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

  return (
    <div className="min-h-screen bg-[#08090d] text-zinc-100 pb-24 selection:bg-rose-500/30">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-rose-600 to-red-700 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 text-sm font-bold animate-bounce border border-rose-400/40">
          <Heart className="w-4 h-4 fill-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative border-b border-zinc-800/80 bg-gradient-to-b from-rose-950/20 via-zinc-900/40 to-transparent py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold tracking-wide">
            <Heart className="w-3.5 h-3.5 fill-rose-400" />
            <span>متتبع حفظ القرآن الكريم بالقلب النابض</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            «أَلا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ»
          </h1>

          <p className="max-w-2xl mx-auto text-zinc-400 text-sm sm:text-base leading-relaxed">
            اجعل كل سورة تحفظها تنبض بالحياة داخل قلبك. كلما أتممت حفظ سورة، تلوّنت خانتها بالأحمر القاني ليفيض قلبك بنور كتاب الله.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto pt-6 text-right">
            {/* Metric 1 */}
            <div className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs text-zinc-400 font-medium">السور المحفوظة</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {stats.surahCount}
                </span>
                <span className="text-xs text-zinc-500">/ 114</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.surahPercentage}%` }}
                />
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs text-zinc-400 font-medium">الآيات المحفوظة</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {stats.ayahCount.toLocaleString("ar-EG")}
                </span>
                <span className="text-xs text-zinc-500">/ 6,236</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-red-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.ayahPercentage}%` }}
                />
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs text-zinc-400 font-medium">نسبة إحياء القلب</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-rose-400">
                  {stats.surahPercentage}%
                </span>
                <span className="text-xs text-zinc-500">مكتمل</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-rose-500 to-red-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.surahPercentage}%` }}
                />
              </div>
            </div>

            {/* Metric 4 */}
            <div className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs text-zinc-400 font-medium">ما يعادله من الأجزاء</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-amber-400">
                  {stats.ajzaEquivalent}
                </span>
                <span className="text-xs text-zinc-500">/ 30 جزء</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(parseFloat(stats.ajzaEquivalent) / 30) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Controls and View Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl">
            <button
              onClick={() => setViewMode("vector")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === "vector"
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              القلب التفاعلي الذكي (SVG)
            </button>
            <button
              onClick={() => setViewMode("poster")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === "poster"
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              اللوحة الأصلية المزخرفة
            </button>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const ammaIds = QURAN_SURAHS.filter((s) => s.id >= 78).map((s) => s.id);
                markBatch(ammaIds, true);
              }}
              className="px-3 py-1.5 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-xl transition-colors"
            >
              + حفظ جزء عمّ (37 سورة)
            </button>
            <button
              onClick={() => {
                const tabarakIds = QURAN_SURAHS.filter((s) => s.id >= 67 && s.id <= 77).map((s) => s.id);
                markBatch(tabarakIds, true);
              }}
              className="px-3 py-1.5 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-xl transition-colors"
            >
              + حفظ جزء تبارك (11 سورة)
            </button>
            <button
              onClick={resetAll}
              title="إعادة ضبط القلب"
              className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Heart Display Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Heart Column (7 Cols on desktop) */}
          <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-4 sm:p-6 backdrop-blur-sm">
            {viewMode === "vector" ? (
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-4 px-2">
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
            ) : (
              /* Original Poster View */
              <div className="relative text-center">
                <div className="text-xs text-zinc-400 mb-3 text-right">
                  اللوحة الفنية الأصلية لحفظ القرآن — انقر على أي سورة من القائمة الجانبية لتحديدها.
                </div>
                <div className="relative inline-block rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl max-w-full">
                  <img
                    src="/trackers/quran_heart.jpg"
                    alt="مخطط حفظ القرآن على شكل قلب"
                    className="w-full max-w-[500px] h-auto object-contain mx-auto"
                  />
                  {/* Glowing Overlay for Memorized Surahs */}
                  <div className="absolute inset-0 pointer-events-none">
                    {QURAN_SURAHS.map((s) => {
                      if (!memorizedSet.has(s.id)) return null;
                      return (
                        <div
                          key={s.id}
                          className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full bg-rose-500/80 shadow-lg shadow-rose-500 border border-white animate-pulse"
                          style={{
                            left: `${(s.pos.x / 600) * 100}%`,
                            top: `${(s.pos.y / 930) * 100}%`,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Surah List & Details Column (5 Cols on desktop) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Selected Surah Detail Card */}
            {selectedSurah ? (
              <div className="bg-gradient-to-br from-rose-950/30 to-zinc-900 border border-rose-500/30 rounded-3xl p-5 shadow-xl text-right">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => toggleSurah(selectedSurah.id)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
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
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                      activeFilter === tab.id
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-850"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Surah Cards List */}
              <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
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
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
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
      </div>
    </div>
  );
}
