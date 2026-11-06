"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Flame,
  CheckSquare,
  Timer,
  ShieldCheck,
  ArrowRight,
  LogIn,
  Layers,
  AlertCircle,
} from "lucide-react";

export default function UnauthenticatedWelcome({ authError }) {
  useEffect(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const errorParam = params?.get("error");
    const cookies = typeof document !== "undefined"
      ? document.cookie.split(";").map((c) => c.split("=")[0].trim()).filter(Boolean)
      : [];

    if (authError || errorParam) {
      console.error("🚨 [ATHAR_AUTH_DEBUG: OAUTH_ERROR_DETECTED]", {
        authError,
        urlParamError: errorParam,
        fullUrl: typeof window !== "undefined" ? window.location.href : "",
        cookiesPresent: cookies,
      });
    } else {
      console.log("ℹ️ [ATHAR_AUTH_DEBUG: UNAUTHENTICATED_VIEW_LOADED]", {
        fullUrl: typeof window !== "undefined" ? window.location.href : "",
        cookiesPresent: cookies,
      });
    }
  }, [authError]);
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      {/* Auth Error Banner if redirected back with error */}
      {authError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm flex items-start gap-3 text-right">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">تعذر إتمام جلسة تسجيل الدخول ({authError})</span>
            <span className="text-zinc-400 text-xs block">
              يرجى التأكد من إضافة متغيرات DATABASE_URL و BETTER_AUTH_URL و GOOGLE_CLIENT_ID في إعدادات Vercel وعمل Redeploy.
            </span>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-zinc-800 shadow-2xl text-center space-y-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {/* 1-Click Instant Owner Login */}
          <a
            href="/api/auth/owner-login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xl shadow-violet-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>دخول المالك الفوري (Taha)</span>
          </a>

          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول عبر Google</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
