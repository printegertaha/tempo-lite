import { Suspense } from "react";
import JournalClient from "@/components/journal/JournalClient";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "عملت إيه النهارده | أثـر",
  description: "سجل الإنجازات اليومية والمهام المكتملة والأنشطة المصنفة حسب المجال.",
};

export default function JournalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-violet-400" />
        </div>
      }
    >
      <JournalClient />
    </Suspense>
  );
}
