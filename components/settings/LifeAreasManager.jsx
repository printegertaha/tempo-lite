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
  Home,
  Music,
  Camera,
  Palette,
  Plane,
  Coffee,
  Utensils,
  Award,
  Trophy,
  Zap,
  Leaf,
  Star,
  Lightbulb,
  Clock,
  Headphones,
  Gamepad2,
  Plus,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layers,
  Check,
  X,
  Loader2,
  MoreVertical,
} from "lucide-react";
import { useLocalSession } from "@/hooks/useLocalSession";
import { localLifeAreaRepo, localOutboxRepo } from "@/lib/local-db";
import { syncEngine } from "@/lib/sync/sync-engine";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  LIFE_AREA_ICONS,
  slugify,
} from "@/lib/validations/life-area";

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
  Home,
  Music,
  Camera,
  Palette,
  Plane,
  Coffee,
  Utensils,
  Award,
  Trophy,
  Zap,
  Leaf,
  Star,
  Lightbulb,
  Clock,
  Headphones,
  Gamepad2,
};

export const COLOR_CONFIG = {
  pink: {
    bg: "bg-pink-500/15",
    text: "text-pink-400",
    border: "border-pink-500/30",
    dot: "bg-pink-500",
  },
  rose: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
    dot: "bg-red-500",
  },
  blue: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
  },
  amber: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
  },
  emerald: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  violet: {
    bg: "bg-violet-500/15",
    text: "text-violet-400",
    border: "border-violet-500/30",
    dot: "bg-violet-500",
  },
  cyan: {
    bg: "bg-cyan-500/15",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    dot: "bg-cyan-500",
  },
  indigo: {
    bg: "bg-indigo-500/15",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
    dot: "bg-indigo-500",
  },
  teal: {
    bg: "bg-teal-500/15",
    text: "text-teal-400",
    border: "border-teal-500/30",
    dot: "bg-teal-500",
  },
  orange: {
    bg: "bg-orange-500/15",
    text: "text-orange-400",
    border: "border-orange-500/30",
    dot: "bg-orange-500",
  },
  purple: {
    bg: "bg-purple-500/15",
    text: "text-purple-400",
    border: "border-purple-500/30",
    dot: "bg-purple-500",
  },
};

const SELECTABLE_COLORS = ["pink", "rose", "blue", "amber", "emerald", "violet"];

function normalizeArText(str = "") {
  return String(str)
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F]/g, "")
    .trim();
}

