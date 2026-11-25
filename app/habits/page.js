import { Suspense } from "react";
import { connection } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import HabitsClient from "@/components/trackers/HabitsClient";
import { getTrackers } from "@/actions/trackers";
import { getLifeAreas } from "@/actions/life-areas";
import { getDailyEntries } from "@/actions/entries";
import { getServerUserTemporalContext } from "@/lib/server-user";
import { Loader2 } from "lucide-react";

async function HabitsServer() {
  await connection();
  const session = await getServerSession();
  const { timezone, todayStr } = await getServerUserTemporalContext(session?.user?.id);

  let initialTrackers = [];
  let initialLifeAreas = [];
  let initialDailyEntries = [];

  if (session?.user) {
    // Concurrent server-side parallel fetching (Zero waterfall)
    const [trackersRes, areasRes, entriesRes] = await Promise.all([
      getTrackers({ isArchived: false }),
      getLifeAreas(false),
      getDailyEntries(todayStr),
    ]);

    if (trackersRes.success) initialTrackers = trackersRes.data || [];
    if (areasRes.success) initialLifeAreas = areasRes.data || [];
    if (entriesRes.success) initialDailyEntries = entriesRes.data || [];
  }

  return (
    <HabitsClient
      user={session?.user || null}
      initialDate={todayStr}
      timezone={timezone}
      initialTrackers={initialTrackers}
      initialLifeAreas={initialLifeAreas}
      initialDailyEntries={initialDailyEntries}
    />
  );
}

export default function HabitsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
        </div>
      }
    >
      <HabitsServer />
    </Suspense>
  );
}
