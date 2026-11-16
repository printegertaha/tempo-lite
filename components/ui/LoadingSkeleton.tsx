"use client";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-zinc-800/40 border border-zinc-800/20 ${className}`}
    />
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 space-y-3 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-5 h-5 rounded-lg bg-zinc-800" />
          <div className="h-4 bg-zinc-800 rounded-md w-2/3" />
        </div>
        <div className="h-5 w-14 rounded-full bg-zinc-800" />
      </div>
      <div className="flex items-center gap-3 pt-1">
        <div className="h-3 w-16 bg-zinc-800/60 rounded" />
        <div className="h-3 w-20 bg-zinc-800/60 rounded" />
      </div>
    </div>
  );
}

export function TaskListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <TaskCardSkeleton key={i} />
      ))}
    </div>
  );
}

