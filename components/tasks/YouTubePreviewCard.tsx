"use client";

import { ExternalLink, Link2, Play, X } from "lucide-react";

export interface YouTubeMeta {
  videoId: string;
  url: string;
  title: string;
  channelName: string;
  channelUrl?: string | null;
  channelAvatar?: string | null;
  thumbnailUrl: string;
}

export function isValidHttpUrl(raw: string): boolean {
  const trimmed = (raw || "").trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.hostname.includes(".")
    );
  } catch {
    return false;
  }
}

export function normalizeYouTubeMetaList(
  raw: YouTubeMeta | YouTubeMeta[] | null | undefined
): YouTubeMeta[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.filter((item): item is YouTubeMeta => Boolean(item?.videoId));
}

export default function YouTubePreviewCard({
  meta,
  compact = false,
  readOnly = false,
  onRemove,
}: {
  meta?: YouTubeMeta | null;
  compact?: boolean;
  readOnly?: boolean;
  onRemove?: () => void;
}) {
  if (!meta?.videoId) return null;

  const thumbSize = compact ? "w-20 h-12" : "w-24 h-14";

  const thumbnailContent = meta.thumbnailUrl ? (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={meta.thumbnailUrl}
        alt={meta.title}
        className="w-full h-full object-cover"
      />
      <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-red-600/90 text-white flex items-center justify-center">
        <Play className="w-2.5 h-2.5 fill-white" />
      </span>
    </>
  ) : (
    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-400">
      <Link2 className="w-5 h-5" />
    </div>
  );

  return (
    <div
      className={`group/yt relative flex items-center gap-3 rounded-2xl border border-red-500/25 bg-zinc-900/80 overflow-hidden ${
        compact ? "p-2" : "p-2.5"
      } ${readOnly ? "select-none cursor-default" : ""}`}
    >
      {readOnly ? (
        <div
          className={`relative shrink-0 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 ${thumbSize}`}
        >
          {thumbnailContent}
        </div>
      ) : (
        <a
          href={meta.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`relative shrink-0 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 ${thumbSize}`}
          title="فتح الفيديو على يوتيوب"
        >
          {thumbnailContent}
        </a>
      )}

      <div className="flex-1 min-w-0 text-right space-y-1">
        {readOnly ? (
          <div className="text-xs font-bold text-zinc-100 line-clamp-1 flex items-center gap-1">
            <span className="truncate">{meta.title}</span>
          </div>
        ) : (
          <a
            href={meta.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-bold text-zinc-100 hover:text-red-300 transition-colors line-clamp-1 flex items-center gap-1"
          >
            <span className="truncate">{meta.title}</span>
            <ExternalLink className="w-3 h-3 text-zinc-500 shrink-0" />
          </a>
        )}

        <div className="flex items-center gap-1.5 min-w-0">
          {meta.channelAvatar ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={meta.channelAvatar}
              alt={meta.channelName}
              referrerPolicy="no-referrer"
              className="w-4 h-4 rounded-full object-cover border border-zinc-700 shrink-0"
            />
          ) : (
            <span className="w-4 h-4 rounded-full bg-red-600/25 border border-red-500/30 text-red-300 text-[9px] font-bold flex items-center justify-center shrink-0">
              {meta.channelName?.[0] || "Y"}
            </span>
          )}
          <span className="text-[11px] text-zinc-400 truncate">{meta.channelName}</span>
        </div>
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
          aria-label="إزالة رابط اليوتيوب"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
