import prisma from "@/lib/prisma";
import { getLocalDateString } from "@/lib/dates";

/**
 * Resolve the authenticated user's configured IANA timezone on the server,
 * returning both the timezone and the user's current local calendar date.
 */
export async function getServerUserTemporalContext(userId?: string | null): Promise<{
  timezone: string;
  todayStr: string;
}> {
  if (!userId || userId === "guest") {
    const timezone = "Asia/Riyadh";
    return { timezone, todayStr: getLocalDateString(new Date(), timezone) };
  }

  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    const timezone = settings?.timezone || "Asia/Riyadh";
    return {
      timezone,
      todayStr: getLocalDateString(new Date(), timezone),
    };
  } catch {
    const timezone = "Asia/Riyadh";
    return { timezone, todayStr: getLocalDateString(new Date(), timezone) };
  }
}
