import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import { processSyncBatch } from "@/lib/sync/server-handler";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED: Active session required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const result = await processSyncBatch(session.user.id, body);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Batch sync API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "INTERNAL_SYNC_ERROR",
      },
      { status: 500 }
    );
  }
}

