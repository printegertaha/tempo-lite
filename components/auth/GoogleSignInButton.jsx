"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { getSafeReturnUrl } from "@/lib/auth-redirect";
import { Loader2, AlertCircle } from "lucide-react";

export default function GoogleSignInButton({
  returnTo,
  className = "",
  label = "سجل بـ",
}) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const searchParams = useSearchParams();
  const timeoutRef = useRef(null);

  // Clear timeout on unmount
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
      setErrorMessage("");

      // Safety timeout: If redirect or network hangs for >15s, release the button
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setLoading(false);
        setErrorMessage(
          "استغرقت الاستجابة وقتاً أطول من المتوقع. يرجى التحقق من اتصال الإنترنت أو إعدادات Google والمحاولة ثانية.",
        );
      }, 15000);

      const destination = returnTo || searchParams?.get("returnTo");
      const safeCallback = getSafeReturnUrl(destination, "/");

      const res = await authClient.signIn.social({
        provider: "google",
        callbackURL: safeCallback,
      });

      // Better Auth returns { data, error } without throwing
      if (res?.error) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const detailedError =
          res.error.message ||
          res.error.statusText ||
          (res.error.status
            ? `HTTP ${res.error.status}`
            : JSON.stringify(res.error));
        console.error(
          "Google sign in error from Better Auth:",
          detailedError,
          res.error,
        );
        setLoading(false);
        setErrorMessage(
          res.error.message ||
            (res.error.status === 500
              ? "حدث خطأ في خادم المصادقة (500). يرجى التأكد من تشغيل الخادم بعد تحديث قاعدة البيانات."
              : "تعذر بدء تسجيل الدخول عبر Google. يرجى التحقق من إعدادات الحساب والمحاولة ثانية."),
        );
        return;
      }

      // Explicit fallback in case automatic client plugin did not trigger window navigation
      if (res?.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (error) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      console.error("Google sign in unexpected error:", error);
      setLoading(false);
      setErrorMessage(
        "حدث خطأ غير متوقع أثناء محاولة التحويل إلى Google. يرجى المحاولة مرة أخرى.",
      );
    }
  };

  return (
    <div className="w-full space-y-3">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-750 hover:border-zinc-600 text-zinc-100 text-sm font-bold shadow-xl hover:shadow-violet-600/10 transition-all duration-200 cursor-pointer active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed group ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
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
          </>
        ) : (
          <>
            {/* Official Google G Logo SVG */}
            <span>{label}</span>
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
          </>
        )}
      </button>

      {errorMessage && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-right animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
