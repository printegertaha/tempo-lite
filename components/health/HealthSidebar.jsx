"use client";

import { useEffect, useRef } from "react";
import {
  Utensils,
  Dumbbell,
  Droplets,
  HeartPulse,
  ChevronLeft,
  Calculator,
  CalendarRange,
  ClipboardCheck,
  Scale,
  Activity,
} from "lucide-react";

export const HEALTH_SECTIONS = [
  {
    id: "nutrition",
    label: "التغذية والوجبات",
    description: "الأهداف، النظام الغذائي، ومتابعة الأكل",
    group: "التغذية والترطيب",
    icon: Utensils,
    accentClass: "text-teal-400",
    badgeBgClass: "bg-teal-500/15 border-teal-500/30",
    defaultSub: "log",
    subSections: [
      {
        id: "targets",
        label: "سعراتي وأهدافي",
        icon: Calculator,
      },
      {
        id: "diet",
        label: "نظامي الغذائي",
        icon: CalendarRange,
      },
      {
        id: "log",
        label: "متابعة وتسجيل الأكل",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    id: "water",
    label: "شرب المياه",
    description: "تسجيل السوائل ومتابعة الترطيب",
    group: "التغذية والترطيب",
    icon: Droplets,
    accentClass: "text-sky-400",
    badgeBgClass: "bg-sky-500/15 border-sky-500/30",
    defaultSub: null,
    subSections: [],
  },
  {
    id: "fitness",
    label: "اللياقة البدنية",
    description: "التمارين والجلسات وقياسات الوزن",
    group: "النشاط البدني",
    icon: Dumbbell,
    accentClass: "text-orange-400",
    badgeBgClass: "bg-orange-500/15 border-orange-500/30",
    defaultSub: "workouts",
    subSections: [
      {
        id: "workouts",
        label: "التمارين والجلسات",
        icon: Activity,
      },
      {
        id: "weight",
        label: "قياسات الوزن",
        icon: Scale,
      },
    ],
  },
];

export const VALID_HEALTH_SECTION_IDS = new Set(HEALTH_SECTIONS.map((s) => s.id));

export function resolveHealthSubSection(sectionId, rawSub) {
  const sec = HEALTH_SECTIONS.find((s) => s.id === sectionId);
  if (!sec || !sec.subSections?.length) return null;
  if (rawSub && sec.subSections.some((sub) => sub.id === rawSub)) {
    return rawSub;
  }
  return sec.defaultSub || sec.subSections[0].id;
}

/**
 * Responsive navigation sidebar for Health Hub with expandable sub-sections:
 * - Mobile/Tablet: primary horizontal scroller + secondary sub-section horizontal scroller
 * - Desktop: sticky vertical sidebar with nested sub-items under active major section
 */
export default function HealthSidebar({
  activeSection,
  activeSubSection,
  onSelectSection,
  summaryText = "التغذية واللياقة والمياه",
}) {
  const mobileItemRefs = useRef({});
  const activeMeta = HEALTH_SECTIONS.find((s) => s.id === activeSection);
  const activeSubs = activeMeta?.subSections || [];

  useEffect(() => {
    const activeEl = mobileItemRefs.current[activeSection];
    if (activeEl && typeof activeEl.scrollIntoView === "function") {
      activeEl.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "smooth",
      });
    }
  }, [activeSection]);

  const groups = Array.from(new Set(HEALTH_SECTIONS.map((s) => s.group)));

  return (
    <>
      {/* Mobile / Tablet Horizontal Navigation (Primary + Sub-sections) */}
      <div className="lg:hidden space-y-2">
        <nav
          aria-label="أقسام الصحة الرئيسية"
          className="-mx-1 px-1 pb-1 overflow-x-auto no-scrollbar"
        >
          <div className="flex flex-nowrap items-center gap-2 min-w-max">
            {HEALTH_SECTIONS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    mobileItemRefs.current[item.id] = el;
                  }}
                  type="button"
                  onClick={() => onSelectSection(item.id, item.defaultSub)}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-teal-600/20 border-teal-500/60 text-zinc-100 shadow-lg shadow-teal-950/40"
                      : "bg-[#0c0e17]/90 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? item.accentClass : "text-zinc-400"
                    }`}
                  />
                  <span className="whitespace-nowrap">{item.label}</span>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-teal-400"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {activeSubs.length > 0 && (
          <nav
            aria-label="الأقسام الفرعية"
            className="-mx-1 px-1 pb-1 overflow-x-auto no-scrollbar"
          >
            <div className="flex flex-nowrap items-center gap-1.5 min-w-max">
              {activeSubs.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = activeSubSection === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => onSelectSection(activeSection, sub.id)}
                    aria-current={isSubActive ? "page" : undefined}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                      isSubActive
                        ? "bg-zinc-800 border-teal-500/50 text-teal-200"
                        : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <SubIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="whitespace-nowrap">{sub.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </div>

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-[280px] shrink-0">
        <div className="sticky top-24 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl p-4 space-y-5 backdrop-blur-xl">
          {/* Compact Health Hub Mini Card */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800/80">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center text-white shrink-0 border border-teal-400/30">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-zinc-100 truncate">
                منظومة الصحة
              </p>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                {summaryText}
              </p>
            </div>
          </div>

          {/* Grouped Vertical Navigation with Nested Sub-Sections */}
          <nav aria-label="أقسام الصحة" className="space-y-4">
            {groups.map((groupTitle) => {
              const items = HEALTH_SECTIONS.filter((s) => s.group === groupTitle);
              return (
                <div key={groupTitle} className="space-y-1.5">
                  <div className="px-2.5 text-[11px] font-bold text-zinc-500">
                    {groupTitle}
                  </div>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.id;
                      const subs = item.subSections || [];
                      return (
                        <div key={item.id} className="space-y-1">
                          <button
                            type="button"
                            onClick={() => onSelectSection(item.id, item.defaultSub)}
                            aria-current={isActive && subs.length === 0 ? "page" : undefined}
                            className={`relative w-full flex items-center gap-3 p-2.5 rounded-2xl border text-right transition-all cursor-pointer group ${
                              isActive
                                ? "bg-teal-600/15 border-teal-500/45 text-zinc-100 shadow-md shadow-teal-950/30"
                                : "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:border-zinc-800/80 hover:text-zinc-200"
                            }`}
                          >
                            {isActive && (
                              <span
                                aria-hidden="true"
                                className="w-1 self-stretch rounded-full bg-teal-400 shrink-0"
                              />
                            )}
                            <div
                              className={`flex items-center justify-center w-9 h-9 rounded-xl border shrink-0 transition-colors ${
                                isActive
                                  ? `${item.badgeBgClass} ${item.accentClass}`
                                  : "bg-zinc-900/80 border-zinc-800 text-zinc-400 group-hover:text-zinc-200"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold truncate">
                                {item.label}
                              </div>
                              <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                                {item.description}
                              </div>
                            </div>
                            <ChevronLeft
                              className={`w-3.5 h-3.5 shrink-0 transition-opacity ${
                                isActive
                                  ? "text-teal-300 opacity-100"
                                  : "text-zinc-600 opacity-0 group-hover:opacity-100"
                              }`}
                            />
                          </button>

                          {/* Expanded Sub-sections when parent is active */}
                          {isActive && subs.length > 0 && (
                            <div className="mr-5 pr-3 border-r border-zinc-800 space-y-1 py-1">
                              {subs.map((sub) => {
                                const SubIcon = sub.icon;
                                const isSubActive = activeSubSection === sub.id;
                                return (
                                  <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => onSelectSection(item.id, sub.id)}
                                    aria-current={isSubActive ? "page" : undefined}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                      isSubActive
                                        ? "bg-zinc-800/90 text-teal-300 border border-teal-500/30"
                                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent"
                                    }`}
                                  >
                                    <SubIcon className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{sub.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
