"use client";

import { useState } from "react";
import { AlertCircle, Check, Copy, RefreshCw } from "lucide-react";
import { resolveUserFacingAuthError } from "@/lib/auth-errors-ui";

export default function AuthErrorBanner({
  errorCode,
  referenceId,
  customMessage,
  onRetry,
}) {
  const [copied, setCopied] = useState(false);

  if (!errorCode && !customMessage) return null;

  const resolved = errorCode
    ? resolveUserFacingAuthError(errorCode, referenceId)
    : null;

  const title = resolved?.title || "تنبيه المصادقة";
  const message = customMessage || resolved?.message;
  const actionHint = resolved?.actionHint;
  const ref = resolved?.referenceId || referenceId || null;
  const canRetry = resolved?.canRetry ?? Boolean(onRetry);

  const handleCopyRef = async () => {
    if (!ref || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-200 text-xs space-y-2.5 animate-in fade-in duration-200"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle
          className="w-4 h-4 shrink-0 text-rose-400 mt-0.5"
          aria-hidden="true"
        />
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-rose-200">{title}</span>
            {resolved?.categoryLabel && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/25 text-[10px] font-semibold text-rose-300">
                {resolved.categoryLabel}
              </span>
            )}
          </div>
          <p className="leading-relaxed text-rose-200/90">{message}</p>
          {actionHint && (
            <p className="text-[11px] text-rose-300/80 leading-relaxed">
              {actionHint}
            </p>
          )}
        </div>
      </div>

      {(ref || (canRetry && onRetry)) && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-rose-500/15">
          {ref ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-rose-300/80">المرجع:</span>
              <code
                dir="ltr"
                className="px-2 py-0.5 rounded-lg bg-zinc-950/70 border border-rose-500/25 font-mono text-[11px] text-rose-200"
              >
                {ref}
              </code>
              <button
                type="button"
                onClick={handleCopyRef}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-[11px] text-rose-200 transition-colors cursor-pointer"
                aria-label="نسخ رمز المرجع"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>نسخ</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <span />
          )}

          {canRetry && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 font-semibold text-[11px] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>إعادة المحاولة</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
