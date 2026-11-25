import RadialHabitWheel from "@/components/trackers/RadialHabitWheel";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "العجلة الشهرية للعادات — 31 يوماً | أثـر",
  description: "مخطط دائري لتتبع عاداتك طوال الشهر بالألوان: الأخضر للإنجاز والأحمر للإخفاق.",
};

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

      <RadialHabitWheel />
    </div>
  );
}
