import { z } from "zod";

export const LIFE_AREA_COLORS = [
  "violet",
  "emerald",
  "amber",
  "cyan",
  "rose",
  "blue",
  "indigo",
  "teal",
  "orange",
  "purple",
] as const;

export const LIFE_AREA_ICONS = [
  "Sparkles",
  "Flame",
  "Heart",
  "BookMarked",
  "Code2",
  "Dumbbell",
  "Wallet",
  "GraduationCap",
  "Brain",
  "Briefcase",
  "Compass",
  "Activity",
  "Target",
  "Moon",
  "Sun",
  "Shield",
  "Smile",
  "Users",
  "Globe",
  "Laptop",
] as const;

export const LifeAreaPrioritySchema = z.number().int().min(1).max(5).default(1);

/**
 * Generate a clean URL-safe slug from Arabic or Latin text
 */
export function slugify(text: string): string {
  const sanitized = text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\s\-]/g, "") // Strip symbols like & ! ? %
    .replace(/[\s\-_]+/g, "-") // Collapse consecutive whitespace, underscores, hyphens
    .replace(/^-+|-+$/g, "");
  return sanitized || `area-${Date.now().toString(36)}`;
}

export const CreateLifeAreaSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "اسم المجال مطلوب")
    .max(80, "اسم المجال يجب ألا يتجاوز 80 حرفاً"),
  description: z
    .string()
    .trim()
    .max(300, "الوصف يجب ألا يتجاوز 300 حرف")
    .optional()
    .nullable(),
  icon: z.string().default("Sparkles"),
  color: z.enum(LIFE_AREA_COLORS).default("violet"),
  priority: LifeAreaPrioritySchema,
  hiddenOnDashboard: z.boolean().default(false),
});

export type CreateLifeAreaInput = z.infer<typeof CreateLifeAreaSchema>;

export const UpdateLifeAreaSchema = z.object({
  id: z.string().min(1, "معرف المجال مطلوب"),
  name: z
    .string()
    .trim()
    .min(1, "اسم المجال مطلوب")
    .max(80, "اسم المجال يجب ألا يتجاوز 80 حرفاً")
    .optional(),
  description: z
    .string()
    .trim()
    .max(300, "الوصف يجب ألا يتجاوز 300 حرف")
    .optional()
    .nullable(),
  icon: z.string().optional(),
  color: z.enum(LIFE_AREA_COLORS).optional(),
  priority: LifeAreaPrioritySchema.optional(),
  hiddenOnDashboard: z.boolean().optional(),
});

export type UpdateLifeAreaInput = z.infer<typeof UpdateLifeAreaSchema>;

export const ReorderLifeAreasSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      sortOrder: z.number().int().min(0),
    })
  ).min(1, "قائمة الترتيب يجب ألا تكون فارغة"),
});

export type ReorderLifeAreasInput = z.infer<typeof ReorderLifeAreasSchema>;
