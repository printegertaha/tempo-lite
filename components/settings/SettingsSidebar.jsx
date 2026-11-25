"use client";

import { useEffect, useRef } from "react";
import {
  User,
  Layers,
  MapPin,
  Flame,
  Sliders,
  ShieldCheck,
  ChevronLeft,
} from "lucide-react";

/**
 * Configuration of settings sections shown in both desktop sidebar and mobile pill bar.
 */
export const SETTINGS_SECTIONS = [
  {
    id: "profile",
    label: "الملف الشخصي",
    description: "الاسم، الصورة، والراتب الشهري",
    group: "الحساب والهوية",
    icon: User,
    accentClass: "text-violet-400",
    badgeBgClass: "bg-violet-500/15 border-violet-500/30",
    supportsSave: true,
  },
  {
    id: "life-areas",
    label: "مجالات الحياة",
    description: "تنظيم المسارات والأولويات",
    group: "الحساب والهوية",
    icon: Layers,
    accentClass: "text-indigo-400",
    badgeBgClass: "bg-indigo-500/15 border-indigo-500/30",
    supportsSave: false,
  },
  {
    id: "localization",
    label: "الموقع والعملة",
    description: "الدولة، المحافظة، التوقيت، والعملة",
    group: "التفضيلات والتخصيص",
    icon: MapPin,
    accentClass: "text-emerald-400",
    badgeBgClass: "bg-emerald-500/15 border-emerald-500/30",
    supportsSave: true,
  },
  {
    id: "prayers",
    label: "تتبع الصلوات",
    description: "المواقيت والهيئة الحسابية",
    group: "التفضيلات والتخصيص",
    icon: Flame,
    accentClass: "text-amber-400",
    badgeBgClass: "bg-amber-500/15 border-amber-500/30",
    supportsSave: true,
  },
  {
    id: "preferences",
    label: "الواجهة والتنبيهات",
    description: "التذكيرات والأصوات والحكمة اليومية",
    group: "التفضيلات والتخصيص",
    icon: Sliders,
    accentClass: "text-cyan-400",
    badgeBgClass: "bg-cyan-500/15 border-cyan-500/30",
    supportsSave: true,
  },
  {
    id: "data",
    label: "البيانات والنسخ",
    description: "التصدير، الاستعادة، وإعادة الضبط",
    group: "النظام والأمان",
    icon: ShieldCheck,
    accentClass: "text-rose-400",
    badgeBgClass: "bg-rose-500/15 border-rose-500/30",
    supportsSave: false,
  },
];

export const VALID_SECTION_IDS = new Set(SETTINGS_SECTIONS.map((s) => s.id));

/**
 * Responsive navigation sidebar (vertical sticky panel on desktop, single-row horizontal scroller on mobile).
 */
export default function SettingsSidebar({
  activeSection,
  onSelectSection,
  profile,
  isCloudUser,
}) {
  const mobileItemRefs = useRef({});

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

  const groups = Array.from(new Set(SETTINGS_SECTIONS.map((s) => s.group)));
  const avatarSrc = profile?.image;

  return (
    <>
      {/* Mobile / Tablet Single-Row Horizontal Navigation */}
      <nav
        aria-label="أقسام الإعدادات"
        className="lg:hidden -mx-1 px-1 pb-1 overflow-x-auto no-scrollbar"
      >
        <div className="flex flex-nowrap items-center gap-2 min-w-max">
          {SETTINGS_SECTIONS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  mobileItemRefs.current[item.id] = el;
                }}
                type="button"
                onClick={() => onSelectSection(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`relative shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-violet-600/20 border-violet-500/60 text-zinc-100 shadow-lg shadow-violet-950/40"
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
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-violet-400"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-[280px] shrink-0">
        <div className="sticky top-24 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl p-4 space-y-5 backdrop-blur-xl">
          {/* Compact Identity Mini Card */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800/80">
            {avatarSrc ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={avatarSrc}
                alt={profile?.name || "المستخدم"}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-xl object-cover border border-violet-500/30 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white font-black text-base shrink-0 border border-violet-400/30">
                {profile?.name?.charAt(0) || "أ"}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-zinc-100 truncate" suppressHydrationWarning>
                {profile?.name || "مستخدم أثـر"}
              </p>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5" suppressHydrationWarning>
                {isCloudUser ? "حساب سحابي متزامن" : "وضع التفضيلات المحلية"}
              </p>
            </div>
          </div>

          {/* Grouped Vertical Navigation */}
          <nav aria-label="أقسام الإعدادات" className="space-y-4">
            {groups.map((groupTitle) => {
              const items = SETTINGS_SECTIONS.filter((s) => s.group === groupTitle);
              return (
                <div key={groupTitle} className="space-y-1.5">
                  <div className="px-2.5 text-[11px] font-bold text-zinc-500">
                    {groupTitle}
                  </div>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelectSection(item.id)}
                          aria-current={isActive ? "page" : undefined}
                          className={`relative w-full flex items-center gap-3 p-2.5 rounded-2xl border text-right transition-all cursor-pointer group ${
                            isActive
                              ? "bg-violet-600/15 border-violet-500/45 text-zinc-100 shadow-md shadow-violet-950/30"
                              : "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:border-zinc-800/80 hover:text-zinc-200"
                          }`}
                        >
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="w-1 self-stretch rounded-full bg-violet-400 shrink-0"
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
                                ? "text-violet-300 opacity-100"
                                : "text-zinc-600 opacity-0 group-hover:opacity-100"
                            }`}
                          />
                        </button>
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
