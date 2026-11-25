"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Check, X } from "lucide-react";
import { normalizeSearchText } from "@/lib/localization";

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  searchText?: string;
}

interface SearchableComboboxProps {
  id?: string;
  label?: string;
  value: string;
  options: ComboboxOption[];
  onChange: (value: string, option: ComboboxOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  maxVisibleOptions?: number;
  className?: string;
  renderOption?: (option: ComboboxOption, isSelected: boolean) => React.ReactNode;
}

export default function SearchableCombobox({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = "اختر...",
  searchPlaceholder = "ابحث هنا...",
  emptyText = "لا توجد نتائج مطابقة",
  disabled = false,
  maxVisibleOptions = 80,
  className = "",
  renderOption,
}: SearchableComboboxProps) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const listboxId = `${controlId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) || null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = normalizeSearchText(query);
    if (!q) return options.slice(0, maxVisibleOptions);

    const matched = options.filter((opt) => {
      const haystack = normalizeSearchText(
        `${opt.label} ${opt.sublabel || ""} ${opt.badge || ""} ${opt.value} ${opt.searchText || ""}`
      );
      return haystack.includes(q);
    });
    return matched.slice(0, maxVisibleOptions);
  }, [options, query, maxVisibleOptions]);

  // Close on outside click or touch
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [isOpen]);

  const openCombobox = () => {
    if (disabled) return;
    setQuery("");
    const selectedIdx = options.findIndex((o) => o.value === value);
    setActiveIndex(selectedIdx >= 0 && selectedIdx < maxVisibleOptions ? selectedIdx : 0);
    setIsOpen(true);
  };

  // Focus search input cleanly when opened
  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-option-idx="${activeIndex}"]`);
    if (el && typeof (el as HTMLElement).scrollIntoView === "function") {
      (el as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, isOpen]);

  const handleSelect = (opt: ComboboxOption) => {
    onChange(opt.value, opt);
    setIsOpen(false);
    setQuery("");
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openCombobox();
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        filteredOptions.length === 0 ? 0 : (prev + 1) % filteredOptions.length
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        filteredOptions.length === 0
          ? 0
          : (prev - 1 + filteredOptions.length) % filteredOptions.length
      );
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const chosen = filteredOptions[activeIndex];
      if (chosen) handleSelect(chosen);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      {label && (
        <label htmlFor={controlId} className="block text-xs text-slate-400 font-bold mb-2">
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        disabled={disabled}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => (isOpen ? setIsOpen(false) : openCombobox())}
        className={`w-full flex items-center justify-between gap-2 bg-[#0f111a] border ${
          isOpen ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-white/10 hover:border-white/20"
        } rounded-xl px-4 py-3 text-right transition-all ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption ? (
            <>
              <span className="text-sm font-semibold text-white truncate">
                {selectedOption.label}
              </span>
              {selectedOption.sublabel && (
                <span className="text-xs text-slate-400 truncate hidden sm:inline">
                  {selectedOption.sublabel}
                </span>
              )}
              {selectedOption.badge && (
                <span className="shrink-0 text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-slate-500 truncate">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
            isOpen ? "rotate-180 text-indigo-400" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute z-50 mt-2 w-full rounded-2xl bg-[#131724] border border-white/15 shadow-2xl overflow-hidden"
          style={{ minWidth: "240px" }}
        >
          <div className="p-2.5 border-b border-white/10 bg-[#0f111a]/80">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="w-full bg-[#181c2b] border border-white/10 rounded-xl pr-9 pl-8 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setActiveIndex(0);
                    searchInputRef.current?.focus();
                  }}
                  aria-label="مسح البحث"
                  className="absolute left-2.5 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            className="max-h-64 overflow-y-auto py-1.5 divide-y divide-white/[0.03]"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400">{emptyText}</div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === activeIndex;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-option-idx={idx}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-right px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                      isHighlighted
                        ? "bg-indigo-600/25 text-white"
                        : isSelected
                          ? "bg-indigo-500/10 text-indigo-200"
                          : "text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    {renderOption ? (
                      renderOption(opt, isSelected)
                    ) : (
                      <div className="flex items-center justify-between gap-2 w-full min-w-0">
                        <div className="min-w-0 flex-1 text-right">
                          <div className="text-sm font-semibold truncate">{opt.label}</div>
                          {opt.sublabel && (
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              {opt.sublabel}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {opt.badge && (
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                              {opt.badge}
                            </span>
                          )}
                          {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
