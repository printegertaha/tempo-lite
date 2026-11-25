"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { getSafeReturnUrl } from "@/lib/auth-redirect";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import AuthErrorBanner from "@/components/auth/AuthErrorBanner";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams?.get("error");
  const urlRef = searchParams?.get("ref");
  const rawReturnTo = searchParams?.get("returnTo");
  const returnTo = getSafeReturnUrl(rawReturnTo, "/");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const clearUrlError = () => {
    const nextUrl = rawReturnTo
      ? `/register?returnTo=${encodeURIComponent(returnTo)}`
      : "/register";
    router.replace(nextUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setFormError("");

    if (!name.trim()) {
      setFormError("يرجى إدخال الاسم");
      return;
    }
    if (!email.trim()) {
      setFormError("يرجى إدخال البريد الإلكتروني");
      return;
    }
    if (!password || password.length < 6) {
      setFormError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    try {
      setLoading(true);

      const res = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (res?.error) {
        setFormError(
          res.error.message ||
            (res.error.status === 422
              ? "البريد الإلكتروني مسجل بالفعل أو غير صالح"
              : "حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.")
        );
        setLoading(false);
        return;
      }

      router.push(returnTo);
      router.refresh();
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Sign up error:", err);
      }
      setFormError("حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-14rem)] flex flex-col justify-start sm:justify-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-violet-600/15 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 left-10 w-64 h-64 bg-indigo-600/10 blur-[100px] pointer-events-none rounded-full" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-1.5 relative z-10 px-4">
        <h1 className="text-xl sm:text-2xl font-black text-zinc-100">
          إنشاء حساب جديد
        </h1>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
          سجل مباشرة بحساب Google أو أنشئ حساباً بالبريد الإلكتروني
        </p>
      </div>

      {/* Main Card */}
      <div className="mt-5 sm:mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0e17]/95 border border-zinc-800/80 shadow-2xl backdrop-blur-xl space-y-5">
          {/* Structured Auth Error Banner */}
          {(formError || urlError) && (
            <AuthErrorBanner
              errorCode={formError ? null : urlError}
              referenceId={formError ? null : urlRef}
              customMessage={formError || null}
              onRetry={urlError && !formError ? clearUrlError : undefined}
            />
          )}

          {/* Google OAuth Sign-Up */}
          <GoogleSignInButton
            returnTo={returnTo}
            label="التسجيل السريع باستخدام Google"
          />

          {/* Divider */}
          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-zinc-800/80" />
            <span className="shrink-0 px-3 text-[11px] font-medium text-zinc-400">
              أو إنشاء حساب بالبريد
            </span>
            <div className="flex-grow border-t border-zinc-800/80" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="register-name"
                className="block text-xs font-semibold text-zinc-300 mb-1.5"
              >
                الاسم الكامل
              </label>
              <div className="relative">
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  enterKeyHint="next"
                  required
                  aria-invalid={submitted && !name.trim() ? "true" : "false"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: طه"
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-3 pr-10 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 transition-all"
                />
                <User className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="block text-xs font-semibold text-zinc-300 mb-1.5"
              >
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  spellCheck={false}
                  enterKeyHint="next"
                  required
                  aria-invalid={submitted && !email.trim() ? "true" : "false"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  dir="ltr"
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-3 pl-10 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 transition-all text-left"
                />
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="block text-xs font-semibold text-zinc-300 mb-1.5"
              >
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  enterKeyHint="done"
                  minLength={6}
                  required
                  aria-invalid={
                    submitted && (!password || password.length < 6)
                      ? "true"
                      : "false"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-3 pl-10 pr-10 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 transition-all text-left"
                />
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-bold shadow-xl shadow-violet-600/30 transition-all duration-200 cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>جارٍ إنشاء الحساب...</span>
                </>
              ) : (
                <span>إنشاء الحساب والبدء فوراً</span>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div className="flex items-center justify-center gap-1 pt-3 text-center text-xs text-zinc-400 border-t border-zinc-800/80">
            <span>لديك حساب بالفعل؟ </span>
            <Link
              href="/login"
              className="text-violet-400 hover:text-violet-300 font-bold transition-colors"
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#08090d] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
