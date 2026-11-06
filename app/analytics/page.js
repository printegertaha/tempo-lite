import { Suspense } from "react";
import { getServerSession } from "@/lib/auth-session";
import { getAnalyticsOverview } from "@/actions/analytics";
import AnalyticsClient from "@/components/analytics/AnalyticsClient";
import { Loader2 } from "lucide-react";

async function AnalyticsServer() {
  const session = await getServerSession();

  let initialData = null;
  if (session?.user) {
    // Server-side initial data fetch:
    // - Computes initial 7-day metrics, streaks, and SVG chart points on the server
    // - Eliminates client waterfalls and loading flicker on initial page load
    const res = await getAnalyticsOverview(7);
    if (res.success && res.data) {
      initialData = res.data;
    }
  }

  return (
    <AnalyticsClient
      user={session?.user || null}
      initialData={initialData}
      initialRange={7}
    />
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
        </div>
      }
    >
      <AnalyticsServer />
    </Suspense>
  );
}
