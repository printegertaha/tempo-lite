import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;
    if (!userId) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const [settings, user] = await Promise.all([
      prisma.userSettings.findUnique({
        where: { userId },
        select: { dashboardConfig: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { image: true },
      }),
    ]);

    const cfg =
      settings?.dashboardConfig && typeof settings.dashboardConfig === "object"
        ? (settings.dashboardConfig as Record<string, any>)
        : {};

    const rawDataUrl =
      typeof cfg.avatarData === "string" && cfg.avatarData.startsWith("data:image/")
        ? cfg.avatarData
        : typeof user?.image === "string" && user.image.startsWith("data:image/")
          ? user.image
          : null;

    if (!rawDataUrl) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const match = rawDataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/i);
    if (!match) {
      return new NextResponse("Invalid Image", { status: 400 });
    }

    const mimeType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
    const buffer = Buffer.from(match[2], "base64");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[Avatar Route Error]:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
