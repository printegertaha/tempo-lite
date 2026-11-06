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
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-xl shadow-violet-600/25 transition-all active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>ابدأ الآن بتسجيل الدخول عبر Google</span>
          </Link>
          <Link
            href="/habits"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold transition-all"
          >العادات</Link>
        </div>
      </div>
    </div>
  );
}
