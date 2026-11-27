"use client";

import { useEffect, useState, useMemo, useId } from "react";
import Modal from "@/components/ui/Modal";
import DatePickerField from "@/components/ui/DatePickerField";
import {
  ACTIVITY_LEVELS,
  GOAL_OPTIONS,
  calculateNutritionPlan,
  createEmptyNutritionProfile,
  resolveProfileAge,
} from "@/lib/nutrition/calculations";
import { Scale, CheckCircle2, AlertTriangle, Info, Sliders, Calculator } from "lucide-react";

export default function NutritionProfileModal({
  isOpen,
  onClose,
  initialProfile,
  latestGymWeight,
  onSaveProfile,
}) {
  const formId = useId();
  const [draft, setDraft] = useState(() => ({
    ...createEmptyNutritionProfile(),
    ...(initialProfile || {}),
  }));
  const [birthInputMode, setBirthInputMode] = useState(() =>
    initialProfile?.birthDate ? "birthDate" : "age"
  );
  const [useCustomMacros, setUseCustomMacros] = useState(() =>
    Boolean(
      initialProfile?.customMacroOverrides &&
        (initialProfile.customMacroOverrides.protein != null ||
          initialProfile.customMacroOverrides.carbs != null ||
          initialProfile.customMacroOverrides.fat != null)
    )
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDraft({
      ...createEmptyNutritionProfile(),
      ...(initialProfile || {}),
    });
    setBirthInputMode(initialProfile?.birthDate ? "birthDate" : "age");
    setUseCustomMacros(
      Boolean(
        initialProfile?.customMacroOverrides &&
          (initialProfile.customMacroOverrides.protein != null ||
            initialProfile.customMacroOverrides.carbs != null ||
            initialProfile.customMacroOverrides.fat != null)
      )
    );
  }, [isOpen, initialProfile]);

  const preview = useMemo(() => calculateNutritionPlan(draft), [draft]);
  const selectedGoalObj =
    GOAL_OPTIONS.find((g) => g.id === (draft.goal || "maintain")) || GOAL_OPTIONS[0];

  const handleConfirmGymWeight = () => {
    if (!latestGymWeight?.weightKg) return;
    setDraft((prev) => ({
      ...prev,
      weightKg: Number(latestGymWeight.weightKg),
      weightConfirmedAt: new Date().toISOString(),
    }));
  };

  const handleGoalChange = (goalId) => {
    const gObj = GOAL_OPTIONS.find((g) => g.id === goalId) || GOAL_OPTIONS[0];
    setDraft((prev) => ({
      ...prev,
      goal: goalId,
      rateKgPerWeek: gObj.defaultRateKgPerWeek,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const cleaned = {
        ...draft,
        weightKg: draft.weightKg ? Number(draft.weightKg) : null,
        heightCm: draft.heightCm ? Number(draft.heightCm) : null,
        age: birthInputMode === "age" && draft.age ? Number(draft.age) : resolveProfileAge(draft),
        birthDate: birthInputMode === "birthDate" ? draft.birthDate || null : null,
        customMacroOverrides: useCustomMacros ? draft.customMacroOverrides || null : null,
        waterLitersOverride: useCustomMacros ? draft.waterLitersOverride ?? null : null,
      };
      await onSaveProfile(cleaned, { syncWeightToGym: true });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title="إعداد الملف الغذائي وحساب الأهداف"
      description="تقدير السعرات والماكروز والسوائل وفق معادلات DRI 2023 وAMDR وISSN"
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-5 text-right max-h-[75vh] overflow-y-auto pl-1">
        {/* Mode Switch */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-zinc-900 border border-zinc-800">
          <button
            type="button"
            onClick={() => setDraft((p) => ({ ...p, mode: "auto" }))}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              draft.mode !== "manual"
                ? "bg-teal-600 text-white shadow-md shadow-teal-600/25"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>حساب علمي تلقائي (DRI 2023)</span>
          </button>
          <button
            type="button"
            onClick={() => setDraft((p) => ({ ...p, mode: "manual" }))}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              draft.mode === "manual"
                ? "bg-teal-600 text-white shadow-md shadow-teal-600/25"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>أهداف يدوية مخصصة</span>
          </button>
        </div>

        {/* Reuse Gym Weight Banner */}
        {latestGymWeight?.weightKg > 0 && (
          <div className="p-3.5 rounded-2xl bg-teal-950/25 border border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Scale className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-teal-200">
                  آخر قياس وزن مسجل في الجيم: {latestGymWeight.weightKg} كجم ({latestGymWeight.date})
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  نفس سجل الوزن الموحد بين التغذية والجيم — أكده لاعتماده أو أدخل وزناً محدثاً.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleConfirmGymWeight}
              className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-200 text-xs font-bold shrink-0 cursor-pointer"
            >
              تأكيد {latestGymWeight.weightKg} كجم
            </button>
          </div>
        )}

        {/* Body Measurements */}
        {draft.mode !== "manual" ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="np-weight" className="block text-xs font-semibold text-zinc-300 mb-1">
                  الوزن الحالي (كجم) <span className="text-rose-400">*</span>
                </label>
                <input
                  id="np-weight"
                  type="number"
                  step="0.1"
                  min="25"
                  max="350"
                  required
                  value={draft.weightKg ?? ""}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      weightKg: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  placeholder="مثال: 78.5"
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                />
              </div>

              <div>
                <label htmlFor="np-height" className="block text-xs font-semibold text-zinc-300 mb-1">
                  الطول (سم) <span className="text-rose-400">*</span>
                </label>
                <input
                  id="np-height"
                  type="number"
                  step="0.5"
                  min="90"
                  max="250"
                  required
                  value={draft.heightCm ?? ""}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      heightCm: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  placeholder="مثال: 175"
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="np-age" className="text-xs font-semibold text-zinc-300">
                    {birthInputMode === "age" ? "العمر (سنوات)" : "تاريخ الميلاد"}{" "}
                    <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setBirthInputMode((m) => (m === "age" ? "birthDate" : "age"))
                    }
                    className="text-[10px] text-teal-400 hover:underline cursor-pointer"
                  >
                    {birthInputMode === "age" ? "أو تاريخ الميلاد" : "أو العمر مباشرة"}
                  </button>
                </div>
                {birthInputMode === "age" ? (
                  <input
                    id="np-age"
                    type="number"
                    min="10"
                    max="110"
                    required
                    value={draft.age ?? ""}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        age: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                    placeholder="مثال: 27"
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                  />
                ) : (
                  <DatePickerField
                    id="np-age"
                    value={draft.birthDate ?? ""}
                    minYear={1920}
                    maxYear={new Date().getFullYear()}
                    maxDate={new Date().toISOString().slice(0, 10)}
                    onChange={(d) =>
                      setDraft((p) => ({ ...p, birthDate: d || null }))
                    }
                    title="تحديد تاريخ الميلاد"
                    placeholder="اختر تاريخ الميلاد"
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                  />
                )}
              </div>
            </div>

            {/* Physiological Calculation Category */}
            <fieldset className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
              <legend className="text-xs font-bold text-zinc-200 px-1">
                الفئة الفسيولوجية للحساب (DRI 2023)
              </legend>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                تستخدم معادلات الأكاديميات الوطنية (DRI 2023) معاملات مختلفة للذكور والإناث بسبب اختلاف متوسط الكتلة العضلية والإنفاق الطاقي. هذا الحقل مستقل عن لقب المخاطبة في الملف الشخصي، ويمكنك اختيار عدم تحديده والتبديل للأهداف اليدوية.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: "male", label: "ذكر (معادلة البالغين للذكور)" },
                  { id: "female", label: "أنثى (معادلة البالغين للإناث)" },
                  { id: "prefer_not_to_say", label: "أفضّل عدم التحديد (يدوي)" },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      draft.biologicalSex === opt.id
                        ? "bg-teal-500/15 border-teal-500/50 text-teal-200 font-bold"
                        : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="biologicalSex"
                      value={opt.id}
                      checked={draft.biologicalSex === opt.id}
                      onChange={() =>
                        setDraft((p) => ({
                          ...p,
                          biologicalSex: opt.id,
                          ...(opt.id === "prefer_not_to_say" ? { mode: "manual" } : {}),
                        }))
                      }
                      className="accent-teal-500"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Activity Level */}
            <fieldset className="space-y-2">
              <legend className="text-xs font-bold text-zinc-200">
                مستوى النشاط البدني اليومي العام (الحركة اليومية الكاملة وليس الجيم فقط)
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ACTIVITY_LEVELS.map((act) => (
                  <label
                    key={act.id}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      draft.activityLevel === act.id
                        ? "bg-teal-500/15 border-teal-500/50 text-zinc-100"
                        : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="activityLevel"
                      value={act.id}
                      checked={draft.activityLevel === act.id}
                      onChange={() => setDraft((p) => ({ ...p, activityLevel: act.id }))}
                      className="mt-1 accent-teal-500"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-zinc-200">{act.labelAr}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">{act.descriptionAr}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{act.examplesAr}</div>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Goal, Rate & Training Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="np-goal" className="block text-xs font-semibold text-zinc-300 mb-1">
                  الهدف الغذائي
                </label>
                <select
                  id="np-goal"
                  value={draft.goal || "maintain"}
                  onChange={(e) => handleGoalChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                >
                  {GOAL_OPTIONS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.labelAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="np-rate" className="block text-xs font-semibold text-zinc-300 mb-1">
                  معدل التغيير المحافظ
                </label>
                <select
                  id="np-rate"
                  disabled={draft.goal === "maintain"}
                  value={draft.rateKgPerWeek ?? selectedGoalObj.defaultRateKgPerWeek}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, rateKgPerWeek: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 disabled:opacity-50"
                >
                  {selectedGoalObj.rates.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.labelAr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="np-training" className="block text-xs font-semibold text-zinc-300 mb-1">
                نمط التمرين الرياضي (لتحديد احتياج البروتين: RDA 0.8 مقابل ISSN 1.4–2.0 جم/كجم)
              </label>
              <select
                id="np-training"
                value={draft.trainingLevel || "none"}
                onChange={(e) => setDraft((p) => ({ ...p, trainingLevel: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
              >
                <option value="none">بدون تمرين منظم (المرجع العام 0.8–1.0 جم/كجم)</option>
                <option value="recreational">لياقة عامة / جري خفيف (1.2–1.4 جم/كجم)</option>
                <option value="strength_endurance">تمارين مقاومة / جيم / تحمل منتظم (ISSN: 1.6–1.8 جم/كجم)</option>
              </select>
            </div>

            {/* Medical / Special Conditions & Hydration Context */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-2.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={Boolean(draft.hotClimate)}
                  onChange={(e) => setDraft((p) => ({ ...p, hotClimate: e.target.checked }))}
                  className="accent-teal-500"
                />
                <span>طقس حار أو تعرق مرتفع (إضافة +0.35 لتر لنقطة بداية السوائل)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={Boolean(draft.isPregnantOrBreastfeeding || draft.hasMedicalRestriction)}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      isPregnantOrBreastfeeding: e.target.checked,
                      hasMedicalRestriction: e.target.checked,
                    }))
                  }
                  className="accent-amber-500"
                />
                <span>حمل / رضاعة / حالة طبية تتطلب توصية غذائية خاصة (يُفعّل التوجيه للوضع اليدوي)</span>
              </label>
            </div>
          </>
        ) : (
          /* Manual Mode Inputs */
          <div className="space-y-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <p className="text-xs text-zinc-400">
              أدخل أهدافك اليومية مباشرة حسب توصية المختص أو تفضيلك الشخصي:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">السعرات (kcal)</label>
                <input
                  type="number"
                  min="500"
                  max="8000"
                  required
                  value={draft.manualTargets?.calories ?? ""}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      manualTargets: {
                        ...(p.manualTargets || {}),
                        calories: e.target.value === "" ? undefined : Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">بروتين (g)</label>
                <input
                  type="number"
                  min="0"
                  max="500"
                  required
                  value={draft.manualTargets?.protein ?? ""}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      manualTargets: {
                        ...(p.manualTargets || {}),
                        protein: e.target.value === "" ? undefined : Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">كارب (g)</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  required
                  value={draft.manualTargets?.carbs ?? ""}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      manualTargets: {
                        ...(p.manualTargets || {}),
                        carbs: e.target.value === "" ? undefined : Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">دهون (g)</label>
                <input
                  type="number"
                  min="0"
                  max="400"
                  required
                  value={draft.manualTargets?.fat ?? ""}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      manualTargets: {
                        ...(p.manualTargets || {}),
                        fat: e.target.value === "" ? undefined : Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">الماء (لتر)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="8"
                  required
                  value={draft.manualTargets?.waterLiters ?? preview.hydrationDetails.recommendedBeverageLiters ?? ""}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      manualTargets: {
                        ...(p.manualTargets || {}),
                        waterLiters: e.target.value === "" ? undefined : Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Optional Macro & Water Customization in Auto Mode */}
        {draft.mode !== "manual" && preview.ready && preview.targets && (
          <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomMacros}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseCustomMacros(checked);
                    if (checked && !draft.customMacroOverrides) {
                      setDraft((p) => ({
                        ...p,
                        customMacroOverrides: {
                          protein: preview.targets.protein,
                          carbs: preview.targets.carbs,
                          fat: preview.targets.fat,
                        },
                      }));
                    }
                  }}
                  className="accent-teal-500"
                />
                <span>تخصيص الماكروز والماء يدوياً فوق الحساب التلقائي</span>
              </label>
            </div>

            {useCustomMacros && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">بروتين (g)</label>
                  <input
                    type="number"
                    min="0"
                    value={draft.customMacroOverrides?.protein ?? preview.targets.protein}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        customMacroOverrides: {
                          ...(p.customMacroOverrides || {}),
                          protein: Number(e.target.value || 0),
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">كارب (g)</label>
                  <input
                    type="number"
                    min="0"
                    value={draft.customMacroOverrides?.carbs ?? preview.targets.carbs}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        customMacroOverrides: {
                          ...(p.customMacroOverrides || {}),
                          carbs: Number(e.target.value || 0),
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">دهون (g)</label>
                  <input
                    type="number"
                    min="0"
                    value={draft.customMacroOverrides?.fat ?? preview.targets.fat}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        customMacroOverrides: {
                          ...(p.customMacroOverrides || {}),
                          fat: Number(e.target.value || 0),
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">مشروبات/ماء (لتر)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="8"
                    value={draft.waterLitersOverride ?? preview.targets.waterLiters}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        waterLitersOverride: Number(e.target.value || 0),
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Calculation Preview & Conflict Reporting */}
        <div className="p-4 rounded-2xl bg-[#0c151c] border border-teal-500/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              <span>معاينة الأهداف التقديرية</span>
            </span>
            {preview.maintenanceEerKcal && (
              <span className="text-[11px] font-mono text-zinc-400">
                طاقة المحافظة (EER): {preview.maintenanceEerKcal} kcal
              </span>
            )}
          </div>

          {!preview.ready ? (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>{preview.eligibility.messageAr}</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono">
                <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  <div className="text-[10px] text-zinc-400">السعرات</div>
                  <div className="text-sm font-black text-amber-400">{preview.targets.calories}</div>
                </div>
                <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  <div className="text-[10px] text-zinc-400">بروتين</div>
                  <div className="text-sm font-black text-emerald-400">{preview.targets.protein}g</div>
                </div>
                <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  <div className="text-[10px] text-zinc-400">كارب</div>
                  <div className="text-sm font-black text-cyan-400">{preview.targets.carbs}g</div>
                </div>
                <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  <div className="text-[10px] text-zinc-400">دهون</div>
                  <div className="text-sm font-black text-orange-400">{preview.targets.fat}g</div>
                </div>
                <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  <div className="text-[10px] text-zinc-400">سوائل/ماء</div>
                  <div className="text-sm font-black text-teal-300">{preview.targets.waterLiters}L</div>
                </div>
              </div>

              {preview.macroEnergyCheck?.conflicts?.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 space-y-1">
                  {preview.macroEnergyCheck.conflicts.map((c, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              )}

              {preview.safetyFloorApplied && (
                <p className="text-[11px] text-amber-300">
                  تم تطبيق الحد الأدنى الآمن للسعرات لتفادي عجز طاقة حاد غير آمن.
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isSaving || !preview.ready}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-teal-600/30 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? "جارٍ الحفظ..." : "اعتماد وحفظ الأهداف"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
