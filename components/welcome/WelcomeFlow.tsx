"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useProgressRouter } from "@/hooks/useProgressRouter";
import { useAthar } from "@/components/context/AtharContext";
import { useLocalSession } from "@/hooks/useLocalSession";
import { localOnboardingRepo } from "@/lib/local-db";
import {
  SALUTATIONS,
  RELIGIONS,
  createEmptyOnboardingState,
  normalizeSalutation,
  normalizeReligion,
  normalizeOnboardingStep,
  WELCOME_NAME_MAX_LENGTH,
  countDisplayCharacters,
  sliceDisplayCharacters,
  validateWelcomeName,
  sanitizeGuestFirstName,
  formatWelcomeReligionQuestion,
  setOnboardingCookie,
  type OnboardingState,
  type Salutation,
  type Religion,
} from "@/lib/onboarding";
import { updateUserProfile } from "@/actions/settings";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flame,
  User,
  LogIn,
  ShieldCheck,
} from "lucide-react";

export default function WelcomeFlow() {
  const router = useProgressRouter();
  const { updatePreferences, userPreferences } = (useAthar() || {}) as any;
  const { user, userId, isGuest, isPending: sessionPending } = useLocalSession();

  const [state, setState] = useState<OnboardingState>(() =>
    createEmptyOnboardingState("guest")
  );
  const [hydrated, setHydrated] = useState(false);
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);
  const debounceNameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (sessionPending) return;
    let active = true;

    async function hydrateOnboarding() {
      const ownerKey = userId || "guest";
      const existing = await localOnboardingRepo.get(ownerKey).catch(() => null);
      const guestFallback =
        ownerKey !== "guest"
          ? await localOnboardingRepo.get("guest").catch(() => null)
          : null;

      if (!active) return;

      const resolvedSalutation =
        normalizeSalutation(userPreferences?.salutation) ||
        normalizeSalutation(existing?.salutation) ||
        normalizeSalutation(guestFallback?.salutation) ||
        null;
      const resolvedReligion =
        normalizeReligion(userPreferences?.religion) ||
        normalizeReligion(existing?.religion) ||
        normalizeReligion(guestFallback?.religion) ||
        null;
      const accountName = !isGuest && user?.name ? user.name.trim() : "";
      const resolvedName =
        accountName ||
        sanitizeGuestFirstName(existing?.guestName) ||
        sanitizeGuestFirstName(guestFallback?.guestName) ||
        "";

      const isAlreadyDone = Boolean(
        existing?.completed || userPreferences?.onboardingCompleted
      );
      if (isAlreadyDone) {
        setOnboardingCookie(true);
        router.replace("/");
        return;
      }

      const initialStep = normalizeOnboardingStep(
        existing?.currentStep ??
          (userPreferences?.onboardingStep as number | undefined) ??
          (guestFallback?.currentStep as number | undefined) ??
          1
      );

      const mergedState: OnboardingState = {
        ownerKey,
        salutation: resolvedSalutation,
        guestName: resolvedName,
        religion: resolvedReligion,
        currentStep: initialStep,
        completed: false,
        sawAtheistHumor: Boolean(
          existing?.sawAtheistHumor || resolvedReligion === "atheist"
        ),
        completedAt: null,
        updatedAt: new Date().toISOString(),
      };

      setState(mergedState);
      setOnboardingCookie(false);
      await localOnboardingRepo.save(mergedState).catch(() => {});
      if (active) setHydrated(true);
    }

    void hydrateOnboarding();
    return () => {
      active = false;
    };
  }, [
    sessionPending,
    userId,
    isGuest,
    user?.name,
    userPreferences?.salutation,
    userPreferences?.religion,
    userPreferences?.onboardingCompleted,
    userPreferences?.onboardingStep,
    router,
  ]);

  useEffect(() => {
    return () => {
      if (debounceNameTimer.current) {
        clearTimeout(debounceNameTimer.current);
      }
    };
  }, []);

  const persistProgress = async (
    patch: Partial<OnboardingState>,
    syncServer = true
  ) => {
    const ownerKey = userId || "guest";
    const next: OnboardingState = {
      ...state,
      ...patch,
      ownerKey,
      updatedAt: new Date().toISOString(),
    };
    setState(next);
    setOnboardingCookie(Boolean(next.completed));
    await localOnboardingRepo.save(next).catch(() => {});

    if (syncServer) {
      await updatePreferences({
        ...(next.salutation ? { salutation: next.salutation } : {}),
        ...(next.religion ? { religion: next.religion } : {}),
        ...(isGuest && next.guestName ? { profileName: next.guestName } : {}),
        onboardingStep: next.currentStep,
        onboardingCompleted: next.completed,
        onboardingCompletedAt: next.completedAt,
        ...(next.completed
          ? {
              prayerTrackingEnabled: next.religion === "muslim",
              prayerPreferenceConfigured: true,
            }
          : {}),
      }).catch(() => {});
    }

    return next;
  };

  const handleSelectSalutation = async (salutation: Salutation) => {
    await persistProgress({ salutation });
  };

  const handleStep1Next = async () => {
    if (!state.salutation) return;
    await persistProgress({ currentStep: 2 });
  };

  const handleNameChange = (val: string) => {
    setNameError("");
    const bounded =
      countDisplayCharacters(val) > WELCOME_NAME_MAX_LENGTH
        ? sliceDisplayCharacters(val, WELCOME_NAME_MAX_LENGTH)
        : val;
    const nextState: OnboardingState = {
      ...state,
      guestName: bounded,
      ownerKey: userId || "guest",
      updatedAt: new Date().toISOString(),
    };
    setState(nextState);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          `athar_onboarding_state:${nextState.ownerKey}`,
          JSON.stringify(nextState)
        );
      } catch {}
    }
    if (debounceNameTimer.current) clearTimeout(debounceNameTimer.current);
    debounceNameTimer.current = setTimeout(() => {
      void localOnboardingRepo.save(nextState).catch(() => {});
    }, 120);
  };

  const handleStep2Next = async () => {
    const validation = validateWelcomeName(state.guestName);
    if (!validation.valid) {
      setNameError(validation.error || "يرجى إدخال اسم صالح");
      return;
    }
    const clean = validation.cleaned;

    if (!isGuest && user?.name && clean !== user.name.trim()) {
      await updateUserProfile({ name: clean }).catch(() => {});
    }

    await persistProgress({
      guestName: clean,
      currentStep: 3,
    });
  };

  const handleSelectReligion = async (religion: Religion) => {
    await persistProgress({
      religion,
      sawAtheistHumor: religion === "atheist",
    });
  };

  const handleCompleteOnboarding = async (overrideReligion?: Religion) => {
    const finalReligion = overrideReligion || state.religion;
    if (!finalReligion || saving) return;

    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const ownerKey = userId || "guest";
      const cleanName =
        !isGuest && user?.name?.trim()
          ? user.name.trim()
          : sanitizeGuestFirstName(state.guestName);

      const finalState: OnboardingState = {
        ...state,
        ownerKey,
        guestName: cleanName,
        religion: finalReligion,
        currentStep: 3,
        completed: true,
        completedAt: nowIso,
        updatedAt: nowIso,
      };

      setOnboardingCookie(true);
      await localOnboardingRepo.save(finalState);

      await updatePreferences({
        salutation: finalState.salutation,
        religion: finalReligion,
        ...(isGuest && cleanName ? { profileName: cleanName } : {}),
        onboardingStep: 3,
        onboardingCompleted: true,
        onboardingCompletedAt: nowIso,
        prayerTrackingEnabled: finalReligion === "muslim",
        prayerPreferenceConfigured: true,
      });

      router.replace("/");
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08090d] px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-600/30 animate-pulse">
            <Flame className="w-6 h-6 text-white fill-white" />
          </div>
          <p className="text-sm text-zinc-400">جاري تجهيز تجربتك...</p>
        </div>
      </div>
    );
  }

  const progressPercent = (state.currentStep / 3) * 100;
  const displaySalutation = state.salutation || "هندسة";

  return (
    <div className="min-h-screen flex flex-col justify-between py-8 px-4 sm:px-6 relative overflow-hidden">
      <div className="max-w-xl w-full mx-auto space-y-8 relative z-10">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg shadow-violet-600/30">
              <Flame className="w-5 h-5 fill-white" />
            </span>
            <div>
              <span className="text-lg font-black text-zinc-100 block leading-tight">
                أثـر
              </span>
              <span className="text-[11px] text-zinc-400 block">
                بداية مخصصة ليومك
              </span>
            </div>
          </div>

          {isGuest && (
            <Link
              href="/login?returnTo=/welcome"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-violet-400" />
              <span>تسجيل دخول</span>
            </Link>
          )}
        </div>

        {/* Progress indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-semibold text-zinc-300">
              الخطوة {state.currentStep} من ٣
            </span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-900 border border-zinc-800/80 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-l from-violet-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`text-[11px] font-medium text-center py-1 rounded-lg transition-colors ${
                  state.currentStep === step
                    ? "text-violet-300 bg-violet-500/10 border border-violet-500/20"
                    : state.currentStep > step
                      ? "text-emerald-400 bg-emerald-500/5"
                      : "text-zinc-500"
                }`}
              >
                {step === 1 ? "اللقب" : step === 2 ? "الاسم" : "التجربة"}
              </div>
            ))}
          </div>
        </div>

        {/* Step Card */}
        <div className="rounded-3xl bg-[#0c0e17]/95 border border-zinc-800/80 shadow-2xl p-6 sm:p-8 space-y-6 backdrop-blur-xl">
          {state.currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
             
                <h1 className="text-2xl sm:text-3xl font-black text-zinc-100">
                  إزيك يا ...
                </h1>
             
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SALUTATIONS.map((item) => {
                  const selected = state.salutation === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleSelectSalutation(item.value)}
                      data-testid={`salutation-${item.value}`}
                      className={`group relative p-5 rounded-2xl border text-right transition-all cursor-pointer ${
                        selected
                          ? "bg-violet-600/15 border-violet-500 shadow-lg shadow-violet-600/15"
                          : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      <div className={`flex items-center justify-between ${item.hint ? "mb-2" : ""}`}>
                        <span className="text-xl font-black text-zinc-100">
                          {item.label}
                        </span>
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                            selected
                              ? "bg-violet-500 border-violet-400 text-white"
                              : "border-zinc-700 text-transparent"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      {item.hint && (
                        <p className="text-xs text-zinc-400">{item.hint}</p>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={!state.salutation}
                  onClick={handleStep1Next}
                  data-testid="welcome-step1-next"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
                >
                  <span>التالي</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {state.currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
                  <User className="w-3.5 h-3.5" />
                  <span>التعريف الشخصي</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-zinc-100">
                  إسمك إيه يا {displaySalutation}؟
                </h1>
                <p className="text-sm text-zinc-400">
                  {!isGuest && user?.name
                    ? "تم جلب اسمك من حسابك تلقائياً ويمكنك تعديله الآن أو من الإعدادات."
                    : "إكتب إسم عشان نناديلك بيه."}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <label
                    htmlFor="welcome-name-input"
                    className="text-zinc-300"
                  >
                    الاسم الأول
                  </label>
                  <span
                    dir="ltr"
                    className={`font-mono text-[11px] ${
                      countDisplayCharacters(state.guestName) > WELCOME_NAME_MAX_LENGTH
                        ? "text-rose-400"
                        : "text-zinc-500"
                    }`}
                  >
                    {countDisplayCharacters(state.guestName)}/{WELCOME_NAME_MAX_LENGTH}
                  </span>
                </div>
                <input
                  id="welcome-name-input"
                  type="text"
                  autoFocus
                  maxLength={WELCOME_NAME_MAX_LENGTH}
                  value={state.guestName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleStep2Next();
                    }
                  }}
                  placeholder="مثال: طه..."
                  className="w-full px-4 py-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 focus:border-violet-500 focus:outline-none text-base font-semibold text-zinc-100 placeholder:text-zinc-500 transition-colors"
                />
                {nameError && (
                  <p className="text-xs text-rose-400 font-medium">{nameError}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => persistProgress({ currentStep: 1 })}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm font-semibold transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>

                <button
                  type="button"
                  onClick={handleStep2Next}
                  data-testid="welcome-step2-next"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
                >
                  <span>التالي</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {state.currentStep === 3 && (
            <div className="space-y-6">
              {state.religion === "atheist" && state.sawAtheistHumor ? (
                <div className="py-8 sm:py-10 flex flex-col items-center justify-center text-center gap-7 min-h-[250px]">
                  <div className="inline-flex items-center justify-center px-7 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 shadow-lg shadow-amber-950/20">
                    <h2 className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight">
                      ملحد يا عدو الله ؟
                    </h2>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() =>
                        persistProgress({ religion: null, sawAtheistHumor: false })
                      }
                      className="px-5 py-3 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-sm font-semibold transition-all cursor-pointer"
                    >
                      تغيير الإجابة
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleCompleteOnboarding("atheist")}
                      data-testid="atheist-continue-btn"
                      className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                    >
                      <span>بينا على اللي بعده</span>
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                 
                    <h1 className="text-2xl sm:text-3xl font-black text-zinc-100">
                      {formatWelcomeReligionQuestion(state.salutation, state.guestName)}
                    </h1>
                    <p className="text-sm text-zinc-400">
                      لنخصّص واجهة التطبيق والأقسام المعروضة بما يناسبك، ويمكنك تغيير ذلك في أي وقت من الإعدادات.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {RELIGIONS.map((item) => {
                      const selected = state.religion === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => handleSelectReligion(item.value)}
                          data-testid={`religion-${item.value}`}
                          className={`w-full p-4 rounded-2xl border text-right transition-all flex items-center justify-between gap-4 cursor-pointer ${
                            selected
                              ? "bg-violet-600/15 border-violet-500 shadow-lg shadow-violet-600/15"
                              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                          }`}
                        >
                          <div>
                            <span className="text-base font-bold text-zinc-100 block">
                              {item.label}
                            </span>
                            <span className="text-xs text-zinc-400 block mt-0.5">
                              {item.description}
                            </span>
                          </div>
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                              selected
                                ? "bg-violet-500 border-violet-400 text-white"
                                : "border-zinc-700 text-transparent"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => persistProgress({ currentStep: 2 })}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>السابق</span>
                    </button>

                    <button
                      type="button"
                      disabled={!state.religion || saving}
                      onClick={() => handleCompleteOnboarding()}
                      data-testid="welcome-complete-btn"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                    >
                      <span>{saving ? "جاري الحفظ..." : "ابدأ يومك في أثـر"}</span>
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-[11px] text-zinc-500 mt-8 relative z-10">
        بياناتك تُحفظ محلياً فوراً وتعمل دون اتصال، ويمكنك مزامنتها مع حسابك وقتما تشاء.
      </p>
    </div>
  );
}
