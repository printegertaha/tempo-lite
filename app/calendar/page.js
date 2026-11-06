import { Suspense } from "react";
import { getServerSession } from "@/lib/auth-session";
import { getCalendarMonthSummary } from "@/actions/history";
import { getLocalDateString } from "@/lib/dates";
import CalendarClient from "@/components/calendar/CalendarClient";
import { Loader2 } from "lucide-react";

async function CalendarServer() {
  const session = await getServerSession();
  const todayStr = getLocalDateString();
  const [initialYear, initialMonth] = todayStr.split("-").map(Number);

  let initialMonthData = null;
  if (session?.user) {
    // Server-side initial data fetch:
    // - Loads the initial month's aggregated days on server
    // - Eliminates client waterfalls and layout shifts on initial load
    const res = await getCalendarMonthSummary(initialYear, initialMonth);
    if (res.success && res.data) {
      initialMonthData = res.data;
    }
  }

  return (
    <CalendarClient
      user={session?.user || null}
      initialYear={initialYear}
      initialMonth={initialMonth}
      initialDate={todayStr}
      initialMonthData={initialMonthData}
    />
  );
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
        </div>
      }
    >
      <CalendarServer />
    </Suspense>
  );
}
