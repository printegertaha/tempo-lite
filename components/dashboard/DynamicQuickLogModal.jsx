"use client";

import { useState } from "react";
import {
  X,
  Zap,
  Search,
  Flame,
  Plus,
  Sparkles,
} from "lucide-react";
import QuickLogControls from "../entries/QuickLogControls";

export default function DynamicQuickLogModal({
  isOpen,
  onClose,
  trackers = [],
  selectedDate,
  onEntryLogged,
  onOpenCreateTracker,
  onOpenDetailedModal,
}) {
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const filteredTrackers = trackers.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">التدوين السريع</h2>
              <p className="text-[11px] text-zinc-500">
                تسجيل فوري وإنجاز بنقرة واحدة لمتعقباتك النشطة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-zinc-900 bg-zinc-950/50">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في العادات والمتعقبات..."
              className="w-full pr-10 pl-4 py-2 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
              autoFocus
            />
          </div>
        </div>

        {/* List of Trackers with Quick Controls */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredTrackers.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-xs text-zinc-400">
                {trackers.length === 0
                  ? "لا توجد متعقبات نشطة حتى الآن."
                  : "لا توجد نتائج مطابقة لبحثك."}
              </p>
              {trackers.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCreateTracker();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إنشاء عادة جديدة</span>
                </button>
              )}
            </div>
          ) : (
            filteredTrackers.map((tracker) => (
              <div
                key={tracker.id}
                className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition-colors space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300">
                      <Flame className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-100">{tracker.name}</h4>
                      {tracker.lifeArea && (
                        <span className="text-[10px] text-zinc-500">{tracker.lifeArea.name}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-400">
                    {tracker.metricType}
                  </span>
                </div>

                <div className="pt-2 border-t border-zinc-900">
                  <QuickLogControls
                    tracker={tracker}
                    localDate={selectedDate}
                    onLogged={() => {
                      if (onEntryLogged) onEntryLogged();
                    }}
                    onOpenDetailedModal={() => {
                      onClose();
                      if (onOpenDetailedModal) onOpenDetailedModal(tracker);
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

