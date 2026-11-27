import { NextRequest, NextResponse } from "next/server";

function extractYouTubeVideoId(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl.trim());
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{6,15}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = parsed.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{6,15}$/.test(v)) return v;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if ((parts[0] === "shorts" || parts[0] === "live" || parts[0] === "embed") && parts[1]) {
        return /^[a-zA-Z0-9_-]{6,15}$/.test(parts[1]) ? parts[1] : null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function fetchChannelAvatar(channelUrl?: string | null): Promise<string | null> {
  if (!channelUrl) return null;
  try {
    const res = await fetch(channelUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AtharBot/1.0)",
        "Accept-Language": "ar,en;q=0.9",
      },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
      || html.match(/<link\s+rel=["']image_src["']\s+href=["']([^"']+)["']/i);
    return ogMatch?.[1] || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url") || "";
  const videoId = extractYouTubeVideoId(rawUrl);

  if (!videoId) {
    return NextResponse.json(
      { success: false, error: "يرجى إدخال رابط يوتيوب صحيح" },
      { status: 400 }
    );
  }

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;
    const res = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: "تعذر جلب بيانات الفيديو من يوتيوب" },
        { status: 404 }
      );
    }

    const data = await res.json();
    const channelUrl = data?.author_url || null;
    const channelAvatar = await fetchChannelAvatar(channelUrl);

    return NextResponse.json(
      {
        success: true,
        data: {
          videoId,
          url: canonicalUrl,
          title: data?.title || "فيديو يوتيوب",
          channelName: data?.author_name || "قناة يوتيوب",
          channelUrl,
          channelAvatar,
          thumbnailUrl:
            data?.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        },
      },
      { headers: { "Cache-Control": "private, max-age=3600" } }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "تعذر الاتصال بخدمة يوتيوب حالياً" },
      { status: 502 }
    );
  }
}
