export type Salutation = "بشمهندس" | "بشمهندسة";
export type Religion = "muslim" | "christian" | "atheist";

export const SALUTATIONS: ReadonlyArray<{
  value: Salutation;
  label: string;
  hint: string;
}> = [
  {
    value: "بشمهندس",
    label: "بشمهندس",
    hint: "",
  },
  {
    value: "بشمهندسة",
    label: "بشمهندسة",
    hint: "",
  },
];

export const RELIGIONS: ReadonlyArray<{
  value: Religion;
  label: string;
  description: string;
}> = [
  {
    value: "muslim",
    label: "مسلم",
    description: "إتاحة متابعة الصلوات والقرآن ضمن التجربة اليومية",
  },
  {
    value: "christian",
    label: "مسيحي",
    description: "تجربة تركّز على المهام والعادات والحياة اليومية",
  },
  {
    value: "atheist",
    label: "ملحد",
    description: "تجربة تركّز على الإنتاجية والتوازن الشخصي",
  },
];

export const ONBOARDING_COOKIE_NAME = "athar_onboarding";
export const ONBOARDING_COOKIE_DONE = "1";
export const ONBOARDING_COOKIE_PENDING = "0";
export const ONBOARDING_LEGACY_USER_DEFAULT_RELIGION: Religion = "muslim";

export interface OnboardingState {
  ownerKey: string;
  salutation: Salutation | null;
  guestName: string;
  religion: Religion | null;
  currentStep: 1 | 2 | 3;
  completed: boolean;
  sawAtheistHumor: boolean;
  completedAt: string | null;
  updatedAt: string;
  migratedLegacy?: boolean;
}

export function createEmptyOnboardingState(
  ownerKey: string = "guest"
): OnboardingState {
  return {
    ownerKey,
    salutation: null,
    guestName: "",
    religion: null,
    currentStep: 1,
    completed: false,
    sawAtheistHumor: false,
    completedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeSalutation(value?: string | null): Salutation | null {
  if (value === "بشمهندس" || value === "بشمهندسة") {
    return value;
  }
  return null;
}

export function normalizeReligion(value?: string | null): Religion | null {
  if (value === "muslim" || value === "christian" || value === "atheist") {
    return value;
  }
  return null;
}

export function normalizeOnboardingStep(step?: number | null): 1 | 2 | 3 {
  if (step === 2) return 2;
  if (step === 3) return 3;
  return 1;
}

export function getSalutationLabel(salutation?: string | null): string {
  return normalizeSalutation(salutation) ?? "هندسة";
}

export function formatPersonalizedGreeting(
  salutation?: string | null,
  name?: string | null
): string {
  const sal = normalizeSalutation(salutation);
  const cleanName = typeof name === "string" ? name.trim() : "";

  if (sal && cleanName) {
    return `إزيك يا ${sal} ${cleanName}`;
  }
  if (sal) {
    return `إزيك يا ${sal}`;
  }
  if (cleanName) {
    return `إزيك يا ${cleanName}`;
  }
  return "إزيك يا هندسة";
}

export function formatAddressingSuffix(salutation?: string | null): string {
  const sal = normalizeSalutation(salutation);
  if (sal === "بشمهندس") return "يا بشمهندس";
  if (sal === "بشمهندسة") return "يا بشمهندسة";
  return "يا هندسة";
}

export function getReligionLabel(religion?: string | null): string {
  switch (normalizeReligion(religion)) {
    case "muslim":
      return "مسلم";
    case "christian":
      return "مسيحي";
    case "atheist":
      return "ملحد";
    default:
      return "غير محدد";
  }
}

export function isMuslimReligion(religion?: string | null): boolean {
  return normalizeReligion(religion) === "muslim";
}

export function isIslamicFeatureVisible(
  prefs?: { religion?: string | null } | null
): boolean {
  return isMuslimReligion(prefs?.religion);
}

export function isPrayerModuleVisible(
  prefs?: { religion?: string | null; prayerTrackingEnabled?: boolean } | null
): boolean {
  return (
    isMuslimReligion(prefs?.religion) &&
    prefs?.prayerTrackingEnabled !== false
  );
}

export function setOnboardingCookie(completed: boolean): void {
  if (typeof document === "undefined") return;
  const value = completed ? ONBOARDING_COOKIE_DONE : ONBOARDING_COOKIE_PENDING;
  const secure =
    typeof window !== "undefined" && window.location?.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${ONBOARDING_COOKIE_NAME}=${value}; path=/; max-age=31536000; SameSite=Lax${secure}`;
}

export function readOnboardingCookieClient(): boolean | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${ONBOARDING_COOKIE_NAME}=`)) {
      const value = trimmed.slice(ONBOARDING_COOKIE_NAME.length + 1);
      if (value === ONBOARDING_COOKIE_DONE) return true;
      if (value === ONBOARDING_COOKIE_PENDING) return false;
    }
  }
  return null;
}

export const WELCOME_NAME_MAX_LENGTH = 10;

function splitDisplayGraphemes(value: string): string[] {
  if (!value) return [];
  if (typeof Intl !== "undefined" && typeof (Intl as any).Segmenter === "function") {
    const segmenter = new (Intl as any).Segmenter("ar", { granularity: "grapheme" });
    return Array.from(segmenter.segment(value), (seg: any) => String(seg.segment));
  }
  return Array.from(value);
}

export function countDisplayCharacters(value?: string | null): number {
  if (!value || typeof value !== "string") return 0;
  return splitDisplayGraphemes(value).length;
}

export function sliceDisplayCharacters(
  value: string,
  maxChars: number = WELCOME_NAME_MAX_LENGTH
): string {
  if (!value) return "";
  return splitDisplayGraphemes(value).slice(0, maxChars).join("");
}

export function validateWelcomeName(raw?: string | null): {
  valid: boolean;
  cleaned: string;
  length: number;
  error?: string;
} {
  const cleaned = sanitizeGuestFirstName(raw);
  const length = countDisplayCharacters(cleaned);
  if (length === 0) {
    return {
      valid: false,
      cleaned,
      length,
      error: "اكتب اسمك الأول عشان نناديك بيه",
    };
  }
  if (length > WELCOME_NAME_MAX_LENGTH) {
    return {
      valid: false,
      cleaned,
      length,
      error: `الاسم يجب ألا يتجاوز ${WELCOME_NAME_MAX_LENGTH} أحرف`,
    };
  }
  return { valid: true, cleaned, length };
}

export function sanitizeGuestFirstName(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim();
}

export function formatWelcomeReligionQuestion(
  salutation?: string | null,
  name?: string | null
): string {
  const sal = normalizeSalutation(salutation);
  const cleanName = sanitizeGuestFirstName(name);

  if (sal === "بشمهندس") {
    return cleanName
      ? `مسلم ولا مسيحي يا عم ${cleanName}؟`
      : "مسلم ولا مسيحي يا بشمهندس؟";
  }

  if (sal === "بشمهندسة") {
    return cleanName
      ? `مسلمة ولا مسيحية يا خالة ${cleanName}؟`
      : "مسلمة ولا مسيحية يا بشمهندسة؟";
  }

  return cleanName
    ? `مسلم ولا مسيحي يا ${cleanName}؟`
    : "مسلم ولا مسيحي يا هندسة؟";
}
