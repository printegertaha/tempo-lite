import { Suspense } from "react";
import { getServerSession } from "@/lib/auth-session";
import AbstinenceHub from "@/components/abstinence/AbstinenceHub";
import { getAbstinenceTrackers } from "@/actions/abstinence";
import Link from "next/link";
import { ShieldCheck, LogIn, Loader2 } from "lucide-react";

async function AbstinenceServer() {
  const session = await getServerSession();

  if (!session?.user) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="p-8 rounded-3xl bg-zinc-950/80 border border-zinc-800 shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">سجل الدخول لمتابعة أهداف الامتناع</h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              تتيح لك منصة أثـر تتبع مدة الامتناع بدقة فائقة بالثواني، وتوثيق الانتكاسات ومحفزاتها، ومراقبة أطول فترات التعافي.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition-all active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول عبر Google</span>
          </Link>
        </div>
      </div>
    );
  }

  const res = await getAbstinenceTrackers();

  return (
    <AbstinenceHub
      initialTrackers={res.success ? res.data : []}
      initialTimezone={res.timezone || "Asia/Riyadh"}
    />
  );
}

export default function AbstinencePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500 mx-auto" />
        </div>
      }
    >
      <AbstinenceServer />
    </Suspense>
  );
}

