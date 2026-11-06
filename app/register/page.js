"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Flame, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

function RegisterContent() {
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get("returnTo");

  return (
    <div className="min-h-screen bg-[#08090d] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-violet-600/15 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 left-10 w-64 h-64 bg-indigo-600/10 blur-[100px] pointer-events-none rounded-full" />

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
          ابدأ رحلتك وصمم أثرك اليوم
        </h2>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
          أنشئ مساحتك الخاصة المعزولة لتتبع عاداتك وأهدافك الشخصية بكل حرية
        </p>
      </div>

      {/* Main Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="p-7 sm:p-8 rounded-3xl bg-[#0c0e17]/95 border border-zinc-800/80 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Key Promises */}
          <div className="space-y-2.5 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 text-xs">
            <div className="flex items-center gap-2.5 text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>مساحة فارغة تماماً تبنيها وتخصصها وفق رغبتك.</span>
            </div>
            <div className="flex items-center gap-2.5 text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>تسجيل دخول فوري بضغطة زر واحدة عبر حسابك في Google.</span>
            </div>
            <div className="flex items-center gap-2.5 text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>عزل وحماية كاملة لبياناتك وسجلاتك التاريخية.</span>
            </div>
          </div>

          {/* Primary Action: Google OAuth Button */}
          <GoogleSignInButton
            returnTo={returnTo}
            label="إنشاء الحساب عبر Google"
          />

          {/* Switch to Login */}
          <div className="pt-2 text-center text-xs text-zinc-400 border-t border-zinc-850">
            <span>لديك حساب بالفعل؟ </span>
            <Link
              href="/login"
              className="text-violet-400 hover:text-violet-300 font-bold transition-colors"
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-zinc-400 text-center">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>تطبيق «أثـر» يعتمد قواعد بيانات PostgreSQL عالية الأمان.</span>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#08090d] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
