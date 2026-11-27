"use client";

import { Suspense, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useProgressRouter } from "@/hooks/useProgressRouter";
import { useAthar } from "@/components/context/AtharContext";
import { authClient } from "@/lib/auth-client";
import { useLocalSession } from "@/hooks/useLocalSession";
import { syncEngine } from "@/lib/sync/sync-engine";
import { getUserSettings, updateUserProfile } from "@/actions/settings";
import { getLifeAreas } from "@/actions/life-areas";
import {
  exportCloudBackup,
  restoreCloudBackup,
  clearCloudUserData,
} from "@/actions/backup";
import {
  getLocalDB,
  clearAllLocalIndexedDB,
  localTaskRepo,
  localTaskSessionRepo,
  localRevisionRepo,
  localTrackerRepo,
  localEntryRepo,
  localNoteRepo,
  localPrayerRepo,
  localAbstinenceRepo,
  localLifeAreaRepo,
  localDomainRepo,
  localSyncMetaRepo,
  localOutboxRepo,
  localOnboardingRepo,
} from "@/lib/local-db";
import {
  isIslamicFeatureVisible,
  normalizeSalutation,
  normalizeReligion,
} from "@/lib/onboarding";
import LifeAreasManager from "@/components/settings/LifeAreasManager";
import SettingsSidebar, {
  SETTINGS_SECTIONS,
  VALID_SECTION_IDS,
} from "@/components/settings/SettingsSidebar";
import ProfileSection from "@/components/settings/sections/ProfileSection";
import LocalizationSection from "@/components/settings/sections/LocalizationSection";
import PrayersSection from "@/components/settings/sections/PrayersSection";
import PreferencesSection from "@/components/settings/sections/PreferencesSection";
import DataSection from "@/components/settings/sections/DataSection";
import {
  buildDefaultLocalizationPreferences,
  getCountryByCodeOrName,
  getCountryFromTimezone,
} from "@/lib/localization";
import {
  AlertTriangle,
  Loader2,
  LogIn,
  X,
} from "lucide-react";

async function resizeAvatarImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(String(reader.result || ""));
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const out = canvas.toDataURL("image/webp", 0.85);
        resolve(out.startsWith("data:image/") ? out : canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("تعذر قراءة ملف الصورة"));
      img.src = String(reader.result || "");
    };
    reader.onerror = () => reject(new Error("تعذر فتح ملف الصورة"));
    reader.readAsDataURL(file);
  });
}

function broadcastPreferencesLocally(nextProfile, userId = "guest") {
  if (typeof window === "undefined") return;
  try {
    if (userId && userId !== "guest") {
      localStorage.setItem(`athar_user_settings:${userId}`, JSON.stringify(nextProfile));
    }
    localStorage.setItem("athar_user_settings", JSON.stringify(nextProfile));
    queueMicrotask(() => {
      window.dispatchEvent(
        new CustomEvent("athar_preferences_updated", { detail: nextProfile })
      );
    });
  } catch {}
}

