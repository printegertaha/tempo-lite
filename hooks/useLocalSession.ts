"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { localSyncMetaRepo } from "@/lib/local-db";
import { syncEngine } from "@/lib/sync/sync-engine";

export interface LocalAccountIdentity {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isGuest?: boolean;
}

const LAST_ACCOUNT_HINT_KEY = "athar_last_account_hint";

function readHintSync(): LocalAccountIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_ACCOUNT_HINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

export function clearCachedAccountIdentity() {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(LAST_ACCOUNT_HINT_KEY);
    } catch {}
  }
  void localSyncMetaRepo.setLastAuthAccount(null).catch(() => {});
  syncEngine.clearSessionUser();
}

/**
 * Resolves active user identity Local-First:
 * - Online & authenticated: authoritative server session + refreshes non-secret offline hint.
 * - Offline / network failure: preserves previously authenticated account descriptor so user can view & edit their own isolated IndexedDB workspace offline.
 * - Online & unauthenticated (confirmed no session): clears offline hint and enters clean Guest mode.
 */
export function useLocalSession() {
  const { data: sessionData, isPending: sessionPending, error } = useSession();
  const [offlineAccount, setOfflineAccount] = useState<LocalAccountIdentity | null>(null);
  const [idbChecked, setIdbChecked] = useState(false);

  // Hydrate offline account descriptor on client mount (prevents SSR hydration mismatch)
  useEffect(() => {
    let active = true;

    const hint = readHintSync();
    if (hint?.id) {
      queueMicrotask(() => {
        if (active) {
          setOfflineAccount(hint);
        }
      });
    }

    localSyncMetaRepo
      .getLastAuthAccount()
      .then((acc) => {
        if (!active) return;
        if (acc?.id) {
          setOfflineAccount(acc);
          try {
            localStorage.setItem(LAST_ACCOUNT_HINT_KEY, JSON.stringify(acc));
          } catch {}
        }
        setIdbChecked(true);
      })
      .catch(() => {
        if (active) setIdbChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Reconcile server session state with non-secret offline account hint
  useEffect(() => {
    if (sessionPending) return;

    if (sessionData?.user?.id) {
      const nextAcc: LocalAccountIdentity = {
        id: sessionData.user.id,
        name: sessionData.user.name || null,
        email: sessionData.user.email || null,
        image: sessionData.user.image || null,
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOfflineAccount(nextAcc);
      try {
        localStorage.setItem(LAST_ACCOUNT_HINT_KEY, JSON.stringify(nextAcc));
      } catch {}
      void localSyncMetaRepo.setLastAuthAccount(nextAcc).catch(() => {});
      syncEngine.init(nextAcc.id);
      return;
    }

    const isOnlineNoError =
      typeof navigator !== "undefined" && navigator.onLine && !error;

    if (isOnlineNoError) {
      // Confirmed logged-out on server while online -> clear cached identity
      setOfflineAccount(null);
      try {
        localStorage.removeItem(LAST_ACCOUNT_HINT_KEY);
      } catch {}
      void localSyncMetaRepo.setLastAuthAccount(null).catch(() => {});
      syncEngine.clearSessionUser();
    } else if (offlineAccount?.id) {
      // Offline / network error: keep isolated local workspace for previously authenticated user
      syncEngine.init(offlineAccount.id);
    }
  }, [sessionData, sessionPending, error, offlineAccount?.id]);

  const activeAuthUser: LocalAccountIdentity | null = sessionData?.user?.id
    ? (sessionData.user as LocalAccountIdentity)
    : offlineAccount?.id
    ? offlineAccount
    : null;

  const isGuest = !activeAuthUser?.id;
  const userId = activeAuthUser?.id || "guest";
  const isOfflineFallback = Boolean(!sessionData?.user?.id && offlineAccount?.id);

  return {
    user: activeAuthUser,
    userId,
    isGuest,
    isOfflineFallback,
    isPending: sessionPending && !activeAuthUser && !idbChecked,
  };
}
