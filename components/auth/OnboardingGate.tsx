"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { useProgressRouter } from "@/hooks/useProgressRouter";
import { useLocalSession } from "@/hooks/useLocalSession";
import { useAthar } from "@/components/context/AtharContext";
import { localOnboardingRepo, localSyncMetaRepo } from "@/lib/local-db";
import { getUserSettings } from "@/actions/settings";
import {
  normalizeSalutation,
  normalizeReligion,
  sanitizeGuestFirstName,
  setOnboardingCookie,
  createEmptyOnboardingState,
  ONBOARDING_LEGACY_USER_DEFAULT_RELIGION,
} from "@/lib/onboarding";
import OnboardingLoadingExperience from "@/components/auth/OnboardingLoadingExperience";

const UNRESTRICTED_PATHS = ["/login", "/register", "/landing"];

function isUnrestrictedPath(pathname: string): boolean {
  return UNRESTRICTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export default function OnboardingGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  const router = useProgressRouter();
  const { user, userId, isGuest, isPending: sessionPending } = useLocalSession();
  const { updatePreferences } = (useAthar() || {}) as any;

  const [gateStatus, setGateStatus] = useState<
    "checking" | "allowed" | "redirecting"
  >("checking");
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);
  const updatePreferencesRef = useRef(updatePreferences);

  useEffect(() => {
    updatePreferencesRef.current = updatePreferences;
  }, [updatePreferences]);

  const isWelcomeRoute =
    pathname === "/welcome" || pathname.startsWith("/welcome/");
  const isUnrestricted = isUnrestrictedPath(pathname);

  useEffect(() => {
    if (isUnrestricted || sessionPending) {
      return;
    }

    let cancelled = false;

    async function verifyOnboarding() {
      try {
        if (isGuest) {
          let guestState = await localOnboardingRepo.get("guest").catch(() => null);

          if (!guestState) {
            const hasLegacyData = await localOnboardingRepo
              .hasLegacyGuestActivity()
              .catch(() => false);
            if (hasLegacyData) {
              guestState = {
                ...createEmptyOnboardingState("guest"),
                religion: ONBOARDING_LEGACY_USER_DEFAULT_RELIGION,
                currentStep: 3,
                completed: true,
                completedAt: new Date().toISOString(),
                migratedLegacy: true,
              };
              await localOnboardingRepo.save(guestState).catch(() => {});
              await updatePreferencesRef.current({
                religion: ONBOARDING_LEGACY_USER_DEFAULT_RELIGION,
                onboardingStep: 3,
                onboardingCompleted: true,
                onboardingCompletedAt: guestState.completedAt,
              }).catch(() => {});
            }
          }

          if (cancelled) return;

          const isDone = Boolean(guestState?.completed);
          setOnboardingCookie(isDone);

          if (!isDone) {
            if (!isWelcomeRoute) {
              setGateStatus("redirecting");
              router.replace("/welcome");
              return;
            }
            setGateStatus("allowed");
            return;
          }

          if (isWelcomeRoute) {
            setGateStatus("redirecting");
            router.replace("/");
            return;
          }

          setVerifiedUserId("guest");
          setGateStatus("allowed");
          return;
        }

        // Authenticated user path: server UserSettings is authoritative when reachable,
        // and guest onboarding preferences auto-link safely without overwriting existing values.
        const [cachedSettings, localUserOnboarding, guestOnboarding] =
          await Promise.all([
            localSyncMetaRepo.getUserSettings(userId).catch(() => null),
            localOnboardingRepo.get(userId).catch(() => null),
            localOnboardingRepo.get("guest").catch(() => null),
          ]);

        let serverSettings: any = null;
        if (typeof navigator === "undefined" || navigator.onLine) {
          const res = await getUserSettings().catch(() => null);
          if (res?.success && res.data) {
            serverSettings = res.data;
          }
        }

        if (cancelled) return;

        const baseSettings = serverSettings || cachedSettings || {};
        const serverCfg =
          baseSettings.dashboardConfig &&
          typeof baseSettings.dashboardConfig === "object"
            ? baseSettings.dashboardConfig
            : {};

        const existingSalutation =
          normalizeSalutation(baseSettings.salutation) ||
          normalizeSalutation(serverCfg.salutation) ||
          normalizeSalutation(localUserOnboarding?.salutation);
        const existingReligion =
          normalizeReligion(baseSettings.religion) ||
          normalizeReligion(serverCfg.religion) ||
          normalizeReligion(localUserOnboarding?.religion);

        const existingCompleted = Boolean(
          baseSettings.onboardingCompleted ??
            serverCfg.onboardingCompleted ??
            localUserOnboarding?.completed
        );

        const guestSalutation = normalizeSalutation(guestOnboarding?.salutation);
        const guestReligion = normalizeReligion(guestOnboarding?.religion);
        const guestCompleted = Boolean(guestOnboarding?.completed);

        const mergedSalutation = existingSalutation || guestSalutation || null;
        const mergedReligion = existingReligion || guestReligion || null;
        const mergedCompleted = existingCompleted || guestCompleted;
        const mergedStep =
          (baseSettings.onboardingStep as 1 | 2 | 3 | undefined) ||
          localUserOnboarding?.currentStep ||
          guestOnboarding?.currentStep ||
          1;

        const needsServerLinking =
          guestOnboarding &&
          ((!existingSalutation && Boolean(guestSalutation)) ||
            (!existingReligion && Boolean(guestReligion)) ||
            (!existingCompleted && guestCompleted));

        if (needsServerLinking) {
          const nowIso =
            guestOnboarding.completedAt || new Date().toISOString();
          await updatePreferencesRef.current({
            ...(mergedSalutation ? { salutation: mergedSalutation } : {}),
            ...(mergedReligion ? { religion: mergedReligion } : {}),
            ...(user?.name?.trim()
              ? { profileName: user.name.trim() }
              : sanitizeGuestFirstName(guestOnboarding.guestName)
                ? { profileName: sanitizeGuestFirstName(guestOnboarding.guestName) }
                : {}),
            onboardingCompleted: mergedCompleted,
            onboardingStep: mergedCompleted ? 3 : mergedStep,
            onboardingCompletedAt: mergedCompleted ? nowIso : null,
            ...(mergedReligion && !existingReligion
              ? {
                  prayerTrackingEnabled: mergedReligion === "muslim",
                  prayerPreferenceConfigured: true,
                }
              : {}),
          }).catch(() => {});

          await localOnboardingRepo
            .save({
              ownerKey: userId,
              salutation: mergedSalutation,
              guestName:
                user?.name?.trim() ||
                sanitizeGuestFirstName(guestOnboarding.guestName),
              religion: mergedReligion,
              currentStep: mergedCompleted ? 3 : (mergedStep as 1 | 2 | 3),
              completed: mergedCompleted,
              sawAtheistHumor: mergedReligion === "atheist",
              completedAt: mergedCompleted ? nowIso : null,
              updatedAt: new Date().toISOString(),
            })
            .catch(() => {});

          // Mark guest onboarding linked so subsequent unrelated logins don't re-apply stale guest picks
          await localOnboardingRepo
            .save({
              ...createEmptyOnboardingState("guest"),
              completed: false,
            })
            .catch(() => {});
        } else {
          if (serverSettings) {
            await localSyncMetaRepo
              .saveUserSettings(userId, serverSettings)
              .catch(() => {});
            await updatePreferencesRef.current({
              ...(mergedSalutation ? { salutation: mergedSalutation } : {}),
              ...(mergedReligion ? { religion: mergedReligion } : {}),
              ...(user?.name?.trim() ? { profileName: user.name.trim() } : {}),
              ...(serverSettings.timezone ? { timezone: serverSettings.timezone } : {}),
              ...(serverSettings.prayerTrackingEnabled !== undefined
                ? { prayerTrackingEnabled: Boolean(serverSettings.prayerTrackingEnabled) }
                : {}),
              onboardingCompleted: mergedCompleted,
              onboardingStep: mergedCompleted ? 3 : (mergedStep as 1 | 2 | 3),
              onboardingCompletedAt:
                baseSettings.onboardingCompletedAt ||
                localUserOnboarding?.completedAt ||
                null,
            }).catch(() => {});
          }

          await localOnboardingRepo
            .save({
              ownerKey: userId,
              salutation: mergedSalutation,
              guestName: user?.name?.trim() || "",
              religion: mergedReligion,
              currentStep: mergedCompleted ? 3 : (mergedStep as 1 | 2 | 3),
              completed: mergedCompleted,
              sawAtheistHumor: mergedReligion === "atheist",
              completedAt:
                baseSettings.onboardingCompletedAt ||
                localUserOnboarding?.completedAt ||
                null,
              updatedAt: new Date().toISOString(),
            })
            .catch(() => {});
        }

        if (cancelled) return;

        setOnboardingCookie(mergedCompleted);

        if (!mergedCompleted) {
          if (!isWelcomeRoute) {
            setGateStatus("redirecting");
            router.replace("/welcome");
            return;
          }
          setGateStatus("allowed");
          return;
        }

        if (isWelcomeRoute) {
          setGateStatus("redirecting");
          router.replace("/");
          return;
        }

        setVerifiedUserId(userId);
        setGateStatus("allowed");
      } catch {
        if (!cancelled) {
          setGateStatus(isWelcomeRoute ? "allowed" : "checking");
        }
      }
    }

    queueMicrotask(() => {
      if (!cancelled) {
        void verifyOnboarding();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isUnrestricted, isWelcomeRoute, pathname, sessionPending, isGuest, userId, user?.name, router]);

  if (isUnrestricted) {
    return <>{children}</>;
  }

  const isAlreadyVerifiedForUser =
    !sessionPending && !isWelcomeRoute && verifiedUserId === userId;

  if (sessionPending || (!isAlreadyVerifiedForUser && gateStatus !== "allowed")) {
    return <OnboardingLoadingExperience />;
  }

  return <>{children}</>;
}
