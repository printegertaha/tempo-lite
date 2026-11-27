"use client";

import { useEffect, useState } from "react";
import DatePickerField from "@/components/ui/DatePickerField";
import {
  ACTIVITY_LEVELS,
  GOAL_OPTIONS,
  computeAgeFromBirthDate,
  createEmptyNutritionProfile,
  resolveProfileAge,
} from "@/lib/nutrition/calculations";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Dumbbell,
  Scale,
  Sparkles,
  Target,
  Utensils,
} from "lucide-react";

const TOTAL_STEPS = 7;

const SEX_OPTIONS = [
  { id: "male", label: "ذكر", desc: "لتقدير احتياج الطاقة اليومي بدقة" },
  { id: "female", label: "أنثى", desc: "لتقدير احتياج الطاقة اليومي بدقة" },
  {
    id: "prefer_not_to_say",
    label: "أفضل عدم التحديد",
    desc: "يمكنك إدخال أهدافك يدوياً لاحقاً من إعدادات الملف الغذائي",
  },
];

const TRAINING_OPTIONS = [
  { id: "none", label: "بدون تمرين منتظم", desc: "توزيع يومي متوازن للماكروز" },
  { id: "recreational", label: "تمرين ترفيهي / لياقة عامة", desc: "1–3 حصص أسبوعياً" },
  { id: "strength_endurance", label: "تمرين مقاومة أو تحمّل منتظم", desc: "زيادة البروتين لدعم التمرين والاستشفاء" },
];

const CALC_STAGES = [
  "تقدير احتياج السعرات اليومي المناسب لجسمك...",
  "توزيع البروتين والكاربوهيدرات والدهون حسب هدفك...",
  "تجهيز احتياج الترطيب اليومي وبرنامجك الشخصي...",
];

