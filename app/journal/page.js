import { Suspense } from "react";
import { connection } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import { getDailyOverview } from "@/actions/history";
import { getServerUserTemporalContext } from "@/lib/server-user";
import JournalClient from "@/components/journal/JournalClient";
import { Loader2 } from "lucide-react";

async function JournalServer() {
  await connection();
  const session = await getServerSession();
  const { timezone, todayStr } = await getServerUserTemporalContext(session?.user?.id);

  let initialData = null;
  if (session?.user) {
    // Concurrent server-side initial data fetch:
    // - Fetches today's trackers, entries, tasks, and daily note on server
    // - Eliminates client waterfalls and layout shifts on initial load
    const res = await getDailyOverview(todayStr);
    if (res.success && res.data) {
      initialData = res.data;
    }
  }

  return (
    <JournalClient
      user={session?.user || null}
      initialDate={todayStr}
      timezone={timezone}
      initialData={initialData}
    />
  );
}

export default function JournalPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
        </div>
      }
    >
      <JournalServer />
    </Suspense>
  );
}
