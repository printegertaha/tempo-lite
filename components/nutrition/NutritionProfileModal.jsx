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
import { Scale, CheckCircle2, AlertTriangle, Sliders, Calculator, ArrowLeft, ArrowRight } from "lucide-react";

const SECTIONS = [
  { id: "body", label: "١. بيانات الجسم" },
  { id: "goal", label: "٢. النشاط والهدف" },
  { id: "summary", label: "٣. النتيجة والحفظ" },
];

export default function NutritionProfileModal({
  isOpen,
  onClose,
  initialProfile,
  latestGymWeight,
  onSaveProfile,
  experienceMode,
  onChangeExperienceMode,
}) {
  const formId = useId();
  const [draft, setDraft] = useState(() => ({
    ...createEmptyNutritionProfile(),
    ...(initialProfile || {}),
  }));
  const [activeSection, setActiveSection] = useState("body");
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
    setActiveSection("body");
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

  const visibleSections =
    draft.mode === "manual"
      ? [
          { id: "body", label: "١. الأهداف اليدوية" },
          { id: "summary", label: "٢. المعاينة والحفظ" },
        ]
      : SECTIONS;

  const currentIdx = visibleSections.findIndex((s) => s.id === activeSection);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title="إعداد الملف الغذائي"
      description="تحديث بياناتك وحساب أهدافك اليومية"
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4 text-right overflow-x-hidden">
        {/* Section Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1 rounded-2xl bg-zinc-900 border border-zinc-800">
          {visibleSections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer truncate ${
                activeSection === sec.id
                  ? "bg-teal-600 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>

        {/* Section 1: Body Data or Manual Inputs */}
        {activeSection === "body" && (
          <div className="space-y-4">
            {/* Mode Switch */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <button
                type="button"
                onClick={() => setDraft((p) => ({ ...p, mode: "auto" }))}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  draft.mode !== "manual"
                    ? "bg-teal-600/25 border border-teal-500/40 text-teal-200"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Calculator className="w-3.5 h-3.5 shrink-0" />
                <span>حساب تلقائي</span>
              </button>
              <button
                type="button"
                onClick={() => setDraft((p) => ({ ...p, mode: "manual" }))}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  draft.mode === "manual"
                    ? "bg-teal-600/25 border border-teal-500/40 text-teal-200"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Sliders className="w-3.5 h-3.5 shrink-0" />
                <span>أهداف يدوية</span>
              </button>
            </div>

            {draft.mode !== "manual" ? (
              <>
     

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="np-weight" className="block text-xs font-semibold text-zinc-300 mb-1">
                      الوزن (كجم)
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
                      placeholder="78.5"
                      className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="np-height" className="block text-xs font-semibold text-zinc-300 mb-1">
                      الطول (سم)
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
                      placeholder="175"
                      className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="np-age" className="text-xs font-semibold text-zinc-300">
                        {birthInputMode === "age" ? "العمر" : "الميلاد"}
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setBirthInputMode((m) => (m === "age" ? "birthDate" : "age"))
                        }
                        className="text-[10px] text-teal-400 hover:underline cursor-pointer"
                      >
                        {birthInputMode === "age" ? "تاريخ الميلاد" : "العمر"}
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
                        placeholder="27"
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
                        placeholder="تاريخ الميلاد"
                        className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-zinc-300">الجنس البيولوجي</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "male", label: "ذكر" },
                      { id: "female", label: "أنثى" },
                      { id: "prefer_not_to_say", label: "غير محدد" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            biologicalSex: opt.id,
                            ...(opt.id === "prefer_not_to_say" ? { mode: "manual" } : {}),
                          }))
                        }
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          draft.biologicalSex === opt.id
                            ? "bg-teal-500/15 border-teal-500/50 text-teal-200"
                            : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
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
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">بروتين (جم)</label>
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
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">كارب (جم)</label>
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
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">دهون (جم)</label>
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
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono"
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
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 2: Activity, Goal & Training */}
        {activeSection === "goal" && draft.mode !== "manual" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-zinc-300">مستوى النشاط اليومي</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ACTIVITY_LEVELS.map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, activityLevel: act.id }))}
                    className={`text-right p-2.5 rounded-xl border transition-all cursor-pointer ${
                      draft.activityLevel === act.id
                        ? "bg-teal-500/15 border-teal-500/50 text-zinc-100"
                        : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div className="text-xs font-bold text-zinc-200">{act.labelAr.split(" (")[0]}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 truncate">{act.descriptionAr}</div>
                  </button>
                ))}
              </div>
            </div>

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
                  المعدل الأسبوعي
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
                مستوى التمرين الرياضي
              </label>
              <select
                id="np-training"
                value={draft.trainingLevel || "none"}
                onChange={(e) => setDraft((p) => ({ ...p, trainingLevel: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
              >
                <option value="none">بدون تمرين منتظم</option>
                <option value="recreational">لياقة عامة (1–3 حصص أسبوعياً)</option>
                <option value="strength_endurance">تمارين مقاومة / جيم / تحمّل منتظم</option>
              </select>
            </div>
          </div>
        )}

        {/* Section 3: Summary, Optional Overrides & Save */}
        {activeSection === "summary" && (
          <div className="space-y-3.5">
            {!preview.ready ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>{preview.eligibility.messageAr}</span>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#0c151c] border border-teal-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-teal-300">الأهداف المحسوبة يومياً</span>
                  {preview.maintenanceEerKcal && (
                    <span className="font-mono text-[11px] text-zinc-400">
                      ثبات الوزن: {preview.maintenanceEerKcal} kcal
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                  <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                    <div className="text-[10px] text-zinc-400">السعرات</div>
                    <div className="text-sm font-black text-amber-400">{preview.targets.calories}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                    <div className="text-[10px] text-zinc-400">بروتين (ب)</div>
                    <div className="text-sm font-black text-emerald-400">{preview.targets.protein} جم</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                    <div className="text-[10px] text-zinc-400">كارب (ك)</div>
                    <div className="text-sm font-black text-cyan-400">{preview.targets.carbs} جم</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                    <div className="text-[10px] text-zinc-400">دهون (د)</div>
                    <div className="text-sm font-black text-orange-400">{preview.targets.fat} جم</div>
                  </div>
                </div>
              </div>
            )}

            {draft.mode !== "manual" && preview.ready && preview.targets && (
              <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-2.5 text-xs">
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
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
                  <span>تعديل الماكروز يدوياً</span>
                </label>

                {useCustomMacros && (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">بروتين (جم)</label>
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
                      <label className="block text-[11px] text-zinc-400 mb-1">كارب (جم)</label>
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
                      <label className="block text-[11px] text-zinc-400 mb-1">دهون (جم)</label>
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
                  </div>
                )}

                <label className="flex items-center gap-2 text-zinc-400 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.hotClimate)}
                    onChange={(e) => setDraft((p) => ({ ...p, hotClimate: e.target.checked }))}
                    className="accent-teal-500"
                  />
                  <span>طقس حار أو تعرق مرتفع</span>
                </label>
              </div>
            )}

            {onChangeExperienceMode && (
              <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-2 text-xs">
                <span className="block font-semibold text-zinc-300">تجربة صفحة التغذية</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => void onChangeExperienceMode("calculator_only")}
                    className={`py-2 px-2 rounded-xl border font-bold cursor-pointer ${
                      experienceMode === "calculator_only"
                        ? "bg-teal-500/15 border-teal-500/50 text-teal-200"
                        : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    حاسبة فقط
                  </button>
                  <button
                    type="button"
                    onClick={() => void onChangeExperienceMode("diet_builder")}
                    className={`py-2 px-2 rounded-xl border font-bold cursor-pointer ${
                      experienceMode === "diet_builder"
                        ? "bg-teal-500/15 border-teal-500/50 text-teal-200"
                        : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    باني النظام
                  </button>
                  <button
                    type="button"
                    onClick={() => void onChangeExperienceMode("full_tracking")}
                    className={`py-2 px-2 rounded-xl border font-bold cursor-pointer ${
                      experienceMode === "full_tracking"
                        ? "bg-teal-500/15 border-teal-500/50 text-teal-200"
                        : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    متابعة كاملة
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Navigation & Save */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            {currentIdx > 0 && (
              <button
                type="button"
                onClick={() => setActiveSection(visibleSections[currentIdx - 1].id)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-zinc-200 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>السابق</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              إلغاء
            </button>
          </div>

          <div className="flex items-center gap-2">
            {currentIdx < visibleSections.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveSection(visibleSections[currentIdx + 1].id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold cursor-pointer"
              >
                <span>التالي</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSaving || !preview.ready}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-teal-600/30 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? "جارٍ الحفظ..." : "حفظ الأهداف"}</span>
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
