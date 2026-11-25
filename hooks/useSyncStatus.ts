"use client";

import { useState, useEffect } from "react";
import { syncEngine, SyncState } from "@/lib/sync/sync-engine";
import type { LocalConflictRecord } from "@/lib/local-db";

export interface SyncStatusInfo {
  status: SyncState;
  pendingCount: number;
  failedCount: number;
  conflictCount: number;
  conflicts: LocalConflictRecord[];
  lastSyncedAt: number | null;
  error?: string;
  flushNow: () => Promise<boolean>;
  retryFailed: () => Promise<boolean>;
  resolveConflict: (
    conflictId: string,
    strategy: "keep_local" | "keep_remote" | "keep_both"
  ) => Promise<void>;
}

export function useSyncStatus(): SyncStatusInfo {
  const [state, setState] = useState<{
    status: SyncState;
    pendingCount: number;
    failedCount: number;
    conflictCount: number;
    conflicts: LocalConflictRecord[];
    lastSyncedAt: number | null;
    error?: string;
  }>({
    status: "idle",
    pendingCount: 0,
    failedCount: 0,
    conflictCount: 0,
    conflicts: [],
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
    retryFailed: () => syncEngine.retryFailed(),
    resolveConflict: (conflictId, strategy) =>
      syncEngine.resolveConflict(conflictId, strategy),
  };
}
