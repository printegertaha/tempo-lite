"use client";

import { useAthar } from "./context/AtharContext";
import { CheckCircle2, Info, AlertCircle } from "lucide-react";

export default function Toast() {
  const { toast } = useAthar();

  if (!toast) return null;

  const isSuccess = toast.type === "success";
  const isInfo = toast.type === "info";

  return (
    <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[90%] sm:w-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div 
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl ${
          isSuccess 
            ? "bg-zinc-900/95 border-emerald-500/40 text-emerald-200 shadow-emerald-950/40" 
            : isInfo 
            ? "bg-zinc-900/95 border-cyan-500/40 text-cyan-200 shadow-cyan-950/40"
            : "bg-zinc-900/95 border-rose-500/40 text-rose-200 shadow-rose-950/40"
        }`}
      >
        <span className="shrink-0">
          {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {isInfo && <Info className="w-5 h-5 text-cyan-400" />}
          {!isSuccess && !isInfo && <AlertCircle className="w-5 h-5 text-rose-400" />}
        </span>
        <p className="text-sm font-medium leading-relaxed">{toast.message}</p>
      </div>
    </div>
  );
}

