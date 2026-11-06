"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Flame,
  LayoutDashboard,
  Calendar as CalendarIcon,
  BarChart3,
  Settings,
  Plus,
  BookMarked,
  Dumbbell,
  Droplets,
  Wallet,
  Menu,
  X,
  ChevronDown,
  LogOut,
  User as UserIcon,
  CheckSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Compass,
} from "lucide-react";
import { useAthar } from "./context/AtharContext";
import { useSession, authClient } from "@/lib/auth-client";
import GoogleSignInButton from "./auth/GoogleSignInButton";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { openQuickLog } = useAthar();
  const { data: sessionData, isPending } = useSession();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const moreDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

  // Close menus on path change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreDropdownOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle outside clicks for dropdowns
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        moreDropdownRef.current &&
        !moreDropdownRef.current.contains(e.target)
      ) {
        setMoreDropdownOpen(false);
      }
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(e.target)
      ) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isAuthenticated = !!sessionData?.user;

  const primaryLinks = [
    { href: "/", label: "الرئيسية", icon: LayoutDashboard },
    { href: "/habits", label: "العادات", icon: Flame },
    { href: "/tasks", label: "المهام", icon: CheckSquare },
    { href: "/journal", label: "اليوميات", icon: BookMarked },
    { href: "/calendar", label: "التقويم", icon: CalendarIcon },
    { href: "/analytics", label: "التحليلات", icon: BarChart3 },
  ];

  const moreLinks = [
    {
      href: "/abstinence",
      label: "الامتناع والتعافي",
      desc: "تتبع مدة التوقف بدقة وإدارة الانتكاسات",
      icon: ShieldCheck,
      accent: "text-rose-400 group-hover:bg-rose-500/10",
    },
    {
      href: "/gym",
      label: "الجيم واللياقة",
      desc: "تمارين المقاومة والأنشطة الرياضية",
      icon: Dumbbell,
      accent: "text-amber-400 group-hover:bg-amber-500/10",
    },
    {
      href: "/nutrition",
      label: "التغذية والماء",
      desc: "استهلاك السوائل والوجبات اليومية",
      icon: Droplets,
      accent: "text-sky-400 group-hover:bg-sky-500/10",
    },
    {
      href: "/expenses",
      label: "المصاريف والميزانية",
      desc: "ضبط الإنفاق ومتابعة الالتزامات",
      icon: Wallet,
      accent: "text-emerald-400 group-hover:bg-emerald-500/10",
    },
    {
      href: "/landing",
      label: "عن منظومة أثـر",
      desc: "فلسفة البناء وأركان الإنتاجية",
      icon: Compass,
      accent: "text-violet-400 group-hover:bg-violet-500/10",
    },
  ];

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      setUserDropdownOpen(false);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  // ---------------------------------------------------------------------------
  // AUTH PAGES MINIMAL NAVBAR
  // ---------------------------------------------------------------------------
  if (isAuthPage) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-zinc-850/80 bg-[#08090d]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Brand Logo */}
            <Link
              href="/"
              className="flex items-center gap-3 group focus:outline-none"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg shadow-violet-600/30 group-hover:shadow-violet-600/50 group-hover:scale-105 transition-all duration-200">
                <Flame className="w-5 h-5 fill-white" />
              </span>
              <div className="text-right">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black text-zinc-100 tracking-tight group-hover:text-white transition-colors">
                    أثـر
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/25 text-violet-300">
                    ATHAR
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 block -mt-0.5">
                  منظومة إتقان العادات وعمارة الوقت
                </span>
              </div>
            </Link>

            {/* Back link */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة للرئيسية</span>
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN APPLICATION NAVBAR
  // ---------------------------------------------------------------------------
  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          scrolled
            ? "border-b border-zinc-800/80 bg-[#08090d]/95 backdrop-blur-2xl shadow-xl shadow-black/40"
            : "border-b border-zinc-800/40 bg-[#08090d]/80 backdrop-blur-xl"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* 1. Right side (Brand & Identity) */}
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="flex items-center gap-3 group focus:outline-none"
              >
                <span className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg shadow-violet-600/30 group-hover:shadow-violet-600/50 group-hover:scale-105 transition-all duration-200">
                  <Flame className="w-5 h-5 fill-white" />
                </span>
                <div className="text-right">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg sm:text-xl font-black text-zinc-100 tracking-tight group-hover:text-white transition-colors">
                      Tempo 
                    </span>
                  </div>
                </div>
              </Link>
            </div>

            {/* 2. Center (Desktop Navigation Tabs) */}
            <nav className="hidden lg:flex items-center gap-1 p-1.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/70 backdrop-blur-md shadow-inner">
              {primaryLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                      active
                        ? "text-zinc-100 bg-zinc-800/90 shadow-sm shadow-violet-500/10 border border-zinc-700/80"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent"
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 ${active ? "text-violet-400" : "text-zinc-400"}`}
                    />
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              {/* More Dropdown */}
              <div className="relative" ref={moreDropdownRef}>
                <button
                  type="button"
                  onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-transparent ${
                    moreDropdownOpen || moreLinks.some((l) => isActive(l.href))
                      ? "text-zinc-100 bg-zinc-800/80"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  }`}
                  aria-expanded={moreDropdownOpen}
                >
                  <span>المزيد</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${moreDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {moreDropdownOpen && (
                  <div className="absolute left-0 sm:right-auto top-full pt-2 min-w-[260px] z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-2 rounded-2xl bg-[#0c0e17]/98 border border-zinc-800/90 shadow-2xl backdrop-blur-2xl space-y-1">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        أقسام ومسارات متخصصة
                      </div>
                      {moreLinks.map((link) => {
                        const Icon = link.icon;
                        const active = isActive(link.href);
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMoreDropdownOpen(false)}
                            className={`flex items-start gap-3 p-2.5 rounded-xl text-right transition-all group ${
                              active
                                ? "bg-violet-600/15 border border-violet-500/25"
                                : "hover:bg-zinc-850/80 border border-transparent"
                            }`}
                          >
                            <span
                              className={`p-2 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 ${link.accent}`}
                            >
                              <Icon className="w-4 h-4" />
                            </span>
                            <div className="space-y-0.5">
                              <span
                                className={`text-xs font-bold block ${active ? "text-violet-300" : "text-zinc-200 group-hover:text-white"}`}
                              >
                                {link.label}
                              </span>
                              <span className="text-[11px] text-zinc-400 block leading-tight">
                                {link.desc}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* 3. Left side (User, Quick Actions, Mobile Menu) */}
            <div className="flex items-center gap-2.5">
              {/* Authenticated user actions */}
              {isAuthenticated ? (
                <>
                  {/* Quick Log Button */}

                  {/* Settings link */}
                  <Link
                    href="/settings"
                    className={`p-2.5 rounded-xl transition-all border ${
                      pathname === "/settings"
                        ? "text-white bg-zinc-800 border-zinc-700 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850 border-zinc-800/60"
                    }`}
                    aria-label="الإعدادات ومجالات الحياة"
                    title="الإعدادات ومجالات الحياة"
                  >
                    <Settings className="w-4 h-4" />
                  </Link>

                  {/* User Profile Popover */}
                  <div className="relative" ref={userDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex items-center gap-2 p-1 pl-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 transition-all focus:outline-none"
                      aria-label="قائمة المستخدم"
                    >
                      {sessionData.user.image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={sessionData.user.image}
                          alt={sessionData.user.name || "المستخدم"}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-lg object-cover border border-violet-500/30"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center justify-center text-xs font-black">
                          {sessionData.user.name?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                      <span className="hidden md:inline-block text-xs font-bold text-zinc-200 max-w-[100px] truncate">
                        {sessionData.user.name || "حسابي"}
                      </span>
                      <ChevronDown className="w-3 h-3 text-zinc-400" />
                    </button>

                    {userDropdownOpen && (
                      <div className="absolute left-0 top-full pt-2 min-w-[220px] z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="p-2.5 rounded-2xl bg-[#0c0e17]/98 border border-zinc-800/90 shadow-2xl backdrop-blur-2xl space-y-2">
                          <div className="px-2 py-1.5 border-b border-zinc-850">
                            <span className="text-xs font-bold text-zinc-100 block truncate">
                              {sessionData.user.name || "المستخدم"}
                            </span>
                            <span className="text-[11px] text-zinc-400 block truncate">
                              {sessionData.user.email}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <Link
                              href="/"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-850/80 transition-colors"
                            >
                              <LayoutDashboard className="w-3.5 h-3.5 text-violet-400" />
                              <span>لوحة التحكم الرئيسية</span>
                            </Link>
                            <Link
                              href="/settings"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-850/80 transition-colors"
                            >
                              <Settings className="w-3.5 h-3.5 text-zinc-400" />
                              <span>الإعدادات ومجالات الحياة</span>
                            </Link>
                          </div>

                          <div className="pt-1 border-t border-zinc-850">
                            <button
                              type="button"
                              onClick={handleSignOut}
                              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition-colors text-right"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>تسجيل الخروج</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Unauthenticated guest actions */
                <div className="flex items-center gap-2">
                  <GoogleSignInButton />
            
                </div>
              )}

              {/* Mobile menu toggle button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2.5 rounded-xl text-zinc-400 hover:text-zinc-100 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 transition-colors"
                aria-label="القائمة الشاملة"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* Mobile Slide-Down Drawer / Overlay */}
        {/* ------------------------------------------------------------------- */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop Blur Overlay: prevents seeing content underneath and closes on click */}
            <div
              className="fixed inset-0 top-[65px] bg-black/80 backdrop-blur-xl z-40 lg:hidden transition-all duration-300"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="relative z-50 lg:hidden px-4 pt-2 pb-6 border-b border-zinc-800/80 bg-[#08090d]/98 backdrop-blur-2xl animate-in slide-in-from-top-4 duration-200 max-h-[calc(100vh-65px)] overflow-y-auto">
            {/* User card if logged in */}
            {isAuthenticated && (
              <div className="p-3 mb-3 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {sessionData.user.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={sessionData.user.image}
                      alt={sessionData.user.name || "المستخدم"}
                      className="w-9 h-9 rounded-xl object-cover border border-violet-500/30"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center text-xs font-bold">
                      {sessionData.user.name?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <div className="text-right">
                    <span className="text-xs font-bold text-zinc-100 block">
                      {sessionData.user.name || "المستخدم"}
                    </span>
                    <span className="text-[11px] text-zinc-400 block">
                      {sessionData.user.email}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Primary Navigation Grid */}
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 px-1 uppercase tracking-wider block mb-2">
                  الأقسام الرئيسية
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {primaryLinks.map((link) => {
                    const Icon = link.icon;
                    const active = isActive(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl text-right text-xs font-bold transition-all ${
                          active
                            ? "bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-sm"
                            : "bg-zinc-900/60 text-zinc-300 hover:bg-zinc-850 border border-zinc-800/60"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${active ? "text-violet-400" : "text-zinc-400"}`}
                        />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Specialized Areas */}
              <div>
                <span className="text-[10px] font-bold text-zinc-400 px-1 uppercase tracking-wider block mb-2">
                  المسارات المتخصصة
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {moreLinks.map((link) => {
                    const Icon = link.icon;
                    const active = isActive(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl text-right text-xs font-bold transition-all ${
                          active
                            ? "bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-sm"
                            : "bg-zinc-900/60 text-zinc-300 hover:bg-zinc-850 border border-zinc-800/60"
                        }`}
                      >
                        <Icon className="w-4 h-4 text-zinc-400" />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                  <Link
                    href="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl text-right text-xs font-bold transition-all ${
                      pathname === "/settings"
                        ? "bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-sm"
                        : "bg-zinc-900/60 text-zinc-300 hover:bg-zinc-850 border border-zinc-800/60"
                    }`}
                  >
                    <Settings className="w-4 h-4 text-zinc-400" />
                    <span>الإعدادات</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      </header>

      {/* ------------------------------------------------------------------- */}
      {/* Mobile Floating Bottom Bar (App Style Navigation) */}
      {/* ------------------------------------------------------------------- */}
      <nav
        aria-label="التنقل السريع"
        className="fixed bottom-3 inset-x-3 z-40 md:hidden bg-[#0a0c16]/95 backdrop-blur-2xl border border-zinc-800/90 rounded-2xl px-2 py-1.5 shadow-2xl shadow-black/80 flex items-center justify-around"
      >
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-colors ${
            pathname === "/"
              ? "text-violet-400 font-bold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">الرئيسية</span>
        </Link>

        <Link
          href="/habits"
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-colors ${
            isActive("/habits")
              ? "text-violet-400 font-bold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Flame className="w-5 h-5" />
          <span className="text-[10px]">العادات</span>
        </Link>

        {/* Center Floating Action Button (Only for authenticated users) */}
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => openQuickLog("prayer")}
            className="flex items-center justify-center -mt-6 w-13 h-13 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-600/40 border-2 border-[#0a0c16] active:scale-95 transition-transform"
            aria-label="تسجيل نشاط سريع"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center -mt-6 w-13 h-13 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-600/40 border-2 border-[#0a0c16] active:scale-95 transition-transform"
            aria-label="تسجيل الدخول"
          >
            <UserIcon className="w-6 h-6 stroke-[2.2]" />
          </Link>
        )}

        <Link
          href="/tasks"
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-colors ${
            isActive("/tasks")
              ? "text-violet-400 font-bold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <CheckSquare className="w-5 h-5" />
          <span className="text-[10px]">المهام</span>
        </Link>

        <Link
          href="/journal"
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-colors ${
            isActive("/journal")
              ? "text-violet-400 font-bold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <BookMarked className="w-5 h-5" />
          <span className="text-[10px]">اليوميات</span>
        </Link>
      </nav>
    </>
  );
}
