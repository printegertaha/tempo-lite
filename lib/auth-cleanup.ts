import { clearAllLocalIndexedDB } from "@/lib/local-db";
import { syncEngine } from "@/lib/sync/sync-engine";
import { activeTimerEngine } from "@/lib/timer/active-timer";
import { clearMemoryTaskCache } from "@/hooks/useLocalTasks";
import { setOnboardingCookie } from "@/lib/onboarding";

/**
 * Clears all browser-side cached user data (in-memory caches, IndexedDB,
 * Web Storage, and Cache Storage) on sign-out without affecting any
 * user data stored on the server/cloud.
 */
export async function clearBrowserCacheOnSignOut(): Promise<void> {
  // 1. Stop sync engine timers & clear active sync user before touching IndexedDB
  syncEngine.clearSessionUser();

  // 2. Clear in-memory caches
  clearMemoryTaskCache();
  activeTimerEngine.resetLocalState();

  if (typeof window === "undefined") return;

  // 3. Clear all IndexedDB object stores (athar_local_v2)
  await clearAllLocalIndexedDB().catch((err) => {
    console.warn("Failed to clear IndexedDB on sign out:", err);
  });

  // 4. Clear localStorage & sessionStorage
  try {
    localStorage.clear();
  } catch (err) {
    console.warn("Failed to clear localStorage on sign out:", err);
  }
  try {
    sessionStorage.clear();
  } catch (err) {
    console.warn("Failed to clear sessionStorage on sign out:", err);
  }
  setOnboardingCookie(false);

  // 5. Clear Service Worker Cache Storage (runtime HTML/RSC & static caches)
  if ("caches" in window) {
    try {
      const cacheKeys = await window.caches.keys();
      await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
    } catch (err) {
      console.warn("Failed to clear Cache Storage on sign out:", err);
    }
  }
}
