"use client";

import { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`py-12 px-4 text-center rounded-3xl border border-dashed border-zinc-800/80 bg-zinc-950/30 space-y-3.5 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
        {icon}
      </div>
      <div className="space-y-1 max-w-sm mx-auto">
        <h4 className="text-sm font-bold text-zinc-200">{title}</h4>
        {description && (
          <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

