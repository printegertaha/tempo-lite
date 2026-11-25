import { Suspense } from "react";
import { connection } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import { getTrackers } from "@/actions/trackers";
import RadialHabitWheel from "@/components/trackers/RadialHabitWheel";
import { Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "العجلة الشهرية للعادات — 31 يوماً | أثـر",
  description: "مخطط دائري لتتبع عاداتك طوال الشهر بالألوان: الأخضر للإنجاز والأحمر للإخفاق.",
};

async function HabitWheelServer() {
  await connection();
  const session = await getServerSession();
  let initialTrackers = [];

  if (session?.user) {
    const res = await getTrackers({ isArchived: false });
    if (res.success) initialTrackers = res.data || [];
  }

  return (
    <RadialHabitWheel
      existingTrackers={initialTrackers}
      userId={session?.user?.id || "guest"}
    />
  );
}

export default function HabitWheelPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/habits"
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة إلى بطاقات العادات</span>
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="max-w-6xl mx-auto py-24 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
          </div>
        }
      >
        <HabitWheelServer />
      </Suspense>
    </div>
  );
}
