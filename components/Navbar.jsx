"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  BookOpen,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useSession, authClient } from "@/lib/auth-client";
import { clearBrowserCacheOnSignOut } from "@/lib/auth-cleanup";
import { getSafeReturnUrl } from "@/lib/auth-redirect";
import { useAthar } from "@/components/context/AtharContext";
import SignOutConfirmDialog from "@/components/auth/SignOutConfirmDialog";

const SyncStatusBadge = dynamic(
  () => import("@/components/sync/SyncStatusBadge"),
  {
    ssr: false,
    loading: () => (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/40 border border-zinc-700/40 text-transparent text-[11px] font-medium select-none pointer-events-none opacity-0"
        aria-hidden="true"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
        <span>المزامنة</span>
      </div>
    ),
  }
);

export default function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: sessionData, isPending } = useSession();
  const { userPreferences } = useAthar();

  const displayName =
    userPreferences?.profileName || sessionData?.user?.name || "المستخدم";
  const displayImage =
    userPreferences?.profileImage !== undefined
      ? userPreferences.profileImage
      : sessionData?.user?.image;

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const headerRef = useRef(null);
  const toggleBtnRef = useRef(null);
  const closeDrawerBtnRef = useRef(null);
  const moreDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close menus when route/path changes (React state adjustment pattern)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
    setMoreDropdownOpen(false);
    setUserDropdownOpen(false);
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  // Lock page scrolling (both html and body) when mobile menu is open + Escape handler
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = body.style.overscrollBehavior;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    closeDrawerBtnRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        toggleBtnRef.current?.focus({ preventScroll: true });
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = prevBodyOverscroll;
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
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

  const currentSearch = searchParams?.toString();
  const currentFullPath = currentSearch ? `${pathname}?${currentSearch}` : pathname;
  const safeReturnTo = getSafeReturnUrl(currentFullPath, "/");
  const loginHref =
    safeReturnTo && safeReturnTo !== "/"
      ? `/login?returnTo=${encodeURIComponent(safeReturnTo)}`
      : "/login";

  const primaryLinks = [
    { href: "/", label: "الرئيسية", icon: LayoutDashboard },
    { href: "/tasks", label: "المهام", icon: CheckSquare },
    { href: "/habits", label: "العادات", icon: Flame },
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
      href: "/quran",
      label: "قلب القرآن",
      desc: "متابعة حفظ القرآن الكريم وتلوين السور",
      icon: BookOpen,
      accent: "text-rose-400 group-hover:bg-rose-500/10",
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

  const requestSignOut = () => {
    setUserDropdownOpen(false);
    setSignOutConfirmOpen(true);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      await clearBrowserCacheOnSignOut();
      setSignOutConfirmOpen(false);
      setUserDropdownOpen(false);
      window.location.replace("/");
    } catch (err) {
      console.error("Sign out error:", err);
      setIsSigningOut(false);
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
        ref={headerRef}
        className={`sticky top-0 z-[60] w-full transition-all duration-300 ${
          scrolled || mobileMenuOpen
            ? "border-b border-zinc-800/80 bg-[#08090d]/95 backdrop-blur-2xl shadow-xl shadow-black/40"
            : "border-b border-zinc-800/40 bg-[#08090d]/80 backdrop-blur-xl"
        } ${mobileMenuOpen ? "max-lg:opacity-0 max-lg:pointer-events-none" : ""}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* 1. Right side (Brand & Identity) */}
            <div className="flex items-center gap-6">
              <Link
                href="/"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 group focus:outline-none"
              >
                <span className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg shadow-violet-600/30 group-hover:shadow-violet-600/50 group-hover:scale-105 transition-all duration-200">
                  <Flame className="w-5 h-5 fill-white" />
                </span>
                <div className="text-right">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg sm:text-xl font-black text-zinc-100 tracking-tight group-hover:text-white transition-colors">
                      أثـر
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

            {/* 3. Left side (Sync Status, User / Login, Mobile Menu) */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Live Local-First Sync / Guest Status */}
              <div className="hidden sm:flex items-center">
                <SyncStatusBadge />
              </div>

              {/* User Profile / Login / Skeleton Loading */}
              {isPending ? (
                <div
                  aria-label="جاري التحقق من الحساب"
                  role="status"
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 animate-pulse shrink-0"
                >
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 shrink-0" />
                  <div className="w-12 sm:w-16 h-3 rounded-md bg-zinc-800" />
                </div>
              ) : isAuthenticated ? (
                <div className="relative shrink-0" ref={userDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen((prev) => !prev)}
                    aria-expanded={userDropdownOpen}
                    aria-haspopup="menu"
                    className="flex items-center gap-2 px-2 py-1 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
                  >
                    {displayImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={displayImage}
                        alt={displayName}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-lg object-cover border border-violet-500/30 shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {displayName?.[0]?.toUpperCase() || "أ"}
                      </div>
                    )}
                    <span className="text-xs font-bold text-zinc-100 max-w-[80px] sm:max-w-[120px] truncate">
                      {displayName}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 hidden sm:block ${
                        userDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {userDropdownOpen && (
                    <div
                      role="menu"
                      className="absolute left-0 top-full mt-2 w-56 p-1.5 rounded-2xl bg-[#0c0e17]/98 border border-zinc-800/90 shadow-2xl backdrop-blur-2xl z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150"
                    >
                      <div className="px-3 py-2 border-b border-zinc-800/80">
                        <p className="text-xs font-bold text-zinc-100 truncate">
                          {displayName}
                        </p>
                        {sessionData?.user?.email && (
                          <p
                            dir="ltr"
                            className="text-[11px] text-zinc-400 font-mono truncate text-right"
                          >
                            {sessionData.user.email}
                          </p>
                        )}
                      </div>

                      <Link
                        href="/settings"
                        role="menuitem"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-200 hover:bg-zinc-800/80 hover:text-white transition-colors"
                      >
                        <Settings className="w-4 h-4 text-violet-400 shrink-0" />
                        <span>الإعدادات والملف الشخصي</span>
                      </Link>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={requestSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/15 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>تسجيل الخروج</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={loginHref}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all shrink-0"
                >
                  <UserIcon className="w-3.5 h-3.5 hidden sm:inline" />
                  <span>تسجيل الدخول</span>
                </Link>
              )}

              {/* Mobile menu toggle button */}
              <button
                ref={toggleBtnRef}
                type="button"
                onClick={toggleMobileMenu}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-nav-drawer"
                className="lg:hidden p-2.5 rounded-xl text-zinc-400 hover:text-zinc-100 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 transition-colors cursor-pointer"
                aria-label={mobileMenuOpen ? "إغلاق القائمة" : "القائمة الشاملة"}
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
      </header>

      {/* ------------------------------------------------------------------- */}
      {/* Mobile Navigation Drawer (takes top: 0, covers screen completely)   */}
      {/* ------------------------------------------------------------------- */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop: covers full screen from top: 0, blurs background, closes on click */}
          <div
            className="athar-drawer-backdrop fixed inset-0 bg-black/75 backdrop-blur-md z-[70] lg:hidden touch-none"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />

          {/* Right-edge Drawer: starts at top: 0, full height */}
          <div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="القائمة الشاملة"
            className="athar-drawer-right fixed top-0 right-0 bottom-0 z-[75] lg:hidden w-[min(22.5rem,88vw)] max-w-[90vw] bg-[#08090d] border-l border-zinc-800/90 shadow-2xl shadow-black/80 flex flex-col"
          >
            {/* Drawer Header with Brand Logo & explicit X close button */}
            <div className="flex items-center justify-between px-4 pt-[calc(0.875rem+env(safe-area-inset-top,0px))] pb-3.5 border-b border-zinc-800/80 shrink-0 bg-[#08090d]">
              <Link
                href="/"
                onClick={closeMobileMenu}
                className="flex items-center gap-2.5 group focus:outline-none"
              >
                <span className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-md shadow-violet-600/30 group-hover:scale-105 transition-transform">
                  <Flame className="w-4 h-4 fill-white" />
                </span>
                <div className="text-right">
                  <span className="text-base font-black text-zinc-100 tracking-tight block leading-tight group-hover:text-white transition-colors">
                    أثـر
                  </span>
                  <span className="text-[10px] text-zinc-400 block -mt-0.5">
                    منظومة أثـر
                  </span>
                </div>
              </Link>
              <button
                ref={closeDrawerBtnRef}
                type="button"
                onClick={closeMobileMenu}
                aria-label="إغلاق القائمة"
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 border border-zinc-800/80 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
              {/* Primary Navigation Grid */}
              <div className="space-y-4">
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
                          onClick={closeMobileMenu}
                          className={`flex items-center gap-2.5 p-3 rounded-xl text-right text-xs font-bold transition-all ${
                            active
                              ? "bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-sm"
                              : "bg-zinc-900/60 text-zinc-300 hover:bg-zinc-850 border border-zinc-800/60"
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 ${active ? "text-violet-400" : "text-zinc-400"}`}
                          />
                          <span className="truncate">{link.label}</span>
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
                          onClick={closeMobileMenu}
                          className={`flex items-center gap-2.5 p-3 rounded-xl text-right text-xs font-bold transition-all ${
                            active
                              ? "bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-sm"
                              : "bg-zinc-900/60 text-zinc-300 hover:bg-zinc-850 border border-zinc-800/60"
                          }`}
                        >
                          <Icon className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span className="truncate">{link.label}</span>
                        </Link>
                      );
                    })}
                    <Link
                      href="/settings"
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-2.5 p-3 rounded-xl text-right text-xs font-bold transition-all ${
                        pathname === "/settings"
                          ? "bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-sm"
                          : "bg-zinc-900/60 text-zinc-300 hover:bg-zinc-850 border border-zinc-800/60"
                      }`}
                    >
                      <Settings className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span className="truncate">الإعدادات</span>
                    </Link>
                  </div>
                </div>

                {/* User / Auth section moved below navigation links */}
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 px-1 uppercase tracking-wider block mb-2">
                    الملف الشخصي
                  </span>
                  {isAuthenticated ? (
                    <div className="p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 flex items-center justify-between gap-2">
                      <Link
                        href="/settings"
                        onClick={closeMobileMenu}
                        className="flex items-center gap-3 min-w-0 flex-1 group"
                      >
                        {displayImage ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={displayImage}
                            alt={displayName}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-xl object-cover border border-violet-500/30 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {displayName?.[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                        <div className="text-right min-w-0">
                          <span className="text-xs font-bold text-zinc-100 group-hover:text-violet-300 transition-colors block truncate">
                            {displayName}
                          </span>
                          <span className="text-[11px] text-zinc-400 block truncate">
                            {sessionData.user.email}
                          </span>
                        </div>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          closeMobileMenu();
                          requestSignOut();
                        }}
                        className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                        title="تسجيل الخروج"
                        aria-label="تسجيل الخروج"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 flex items-center justify-between gap-2">
                      <div className="text-right">
                        <span className="text-xs font-bold text-zinc-100 block">
                          حساب أثـر
                        </span>
                        <span className="text-[11px] text-zinc-400 block">
                          سجل دخولك لحفظ ومزامنة بياناتك
                        </span>
                      </div>
                      <Link
                        href={loginHref}
                        onClick={closeMobileMenu}
                        className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all shrink-0"
                      >
                        تسجيل الدخول
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <SignOutConfirmDialog
        isOpen={signOutConfirmOpen}
        isSigningOut={isSigningOut}
        onCancel={() => setSignOutConfirmOpen(false)}
        onConfirm={handleSignOut}
      />
    </>
  );
}