function mapSettingsRecordToProfile(rawSettings, prev, userObj) {
  if (!rawSettings || typeof rawSettings !== "object") return prev;
  const cfg = rawSettings.dashboardConfig || rawSettings;
  const resolvedCountry =
    getCountryByCodeOrName(
      rawSettings.countryCode || cfg.countryCode || cfg.country
    ) ||
    getCountryFromTimezone(rawSettings.timezone) ||
    getCountryByCodeOrName("EG");
  const resolvedGov =
    rawSettings.governorate ||
    cfg.governorate ||
    cfg.city ||
    resolvedCountry?.defaultRegion ||
    "القاهرة";
  const resolvedCurrencyAuto =
    rawSettings.currencyAuto ?? cfg.currencyAuto ?? true;
  const resolvedCurrency =
    rawSettings.currency ||
    cfg.currency ||
    resolvedCountry?.defaultCurrency ||
    "EGP";
  const resolvedPrayerEnabled =
    rawSettings.prayerTrackingEnabled ??
    cfg.prayerTrackingEnabled ??
    true;
  const dbUser = rawSettings.userProfile || {};

  const resolvedName =
    rawSettings.name ||
    rawSettings.profileName ||
    dbUser.name ||
    userObj?.name ||
    prev.name;
  const resolvedImage =
    rawSettings.image !== undefined
      ? rawSettings.image
      : rawSettings.profileImage !== undefined
      ? rawSettings.profileImage
      : dbUser.image !== undefined
      ? dbUser.image
      : userObj?.image ?? prev.image;

  return {
    ...prev,
    name: resolvedName,
    email: rawSettings.email || dbUser.email || userObj?.email || prev.email,
    image: resolvedImage,
    profileName: resolvedName,
    profileImage: resolvedImage,
    monthlySalary: Number(cfg.monthlySalary ?? rawSettings.monthlySalary ?? 0) || 0,
    timezone:
      rawSettings.timezone ||
      resolvedCountry?.defaultTimezone ||
      prev.timezone,
    timezoneAuto: cfg.timezoneAuto ?? rawSettings.timezoneAuto ?? true,
    weekStartDay: rawSettings.weekStartDay ?? prev.weekStartDay,
    themeAccent: rawSettings.themeAccent || prev.themeAccent,
    countryCode: resolvedCountry?.code || prev.countryCode,
    country: resolvedCountry?.nameAr || cfg.country || prev.country,
    governorate: resolvedGov,
    city:
      rawSettings.city !== undefined
        ? rawSettings.city || ""
        : cfg.city || "",
    currency: String(resolvedCurrency).toUpperCase(),
    currencyAuto: Boolean(resolvedCurrencyAuto),
    prayerTrackingEnabled: Boolean(resolvedPrayerEnabled),
    prayerPreferenceConfigured:
      cfg.prayerPreferenceConfigured ?? rawSettings.prayerPreferenceConfigured ?? true,
    prayerCalc:
      cfg.prayerCalc ||
      rawSettings.prayerCalc ||
      resolvedCountry?.defaultPrayerCalc ||
      prev.prayerCalc,
    asrMethod: cfg.asrMethod || rawSettings.asrMethod || prev.asrMethod,
    density: cfg.density || rawSettings.density || prev.density,
    soundEffects: cfg.soundEffects ?? rawSettings.soundEffects ?? prev.soundEffects,
    dailyQuote: cfg.dailyQuote ?? rawSettings.dailyQuote ?? prev.dailyQuote,
    tagline: cfg.tagline || rawSettings.tagline || prev.tagline,
    role: cfg.role || rawSettings.role || prev.role,
    salutation:
      normalizeSalutation(rawSettings.salutation) ??
      normalizeSalutation(cfg.salutation) ??
      prev.salutation ??
      null,
    religion:
      normalizeReligion(rawSettings.religion) ??
      normalizeReligion(cfg.religion) ??
      prev.religion ??
      null,
    onboardingCompleted:
      rawSettings.onboardingCompleted !== undefined
        ? Boolean(rawSettings.onboardingCompleted)
        : cfg.onboardingCompleted !== undefined
          ? Boolean(cfg.onboardingCompleted)
          : prev.onboardingCompleted ?? true,
    onboardingStep:
      Number(rawSettings.onboardingStep ?? cfg.onboardingStep ?? prev.onboardingStep ?? 3) || 3,
    onboardingCompletedAt:
      rawSettings.onboardingCompletedAt ??
      cfg.onboardingCompletedAt ??
      prev.onboardingCompletedAt ??
      null,
    preferencesUpdatedAt:
      cfg.preferencesUpdatedAt || rawSettings.preferencesUpdatedAt || prev.preferencesUpdatedAt,
  };
}

