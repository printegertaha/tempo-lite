"use client";

import { Suspense, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  localTrackerRepo,
  localEntryRepo,
  localNoteRepo,
  localPrayerRepo,
  localAbstinenceRepo,
  localLifeAreaRepo,
  localDomainRepo,
  localSyncMetaRepo,
  localOutboxRepo,
} from "@/lib/local-db";
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
    preferencesUpdatedAt:
      cfg.preferencesUpdatedAt || rawSettings.preferencesUpdatedAt || prev.preferencesUpdatedAt,
  };
}

function SettingsWorkspace() {
  const router = useRouter();
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

  // User Profile & System Preferences State
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
    const cleanProfile = {
      ...nextProfile,
      name: trimmedName,
      image: nextImage,
      profileName: trimmedName,
      profileImage: nextImage,
      monthlySalary: Number(nextProfile.monthlySalary || 0) || 0,
      preferencesUpdatedAt: nowIso,
    };

    setProfile(cleanProfile);
    broadcastPreferencesLocally(cleanProfile, activeUserId);
    await localSyncMetaRepo.saveUserSettings(activeUserId, cleanProfile).catch(() => {});

    if (!isGuest) {
      const settingsPayload = {
        timezone: cleanProfile.timezone,
        countryCode: cleanProfile.countryCode,
        governorate: cleanProfile.governorate,
        city: cleanProfile.city || "",
        currency: cleanProfile.currency,
        currencyAuto: Boolean(cleanProfile.currencyAuto),
        prayerTrackingEnabled: Boolean(cleanProfile.prayerTrackingEnabled),
        language: "ar",
        weekStartDay: Number(cleanProfile.weekStartDay),
        themeAccent: cleanProfile.themeAccent,
        profileName: trimmedName,
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
    persistProfileSnapshot(
      next,
      enabled
        ? "تم تفعيل تتبع الصلوات ✨"
        : "تم إخفاء تتبع الصلوات مع الحفاظ على جميع سجلاتك السابقة"
    );
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
          prayerRecords,
          trackers,
          trackerEntries,
          dailyNotes,
          absTrackers,
          absSessions,
          gymWorkouts,
          mealEntries,
          expenseEntries,
          localAreasList,
        ] = await Promise.all([
          localTaskRepo.getAllForUser(effectiveUid, true).catch(() => []),
          localPrayerRepo.getAllForUser(effectiveUid).catch(() => []),
          localTrackerRepo.getAllForUser(effectiveUid, true).catch(() => []),
          localEntryRepo.getAllForUser(effectiveUid).catch(() => []),
          localNoteRepo.getAllForUser(effectiveUid).catch(() => []),
          localAbstinenceRepo.getAllTrackers(effectiveUid).catch(() => []),
          localAbstinenceRepo.getAllSessions(effectiveUid).catch(() => []),
          localDomainRepo.getGymWorkouts(effectiveUid).catch(() => []),
          localDomainRepo.getMealEntries(effectiveUid).catch(() => []),
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
          dailyNotes,
          prayerRecords,
          abstinenceTrackers,
          gymWorkouts,
          mealEntries,
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
        await putAll("trackers", parsed.trackers);
        await putAll("tracker_entries", parsed.trackerEntries);
        await putAll("daily_notes", parsed.dailyNotes);
        await putAll("prayer_records", parsed.prayerRecords);
        await putAll("gym_workouts", parsed.gymWorkouts);
        await putAll("meal_entries", parsed.mealEntries);
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Guest Mode Banner */}
      {!sessionPending && isGuest && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            <span className="text-xs font-medium">
              أنت تستخدم المنظومة في وضع المعاينة المؤقت. سجّل الدخول بحساب Google لحفظ مجالاتك وإعداداتك بشكل دائم في قاعدة البيانات السحابية.
            </span>
          </div>
          <Link
            href="/login?returnTo=/settings"
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-xs font-bold transition-colors shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>تسجيل الدخول</span>
          </Link>
        </div>
      )}

      {/* 2. Sidebar + Active Section Workspace */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-6">
        <SettingsSidebar
          activeSection={activeSection}
          onSelectSection={handleSelectSection}
          profile={profile}
          isCloudUser={!isGuest}
        />

        <section
          aria-label={activeSectionMeta.label}
          className="flex-1 min-w-0"
        >
          {activeSection === "profile" && (
            <ProfileSection
              profile={profile}
              sessionUser={localUser}
              isPending={isPending}
              onSaveProfile={({ name, image }) => {
                startTransition(async () => {
                  await persistProfileSnapshot(
                    {
                      ...profile,
                      name,
                      image,
                      profileName: name,
                      profileImage: image,
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

          {activeSection === "life-areas" && (
            <LifeAreasManager
              areas={lifeAreas}
              onAreasChange={setLifeAreas}
              onToast={showToast}
            />
          )}

          {activeSection === "localization" && (
            <LocalizationSection
              profile={profile}
              setProfile={setProfile}
              isPending={isPending}
              onSave={handleSaveProfile}
            />
          )}

          {activeSection === "prayers" && (
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

          {activeSection === "preferences" && (
            <PreferencesSection
              profile={profile}
              setProfile={setProfile}
              isPending={isPending}
              onSave={handleSaveProfile}
            />
          )}

          {activeSection === "data" && (
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

function SettingsFallback() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="h-14 lg:h-96 lg:w-[280px] rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 animate-pulse shrink-0" />
        <div className="flex-1 h-96 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 animate-pulse" />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsFallback />}>
      <SettingsWorkspace />
    </Suspense>
  );
}
