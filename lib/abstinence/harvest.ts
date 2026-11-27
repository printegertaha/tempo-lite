import { addDaysToDateString, getLocalDateString, getUtcStartOfLocalDate } from "@/lib/dates";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const POSITIVE_POOL = [
  "بقيت إنسان أفضل",
  "صحتك بقت أفضل",
  "مخك بقى أفضل",
  "أنت بقيت كويس",
  "إرادتك بقت أقوى",
  "يوم أنظف وذهن أصفى",
];

function pickContextualMessage(trackerName: string): string | null {
  const name = trackerName.toLowerCase();
  if (/تدخين|سجائر|سيجار|فيب|نيكوتين|شيشة/.test(name)) {
    return "رئتك بقت أفضل";
  }
  if (/سوشيال|تواصل|موبايل|هاتف|يوتيوب|تيك توك|ألعاب|فيديو|سهر/.test(name)) {
    return "مخك بقى أفضل";
  }
  if (/سكر|حلويات|وجبات|أكل|طعام|كافيين|قهوة|مشروبات/.test(name)) {
    return "صحتك بقت أفضل";
  }
  if (/إباحي|محتوى|عادة/.test(name)) {
    return "بقيت إنسان أفضل";
  }
  return null;
}

export function getEncryptedAbstinenceMessage(
  trackerName: string,
  index: number,
  usedMessages?: Set<string>
): string {
  const contextual = pickContextualMessage(trackerName);
  if (contextual && (!usedMessages || !usedMessages.has(contextual))) {
    usedMessages?.add(contextual);
    return contextual;
  }

  for (const candidate of POSITIVE_POOL) {
    if (!usedMessages || !usedMessages.has(candidate)) {
      usedMessages?.add(candidate);
      return candidate;
    }
  }

  return POSITIVE_POOL[index % POSITIVE_POOL.length];
}

export function formatAbstinenceRevealText(trackerName: string): string {
  const clean = (trackerName || "").trim();
  if (!clean) return "امتنعت عن هذا السلوك";
  if (clean.startsWith("امتنعت عن ")) return clean;
  if (clean.startsWith("الامتناع عن ")) {
    return `امتنعت عن ${clean.slice("الامتناع عن ".length).trim()}`;
  }
  return `امتنعت عن ${clean}`;
}

export interface AbstinenceTrackerInput {
  id: string;
  name: string;
}

export interface AbstinenceSessionInput {
  id: string;
  abstinenceTrackerId?: string;
  trackerId?: string;
  startedAt: string;
  endedAt?: string | null;
}

export interface AbstinenceHarvestAchievement {
  id: string;
  trackerId: string;
  trackerName: string;
  milestoneDays: number;
  encryptedText: string;
  revealedText: string;
}

/**
 * Computes positive 24-hour abstinence achievements for a specific local date.
 * Relapses are excluded; only completed 24h milestones (24h, 48h, 72h, ...)
 * whose milestone timestamp falls on `selectedDate` are returned.
 */
export function computeAbstinenceAchievementsForDate(params: {
  trackers: AbstinenceTrackerInput[];
  sessions: AbstinenceSessionInput[];
  selectedDate: string;
  timezone: string;
  nowMs?: number;
}): AbstinenceHarvestAchievement[] {
  const { trackers, sessions, selectedDate, timezone, nowMs = Date.now() } = params;
  if (!trackers.length || !sessions.length) return [];

  const todayStr = getLocalDateString(new Date(nowMs), timezone);
  if (selectedDate > todayStr) return [];

  const dayStartMs = getUtcStartOfLocalDate(selectedDate, timezone).getTime();
  const nextDayStr = addDaysToDateString(selectedDate, 1);
  const dayEndMs = getUtcStartOfLocalDate(nextDayStr, timezone).getTime();
  const effectiveDayEndMs = Math.min(dayEndMs, nowMs);

  if (effectiveDayEndMs <= dayStartMs) return [];

  const sessionsByTracker = new Map<string, AbstinenceSessionInput[]>();
  for (const s of sessions) {
    const tid = s.abstinenceTrackerId || s.trackerId;
    if (!tid) continue;
    const list = sessionsByTracker.get(tid) || [];
    list.push(s);
    sessionsByTracker.set(tid, list);
  }

  const usedMessages = new Set<string>();
  const results: AbstinenceHarvestAchievement[] = [];

  for (const tracker of trackers) {
    const trackerSessions = sessionsByTracker.get(tracker.id) || [];
    let bestMilestoneDays = 0;

    for (const s of trackerSessions) {
      const startMs = new Date(s.startedAt).getTime();
      if (!Number.isFinite(startMs)) continue;

      const sessionEndMs = s.endedAt ? new Date(s.endedAt).getTime() : nowMs;
      if (!Number.isFinite(sessionEndMs)) continue;

      const effectiveEndMs = Math.min(sessionEndMs, effectiveDayEndMs);
      if (effectiveEndMs <= startMs) continue;

      const milestonesReached = Math.floor((effectiveEndMs - startMs) / MS_PER_DAY);
      if (milestonesReached < 1) continue;

      const latestMilestoneMs = startMs + milestonesReached * MS_PER_DAY;
      if (latestMilestoneMs >= dayStartMs && latestMilestoneMs <= effectiveEndMs) {
        if (milestonesReached > bestMilestoneDays) {
          bestMilestoneDays = milestonesReached;
        }
      }
    }

    if (bestMilestoneDays >= 1) {
      const encryptedText = getEncryptedAbstinenceMessage(
        tracker.name,
        results.length,
        usedMessages
      );
      results.push({
        id: `${tracker.id}:${selectedDate}`,
        trackerId: tracker.id,
        trackerName: tracker.name,
        milestoneDays: bestMilestoneDays,
        encryptedText,
        revealedText: formatAbstinenceRevealText(tracker.name),
      });
    }
  }

  return results;
}
