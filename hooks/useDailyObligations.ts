"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  localTrackerRepo,
  localEntryRepo,
  localPrayerRepo,
  type LocalPrayerRecord,
  type LocalTask,
} from "@/lib/local-db";
import { selectDailyObligations, type DailyObligationSummary } from "@/lib/daily-obligations";

export function useDailyObligations(params: {
  userId: string;
  todayStr: string;
  timezone?: string;
  tasks: LocalTask[];
  userPreferences?: {
    religion?: string | null;
    prayerTrackingEnabled?: boolean;
    weekStartDay?: number;
  } | null;
  initialPrayers?: LocalPrayerRecord[];
}) {
  const {
    userId,
    todayStr,
    timezone,
    tasks,
    userPreferences,
    initialPrayers = [],
  } = params;

  const [trackers, setTrackers] = useState<any[]>([]);
  const [trackerEntries, setTrackerEntries] = useState<any[]>([]);
  const [prayersToday, setPrayersToday] = useState<LocalPrayerRecord[]>(initialPrayers);
  const [auxLoaded, setAuxLoaded] = useState(false);

  const loadAuxStores = useCallback(async () => {
    const owner = userId || "guest";
    try {
      const [localTrackers, localEntries, localPrayers] = await Promise.all([
        localTrackerRepo.getAllForUser(owner, false).catch(() => []),
        localEntryRepo.getAllForUser(owner).catch(() => []),
        localPrayerRepo.getByDate(owner, todayStr).catch(() => []),
      ]);
      setTrackers(Array.isArray(localTrackers) ? localTrackers : []);
      setTrackerEntries(Array.isArray(localEntries) ? localEntries : []);
      setPrayersToday(Array.isArray(localPrayers) ? localPrayers : []);
    } finally {
      setAuxLoaded(true);
    }
  }, [userId, todayStr]);

  useEffect(() => {
    void loadAuxStores();

    const refreshHandler = () => {
      void loadAuxStores();
    };
    window.addEventListener("athar_data_synced", refreshHandler);
    window.addEventListener("athar_tasks_updated", refreshHandler);
    window.addEventListener("athar_prayers_updated", refreshHandler);
    window.addEventListener("athar_entries_updated", refreshHandler);
    return () => {
      window.removeEventListener("athar_data_synced", refreshHandler);
      window.removeEventListener("athar_tasks_updated", refreshHandler);
      window.removeEventListener("athar_prayers_updated", refreshHandler);
      window.removeEventListener("athar_entries_updated", refreshHandler);
    };
  }, [loadAuxStores]);

  const obligations: DailyObligationSummary = useMemo(
    () =>
      selectDailyObligations({
        todayStr,
        timezone,
        weekStartDay:
          typeof userPreferences?.weekStartDay === "number"
            ? userPreferences.weekStartDay
            : 6,
        tasks,
        trackers,
        trackerEntries,
        prayersToday,
        userPreferences,
      }),
    [todayStr, timezone, tasks, trackers, trackerEntries, prayersToday, userPreferences]
  );

  return {
    obligations,
    auxLoaded,
    refreshObligations: loadAuxStores,
  };
}
