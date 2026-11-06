"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Flame, ShieldCheck, AlertCircle } from "lucide-react";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error");
  const returnTo = searchParams?.get("returnTo");

  return (
    <div className="min-h-screen bg-[#08090d] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-violet-600/15 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 w-60 h-60 bg-emerald-600/10 blur-[90px] pointer-events-none rounded-full" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3 relative z-10 px-4">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center justify-center shadow-xl shadow-violet-600/30 group-hover:scale-105 transition-transform">
            <Flame className="w-6 h-6 fill-white" />
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-zinc-100 tracking-tight block">
              أثـر (Athar)
            </span>
            <span className="text-xs text-zinc-400">
              منظومة إتقان العادات وعمارة الوقت
            </span>
          </div>
        </Link>
        <h2 className="text-xl sm:text-2xl font-black text-zinc-100 pt-2">
          تسجيل الدخول إلى حسابك
        </h2>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
          أهلاً بك مجدداً في مساحتك الخاصة لتوثيق أثرك اليومي ومتابعة تطورك
        </p>
      </div>

      {/* Main Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="p-7 sm:p-8 rounded-3xl bg-[#0c0e17]/95 border border-zinc-800/80 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>
                تعذر إتمام تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.
              </span>
            </div>
          )}

          {/* Primary Action: Google OAuth Button */}
          <div className="space-y-4">
            <GoogleSignInButton
              returnTo={returnTo}
              label="تسجيل الدخول باستخدام Google"
            />

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 text-center space-y-1.5">
              <span className="text-xs font-semibold text-zinc-300 block">
                تسجيل الدخول الموحد والآمن
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                يستخدم تطبيق «أثـر» حساب Google الخاص بك فقط للتحقق الآمن من
                هويتك دون الحاجة لحفظ أو تذكر كلمات مرور.
              </p>
            </div>
          </div>

          {/* New User Note */}
          <div className="pt-2 text-center text-xs text-zinc-400 border-t border-zinc-850">
            <span>مستخدم جديد؟ </span>
            <span className="text-zinc-300">
              تسجيل الدخول عبر Google ينشئ حسابك ومساحتك فوراً وبشكل تلقائي.
            </span>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-zinc-400 text-center">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            بياناتك مشفرة ومحمية بالكامل على خوادم PostgreSQL المعزولة.
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#08090d] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
