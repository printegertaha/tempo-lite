"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useProgressRouter } from "@/hooks/useProgressRouter";
import { navigateAssign } from "@/lib/navigation-progress";
import { authClient } from "@/lib/auth-client";
import { getSafeErrorCallbackUrl } from "@/lib/auth-redirect";
import { getGoogleOAuthMode } from "@/lib/device-detection";
import { Loader2, ExternalLink, X } from "lucide-react";
import AuthErrorBanner from "./AuthErrorBanner";

export default function GoogleSignInButton({
  className = "",
  label = "المتابعة باستخدام Google",
  shortLabel = "سجل مع Google",
}) {
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [activeMode, setActiveMode] = useState(null);
  const pathname = usePathname();
  const router = useProgressRouter();
  const cancelledRef = useRef(false);
  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    const handlePageShow = (event) => {
      // Reset loading state if restored from browser bfcache (e.g. Back from Google OAuth on mobile/tablet)
      if (event.persisted || inFlightRef.current) {
        inFlightRef.current = false;
        cancelledRef.current = false;
        if (mountedRef.current) {
          setLoading(false);
          setActiveMode(null);
        }
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => {
      mountedRef.current = false;
      inFlightRef.current = false;
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  const baseAuthPath = pathname === "/register" ? "/register" : "/login";
  const safeErrorCallback = getSafeErrorCallbackUrl(baseAuthPath, "/login");

  const handleCancelInTab = () => {
    cancelledRef.current = true;
    inFlightRef.current = false;
    setLoading(false);
    setActiveMode(null);
    setPopupBlocked(false);
    setErrorState(null);
  };

  const startRedirectFlow = async () => {
    if (inFlightRef.current || loading) return;
    try {
      inFlightRef.current = true;
      cancelledRef.current = false;
      setLoading(true);
      setActiveMode("redirect");
      setPopupBlocked(false);
      setErrorState(null);

      const res = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
        newUserCallbackURL: "/",
        errorCallbackURL: safeErrorCallback,
      });

      if (!mountedRef.current || cancelledRef.current) {
        inFlightRef.current = false;
        return;
      }

      if (res?.error) {
        inFlightRef.current = false;
        setLoading(false);
        setActiveMode(null);
        const errObj = res.error;
        const nestedErr =
          typeof errObj === "object" && errObj !== null && "error" in errObj
            ? errObj.error
            : errObj;
        const errCode =
          nestedErr?.code ||
          errObj?.code ||
          (errObj?.status === 503
            ? "missing_google_credentials"
            : errObj?.status === 403
              ? "invalid_origin"
              : "google_sign_in_failed");
        setErrorState({
          code: String(errCode),
          referenceId: nestedErr?.referenceId || errObj?.referenceId || null,
          message:
            typeof nestedErr?.message === "string" ? nestedErr.message : null,
        });
        return;
      }

      if (res?.data?.url) {
        navigateAssign(res.data.url);
      } else {
        inFlightRef.current = false;
        setLoading(false);
        setActiveMode(null);
        setErrorState({
          code: "no_redirect_url",
          message:
            "لم يرجع الخادم رابط التوجيه إلى Google. يرجى المحاولة مرة أخرى.",
        });
      }
    } catch {
      inFlightRef.current = false;
      if (!mountedRef.current) return;
      setLoading(false);
      setActiveMode(null);
      setErrorState({
        code: "unexpected_client_error",
        message:
          "تعذر الاتصال بالخادم. يرجى التحقق من الإنترنت والمحاولة مرة أخرى.",
      });
    }
  };

  const startPopupFlow = async () => {
    if (inFlightRef.current || loading) return;
    try {
      inFlightRef.current = true;
      cancelledRef.current = false;
      setLoading(true);
      setActiveMode("popup");
      setPopupBlocked(false);
      setErrorState(null);

      // Must call synchronously from click handler so popup blockers permit window.open()
      const res = await authClient.signIn.popup({
        provider: "google",
        callbackURL: "/",
        newUserCallbackURL: "/",
        errorCallbackURL: safeErrorCallback,
      });

      if (!mountedRef.current || cancelledRef.current) {
        inFlightRef.current = false;
        return;
      }

      if (res?.error) {
        inFlightRef.current = false;
        setLoading(false);
        setActiveMode(null);

        if (res.error.code === "POPUP_BLOCKED") {
          setPopupBlocked(true);
          return;
        }

        if (res.error.code === "POPUP_CLOSED") {
          setErrorState({
            code: "access_denied",
            message:
              "تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية. يمكنك المحاولة مرة أخرى متى شئت.",
          });
          return;
        }

        if (res.error.code === "POPUP_TIMEOUT") {
          setErrorState({
            code: "oauth_timeout",
            message:
              "انتهت مهلة نافذة تسجيل الدخول. يرجى المحاولة مرة أخرى.",
          });
          return;
        }

        setErrorState({
          code: String(res.error.code || "google_sign_in_failed"),
          message:
            typeof res.error.message === "string" ? res.error.message : null,
        });
        return;
      }

      if (res?.data?.success) {
        const sessionRes = await authClient
          .getSession({ query: { disableCookieCache: true } })
          .catch(() => null);

        if (!mountedRef.current || cancelledRef.current) {
          inFlightRef.current = false;
          return;
        }

        if (sessionRes?.data?.user) {
          inFlightRef.current = false;
          router.replace("/");
          router.refresh();
          return;
        }
      }

      inFlightRef.current = false;
      setLoading(false);
      setActiveMode(null);
      setErrorState({
        code: "google_sign_in_failed",
        message: "تعذر التحقق من الجلسة بعد تسجيل الدخول. يرجى المحاولة مرة أخرى.",
      });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Google popup sign in unexpected error:", error);
      }
      inFlightRef.current = false;
      if (!mountedRef.current) return;
      setLoading(false);
      setActiveMode(null);
      setErrorState({
        code: "unexpected_client_error",
        message:
          "حدث خطأ في الشبكة أو أثناء المصادقة عبر Google. يمكنك المحاولة مرة أخرى.",
      });
    }
  };

  const handleSignIn = () => {
    if (inFlightRef.current || loading) return;
    const mode = getGoogleOAuthMode();
    if (mode === "redirect") {
      void startRedirectFlow();
    } else {
      void startPopupFlow();
    }
  };

  return (
    <div className="w-full space-y-3">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading}
        aria-busy={loading}
        className={`w-full min-h-[48px] touch-manipulation flex items-center justify-center gap-2.5 sm:gap-3 py-3.5 px-3 sm:px-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-700/80 hover:border-zinc-500 text-zinc-100 text-xs sm:text-sm font-bold shadow-xl hover:shadow-violet-600/10 transition-all duration-200 cursor-pointer active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed group whitespace-nowrap ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
            <span>
              {activeMode === "redirect"
                ? "جارٍ التوجيه إلى Google..."
                : "جارٍ المصادقة عبر Google..."}
            </span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5 shrink-0 transition-transform group-hover:scale-105"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="max-[444px]:hidden whitespace-nowrap">{label}</span>
            <span className="hidden max-[444px]:inline whitespace-nowrap">{shortLabel}</span>
          </>
        )}
      </button>

      {loading && (
        <button
          type="button"
          onClick={handleCancelInTab}
          className="w-full min-h-[40px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>إلغاء تسجيل الدخول</span>
        </button>
      )}

      {popupBlocked && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2.5 text-right"
        >
          <p className="leading-relaxed">
            قام المتصفح بحظر النافذة المنبثقة لتسجيل الدخول عبر Google. يمكنك المتابعة في هذه الصفحة بدلاً من ذلك أو إلغاء المحاولة.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startRedirectFlow}
              className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-100 font-bold transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>المتابعة في نفس الصفحة</span>
            </button>
            <button
              type="button"
              onClick={() => setPopupBlocked(false)}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-semibold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {errorState && (
        <AuthErrorBanner
          errorCode={errorState.code}
          referenceId={errorState.referenceId}
          customMessage={errorState.message}
          onRetry={handleSignIn}
        />
      )}
    </div>
  );
}
