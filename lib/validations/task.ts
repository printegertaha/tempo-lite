import { z } from "zod";
import { LocalDateSchema } from "./entry";

export const TaskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export type TaskPriorityType = z.infer<typeof TaskPriorityEnum>;

export const TaskStatusEnum = z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export type TaskStatusType = z.infer<typeof TaskStatusEnum>;

export const SubtaskItemSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1, "عنوان المهمة الفرعية مطلوب"),
  completed: z.boolean().default(false),
});
export type SubtaskItem = z.infer<typeof SubtaskItemSchema>;

/**
 * Task Creation Validation Schema
 */
export const CreateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "عنوان المهمة مطلوب")
    .max(200, "عنوان المهمة طويل جداً (الحد الأقصى 200 حرف)"),
  description: z
    .string()
    .trim()
    .max(2000, "الوصف طويل جداً (الحد الأقصى 2000 حرف)")
    .optional()
    .nullable(),
  dueDate: LocalDateSchema.optional().nullable(),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "تنسيق الوقت غير صالح (HH:MM)")
    .optional()
    .nullable(),
  durationMinutes: z.coerce.number().int().min(1).max(1440).optional().nullable(),
  priority: TaskPriorityEnum.default("MEDIUM"),
  status: TaskStatusEnum.default("TODO"),
  lifeAreaId: z.string().trim().optional().nullable(),
  trackerId: z.string().trim().optional().nullable(),
  tags: z.array(z.string().trim().max(40)).default([]),
  sortOrder: z.number().int().default(0),
  isPomodoro: z.boolean().default(false),
  workCycle: z.coerce.number().int().min(1).max(180).default(25),
  breakCycle: z.coerce.number().int().min(1).max(60).default(5),
  isRecurring: z.boolean().default(false),
  subtasks: z.array(SubtaskItemSchema).default([]),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

/**
 * Task Update Validation Schema
 */
export const UpdateTaskSchema = z.object({
  id: z.string().min(1, "معرف المهمة مطلوب"),
  title: z
    .string()
    .trim()
    .min(1, "عنوان المهمة مطلوب")
    .max(200, "عنوان المهمة طويل جداً")
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable(),
  dueDate: LocalDateSchema.optional().nullable(),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "تنسيق الوقت غير صالح (HH:MM)")
    .optional()
    .nullable(),
  durationMinutes: z.coerce.number().int().min(1).max(1440).optional().nullable(),
  priority: TaskPriorityEnum.optional(),
  status: TaskStatusEnum.optional(),
  lifeAreaId: z.string().trim().optional().nullable(),
  trackerId: z.string().trim().optional().nullable(),
  tags: z.array(z.string().trim().max(40)).optional(),
  sortOrder: z.number().int().optional(),
  isArchived: z.boolean().optional(),
  isPomodoro: z.boolean().optional(),
  workCycle: z.coerce.number().int().min(1).max(180).optional(),
  breakCycle: z.coerce.number().int().min(1).max(60).optional(),
  isRecurring: z.boolean().optional(),
  subtasks: z.array(SubtaskItemSchema).optional(),
});

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

/**
 * Postpone Task Validation Schema
 */
export const PostponeTaskSchema = z.object({
  id: z.string().min(1, "معرف المهمة مطلوب"),
  newDueDate: LocalDateSchema,
});

export type PostponeTaskInput = z.infer<typeof PostponeTaskSchema>;

/**
 * Tasks Query Filters Schema
 */
export const TaskQueryFiltersSchema = z.object({
  view: z
    .enum([
      "all",
      "today",
      "home",
      "full",
      "upcoming",
      "overdue",
      "completed",
      "archived",
    ])
    .default("today"),
  lifeAreaId: z.string().optional().nullable(),
  trackerId: z.string().optional().nullable(),
  localDate: LocalDateSchema.optional(),
  searchQuery: z.string().trim().optional(),
  isArchived: z.boolean().optional(),
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(500).optional().default(100),
});

export type TaskQueryFilters = z.infer<typeof TaskQueryFiltersSchema>;

