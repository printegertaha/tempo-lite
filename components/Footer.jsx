import Link from "next/link";
import { Flame, ShieldCheck, Heart, Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-zinc-800/80 bg-[#07080c] mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-8 border-b border-zinc-800/60">
          
          {/* Brand & Poetic Motto */}
          <div className="flex flex-col items-center md:items-start text-center md:text-right gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
                <Flame className="w-4 h-4 fill-violet-400" />
              </span>
              <span className="text-zinc-100 font-extrabold text-lg tracking-tight font-sans">
                أثـر (Athar)
              </span>
            </div>
            
            <p className="text-zinc-400 text-xs sm:text-sm max-w-md font-sans">
              «وما من كاتب إلا سيفنى .. ويُبقي الدهر ما كتبت يداه»
            </p>
            <span className="text-[11px] text-zinc-400 font-mono">
              استثمر في يومك لتبني مستقبلك عادةً تلو الأخرى.
            </span>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400 font-medium">
            <Link href="/" className="hover:text-violet-400 transition-colors">
              الرئيسية
            </Link>
            <Link href="/journal" className="hover:text-violet-400 transition-colors">
              اليوميات
            </Link>
            <Link href="/calendar" className="hover:text-violet-400 transition-colors">
              التقويم
            </Link>
            <Link href="/habits" className="hover:text-violet-400 transition-colors">
              العادات
            </Link>
            <Link href="/analytics" className="hover:text-violet-400 transition-colors">
              التحليلات
            </Link>
            <Link href="/gym" className="hover:text-violet-400 transition-colors">
              الجيم
            </Link>
            <Link href="/nutrition" className="hover:text-violet-400 transition-colors">
              التغذية
            </Link>
            <Link href="/expenses" className="hover:text-violet-400 transition-colors">
              المصاريف
            </Link>
            <Link href="/settings" className="hover:text-violet-400 transition-colors">
              الإعدادات
            </Link>
            <Link href="/landing" className="hover:text-violet-400 transition-colors text-violet-400/90">
              عن أثر
            </Link>
            <Link href="/login" className="hover:text-violet-400 transition-colors text-zinc-500">
              دخول
            </Link>
          </div>

          {/* Privacy & System Status Badge */}
          <div className="flex flex-col items-center md:items-end gap-1.5">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>بياناتك محفوظة محلياً بالكامل</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">
              النظام نشط وجاهز للعمل • الإصدار 2.0
            </span>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <p>© 2026 أثـر. صُمم بحرفية ليكون رفيق نموك اليومي.</p>
          <div className="flex items-center gap-1 text-zinc-400">
            <span>صُنع بشغف لإحداث</span>
            <span className="text-violet-400 font-bold">أثـر حقيقي</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
