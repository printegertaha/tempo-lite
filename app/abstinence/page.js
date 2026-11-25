import { Suspense } from "react";
import { connection } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import { getServerUserTemporalContext } from "@/lib/server-user";
import AbstinenceHub from "@/components/abstinence/AbstinenceHub";
import { getAbstinenceTrackers } from "@/actions/abstinence";
import { Loader2 } from "lucide-react";

async function AbstinenceServer() {
  await connection();
  const session = await getServerSession();
  const { timezone } = await getServerUserTemporalContext(session?.user?.id);

  // Guest Mode: Allow immediate full offline abstinence & relapse tracking
  if (!session?.user) {
    return (
      <AbstinenceHub
        userId="guest"
        initialTrackers={[]}
        initialTimezone={timezone}
      />
    );
  }

  const res = await getAbstinenceTrackers();

  return (
    <AbstinenceHub
      userId={session.user.id}
      initialTrackers={res.success ? res.data : []}
      initialTimezone={res.timezone || timezone}
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