const ICON_KEYWORD_RULES = [
  {
    icon: "Moon",
    keywords: ["دين", "ايمان", "روح", "صلاه", "قران", "عباد", "ذكر", "صوم", "مسجد", "اسلام", "faith", "religion", "spiritual", "quran", "prayer"],
  },
  {
    icon: "Code2",
    keywords: ["برمج", "كود", "تطوير", "تقني", "تكنولوج", "سوفتوير", "ويب", "تطبيق", "ذكاء", "code", "dev", "software", "tech", "ai", "programming"],
  },
  {
    icon: "Briefcase",
    keywords: ["شغل", "عمل", "وظيف", "مهن", "بيزنس", "تجار", "مشروع", "شرك", "فريلانس", "كارير", "work", "job", "career", "business", "freelance"],
  },
  {
    icon: "GraduationCap",
    keywords: ["دراس", "تعلم", "تعليم", "جامع", "مدرس", "كورس", "امتحان", "مذاكر", "علم", "study", "learn", "education", "course", "university"],
  },
  {
    icon: "BookMarked",
    keywords: ["قراء", "كتاب", "كتب", "ثقاف", "تدوين", "مقال", "read", "book", "journal"],
  },
  {
    icon: "Dumbbell",
    keywords: ["جيم", "رياض", "لياق", "تمرين", "تمارين", "عضل", "حديد", "كورة", "سباح", "جري", "gym", "fitness", "workout", "sport", "run"],
  },
  {
    icon: "Activity",
    keywords: ["صح", "تغذي", "اكل", "دايت", "نوم", "عافي", "طب", "علاج", "health", "nutrition", "diet", "sleep", "medical"],
  },
  {
    icon: "Wallet",
    keywords: ["مال", "فلوس", "مصاري", "ميزاني", "دخل", "راتب", "ادخار", "استثمار", "تجاره", "اقتصاد", "finance", "money", "budget", "invest", "saving"],
  },
  {
    icon: "Users",
    keywords: ["عائل", "اسر", "اهل", "اصدقا", "صاحب", "علاق", "زواج", "اجتماع", "ناس", "family", "friend", "social", "relation"],
  },
  {
    icon: "Heart",
    keywords: ["حب", "عاطف", "نفس", "قلبي", "هدوء", "راحه", "تامل", "استرخا", "love", "mental", "mind", "peace", "calm"],
  },
  {
    icon: "Smile",
    keywords: ["ترفيه", "لعب", "متع", "سعاد", "مزاج", "هواي", "فن", "رسم", "موسيقي", "قيمنق", "fun", "game", "hobby", "art", "mood"],
  },
  {
    icon: "Compass",
    keywords: ["سفر", "رحل", "مغامر", "خروج", "سياح", "travel", "trip", "explore", "adventure"],
  },
  {
    icon: "Target",
    keywords: ["هدف", "اهداف", "انجاز", "تخطيط", "انتاج", "تركيز", "عادات", "تطوير الذات", "goal", "focus", "plan", "productivity"],
  },
  {
    icon: "Shield",
    keywords: ["امتناع", "تعافي", "انضباط", "التزام", "حماي", "discipline", "recovery", "habit"],
  },
  {
    icon: "Laptop",
    keywords: ["كمبيوتر", "لابتوب", "مكتب", "رقم", "computer", "laptop", "digital"],
  },
];

export function inferLifeAreaIcon(name) {
  const norm = normalizeArText(name);
  if (!norm) return "Sparkles";
  for (const rule of ICON_KEYWORD_RULES) {
    if (rule.keywords.some((kw) => norm.includes(normalizeArText(kw)))) {
      return rule.icon;
    }
  }
  return "Sparkles";
}

