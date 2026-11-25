"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, RefreshCw, X, Download } from "lucide-react";

export default function PwaRegister() {
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const userRequestedUpdateRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // In development, unregister any existing SW and clear Athar caches so HMR/Turbopack chunks
    // and RSC Flight payloads are never served stale from a prior compilation.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      });
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => {
            if (key.startsWith("athar-")) caches.delete(key);
          });
        });
      }
      return;
    }

    // Register Service Worker in production only
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // If there's an active waiting worker on registration
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowUpdatePrompt(true);
        }

        // Listen for new worker installed
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (
              installingWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(installingWorker);
              setShowUpdatePrompt(true);
            }
          });
        });
      })
      .catch((err) => {
        console.warn("ServiceWorker registration failed:", err);
      });

    // Handle controller change ONLY when user explicitly clicked "تحديث الآن"
    // Never reload automatically on initial SW activation or background claim.
    let refreshing = false;
    const handleControllerChange = () => {
      if (userRequestedUpdateRef.current && !refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    // Listen for installable PWA prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user dismissed install before
      if (!localStorage.getItem("athar_pwa_install_dismissed")) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      userRequestedUpdateRef.current = true;
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
    setShowUpdatePrompt(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const dismissInstall = () => {
    setShowInstallBanner(false);
    try {
      localStorage.setItem("athar_pwa_install_dismissed", "true");
    } catch {}
  };

  return (
    <>
      {/* 1. App Update Available Banner */}
      {showUpdatePrompt && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[92%] sm:w-auto animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-900/95 border border-violet-500/40 shadow-2xl backdrop-blur-xl text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-zinc-100">تحديث جديد متوفر لمنصة أثـر</p>
                <p className="text-[11px] text-zinc-400">انقر للتحديث والتحسين الفوري</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleUpdate}
                className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/20 flex items-center gap-1 transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تحديث الآن</span>
              </button>
              <button
                type="button"
                onClick={() => setShowUpdatePrompt(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PWA Install Prompt Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-20 md:bottom-6 left-4 z-50 max-w-sm w-[90%] sm:w-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/95 border border-zinc-800 shadow-2xl backdrop-blur-xl text-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-zinc-200">تثبيت أثـر كتطبيق أصلي</p>
                <p className="text-[10px] text-zinc-400">للوصول السريع والعمل دون اتصال</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInstall}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all active:scale-95"
              >
                تثبيت
              </button>
              <button
                type="button"
                onClick={dismissInstall}
                className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label="تخطي التثبيت"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

