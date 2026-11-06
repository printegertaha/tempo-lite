"use client";

import { useState } from "react";
import {
  Sparkles,
  Flame,
  Heart,
  BookMarked,
  Code2,
  Dumbbell,
  Wallet,
  GraduationCap,
  Brain,
  Briefcase,
  Compass,
  Activity,
  Target,
  Moon,
  Sun,
  Shield,
  Smile,
  Users,
  Globe,
  Laptop,
  Plus,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Layers,
  Check,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  createLifeArea,
  updateLifeArea,
  reorderLifeAreas,
  toggleLifeAreaDashboardVisibility,
  archiveLifeArea,
  restoreLifeArea,
  deleteLifeArea,
} from "@/actions/life-areas";
import { LIFE_AREA_COLORS, LIFE_AREA_ICONS } from "@/lib/validations/life-area";

// Map of available Lucide icons for visual rendering
export const ICON_MAP = {
  Sparkles,
  Flame,
  Heart,
  BookMarked,
  Code2,
  Dumbbell,
  Wallet,
  GraduationCap,
  Brain,
  Briefcase,
  Compass,
  Activity,
  Target,
  Moon,
  Sun,
  Shield,
  Smile,
  Users,
  Globe,
  Laptop,
};

export const COLOR_CONFIG = {
  violet: { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/30", dot: "bg-violet-500" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-500" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-500" },
  cyan: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30", dot: "bg-cyan-500" },
  rose: { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30", dot: "bg-rose-500" },
  blue: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-500" },
  indigo: { bg: "bg-indigo-500/15", text: "text-indigo-400", border: "border-indigo-500/30", dot: "bg-indigo-500" },
  teal: { bg: "bg-teal-500/15", text: "text-teal-400", border: "border-teal-500/30", dot: "bg-teal-500" },
  orange: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30", dot: "bg-orange-500" },
  purple: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30", dot: "bg-purple-500" },
};

export const PRIORITY_LABELS = {
  1: { label: "عادية", color: "text-zinc-400 bg-zinc-800/80 border-zinc-700/60" },
  2: { label: "متوسطة", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  3: { label: "عالية", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  4: { label: "قصوى", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
};

export default function LifeAreasManager({ initialAreas = [], onToast }) {
  const [areas, setAreas] = useState(initialAreas);
  const [tab, setTab] = useState("active"); // "active" | "archived"
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "Sparkles",
    color: "violet",
    priority: 1,
    hiddenOnDashboard: false,
  });

  const activeAreas = areas.filter((a) => !a.isArchived);
  const archivedAreas = areas.filter((a) => a.isArchived);
  const displayedAreas = tab === "active" ? activeAreas : archivedAreas;

  const openCreateModal = () => {
    setEditingArea(null);
    setFormData({
      name: "",
      description: "",
      icon: "Sparkles",
      color: "violet",
      priority: 1,
      hiddenOnDashboard: false,
    });
    setModalOpen(true);
  };

  const openEditModal = (area) => {
    setEditingArea(area);
    setFormData({
      name: area.name,
      description: area.description || "",
      icon: area.icon || "Sparkles",
      color: area.color || "violet",
      priority: area.priority || 1,
      hiddenOnDashboard: area.hiddenOnDashboard || false,
    });
    setModalOpen(true);
  };

  const handleSaveArea = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      onToast?.("يرجى إدخال اسم مجال الحياة", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingArea) {
        const res = await updateLifeArea({
          id: editingArea.id,
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          color: formData.color,
          priority: Number(formData.priority),
          hiddenOnDashboard: formData.hiddenOnDashboard,
        });

        if (res.success) {
          setAreas((prev) =>
            prev.map((a) => (a.id === editingArea.id ? { ...a, ...res.data } : a))
          );
          onToast?.("تم تحديث مجال الحياة بنجاح ✨", "success");
          setModalOpen(false);
        } else {
          onToast?.(res.error || "تعذر تحديث المجال", "error");
        }
      } else {
        const res = await createLifeArea({
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          color: formData.color,
          priority: Number(formData.priority),
          hiddenOnDashboard: formData.hiddenOnDashboard,
        });

        if (res.success) {
          setAreas((prev) => [...prev, res.data]);
          onToast?.("تم إنشاء مجال الحياة الجديد بنجاح 🎉", "success");
          setModalOpen(false);
        } else {
          onToast?.(res.error || "تعذر إنشاء المجال", "error");
        }
      }
    } catch {
      onToast?.("حدث خطأ غير متوقع", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVisibility = async (area) => {
    try {
      const res = await toggleLifeAreaDashboardVisibility(area.id);
      if (res.success) {
        setAreas((prev) =>
          prev.map((a) => (a.id === area.id ? { ...a, hiddenOnDashboard: !a.hiddenOnDashboard } : a))
        );
        onToast?.(
          !area.hiddenOnDashboard
            ? "تم إخفاء المجال من لوحة التحكم"
            : "تم إظهار المجال في لوحة التحكم",
          "info"
        );
      }
    } catch {
      onToast?.("تعذر تغيير حالة العرض", "error");
    }
  };

  const handleArchive = async (area) => {
    try {
      const res = await archiveLifeArea(area.id);
      if (res.success) {
        setAreas((prev) =>
          prev.map((a) => (a.id === area.id ? { ...a, isArchived: true, archivedAt: new Date() } : a))
        );
        onToast?.("تم نقل المجال إلى الأرشيف (سجلات العادات محفوظة)", "info");
      }
    } catch {
      onToast?.("تعذر أرشفة المجال", "error");
    }
  };

  const handleRestore = async (area) => {
    try {
      const res = await restoreLifeArea(area.id);
      if (res.success) {
        setAreas((prev) =>
          prev.map((a) => (a.id === area.id ? { ...a, isArchived: false, archivedAt: null } : a))
        );
        onToast?.("تمت استعادة المجال بنجاح ✨", "success");
      }
    } catch {
      onToast?.("تعذر استعادة المجال", "error");
    }
  };

  const handleDelete = async (area) => {
    if (!confirm(`هل أنت متأكد من حذف مجال "${area.name}"؟ لن يتم حذف عاداتك وسجلاتك التاريخية.`)) {
      return;
    }

    try {
      const res = await deleteLifeArea(area.id);
      if (res.success) {
        setAreas((prev) => prev.filter((a) => a.id !== area.id));
        onToast?.("تم حذف المجال بنجاح", "info");
      }
    } catch {
      onToast?.("تعذر حذف المجال", "error");
    }
  };

  const handleMoveOrder = async (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeAreas.length) return;

    const newActive = [...activeAreas];
    const [moved] = newActive.splice(index, 1);
    newActive.splice(targetIndex, 0, moved);

    const reorderPayload = newActive.map((item, idx) => ({
      id: item.id,
      sortOrder: idx,
    }));

    // Optimistic update
    setAreas((prev) =>
      prev.map((a) => {
        const found = reorderPayload.find((p) => p.id === a.id);
        return found ? { ...a, sortOrder: found.sortOrder } : a;
      })
    );

    try {
      await reorderLifeAreas({ items: reorderPayload });
      onToast?.("تم حفظ ترتيب المجالات", "success");
    } catch {
      onToast?.("تعذر حفظ الترتيب", "error");
    }
  };

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-zinc-100">مجالات وتصنيفات الحياة</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                {activeAreas.length} نشط
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              قسّم أهدافك وعاداتك إلى مجالات حرة من اختيارك (الروحانيات، الصحة، العمل، التعلم)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active vs Archived Tab Selector */}
          <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setTab("active")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                tab === "active"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              النشطة ({activeAreas.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("archived")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                tab === "archived"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              الأرشيف ({archivedAreas.length})
            </button>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>مجال جديد</span>
          </button>
        </div>
      </div>

      {/* 2. Areas List or Clean Empty State */}
      {displayedAreas.length === 0 ? (
        <div className="py-12 px-6 rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 text-zinc-400 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-zinc-200">
              {tab === "active" ? "لم تقم بإنشاء أي مجال حياة بعد" : "الأرشيف فارغ حالياً"}
            </h4>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              {tab === "active"
                ? "ابدأ بتأسيس مجالك الأول لتنظيم مساراتك بحرية تامة دون أي تصنيفات مفروضة مسبقاً."
                : "المجالات المؤرشفة ستظهر هنا مع الحفاظ الدائم على سجلات العادات والأنشطة التاريخية."}
            </p>
          </div>
          {tab === "active" && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 mt-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>أنشئ أول مجال حياة الآن ✨</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayedAreas.map((area, index) => {
            const IconComponent = ICON_MAP[area.icon] || Sparkles;
            const colorCfg = COLOR_CONFIG[area.color] || COLOR_CONFIG.violet;
            const priorityInfo = PRIORITY_LABELS[area.priority] || PRIORITY_LABELS[1];

            return (
              <div
                key={area.id}
                className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all group"
              >
                {/* Left side: Icon, Name, Details */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-xl border ${colorCfg.bg} ${colorCfg.border} ${colorCfg.text} shrink-0`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-zinc-100 truncate">{area.name}</h4>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${priorityInfo.color}`}
                      >
                        أولوية {priorityInfo.label}
                      </span>
                      {area.hiddenOnDashboard && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                          مخفي عن الرئيسية
                        </span>
                      )}
                    </div>
                    {area.description ? (
                      <p className="text-xs text-zinc-400 mt-0.5 truncate">{area.description}</p>
                    ) : (
                      <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">#{area.slug}</p>
                    )}
                  </div>
                </div>

                {/* Right side: Reorder & Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {tab === "active" && (
                    <>
                      {/* Reorder Buttons */}
                      <button
                        type="button"
                        onClick={() => handleMoveOrder(index, "up")}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="تحريك لأعلى"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveOrder(index, "down")}
                        disabled={index === activeAreas.length - 1}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="تحريك لأسفل"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      {/* Dashboard Visibility Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(area)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          area.hiddenOnDashboard
                            ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                            : "text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                        title={area.hiddenOnDashboard ? "إظهار في الرئيسية" : "إخفاء عن الرئيسية"}
                      >
                        {area.hiddenOnDashboard ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => openEditModal(area)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-violet-300 hover:bg-zinc-800 transition-colors"
                        title="تعديل المجال"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Archive */}
                      <button
                        type="button"
                        onClick={() => handleArchive(area)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition-colors"
                        title="أرشفة المجال"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {tab === "archived" && (
                    <>
                      {/* Restore */}
                      <button
                        type="button"
                        onClick={() => handleRestore(area)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-300 hover:bg-zinc-800 transition-colors"
                        title="استعادة من الأرشيف"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      {/* Permanent Delete */}
                      <button
                        type="button"
                        onClick={() => handleDelete(area)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                        title="حذف نهائي"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Create / Edit Life Area Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg p-6 sm:p-7 rounded-3xl bg-[#0c0e17] border border-zinc-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
                  {editingArea ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">
                    {editingArea ? "تعديل مجال الحياة" : "إنشاء مجال حياة جديد"}
                  </h3>
                  <p className="text-xs text-zinc-400">حدد الاسم واللون والأيقونة والأولوية بحرية</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveArea} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  اسم المجال <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: الروحانيات، العمل العميق، اللياقة البدنية"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  الوصف أو النية المستهدفة (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="ملاحظات توجيهية خاصة بهذا المجال..."
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              {/* Priority Selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  مستوى الأولوية في المنظومة
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: 1, label: "عادية" },
                    { val: 2, label: "متوسطة" },
                    { val: 3, label: "عالية" },
                    { val: 4, label: "قصوى" },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p.val })}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        formData.priority === p.val
                          ? "bg-violet-600/20 text-violet-300 border-violet-500 shadow-md"
                          : "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800/50"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  لون المجال المميز
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {LIFE_AREA_COLORS.map((colorKey) => {
                    const cfg = COLOR_CONFIG[colorKey];
                    const isSelected = formData.color === colorKey;
                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: colorKey })}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                          cfg.dot
                        } ${isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-[#0c0e17] scale-110" : "opacity-80 hover:opacity-100"}`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  أيقونة المجال
                </label>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 max-h-36 overflow-y-auto p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  {LIFE_AREA_ICONS.map((iconKey) => {
                    const IconComp = ICON_MAP[iconKey] || Sparkles;
                    const isSelected = formData.icon === iconKey;
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: iconKey })}
                        className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-violet-600 text-white shadow-md scale-105"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                        }`}
                        title={iconKey}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dashboard Visibility Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div>
                  <h5 className="text-xs font-bold text-zinc-200">إظهار في لوحة التحكم الرئيسية</h5>
                  <p className="text-[11px] text-zinc-400">
                    عند التفعيل، ستظهر عادات هذا المجال في البطاقات العلوية للوحة التحكم
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={!formData.hiddenOnDashboard}
                  onChange={(e) =>
                    setFormData({ ...formData, hiddenOnDashboard: !e.target.checked })
                  }
                  className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{editingArea ? "حفظ التعديلات" : "إنشاء المجال"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

