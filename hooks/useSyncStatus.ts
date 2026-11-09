"use client";

import { useState, useEffect } from "react";
import { syncEngine, SyncState } from "@/lib/sync/sync-engine";

export interface SyncStatusInfo {
  status: SyncState;
  pendingCount: number;
  lastSyncedAt: number | null;
  error?: string;
  flushNow: () => Promise<boolean>;
}

export function useSyncStatus(): SyncStatusInfo {
  const [state, setState] = useState<{
    status: SyncState;
    pendingCount: number;
    lastSyncedAt: number | null;
    error?: string;
  }>({
    status: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "idle",
    pendingCount: 0,
    lastSyncedAt: null,
  });

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((updated) => {
      setState(updated);
    });
    return unsubscribe;
  }, []);

  return {
    ...state,
    flushNow: () => syncEngine.flushNow(),
  };
}

