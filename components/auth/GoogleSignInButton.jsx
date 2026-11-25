"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { getSafeReturnUrl } from "@/lib/auth-redirect";
import { Loader2 } from "lucide-react";
import AuthErrorBanner from "./AuthErrorBanner";

export default function GoogleSignInButton({
  returnTo,
  className = "",
  label = "المتابعة باستخدام Google",
}) {
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setErrorState(null);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setLoading(false);
        setErrorState({
          code: "oauth_timeout",
          message:
            "استغرقت الاستجابة وقتاً أطول من المتوقع. يرجى التحقق من اتصال الإنترنت وإعدادات الخادم والمحاولة ثانية.",
        });
      }, 15000);

      const destination = returnTo || searchParams?.get("returnTo");
      const safeCallback = getSafeReturnUrl(destination, "/");
      const safeErrorCallback =
        pathname === "/register" ? "/register" : "/login";

      const res = await authClient.signIn.social({
        provider: "google",
        callbackURL: safeCallback,
        errorCallbackURL: safeErrorCallback,
      });

      if (res?.error) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setLoading(false);

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

        const referenceId = nestedErr?.referenceId || errObj?.referenceId || null;

        setErrorState({
          code: String(errCode),
          referenceId,
          message:
            typeof nestedErr?.message === "string" ? nestedErr.message : null,
        });
        return;
      }

      if (res?.data?.url) {
        window.location.href = res.data.url;
      } else {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setLoading(false);
        setErrorState({
          code: "no_redirect_url",
          message:
            "لم يرجع الخادم رابط التوجيه إلى Google. يرجى المحاولة مرة أخرى.",
        });
      }
    } catch (error) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (process.env.NODE_ENV === "development") {
        console.error("Google sign in unexpected error:", error);
      }
      setLoading(false);
      setErrorState({
        code: "unexpected_client_error",
        message:
          "حدث خطأ غير متوقع أثناء محاولة التحويل إلى Google. يرجى المحاولة مرة أخرى.",
      });
    }
  };

  return (
    <div className="w-full space-y-3">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading}
        aria-busy={loading}
        className={`w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-700/80 hover:border-zinc-500 text-zinc-100 text-xs sm:text-sm font-bold shadow-xl hover:shadow-violet-600/10 transition-all duration-200 cursor-pointer active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed group ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
            <span>جارٍ التحويل إلى Google...</span>
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
            <span>{label}</span>
          </>
        )}
      </button>

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