export const PRIORITY_LABELS = {
  1: {
    label: "عادية",
    color: "text-zinc-400 bg-zinc-800/80 border-zinc-700/60",
  },
  2: {
    label: "متوسطة",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  3: {
    label: "عالية",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
};

async function enqueueLifeAreaMutation(
  userId,
  entityId,
  action,
  payload,
  baseUpdatedAt,
  prefix = "la",
) {
  const now = Date.now();
  await localOutboxRepo.add({
    mutationId: `${prefix}_${now}_${crypto.randomUUID().slice(0, 8)}`,
    userId,
    entityType: "life_area",
    entityId,
    action,
    payload,
    clientTimestamp: now,
    version: 1,
    ...(baseUpdatedAt ? { baseUpdatedAt } : {}),
    status: "pending",
    retryCount: 0,
  });
  syncEngine.scheduleSync(500);
}

export default function LifeAreasManager({
  initialAreas = [],
  areas: controlledAreas,
  onAreasChange,
  onToast,
}) {
  const { userId: activeUserId, isGuest } = useLocalSession();
  const [localAreas, setLocalAreas] = useState(initialAreas);
  const areas = controlledAreas !== undefined ? controlledAreas : localAreas;
  const setAreas = (updater) => {
    if (onAreasChange) {
      onAreasChange((prev) =>
        typeof updater === "function" ? updater(prev) : updater,
      );
      return;
    }
    setLocalAreas(updater);
  };
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [hasCustomIcon, setHasCustomIcon] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "Sparkles",
    color: "violet",
    priority: 1,
  });

  const activeAreas = [...areas]
    .filter((a) => !a.isArchived)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const displayedAreas = activeAreas;

  const openCreateModal = () => {
    setEditingArea(null);
    setHasCustomIcon(false);
    setIconPickerOpen(false);
    setFormData({
      name: "",
      description: "",
      icon: "Sparkles",
      color: "violet",
      priority: 1,
    });
    setModalOpen(true);
  };

  const openEditModal = (area) => {
    setEditingArea(area);
    setHasCustomIcon(Boolean(area.icon));
    setIconPickerOpen(false);
    setFormData({
      name: area.name,
      description: area.description || "",
      icon: area.icon || "Sparkles",
      color: area.color || "violet",
      priority: Math.min(3, Math.max(1, Number(area.priority || 1))),
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
    const nowIso = new Date().toISOString();
    const resolvedIcon =
      hasCustomIcon && formData.icon
        ? formData.icon
        : inferLifeAreaIcon(formData.name);
    try {
      if (editingArea) {
        const updatedArea = {
          ...editingArea,
          userId: activeUserId,
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          icon: resolvedIcon,
          color: formData.color,
          priority: Number(formData.priority) || 1,
          hiddenOnDashboard: false,
          updatedAt: nowIso,
          _syncStatus: isGuest ? "synced" : "pending",
        };
        await localLifeAreaRepo.save(updatedArea);
        if (!isGuest) {
          await enqueueLifeAreaMutation(
            activeUserId,
            editingArea.id,
            "update",
            updatedArea,
            editingArea.updatedAt,
            "la_upd",
          );
        }
        setAreas((prev) =>
          prev.map((a) =>
            a.id === editingArea.id ? { ...a, ...updatedArea } : a,
          ),
        );
        setModalOpen(false);
      } else {
        const areaId = crypto.randomUUID();
        const baseSlug =
          slugify(formData.name.trim()) || `area-${areaId.slice(0, 6)}`;
        const newArea = {
          id: areaId,
          userId: activeUserId,
          name: formData.name.trim(),
          slug: `${baseSlug}-${areaId.slice(0, 4)}`,
          description: formData.description?.trim() || null,
          icon: resolvedIcon,
          color: formData.color,
          priority: Number(formData.priority) || 1,
          sortOrder: areas.length,
          hiddenOnDashboard: false,
          isArchived: false,
          archivedAt: null,
          createdAt: nowIso,
          updatedAt: nowIso,
          _syncStatus: isGuest ? "synced" : "pending",
        };
        await localLifeAreaRepo.save(newArea);
        if (!isGuest) {
          await enqueueLifeAreaMutation(
            activeUserId,
            areaId,
            "create",
            newArea,
            null,
            "la_crt",
          );
        }
        setAreas((prev) => [...prev, newArea]);
        setModalOpen(false);
      }
    } catch {
      // silent
    } finally {
      setIsSubmitting(false);
    }
  };

  const persistAreaPatch = async (
    area,
    patch,
    toastMessage,
    toastType = "info",
  ) => {
    const nowIso = new Date().toISOString();
    const updated = {
      ...area,
      ...patch,
      userId: activeUserId,
      updatedAt: nowIso,
      _syncStatus: isGuest ? "synced" : "pending",
    };
    setAreas((prev) => prev.map((a) => (a.id === area.id ? updated : a)));
    try {
      await localLifeAreaRepo.save(updated);
      if (!isGuest) {
        await enqueueLifeAreaMutation(
          activeUserId,
          area.id,
          "update",
          updated,
          area.updatedAt,
          "la_upd",
        );
      }
    } catch {
      // silent
    }
  };

  const confirmDeleteArea = async () => {
    if (!deleteTarget) return;
    const area = deleteTarget;
    setDeleteTarget(null);
    setAreas((prev) => prev.filter((a) => a.id !== area.id));
    try {
      await localLifeAreaRepo.delete(area.id);
      if (!isGuest) {
        await enqueueLifeAreaMutation(
          activeUserId,
          area.id,
          "delete",
          {},
          null,
          "la_del",
        );
      }
    } catch {
      // silent
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

    const nowIso = new Date().toISOString();
    const updatedItems = [];
    // Optimistic update + sort immediately by sortOrder
    setAreas((prev) =>
      prev
        .map((a) => {
          const found = reorderPayload.find((p) => p.id === a.id);
          if (!found) return a;
          const nextItem = {
            ...a,
            sortOrder: found.sortOrder,
            updatedAt: nowIso,
          };
          updatedItems.push(nextItem);
          return nextItem;
        })
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    );

    try {
      await localLifeAreaRepo.saveBatch(updatedItems);
      if (!isGuest) {
        for (const item of updatedItems) {
          await enqueueLifeAreaMutation(
            activeUserId,
            item.id,
            "update",
            { sortOrder: item.sortOrder },
            item.updatedAt,
            "la_ord",
          );
        }
      }
    } catch {
      // silent
    }
  };

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-6">
      {/* 1. Header & Actions */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          displayedAreas.length > 0 ? "pb-4 border-b border-zinc-800" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-zinc-100">
                مجالات وتصنيفات الحياة
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                {activeAreas.length} نشط
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              قسّم أهدافك وعاداتك إلى مجالات حرة من اختيارك (الروحانيات، الصحة،
              العمل، التعلم)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      {/* 2. Areas List (rendered only when items exist) */}
      {displayedAreas.length > 0 && (
        <div className="space-y-2.5">
          {displayedAreas.map((area, index) => {
            const IconComponent = ICON_MAP[area.icon] || Sparkles;
            const colorCfg = COLOR_CONFIG[area.color] || COLOR_CONFIG.violet;
            const priorityInfo =
              PRIORITY_LABELS[area.priority] || PRIORITY_LABELS[1];

            return (
              <div
                key={area.id}
                className="relative flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all group"
              >
                {/* Right side: Icon (with muted 1/2/3 badge), Name, Details */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`relative flex items-center justify-center w-10 h-10 rounded-xl border ${colorCfg.bg} ${colorCfg.border} ${colorCfg.text} shrink-0`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-900 border border-zinc-700/80 text-[9px] font-mono font-bold text-zinc-400 flex items-center justify-center leading-none"
                      title={`أولوية ${Math.min(3, Math.max(1, Number(area.priority || 1)))}`}
                    >
                      {Math.min(3, Math.max(1, Number(area.priority || 1)))}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className="text-sm font-bold text-zinc-100 truncate">
                        {area.name}
                      </h4>
                    </div>
                    {area.description && (
                      <p className="text-xs text-zinc-400 mt-0.5 truncate">
                        {area.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Desktop Inline Actions */}
                <div className="hidden sm:flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveOrder(index, "up")}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="تحريك لأعلى"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveOrder(index, "down")}
                    disabled={index === activeAreas.length - 1}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="تحريك لأسفل"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(area)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-violet-300 hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="تعديل المجال"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(area)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="حذف المجال"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile 3-Dots Action Menu */}
                <div className="relative sm:hidden shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenuId((prev) => (prev === area.id ? null : area.id))
                    }
                    aria-expanded={openMenuId === area.id}
                    aria-label="إجراءات المجال"
                    className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {openMenuId === area.id && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div className="absolute left-0 top-full mt-1.5 w-44 p-1.5 rounded-2xl bg-[#0c0e17] border border-zinc-800 shadow-2xl z-40 space-y-0.5 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => {
                            setOpenMenuId(null);
                            handleMoveOrder(index, "up");
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-800 disabled:opacity-35 cursor-pointer"
                        >
                          <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                          <span>تحريك لأعلى</span>
                        </button>
                        <button
                          type="button"
                          disabled={index === activeAreas.length - 1}
                          onClick={() => {
                            setOpenMenuId(null);
                            handleMoveOrder(index, "down");
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-800 disabled:opacity-35 cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                          <span>تحريك لأسفل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            openEditModal(area);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-800 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-violet-400" />
                          <span>تعديل</span>
                        </button>
                        <div className="my-1 border-t border-zinc-800/80" />
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            setDeleteTarget(area);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-300 hover:bg-rose-500/15 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>حذف</span>
                        </button>
                      </div>
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
                <button
                  type="button"
                  onClick={() => setIconPickerOpen(true)}
                  title="اختيار أيقونة مخصصة للمجال"
                  aria-label="اختيار أيقونة مخصصة للمجال"
                  className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-600/20 hover:bg-violet-600/35 text-violet-400 border border-violet-500/30 hover:border-violet-400/50 transition-all cursor-pointer active:scale-95"
                >
                  {(() => {
                    if (hasCustomIcon && ICON_MAP[formData.icon]) {
                      const SelectedIcon = ICON_MAP[formData.icon];
                      return <SelectedIcon className="w-4 h-4" />;
                    }
                    return <Plus className="w-4 h-4" />;
                  })()}
                </button>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">
                    {editingArea ? "تعديل مجال الحياة" : "إنشاء مجال حياة جديد"}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    حدد الاسم واللون والأيقونة والأولوية بحرية
                  </p>
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
                  maxLength={35}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="مثال: الدين, الشغل, الدراسة, اللياقة البدنية..."
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
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="ملاحظات توجيهية خاصة بهذا المجال..."
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              {/* Priority Selection (3 Compact Levels) */}
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-semibold text-zinc-300 shrink-0">
                  مستوى الأولوية
                </label>
                <div className="inline-flex items-center p-0.5 rounded-xl bg-zinc-900/80 border border-zinc-800 gap-0.5">
                  {[
                    { val: 1, num: "1", word: "أولى" },
                    { val: 2, num: "2", word: "ثانية" },
                    { val: 3, num: "3", word: "ثالثة" },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, priority: p.val })
                      }
                      aria-pressed={formData.priority === p.val}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        formData.priority === p.val
                          ? "bg-zinc-800 text-zinc-100 shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <span className="sm:hidden font-mono">{p.num}</span>
                      <span className="hidden sm:inline">{p.word}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector (6 Popular Colors) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  لون المجال المميز
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {SELECTABLE_COLORS.map((colorKey) => {
                    const cfg = COLOR_CONFIG[colorKey];
                    const isSelected = formData.color === colorKey;
                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, color: colorKey })
                        }
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          cfg.dot
                        } ${isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-[#0c0e17] scale-110" : "opacity-80 hover:opacity-100"}`}
                      >
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-white" />
                        )}
                      </button>
                    );
                  })}
                </div>
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

      {/* 3b. Custom Icon Picker Popup */}
      {modalOpen && iconPickerOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIconPickerOpen(false)}
        >
          <div
            className="w-full max-w-md p-5 sm:p-6 rounded-3xl bg-[#0c0e17] border border-zinc-800 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h4 className="text-sm font-bold text-zinc-100">
                  اختر أيقونة للمجال
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {LIFE_AREA_ICONS.length} أيقونة متاحة
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIconPickerOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-6 gap-2.5 max-h-[60vh] overflow-y-auto p-0.5">
              {LIFE_AREA_ICONS.map((iconKey) => {
                const IconComp = ICON_MAP[iconKey] || Sparkles;
                const isSelected = hasCustomIcon && formData.icon === iconKey;
                return (
                  <button
                    key={iconKey}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, icon: iconKey }));
                      setHasCustomIcon(true);
                      setIconPickerOpen(false);
                    }}
                    className={`aspect-square rounded-2xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? "bg-violet-600/25 border-violet-500 text-violet-300 ring-2 ring-violet-500/40"
                        : "bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-700"
                    }`}
                    title={iconKey}
                    aria-label={iconKey}
                  >
                    <IconComp className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Life Area Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteArea}
        title={`حذف مجال "${deleteTarget?.name || ""}"؟`}
        description="لن يتم حذف عاداتك أو سجلاتك التاريخية المرتبطة بهذا المجال."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        isDestructive={true}
      />
    </div>
  );
}
