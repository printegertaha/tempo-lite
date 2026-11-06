"use client";

import { useState } from "react";
import {
  X,
  Check,
  Flame,
  Dumbbell,
  BookMarked,
  Code2,
  Smartphone,
  Cigarette,
  Droplets,
  Moon,
  Sparkles,
  Heart,
  Timer,
  Clock,
  ListTodo,
  ShieldAlert,
  Hash,
  ToggleLeft,
  Calendar,
  Layers,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { createTracker, updateTracker } from "@/actions/trackers";
import { LIFE_AREA_COLORS } from "@/lib/validations/life-area";
import {
  TRACKER_METRIC_TYPES,
  TARGET_FREQUENCIES,
} from "@/lib/validations/tracker";

export const METRIC_TYPE_METADATA = {
  BOOLEAN: {
    label: "إنجاز ثنائي (نعم/لا)",
    shortLabel: "إنجاز",
    icon: ToggleLeft,
    description: "تحديد إتمام النشاط بعلامة صح بسيطة يومياً",
    defaultUnit: "",
    defaultTarget: 1,
  },
  COUNTER: {
    label: "عداد رقمي تراكمي",
    shortLabel: "عداد",
    icon: Hash,
    description: "تسجيل كميات بعدد المرات أو الأكواب (مثل: أكواب الماء، القهوة، التكرارات)",
    defaultUnit: "كوب",
    defaultTarget: 5,
  },
  NUMBER: {
    label: "قياس وكمية رقمية",
    shortLabel: "قياس",
    icon: Droplets,
    description: "قياس دقيق مع كسور ووحدات (مثل: لترات الماء، الوزن، الصفحات، المسافة)",
    defaultUnit: "لتر",
    defaultTarget: 2.5,
  },
  DURATION: {
    label: "مدة زمنية وتركيز",
    shortLabel: "مدة",
    icon: Timer,
    description: "تتبع الوقت المستغرق في الإنجاز (مثل: ساعات البرمجة، القراءة، المذاكرة)",
    defaultUnit: "دقيقة",
    defaultTarget: 60,
  },
  TIME_RANGE: {
    label: "نطاق زمني (بداية ونهاية)",
    shortLabel: "نطاق وقت",
    icon: Clock,
    description: "تسجيل فترات محددة بوقت بدء ووقت انتهاء (مثل: ساعات النوم والاستيقاظ)",
    defaultUnit: "ساعة",
    defaultTarget: 8,
  },
  CHECKLIST: {
    label: "قائمة تدقيق وعناصر",
    shortLabel: "قائمة",
    icon: ListTodo,
    description: "مجموعة مهام فرعية تُنجز يومياً (مثل: الصلوات الخمس وسننها، روتين الصباح)",
    defaultUnit: "بند",
    defaultTarget: 5,
  },
  AVOIDANCE: {
    label: "امتناع ومقاومة عادة",
    shortLabel: "امتناع",
    icon: ShieldAlert,
    description: "تتبع التوقف عن سلوك غير مرغوب وبناء سلسلة نقاء (مثل: الإقلاع عن التدخين)",
    defaultUnit: "يوم",
    defaultTarget: 0,
  },
};

export const POPULAR_ICONS = [
  "Flame",
  "Sparkles",
  "Heart",
  "BookMarked",
  "Code2",
  "Dumbbell",
  "Droplets",
  "Moon",
  "Wallet",
  "Smartphone",
  "Cigarette",
  "Timer",
  "Clock",
  "ListTodo",
  "ShieldAlert",
];

function TrackerForm({
  editingTracker,
  lifeAreas = [],
  onClose,
  onSaved,
  onToast,
}) {
  const isEditing = Boolean(editingTracker);

  // Form State initialized directly from props
  const [metricType, setMetricType] = useState(
    editingTracker?.metricType || "BOOLEAN"
  );
  const [name, setName] = useState(editingTracker?.name || "");
  const [description, setDescription] = useState(
    editingTracker?.description || ""
  );
  const [lifeAreaId, setLifeAreaId] = useState(
    editingTracker?.lifeAreaId || ""
  );
  const [icon, setIcon] = useState(editingTracker?.icon || "Flame");
  const [color, setColor] = useState(editingTracker?.color || "emerald");
  const [priority, setPriority] = useState(editingTracker?.priority || 1);
  const [unit, setUnit] = useState(editingTracker?.unit || "");
  const [targetValue, setTargetValue] = useState(
    editingTracker?.targetValue !== undefined && editingTracker?.targetValue !== null
      ? String(editingTracker.targetValue)
      : "1"
  );
  const [targetFrequency, setTargetFrequency] = useState(
    editingTracker?.targetFrequency || "DAILY"
  );

  // Schedule Config State
  const [scheduleType, setScheduleType] = useState(
    editingTracker?.scheduleConfig?.type || "daily"
  );
  const [scheduleDays, setScheduleDays] = useState(
    editingTracker?.scheduleConfig?.days || [0, 1, 2, 3, 4, 5, 6]
  );

  // Checklist Items State
  const [checklistItems, setChecklistItems] = useState(
    editingTracker?.trackerConfig?.items || [
      { id: "item-1", label: "البند الأول", required: false },
      { id: "item-2", label: "البند الثاني", required: false },
    ]
  );
  const [newChecklistLabel, setNewChecklistLabel] = useState("");

  // Counter / TimeRange Configs
  const [counterStep, setCounterStep] = useState(
    editingTracker?.trackerConfig?.step || 1
  );
  const [timeRangeStart, setTimeRangeStart] = useState(
    editingTracker?.trackerConfig?.defaultStart || "23:00"
  );
  const [timeRangeEnd, setTimeRangeEnd] = useState(
    editingTracker?.trackerConfig?.defaultEnd || "07:00"
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Metric Type Change
  const handleSelectMetricType = (type) => {
    if (isEditing && editingTracker?._count?.entries > 0 && type !== editingTracker.metricType) {
      onToast?.(
        "تنبيه: تغيير نوع القياس لمتعقب ذي سجلات سابقة قد يتطلب أرشفته لحماية التاريخ",
        "info"
      );
    }
    setMetricType(type);
    const meta = METRIC_TYPE_METADATA[type];
    if (!isEditing) {
      if (meta.defaultUnit) setUnit(meta.defaultUnit);
      if (meta.defaultTarget !== undefined) setTargetValue(String(meta.defaultTarget));
    }
  };

  // Add item to checklist
  const handleAddChecklistItem = () => {
    if (!newChecklistLabel.trim()) return;
    const newItem = {
      id: `chk-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      label: newChecklistLabel.trim(),
      required: false,
    };
    const updated = [...checklistItems, newItem];
    setChecklistItems(updated);
    setNewChecklistLabel("");
    setTargetValue(String(updated.length));
  };

  // Remove checklist item
  const handleRemoveChecklistItem = (id) => {
    if (checklistItems.length <= 1) {
      onToast?.("يجب الإبقاء على بند واحد على الأقل", "error");
      return;
    }
    const updated = checklistItems.filter((it) => it.id !== id);
    setChecklistItems(updated);
    setTargetValue(String(updated.length));
  };

  // Toggle Day in Schedule
  const handleToggleDay = (dayIndex) => {
    if (scheduleDays.includes(dayIndex)) {
      if (scheduleDays.length <= 1) {
        onToast?.("يجب تحديد يوم واحد على الأقل في الجدول", "error");
        return;
      }
      setScheduleDays(scheduleDays.filter((d) => d !== dayIndex));
    } else {
      setScheduleDays([...scheduleDays, dayIndex].sort());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      onToast?.("يرجى إدخال اسم المتعقب", "error");
      return;
    }

    // Build Type-Specific Config
    let trackerConfig = {};
    if (metricType === "CHECKLIST") {
      if (checklistItems.length === 0) {
        onToast?.("يجب إضافة عنصر واحد على الأقل في قائمة التدقيق", "error");
        return;
      }
      trackerConfig = { items: checklistItems };
    } else if (metricType === "COUNTER") {
      trackerConfig = { step: Number(counterStep) || 1, min: 0 };
    } else if (metricType === "TIME_RANGE") {
      trackerConfig = {
        defaultStart: timeRangeStart,
        defaultEnd: timeRangeEnd,
        allowCrossingMidnight: true,
      };
    } else if (metricType === "DURATION") {
      trackerConfig = {
        format: "minutes",
        defaultDurationSeconds: (Number(targetValue) || 30) * 60,
      };
    } else if (metricType === "AVOIDANCE") {
      trackerConfig = {
        behaviorName: name,
        cleanLabel: "يوم نظيف ومثالي",
        relapseLabel: "حدثت زلة أو انتكاسة",
        targetCleanDays: 30,
      };
    }

    const scheduleConfig = {
      type: scheduleType,
      days: scheduleType === "weekdays" ? scheduleDays : [0, 1, 2, 3, 4, 5, 6],
    };

    setIsSubmitting(true);
    try {
      if (isEditing) {
        const res = await updateTracker({
          id: editingTracker.id,
          name: name.trim(),
          description: description.trim() || null,
          lifeAreaId: lifeAreaId || null,
          icon,
          color,
          priority: Number(priority),
          metricType,
          unit: unit.trim() || null,
          targetValue: targetValue ? Number(targetValue) : null,
          targetFrequency,
          scheduleConfig,
          trackerConfig,
        });

        if (res.success) {
          onToast?.("تم تحديث المتعقب بنجاح ✨", "success");
          onSaved?.(res.data);
          onClose();
        } else {
          onToast?.(res.error || "تعذر تحديث المتعقب", "error");
        }
      } else {
        const res = await createTracker({
          name: name.trim(),
          description: description.trim() || null,
          lifeAreaId: lifeAreaId || null,
          icon,
          color,
          priority: Number(priority),
          metricType,
          unit: unit.trim() || null,
          targetValue: targetValue ? Number(targetValue) : null,
          targetFrequency,
          scheduleConfig,
          trackerConfig,
        });

        if (res.success) {
          onToast?.("تم إنشاء المتعقب بنجاح 🎉", "success");
          onSaved?.(res.data);
          onClose();
        } else {
          onToast?.(res.error || "تعذر إنشاء المتعقب", "error");
        }
      }
    } catch {
      onToast?.("حدث خطأ غير متوقع", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const weekDayLabels = [
    { index: 6, label: "السبت" },
    { index: 0, label: "الأحد" },
    { index: 1, label: "الاثنين" },
    { index: 2, label: "الثلاثاء" },
    { index: 3, label: "الأربعاء" },
    { index: 4, label: "الخميس" },
    { index: 5, label: "الجمعة" },
  ];

  return (
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* 1. Metric Type Selector */}
      <div className="space-y-2.5">
        <label className="block text-xs font-semibold text-zinc-300">
          نوع التتبع والقياس (Metric Type) <span className="text-rose-400">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TRACKER_METRIC_TYPES.map((typeKey) => {
            const meta = METRIC_TYPE_METADATA[typeKey];
            const IconComp = meta.icon;
            const isSelected = metricType === typeKey;
            return (
              <button
                key={typeKey}
                type="button"
                onClick={() => handleSelectMetricType(typeKey)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  isSelected
                    ? "bg-violet-600/20 border-violet-500 text-violet-200 shadow-md"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                }`}
              >
                <IconComp className="w-5 h-5 mb-1.5" />
                <span className="text-xs font-bold">{meta.shortLabel}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-zinc-400 mt-1">
          {METRIC_TYPE_METADATA[metricType]?.description}
        </p>
      </div>

      {/* 2. Basic Information (Name, Life Area, Description) */}
      <div className="space-y-4 pt-2 border-t border-zinc-800/80">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              اسم العادة أو المتعقب <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: قراءة القرآن، ساعات البرمجة، المشي 10,000 خطوة"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              مجال الحياة المرتبط (اختياري)
            </label>
            <select
              value={lifeAreaId}
              onChange={(e) => setLifeAreaId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
            >
              <option value="">بدون تصنيف (عام)</option>
              {lifeAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            الوصف أو الشعار التحفيزي (اختياري)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="سطر قصير يوضح الغاية من هذا المتعقب..."
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {/* 3. Type-Specific Config & Targets */}
      <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
        <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span>إعدادات الهدف والقياس المخصص ({METRIC_TYPE_METADATA[metricType]?.shortLabel})</span>
        </h4>

        {/* If CHECKLIST */}
        {metricType === "CHECKLIST" && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-zinc-300">
              عناصر قائمة التدقيق (مثل: الصلوات الخمس)
            </label>
            <div className="space-y-2">
              {checklistItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
                >
                  <span className="text-zinc-300 font-medium">
                    {idx + 1}. {item.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(item.id)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newChecklistLabel}
                onChange={(e) => setNewChecklistLabel(e.target.value)}
                placeholder="أضف عنصراً جديداً للقائمة..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold transition-colors shrink-0"
              >
                إضافة بند
              </button>
            </div>
          </div>
        )}

        {/* If TIME_RANGE */}
        {metricType === "TIME_RANGE" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                وقت البدء الافتراضي (HH:MM)
              </label>
              <input
                type="time"
                value={timeRangeStart}
                onChange={(e) => setTimeRangeStart(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                وقت الانتهاء الافتراضي (HH:MM)
              </label>
              <input
                type="time"
                value={timeRangeEnd}
                onChange={(e) => setTimeRangeEnd(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100"
              />
            </div>
          </div>
        )}

        {/* Target Value & Unit fields for numerical/duration/counter */}
        {metricType === "AVOIDANCE" && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-zinc-100">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>نظام الامتناع والتعافي الدقيق</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              سيتم ربط هذا المتعقب تلقائياً بنظام الامتناع المتقدم بحساب الثواني والأيام الحقيقية، مع إمكانية تعديل وقت البداية وتوثيق الانتكاسات ومحفزاتها بدقة.
            </p>
          </div>
        )}

        {metricType !== "BOOLEAN" && metricType !== "AVOIDANCE" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                الهدف المستهدف
              </label>
              <input
                type="number"
                step="any"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="مثال: 5 أو 60"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-violet-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                الوحدة (Unit)
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="دقيقة، كوب، صفحة، كم..."
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                تكرار الهدف
              </label>
              <select
                value={targetFrequency}
                onChange={(e) => setTargetFrequency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
              >
                <option value="DAILY">يومياً (Daily)</option>
                <option value="WEEKLY">أسبوعياً (Weekly)</option>
                <option value="CUSTOM">مخصص (Custom)</option>
              </select>
            </div>
          </div>
        )}

        {/* Priority Selector */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            مستوى الأهمية / الأولوية (1 - 5)
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                  priority === p
                    ? "bg-violet-600/20 text-violet-300 border-violet-500 shadow-sm"
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Flexible Schedule Configuration */}
      <div className="space-y-3 pt-2 border-t border-zinc-800/80">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-300">
            جدول التكرار والأيام النشطة
          </label>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setScheduleType("daily")}
              className={`px-3 py-1 rounded-lg transition-all ${
                scheduleType === "daily"
                  ? "bg-zinc-800 text-zinc-100 font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              يومياً
            </button>
            <button
              type="button"
              onClick={() => setScheduleType("weekdays")}
              className={`px-3 py-1 rounded-lg transition-all ${
                scheduleType === "weekdays"
                  ? "bg-zinc-800 text-zinc-100 font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              أيام محددة
            </button>
          </div>
        </div>

        {scheduleType === "weekdays" && (
          <div className="grid grid-cols-7 gap-1.5 pt-1">
            {weekDayLabels.map((wd) => {
              const isSelected = scheduleDays.includes(wd.index);
              return (
                <button
                  key={wd.index}
                  type="button"
                  onClick={() => handleToggleDay(wd.index)}
                  className={`py-2 rounded-xl border text-xs font-bold transition-all text-center ${
                    isSelected
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                      : "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
                  }`}
                >
                  {wd.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Color & Icon Selector */}
      <div className="space-y-3 pt-2 border-t border-zinc-800/80">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-2">
            اللون المميز
          </label>
          <div className="flex flex-wrap gap-2">
            {LIFE_AREA_COLORS.map((colorKey) => (
              <button
                key={colorKey}
                type="button"
                onClick={() => setColor(colorKey)}
                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all bg-${colorKey}-500 ${
                  color === colorKey
                    ? "ring-2 ring-white ring-offset-2 ring-offset-[#0c0e17] scale-110"
                    : "opacity-75 hover:opacity-100"
                }`}
              >
                {color === colorKey && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Footer Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span>{isEditing ? "حفظ التعديلات" : "إنشاء المتعقب"}</span>
        </button>
      </div>
    </form>
  );
}

export default function TrackerModal({
  isOpen,
  onClose,
  editingTracker = null,
  lifeAreas = [],
  onSaved,
  onToast,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0c0e17] border border-zinc-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/30">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                {editingTracker ? "تعديل إعدادات المتعقب" : "إنشاء عادة أو متعقب جديد"}
              </h3>
              <p className="text-xs text-zinc-400">
                خصص نوع القياس، الأهداف، الجداول، ومجال الحياة بحرية تامة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inner Form with key ensuring clean state reset on edit change */}
        <TrackerForm
          key={editingTracker?.id || "create-new-tracker"}
          editingTracker={editingTracker}
          lifeAreas={lifeAreas}
          onClose={onClose}
          onSaved={onSaved}
          onToast={onToast}
        />

      </div>
    </div>
  );
}