function SettingsWorkspace() {
  const router = useProgressRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawSection = searchParams.get("section");
  const activeSection = VALID_SECTION_IDS.has(rawSection) ? rawSection : "profile";
  const activeSectionMeta =
    SETTINGS_SECTIONS.find((s) => s.id === activeSection) || SETTINGS_SECTIONS[0];

  const {
    expensesData,
    nutritionData,
    gymData,
    prayerSchedule,
    openPrayerScheduleModal,
    showToast,
  } = useAthar();

  const {
    user: localUser,
    userId: activeUserId,
    isGuest,
    isPending: sessionPending,
  } = useLocalSession();
  const [isPending, startTransition] = useTransition();

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetScope, setResetScope] = useState("local"); // "local" | "cloud_and_local"
  const [isResetting, setIsResetting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lifeAreas, setLifeAreas] = useState([]);
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("athar_settings_guest_banner_dismissed") === "1";
    } catch {
      return false;
    }
  });

  const handleDismissGuestBanner = () => {
    setGuestBannerDismissed(true);
    try {
      localStorage.setItem("athar_settings_guest_banner_dismissed", "1");
    } catch {}
  };

  // User Profile & System Preferences State
  const [profileHydrated, setProfileHydrated] = useState(false);
  const [profile, setProfile] = useState(() => ({
    name: "مستخدم أثـر",
    tagline: "باحث عن الأثر الحقيقي وعمارة الوقت",
    email: "",
    image: null,
    role: "مهتم بالإنتاجية والانضباط",
    avatarColor: "violet",
    monthlySalary: 0,

    ...buildDefaultLocalizationPreferences("Africa/Cairo"),
    asrMethod: "standard",

    weekStartDay: 6, // 6 = Saturday
    themeAccent: "violet",
    density: "comfortable",
    soundEffects: true,
    reminders: true,
    dailyQuote: true,
  }));

  const handleSelectSection = (sectionId) => {
    if (!VALID_SECTION_IDS.has(sectionId)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", sectionId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Load preferences and life areas Local-First (IDB immediate -> background sync refresh)
  useEffect(() => {
    let isCancelled = false;

    async function hydrateFromLocal() {
      try {
        const [localSettings, localAreas] = await Promise.all([
          localSyncMetaRepo.getUserSettings(activeUserId).catch(() => null),
          localLifeAreaRepo.getAllForUser(activeUserId, true).catch(() => []),
        ]);
        if (isCancelled) return;

        if (Array.isArray(localAreas)) {
          setLifeAreas(localAreas);
        }

        let resolvedRaw = localSettings;
        if (!resolvedRaw && typeof window !== "undefined") {
          try {
            const scoped =
              localStorage.getItem(`athar_user_settings:${activeUserId}`) ||
              (isGuest ? localStorage.getItem("athar_user_settings") : null);
            if (scoped) resolvedRaw = JSON.parse(scoped);
          } catch {}
        }

        if (resolvedRaw) {
          let computedNext = null;
          setProfile((prev) => {
            const next = mapSettingsRecordToProfile(resolvedRaw, prev, localUser);
            computedNext = next;
            return next;
          });
          queueMicrotask(() => {
            if (!isCancelled && computedNext) {
              broadcastPreferencesLocally(computedNext, activeUserId);
            }
          });
        } else if (isGuest) {
          const browserTz =
            typeof Intl !== "undefined"
              ? Intl.DateTimeFormat().resolvedOptions().timeZone
              : "Africa/Cairo";
          const detected = buildDefaultLocalizationPreferences(browserTz);
          setProfile((prev) => ({
            ...prev,
            ...detected,
            prayerTrackingEnabled: false,
            prayerPreferenceConfigured: false,
          }));
        } else if (localUser) {
          setProfile((prev) => ({
            ...prev,
            name: localUser.name || prev.name,
            email: localUser.email || prev.email,
            image: localUser.image !== undefined ? localUser.image : prev.image,
            profileName: localUser.name || prev.profileName,
            profileImage:
              localUser.image !== undefined ? localUser.image : prev.profileImage,
          }));
        }

        // First-visit fallback if signed in online & local stores are not populated yet
        if (!isGuest && (typeof navigator === "undefined" || navigator.onLine)) {
          const needsServerSettings = !localSettings;
          const needsServerAreas = !localAreas || localAreas.length === 0;
          if (needsServerSettings || needsServerAreas) {
            const [settingsRes, areasRes] = await Promise.all([
              needsServerSettings ? getUserSettings() : Promise.resolve(null),
              needsServerAreas ? getLifeAreas(true) : Promise.resolve(null),
            ]);
            if (isCancelled) return;

            if (settingsRes?.success && settingsRes.data) {
              await localSyncMetaRepo
                .saveUserSettings(activeUserId, settingsRes.data)
                .catch(() => {});
              let computedNext = null;
              setProfile((prev) => {
                const next = mapSettingsRecordToProfile(settingsRes.data, prev, localUser);
                computedNext = next;
                return next;
              });
              queueMicrotask(() => {
                if (!isCancelled && computedNext) {
                  broadcastPreferencesLocally(computedNext, activeUserId);
                }
              });
            }

            if (areasRes?.success && Array.isArray(areasRes.data)) {
              const normalizedAreas = areasRes.data.map((a) => ({
                ...a,
                userId: activeUserId,
                _syncStatus: "synced",
              }));
              await localLifeAreaRepo.saveBatch(normalizedAreas).catch(() => {});
              setLifeAreas(normalizedAreas);
            }
          }
        }
      } catch (err) {
        console.error("Error hydrating settings locally:", err);
      } finally {
        if (!isCancelled) {
          setProfileHydrated(true);
        }
      }
    }

    void hydrateFromLocal();

    const handleSynced = (ev) => {
      const types = ev?.detail?.changedTypes || [];
      if (types.includes("user_settings") || types.includes("life_area")) {
        void hydrateFromLocal();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("athar_data_synced", handleSynced);
    }

    return () => {
      isCancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("athar_data_synced", handleSynced);
      }
    };
  }, [activeUserId, isGuest, localUser]);

  const persistProfileSnapshot = async (nextProfile, successMessage) => {
    const trimmedName = (nextProfile.name || "").trim() || "مستخدم أثـر";
    const nextImage = nextProfile.image || null;
    const nowIso = new Date().toISOString();
    const resolvedReligion = normalizeReligion(nextProfile.religion) || nextProfile.religion || null;
    const resolvedSalutation = normalizeSalutation(nextProfile.salutation) || nextProfile.salutation || null;
    const cleanProfile = {
      ...nextProfile,
      name: trimmedName,
      image: nextImage,
      profileName: trimmedName,
      profileImage: nextImage,
      salutation: resolvedSalutation,
      religion: resolvedReligion,
      onboardingCompleted:
        nextProfile.onboardingCompleted !== undefined
          ? Boolean(nextProfile.onboardingCompleted)
          : true,
      onboardingStep: Number(nextProfile.onboardingStep || 3) || 3,
      onboardingCompletedAt: nextProfile.onboardingCompletedAt || nowIso,
      monthlySalary: Number(nextProfile.monthlySalary || 0) || 0,
      preferencesUpdatedAt: nowIso,
    };

    setProfile(cleanProfile);
    broadcastPreferencesLocally(cleanProfile, activeUserId);
    await localSyncMetaRepo.saveUserSettings(activeUserId, cleanProfile).catch(() => {});
    await localOnboardingRepo
      .save({
        ownerKey: activeUserId,
        salutation: resolvedSalutation,
        guestName: trimmedName,
        religion: resolvedReligion,
        currentStep: 3,
        completed: Boolean(cleanProfile.onboardingCompleted),
        sawAtheistHumor: resolvedReligion === "atheist",
        completedAt: cleanProfile.onboardingCompletedAt,
        updatedAt: nowIso,
      })
      .catch(() => {});

    if (!isGuest) {
      const settingsPayload = {
        timezone: cleanProfile.timezone,
        countryCode: cleanProfile.countryCode,
        governorate: cleanProfile.governorate,
        city: cleanProfile.city || "",
        currency: cleanProfile.currency,
        currencyAuto: Boolean(cleanProfile.currencyAuto),
        prayerTrackingEnabled: Boolean(cleanProfile.prayerTrackingEnabled),
        salutation: resolvedSalutation,
        religion: resolvedReligion,
        onboardingCompleted: Boolean(cleanProfile.onboardingCompleted),
        onboardingStep: cleanProfile.onboardingStep,
        onboardingCompletedAt: cleanProfile.onboardingCompletedAt,
        language: "ar",
        weekStartDay: Number(cleanProfile.weekStartDay),
        themeAccent: cleanProfile.themeAccent,
        profileName: trimmedName,
        forceProfileNameUpdate: true,
        profileImage: nextImage,
        dashboardConfig: {
          density: cleanProfile.density,
          soundEffects: Boolean(cleanProfile.soundEffects),
          dailyQuote: Boolean(cleanProfile.dailyQuote),
          countryCode: cleanProfile.countryCode,
          country: cleanProfile.country,
          governorate: cleanProfile.governorate,
          city: cleanProfile.city || "",
          timezoneAuto: Boolean(cleanProfile.timezoneAuto),
          currency: cleanProfile.currency,
          currencyAuto: Boolean(cleanProfile.currencyAuto),
          monthlySalary: cleanProfile.monthlySalary,
          prayerTrackingEnabled: Boolean(cleanProfile.prayerTrackingEnabled),
          prayerPreferenceConfigured: Boolean(cleanProfile.prayerPreferenceConfigured),
          salutation: resolvedSalutation,
          religion: resolvedReligion,
          onboardingCompleted: Boolean(cleanProfile.onboardingCompleted),
          preferencesUpdatedAt: nowIso,
          prayerCalc: cleanProfile.prayerCalc,
          asrMethod: cleanProfile.asrMethod,
          tagline: cleanProfile.tagline,
          role: cleanProfile.role,
          timeFormat: "12h",
        },
      };

      await localOutboxRepo
        .add({
          mutationId: `settings_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
          userId: activeUserId,
          entityType: "user_settings",
          entityId: activeUserId,
          action: "update",
          payload: settingsPayload,
          clientTimestamp: Date.now(),
          version: 1,
          baseUpdatedAt: nextProfile.preferencesUpdatedAt,
          status: "pending",
          retryCount: 0,
        })
        .catch(() => {});

      syncEngine.scheduleSync(400);

      if (typeof navigator === "undefined" || navigator.onLine) {
        updateUserProfile({ name: trimmedName, image: nextImage })
          .then(() => authClient.getSession({ query: { disableCookieCache: true } }).catch(() => {}))
          .catch(() => {});
        if (successMessage) showToast(successMessage, "success");
      } else {
        showToast("تم حفظ الإعدادات محلياً وسيتم مزامنتها تلقائياً عند عودة الاتصال ✨", "info");
      }
    } else if (successMessage) {
      showToast(successMessage, "success");
    }
  };

  const handleSaveProfile = (e) => {
    if (e?.preventDefault) e.preventDefault();
    startTransition(async () => {
      await persistProfileSnapshot(
        profile,
        !isGuest
          ? "تم حفظ الإعدادات وتحديثها بنجاح ✨"
          : "تم حفظ الإعدادات محلياً في هذا المتصفح ✨"
      );
    });
  };

  const handleTogglePrayerTracking = (enabled) => {
    const next = {
      ...profile,
      prayerTrackingEnabled: enabled,
      prayerPreferenceConfigured: true,
    };
    setProfile(next);
    persistProfileSnapshot(next);
  };

  // Export all user records across EVERY supported domain (Cloud + Local IDB + Quran)
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const effectiveUid = activeUserId;
      let domainSnapshot = null;

      if (!isGuest && (typeof navigator === "undefined" || navigator.onLine)) {
        const cloudRes = await exportCloudBackup().catch(() => null);
        if (cloudRes?.success && cloudRes.data) {
          domainSnapshot = cloudRes.data;
        }
      }

      if (!domainSnapshot) {
        const [
          tasks,
          taskSessions,
          entityRevisions,
          prayerRecords,
          trackers,
          trackerEntries,
          dailyNotes,
          absTrackers,
          absSessions,
          gymWorkouts,
          mealEntries,
          waterEntries,
          expenseEntries,
          localAreasList,
        ] = await Promise.all([
          localTaskRepo.getAllForUser(effectiveUid, true).catch(() => []),
          localTaskSessionRepo.getAllForUser(effectiveUid).catch(() => []),
          localRevisionRepo.getAllForUser(effectiveUid).catch(() => []),
          localPrayerRepo.getAllForUser(effectiveUid).catch(() => []),
          localTrackerRepo.getAllForUser(effectiveUid, true).catch(() => []),
          localEntryRepo.getAllForUser(effectiveUid).catch(() => []),
          localNoteRepo.getAllForUser(effectiveUid).catch(() => []),
          localAbstinenceRepo.getAllTrackers(effectiveUid).catch(() => []),
          localAbstinenceRepo.getAllSessions(effectiveUid).catch(() => []),
          localDomainRepo.getGymWorkouts(effectiveUid).catch(() => []),
          localDomainRepo.getMealEntries(effectiveUid).catch(() => []),
          localDomainRepo.getWaterEntries(effectiveUid).catch(() => []),
          localDomainRepo.getExpenseEntries(effectiveUid).catch(() => []),
          localLifeAreaRepo.getAllForUser(effectiveUid, true).catch(() => lifeAreas),
        ]);

        const abstinenceTrackers = absTrackers.map((t) => ({
          ...t,
          sessions: absSessions.filter(
            (s) => s.abstinenceTrackerId === t.id || s.trackerId === t.id
          ),
        }));

        domainSnapshot = {
          userSettings: profile,
          lifeAreas: localAreasList,
          trackers,
          trackerEntries,
          tasks,
          taskSessions,
          entityRevisions,
          dailyNotes,
          prayerRecords,
          abstinenceTrackers,
          gymWorkouts,
          mealEntries,
          waterEntries,
          expenseEntries,
        };
      }

      let quranMemorized = [];
      try {
        const rawQuran = localStorage.getItem("athar_quran_memorization_v1");
        if (rawQuran) quranMemorized = JSON.parse(rawQuran);
      } catch {}

      const backupData = {
        exportMetadata: {
          exportedAt: new Date().toISOString(),
          platform: "Athar Life Tracker (أثـر)",
          version: "3.0.0",
          author: profile.name,
          scope: !isGuest ? "cloud" : "local_guest",
          userId: effectiveUid,
        },
        ...domainSnapshot,
        quranMemorization: quranMemorized,
        legacyLocalState: {
          prayerSchedule,
          expenses: expensesData,
          nutrition: nutritionData,
          gymWorkoutsLegacy: gymData,
        },
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = `athar-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast("تم تصدير النسخة الاحتياطية الشاملة بنجاح 📁", "success");
    } catch (err) {
      console.error("Backup export failed:", err);
      showToast("فشل تصدير النسخة الاحتياطية", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // Validate and restore full JSON backup
  const handleRestoreBackup = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsRestoring(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed || !parsed.exportMetadata || !parsed.exportMetadata.platform) {
        showToast("ملف النسخة الاحتياطية غير صالح أو لا يخص تطبيق أثر", "error");
        return;
      }

      if (!isGuest) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          showToast("تتطلب استعادة النسخة السحابية اتصالاً بالإنترنت", "error");
          return;
        }
        const res = await restoreCloudBackup(parsed);
        if (!res.success) {
          showToast(res.error || "فشل استعادة النسخة الاحتياطية السحابية", "error");
          return;
        }
        await clearAllLocalIndexedDB().catch(() => {});
      } else {
        const db = await getLocalDB();
        const putAll = async (storeName, items, extraUserId = true) => {
          if (!Array.isArray(items) || items.length === 0) return;
          const tx = db.transaction(storeName, "readwrite");
          for (const item of items) {
            if (!item?.id) continue;
            await tx.store.put(extraUserId ? { ...item, userId: "guest" } : item);
          }
          await tx.done;
        };

        await putAll("tasks", parsed.tasks);
        await putAll("task_sessions", parsed.taskSessions);
        await putAll("entity_revisions", parsed.entityRevisions);
        await putAll("trackers", parsed.trackers);
        await putAll("tracker_entries", parsed.trackerEntries);
        await putAll("daily_notes", parsed.dailyNotes);
        await putAll("prayer_records", parsed.prayerRecords);
        await putAll("gym_workouts", parsed.gymWorkouts);
        await putAll("meal_entries", parsed.mealEntries);
        await putAll("water_entries", parsed.waterEntries);
        await putAll("expense_entries", parsed.expenseEntries);

        if (Array.isArray(parsed.abstinenceTrackers)) {
          for (const a of parsed.abstinenceTrackers) {
            if (!a?.id) continue;
            await localAbstinenceRepo.saveTracker({ ...a, userId: "guest" });
            for (const s of a.sessions || []) {
              if (!s?.id) continue;
              await localAbstinenceRepo.saveSession({
                ...s,
                abstinenceTrackerId: a.id,
                trackerId: a.id,
                userId: "guest",
              });
            }
          }
        }
      }

      if (Array.isArray(parsed.quranMemorization)) {
        localStorage.setItem(
          "athar_quran_memorization_v1",
          JSON.stringify(parsed.quranMemorization)
        );
      }

      showToast("تمت استعادة النسخة الاحتياطية بنجاح! جاري التحديث... ✨", "success");
      setTimeout(() => {
        window.location.reload();
      }, 900);
    } catch (err) {
      console.error("Restore failed:", err);
      showToast("تعذر قراءة أو استعادة ملف النسخة الاحتياطية", "error");
    } finally {
      setIsRestoring(false);
    }
  };

  // Confirm Reset Modal action
  const handleConfirmReset = async () => {
    if (typeof window === "undefined") return;
    setIsResetting(true);

    try {
      if (resetScope === "cloud_and_local" && !isGuest) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          showToast("مسح السحابة يتطلب اتصالاً بالإنترنت", "error");
          setIsResetting(false);
          return;
        }
        const res = await clearCloudUserData();
        if (!res.success) {
          showToast(res.error || "فشل مسح البيانات السحابية، لم يتم المسح", "error");
          setIsResetting(false);
          return;
        }
      }

      await clearAllLocalIndexedDB();
      localStorage.clear();
      sessionStorage.clear();

      setResetModalOpen(false);
      showToast(
        resetScope === "cloud_and_local"
          ? "تم مسح البيانات السحابية والمحلية بنجاح"
          : "تم مسح كافة البيانات المحلية على هذا الجهاز بنجاح",
        "info"
      );

      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err) {
      console.error("Reset failed:", err);
      showToast("حدث خطأ أثناء مسح البيانات، يرجى المحاولة مرة أخرى", "error");
    } finally {
      setIsResetting(false);
    }
  };

  const isProfileLoading = sessionPending || !profileHydrated;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Guest Mode Banner */}
      {!sessionPending && isGuest && !guestBannerDismissed && (
        <div className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 pr-10 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300">
          <button
            type="button"
            onClick={handleDismissGuestBanner}
            aria-label="إخفاء التنبيه"
            title="إخفاء التنبيه"
            data-testid="dismiss-guest-settings-banner-btn"
            className="absolute top-2.5 right-2.5 p-1 rounded-lg text-amber-300/80 hover:text-amber-100 hover:bg-amber-500/20 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            <span className="text-xs font-medium">
              أنت تستخدم المنظومة في وضع المعاينة المؤقت. سجّل الدخول بحساب Google لحفظ مجالاتك وإعداداتك بشكل دائم في قاعدة البيانات السحابية.
            </span>
          </div>
          <Link
            href="/login?returnTo=/settings"
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-xs font-bold transition-colors shrink-0 self-end sm:self-auto"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>تسجيل الدخول</span>
          </Link>
        </div>
      )}

      {/* 2. Sidebar + Active Section Workspace */}
      {(() => {
        const showIslamic = isIslamicFeatureVisible(profile);
        const effectiveSection =
          activeSection === "prayers" && !showIslamic ? "profile" : activeSection;
        const effectiveMeta =
          SETTINGS_SECTIONS.find((s) => s.id === effectiveSection) || activeSectionMeta;
        return (
      <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-6">
        <SettingsSidebar
          activeSection={effectiveSection}
          onSelectSection={handleSelectSection}
          profile={profile}
          isCloudUser={!isGuest}
          isProfileLoading={isProfileLoading}
        />

        <section
          aria-label={effectiveMeta.label}
          className="flex-1 min-w-0"
        >
          {effectiveSection === "profile" && (
            <ProfileSection
              profile={profile}
              sessionUser={localUser}
              isPending={isPending}
              isProfileLoading={isProfileLoading}
              onSaveProfile={({ name, image, salutation, religion }) => {
                startTransition(async () => {
                  const prevReligion = normalizeReligion(profile.religion);
                  const nextReligion = normalizeReligion(religion) || profile.religion;
                  const unlockedIslam =
                    nextReligion === "muslim" && prevReligion && prevReligion !== "muslim";
                  await persistProfileSnapshot(
                    {
                      ...profile,
                      name,
                      image,
                      profileName: name,
                      profileImage: image,
                      salutation: salutation ?? profile.salutation,
                      religion: nextReligion,
                      ...(unlockedIslam
                        ? {
                            prayerTrackingEnabled: true,
                            prayerPreferenceConfigured: true,
                          }
                        : {}),
                    },
                    !isGuest
                      ? "تم حفظ الإعدادات وتحديثها بنجاح ✨"
                      : "تم حفظ الإعدادات محلياً في هذا المتصفح ✨"
                  );
                });
              }}
              onProcessAvatarFile={resizeAvatarImage}
              onError={(msg) => showToast(msg, "error")}
            />
          )}

          {effectiveSection === "life-areas" && (
            <LifeAreasManager
              areas={lifeAreas}
              onAreasChange={setLifeAreas}
              onToast={showToast}
            />
          )}

          {effectiveSection === "localization" && (
            <LocalizationSection
              profile={profile}
              setProfile={setProfile}
              isPending={isPending}
              onSave={handleSaveProfile}
            />
          )}

          {effectiveSection === "prayers" && showIslamic && (
            <PrayersSection
              profile={profile}
              setProfile={setProfile}
              prayerSchedule={prayerSchedule}
              openPrayerScheduleModal={openPrayerScheduleModal}
              isPending={isPending}
              onSave={handleSaveProfile}
              onTogglePrayerTracking={handleTogglePrayerTracking}
            />
          )}

          {effectiveSection === "preferences" && (
            <PreferencesSection
              profile={profile}
              setProfile={setProfile}
              isPending={isPending}
              onSave={handleSaveProfile}
            />
          )}

          {effectiveSection === "data" && (
            <DataSection
              isCloudUser={!isGuest}
              isExporting={isExporting}
              isRestoring={isRestoring}
              onExportData={handleExportData}
              onRestoreBackup={handleRestoreBackup}
              onOpenResetModal={() => {
                setResetScope("local");
                setResetModalOpen(true);
              }}
            />
          )}
        </section>
      </div>
        );
      })()}

      {/* Confirmation Modal for Resetting Local or Cloud Data */}
      {resetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => !isResetting && setResetModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[#0f111a] border border-rose-500/30 p-6 sm:p-7 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-100">
                  تأكيد مسح البيانات وإعادة الضبط
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  اختر نطاق المسح بدقة. مسح البيانات المحلية يزيل السجلات المخزنة في هذا المتصفح (IndexedDB و LocalStorage) دون المساس بحسابك السحابي.
                </p>
              </div>
            </div>

            {!isGuest && (
              <div className="space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => setResetScope("local")}
                  className={`w-full text-right p-3 rounded-xl border transition-colors ${
                    resetScope === "local"
                      ? "bg-zinc-800 border-amber-500/50 text-zinc-100"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400"
                  }`}
                >
                  <div className="font-bold">مسح بيانات هذا الجهاز فقط (محلياً)</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    تبقى بياناتك المحفوظة في السحابة آمنة وتُحمّل عند الدخول مجدداً.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setResetScope("cloud_and_local")}
                  className={`w-full text-right p-3 rounded-xl border transition-colors ${
                    resetScope === "cloud_and_local"
                      ? "bg-rose-950/40 border-rose-500/60 text-rose-200"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400"
                  }`}
                >
                  <div className="font-bold text-rose-300">
                    مسح كافة البيانات السحابية والمحلية نهائياً
                  </div>
                  <div className="text-[11px] text-rose-300/80 mt-0.5">
                    يحذف جميع المهام والعادات والصلوات والسجلات من الخادم ومن المتصفح مع إبقاء الحساب نشطاً.
                  </div>
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                disabled={isResetting}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                إلغاء الأمر
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleConfirmReset}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
              >
                {isResetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {isResetting
                    ? "جاري المسح..."
                    : resetScope === "cloud_and_local"
                    ? "تأكيد المسح السحابي والمحلي"
                    : "تأكيد المسح المحلي"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
      aria-busy="true"
      aria-label="جاري تحميل الإعدادات"
    >
      <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-6">
        {/* Sidebar Skeleton */}
        <aside className="w-full lg:w-[272px] shrink-0 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 p-4 space-y-4 animate-pulse">
          <div className="flex items-center gap-3 pb-3 border-b border-zinc-800/80">
            <div className="w-11 h-11 rounded-2xl bg-zinc-800/80 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-24 rounded-md bg-zinc-800" />
              <div className="h-2.5 w-32 rounded-md bg-zinc-800/60" />
            </div>
          </div>

          <div className="flex lg:flex-col gap-2 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 flex-1 lg:flex-none rounded-xl bg-zinc-900/90 border border-zinc-800/60 flex items-center gap-2.5 px-3"
              >
                <div className="w-4 h-4 rounded-md bg-zinc-800 shrink-0" />
                <div className="h-3 w-20 rounded bg-zinc-800/80 hidden sm:block" />
              </div>
            ))}
          </div>
        </aside>

        {/* Main Section Skeleton */}
        <div className="flex-1 min-w-0 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 p-5 sm:p-7 space-y-6 animate-pulse">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
            <div className="space-y-2">
              <div className="h-5 w-40 rounded-lg bg-zinc-800" />
              <div className="h-3 w-64 rounded-md bg-zinc-800/60" />
            </div>
            <div className="h-9 w-24 rounded-xl bg-zinc-800/70 shrink-0" />
          </div>

          {/* Avatar + Identity Card */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-32 rounded-md bg-zinc-800" />
              <div className="h-3 w-48 rounded-md bg-zinc-800/60" />
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-24 rounded bg-zinc-800/70" />
                <div className="h-10 w-full rounded-xl bg-zinc-900/80 border border-zinc-800/60" />
              </div>
            ))}
          </div>

          {/* Footer Save Button */}
          <div className="flex justify-end pt-2">
            <div className="h-10 w-36 rounded-xl bg-violet-600/30 border border-violet-500/20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsWorkspace />
    </Suspense>
  );
}
