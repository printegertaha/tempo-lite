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
} from "lucide-react";

export default function UnauthenticatedWelcome() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12">
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