export default function NutritionOnboardingWizard({
  initialProfile,
  latestGymWeight,
  onSaveDraft,
  onCompleteProfile,
}) {
  const [draft, setDraft] = useState(() => ({
    ...createEmptyNutritionProfile(),
    ...(initialProfile || {}),
  }));
  const [inSetup, setInSetup] = useState(() => Boolean(initialProfile?.setupInProgress));
  const [step, setStep] = useState(() => {
    const s = Number(initialProfile?.setupStep || 1);
    return Number.isFinite(s) && s >= 1 && s <= TOTAL_STEPS ? s : 1;
  });
  const [birthMode, setBirthMode] = useState(() =>
    initialProfile?.birthDate ? "birthDate" : "age"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcStageIdx, setCalcStageIdx] = useState(0);

  // Sync if initialProfile loads or updates from another tab/account switch
  useEffect(() => {
    setDraft({
      ...createEmptyNutritionProfile(),
      ...(initialProfile || {}),
    });
    setInSetup(Boolean(initialProfile?.setupInProgress));
    const s = Number(initialProfile?.setupStep || 1);
    setStep(Number.isFinite(s) && s >= 1 && s <= TOTAL_STEPS ? s : 1);
    setBirthMode(initialProfile?.birthDate ? "birthDate" : "age");
  }, [initialProfile]);

  const persistDraft = (patch, nextStep = step) => {
    const merged = { ...draft, ...patch, setupStep: nextStep, setupInProgress: true };
    setDraft(merged);
    setErrorMsg("");
    void onSaveDraft?.({ ...patch, setupStep: nextStep, setupInProgress: true });
  };

  const handleStartSetup = () => {
    setInSetup(true);
    setStep(1);
    setErrorMsg("");
    void onSaveDraft?.({ setupStep: 1, setupInProgress: true });
  };

  const validateCurrentStep = () => {
    if (step === 1) {
      if (!draft.biologicalSex) return "يرجى اختيار الجنس البيولوجي للمتابعة.";
    } else if (step === 2) {
      const resolvedAge =
        birthMode === "birthDate"
          ? computeAgeFromBirthDate(draft.birthDate)
          : Number(draft.age);
      if (!Number.isFinite(resolvedAge) || resolvedAge < 10 || resolvedAge > 110) {
        return "يرجى إدخال عمر صحيح بين 10 و110 سنة.";
      }
    } else if (step === 3) {
      const h = Number(draft.heightCm);
      if (!Number.isFinite(h) || h < 90 || h > 250) {
        return "يرجى إدخال طول صحيح بين 90 و250 سم.";
      }
    } else if (step === 4) {
      const w = Number(draft.weightKg);
      if (!Number.isFinite(w) || w < 25 || w > 350) {
        return "يرجى إدخال وزن صحيح بين 25 و350 كجم.";
      }
    } else if (step === 5) {
      if (!draft.activityLevel) return "يرجى اختيار مستوى النشاط اليومي.";
    } else if (step === 6) {
      if (!draft.goal) return "يرجى اختيار هدفك الغذائي.";
    } else if (step === 7) {
      if (!draft.trainingLevel) return "يرجى اختيار مستوى التمرين الرياضي.";
    }
    return "";
  };

  const handleNext = async () => {
    const err = validateCurrentStep();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg("");

    if (step < TOTAL_STEPS) {
      const nextStep = step + 1;
      setStep(nextStep);
      void onSaveDraft?.({ ...draft, setupStep: nextStep, setupInProgress: true });
      return;
    }

    // Final step -> personalized calculation animation then complete
    setIsCalculating(true);
    setCalcStageIdx(0);
    const t1 = setTimeout(() => setCalcStageIdx(1), 550);
    const t2 = setTimeout(() => setCalcStageIdx(2), 1100);

    try {
      await new Promise((r) => setTimeout(r, 1700));
      const finalProfile = {
        ...draft,
        weightKg: Number(draft.weightKg),
        heightCm: Number(draft.heightCm),
        age:
          birthMode === "age" && draft.age
            ? Number(draft.age)
            : resolveProfileAge(draft),
        birthDate: birthMode === "birthDate" ? draft.birthDate || null : null,
        setupStep: TOTAL_STEPS,
        setupInProgress: false,
        setupCompleted: true,
        setupVersion: 1,
      };
      await onCompleteProfile?.(finalProfile, { syncWeightToGym: true });
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setIsCalculating(false);
    }
  };

  const handleBack = () => {
    if (step <= 1) return;
    const prevStep = step - 1;
    setStep(prevStep);
    setErrorMsg("");
    void onSaveDraft?.({ ...draft, setupStep: prevStep, setupInProgress: true });
  };

  // 1. Final Personalized Calculation Animation
  if (isCalculating) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-12">
        <div className="relative flex flex-col items-center text-center max-w-md w-full p-8 rounded-3xl bg-[#0c0e17]/95 border border-teal-500/30 shadow-2xl space-y-6 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-56 h-56 rounded-full bg-teal-500/15 blur-3xl animate-pulse" />
          </div>
          <div className="relative z-10 w-16 h-16 rounded-2xl bg-teal-500/15 border border-teal-400/40 flex items-center justify-center text-teal-300">
            <Calculator className="w-8 h-8 animate-pulse" />
          </div>
          <div className="relative z-10 space-y-2">
            <h2 className="text-lg font-black text-zinc-100">جاري تخصيص برنامجك الغذائي...</h2>
            <p className="text-xs text-teal-300 font-medium min-h-[1.5rem]">
              {CALC_STAGES[calcStageIdx]}
            </p>
          </div>
          <div className="relative z-10 w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.round(((calcStageIdx + 1) / CALC_STAGES.length) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 2. Minimal Welcome Screen (Before setup starts)
  if (!inSetup) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full p-8 sm:p-10 rounded-3xl bg-[#0c0e17]/95 border border-zinc-800/90 shadow-2xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-teal-600/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Utensils className="w-8 h-8" />
          </div>
          <div className="space-y-2.5">
            <h1 className="text-2xl font-black text-zinc-100">
              لسه معندناش بياناتك الغذائية
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              خلينا نتعرف على جسمك وهدفك عشان نحسب احتياجاتك ونخصص برنامجك الغذائي.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartSetup}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold shadow-lg shadow-teal-600/30 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>خصص برنامجي الغذائي</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Progressive 7-Step Setup (One question per step)
  const progressPercent = Math.round((step / TOTAL_STEPS) * 100);
  const selectedGoalObj = GOAL_OPTIONS.find((g) => g.id === (draft.goal || "maintain")) || GOAL_OPTIONS[0];

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-10">
      <div className="max-w-xl w-full p-6 sm:p-8 rounded-3xl bg-[#0c0e17]/95 border border-zinc-800/90 shadow-2xl space-y-6 text-right">
        {/* Progress Header */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-teal-300">إعداد برنامجك الغذائي</span>
            <span className="font-mono text-zinc-400">
              الخطوة {step} من {TOTAL_STEPS}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Step Content (One Question Per Step) */}
        <div className="min-h-[210px] flex flex-col justify-center space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              <h2 className="text-lg font-black text-zinc-100">ما هو الجنس؟</h2>
              <p className="text-xs text-zinc-400">يساعدنا في تقدير احتياجات جسمك اليومية بشكل أدق.</p>
              <div className="space-y-2">
                {SEX_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => persistDraft({ biologicalSex: opt.id })}
                    className={`w-full text-right p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      draft.biologicalSex === opt.id
                        ? "bg-teal-500/15 border-teal-500/50 text-zinc-100"
                        : "bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    <div className="text-sm font-bold">{opt.label}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-black text-zinc-100">
                  {birthMode === "age" ? "كم عمرك؟" : "ما هو تاريخ ميلادك؟"}
                </h2>
                <button
                  type="button"
                  onClick={() => setBirthMode((m) => (m === "age" ? "birthDate" : "age"))}
                  className="text-xs text-teal-400 hover:underline cursor-pointer"
                >
                  {birthMode === "age" ? "استخدام تاريخ الميلاد" : "إدخال العمر مباشرة"}
                </button>
              </div>
              <p className="text-xs text-zinc-400">يؤثر العمر مباشرة في حساب احتياج الطاقة اليومي.</p>
              {birthMode === "age" ? (
                <input
                  type="number"
                  min="10"
                  max="110"
                  value={draft.age ?? ""}
                  onChange={(e) =>
                    persistDraft({
                      age: e.target.value === "" ? null : Number(e.target.value),
                      birthDate: null,
                    })
                  }
                  placeholder="مثال: 27"
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-base text-zinc-100 font-mono"
                />
              ) : (
                <DatePickerField
                  value={draft.birthDate ?? ""}
                  minYear={1920}
                  maxYear={new Date().getFullYear()}
                  maxDate={new Date().toISOString().slice(0, 10)}
                  onChange={(d) =>
                    persistDraft({
                      birthDate: d || null,
                      age: d ? computeAgeFromBirthDate(d) : null,
                    })
                  }
                  title="تاريخ الميلاد"
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-sm text-zinc-100"
                />
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h2 className="text-lg font-black text-zinc-100">ما هو طولك بالسنتيمتر؟</h2>
              <p className="text-xs text-zinc-400">أدخل الطول التقريبي (سم) لحساب كتلة الجسم والطاقة بدقة.</p>
              <input
                type="number"
                step="0.5"
                min="90"
                max="250"
                value={draft.heightCm ?? ""}
                onChange={(e) =>
                  persistDraft({
                    heightCm: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                placeholder="مثال: 175"
                className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-base text-zinc-100 font-mono"
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <h2 className="text-lg font-black text-zinc-100">ما هو وزنك الحالي بالكيلوجرام؟</h2>
              <p className="text-xs text-zinc-400">يُستخدم لتحديد السعرات اليومية واحتياج البروتين والماء.</p>
              {latestGymWeight?.weightKg > 0 && (
                <div className="p-3 rounded-2xl bg-teal-950/30 border border-teal-500/30 flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 text-teal-200">
                    <Scale className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>آخر وزن مسجل في الجيم: {latestGymWeight.weightKg} كجم</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      persistDraft({
                        weightKg: Number(latestGymWeight.weightKg),
                        weightConfirmedAt: new Date().toISOString(),
                      })
                    }
                    className="px-3 py-1 rounded-xl bg-teal-600/25 hover:bg-teal-600/40 border border-teal-500/40 text-teal-200 font-bold cursor-pointer"
                  >
                    استخدامه
                  </button>
                </div>
              )}
              <input
                type="number"
                step="0.1"
                min="25"
                max="350"
                value={draft.weightKg ?? ""}
                onChange={(e) =>
                  persistDraft({
                    weightKg: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                placeholder="مثال: 78.5"
                className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-base text-zinc-100 font-mono"
              />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <h2 className="text-lg font-black text-zinc-100">ما هو مستوى نشاطك اليومي؟</h2>
              <div className="space-y-2">
                {ACTIVITY_LEVELS.map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => persistDraft({ activityLevel: lvl.id })}
                    className={`w-full text-right p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      draft.activityLevel === lvl.id
                        ? "bg-teal-500/15 border-teal-500/50 text-zinc-100"
                        : "bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    <div className="text-sm font-bold">{lvl.labelAr}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{lvl.examplesAr}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-3">
              <h2 className="text-lg font-black text-zinc-100 flex items-center gap-2">
                <Target className="w-5 h-5 text-teal-400" />
                <span>ما هو هدفك الغذائي الحالي؟</span>
              </h2>
              <div className="space-y-2">
                {GOAL_OPTIONS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() =>
                      persistDraft({ goal: g.id, rateKgPerWeek: g.defaultRateKgPerWeek })
                    }
                    className={`w-full text-right p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      draft.goal === g.id
                        ? "bg-teal-500/15 border-teal-500/50 text-zinc-100"
                        : "bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    <div className="text-sm font-bold">{g.labelAr}</div>
                  </button>
                ))}
              </div>
              {selectedGoalObj.rates.length > 1 && (
                <div className="pt-2 space-y-1.5">
                  <div className="text-xs font-semibold text-zinc-400">معدل التغيير الأسبوعي:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedGoalObj.rates.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => persistDraft({ rateKgPerWeek: r.value })}
                        className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                          Number(draft.rateKgPerWeek) === r.value
                            ? "bg-teal-500/20 border-teal-500/50 text-teal-200"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400"
                        }`}
                      >
                        {r.labelAr}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 7 && (
            <div className="space-y-3">
              <h2 className="text-lg font-black text-zinc-100 flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-teal-400" />
                <span>ما هو مستوى تمرينك الرياضي؟</span>
              </h2>
              <div className="space-y-2">
                {TRAINING_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => persistDraft({ trainingLevel: t.id })}
                    className={`w-full text-right p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      draft.trainingLevel === t.id
                        ? "bg-teal-500/15 border-teal-500/50 text-zinc-100"
                        : "bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    <div className="text-sm font-bold">{t.label}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-2 rounded-xl">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={handleBack}
            disabled={step <= 1}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-700 text-xs font-bold text-zinc-200 cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>السابق</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-600/30 cursor-pointer"
          >
            {step === TOTAL_STEPS ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>احسب برنامجي الغذائي</span>
              </>
            ) : (
              <>
                <span>التالي</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
