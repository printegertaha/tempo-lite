import { Suspense } from "react";
import { connection } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import AbstinenceHub from "@/components/abstinence/AbstinenceHub";
import { getAbstinenceTrackers } from "@/actions/abstinence";
import Link from "next/link";
import { ShieldCheck, LogIn, Loader2 } from "lucide-react";

async function AbstinenceServer() {
  await connection();
  const session = await getServerSession();

  // Guest Mode: Allow immediate full offline abstinence & relapse tracking
  if (!session?.user) {
    return (
      <AbstinenceHub
        initialTrackers={[]}
        initialTimezone="Asia/Riyadh"
      />
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

