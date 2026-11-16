import { Suspense } from "react";
import QuranHeartHub from "@/components/quran/QuranHeartHub";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "قلب القرآن — متتبع حفظ كتاب الله | أثـر",
  description: "تتبع إتمام وحفظ سور القرآن الكريم مع تصميم القلب النابض الذي يحمر مع كل سورة تحفظها.",
};

export default function QuranPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#08090d] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        </div>
      }
    >
      <QuranHeartHub />
    </Suspense>
  );
}
