import { z } from "zod";
import { LIFE_AREA_COLORS } from "./life-area";

export const TRACKER_METRIC_TYPES = [
  "BOOLEAN",
  "COUNTER",
  "NUMBER",
  "DURATION",
  "TIME_RANGE",
  "CHECKLIST",
  "AVOIDANCE",
] as const;

export type TrackerMetricType = (typeof TRACKER_METRIC_TYPES)[number];

export const TARGET_FREQUENCIES = ["DAILY", "WEEKLY", "CUSTOM"] as const;
export type TargetFrequency = (typeof TARGET_FREQUENCIES)[number];

// -----------------------------------------------------------------------------
// Type-Specific Configuration Schemas
// -----------------------------------------------------------------------------

export const DEFAULT_BOOLEAN_CONFIG = {
  trueLabel: "تم الإنجاز",
  falseLabel: "لم يُنجز",
  autoResetDaily: true,
};

export const BooleanTrackerConfigSchema = z
  .object({
    trueLabel: z.string().trim().max(50).default("تم الإنجاز"),
    falseLabel: z.string().trim().max(50).default("لم يُنجز"),
    autoResetDaily: z.boolean().default(true),
  })
  .default(DEFAULT_BOOLEAN_CONFIG);

export const DEFAULT_COUNTER_CONFIG = {
  step: 1,
  min: 0,
  allowNegative: false,
  initialValue: 0,
};

export const CounterTrackerConfigSchema = z
  .object({
    step: z.number().min(0.01).max(1000).default(1),
    min: z.number().default(0),
    max: z.number().optional(),
    allowNegative: z.boolean().default(false),
    initialValue: z.number().default(0),
  })
  .default(DEFAULT_COUNTER_CONFIG);

export const DEFAULT_NUMBER_CONFIG = {
  precision: 1,
  aggregation: "sum" as const,
};

export const NumberTrackerConfigSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
    precision: z.number().int().min(0).max(4).default(1),
    aggregation: z.enum(["sum", "avg", "last", "min", "max"]).default("sum"),
  })
  .default(DEFAULT_NUMBER_CONFIG);

export const DEFAULT_DURATION_CONFIG = {
  defaultDurationSeconds: 1800,
  minDurationSeconds: 60,
  format: "minutes" as const,
};

export const DurationTrackerConfigSchema = z
  .object({
    defaultDurationSeconds: z.number().int().min(60).default(1800), // 30 minutes
    minDurationSeconds: z.number().int().min(0).default(60),
    maxDurationSeconds: z.number().int().optional(),
    format: z.enum(["minutes", "hours", "seconds"]).default("minutes"),
  })
  .default(DEFAULT_DURATION_CONFIG);

export const DEFAULT_TIME_RANGE_CONFIG = {
  defaultStart: "23:00",
  defaultEnd: "07:00",
  allowCrossingMidnight: true,
};

export const TimeRangeTrackerConfigSchema = z
  .object({
    defaultStart: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "صيغة الوقت غير صالحة (HH:MM)")
      .default("23:00"),
    defaultEnd: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "صيغة الوقت غير صالحة (HH:MM)")
      .default("07:00"),
    allowCrossingMidnight: z.boolean().default(true),
  })
  .default(DEFAULT_TIME_RANGE_CONFIG);

export const ChecklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1, "اسم العنصر مطلوب").max(80),
  color: z.string().optional(),
  weight: z.number().min(0).default(1),
  required: z.boolean().default(false),
});

export const ChecklistTrackerConfigSchema = z.object({
  items: z
    .array(ChecklistItemSchema)
    .min(1, "يجب تحديد عنصر واحد على الأقل في قائمة التدقيق"),
});

export const DEFAULT_AVOIDANCE_CONFIG = {
  cleanLabel: "يوم نظيف ومثالي",
  relapseLabel: "حدثت زلة أو انتكاسة",
  targetCleanDays: 30,
  urgeTrackingEnabled: true,
};

export const AvoidanceTrackerConfigSchema = z
  .object({
    behaviorName: z.string().trim().max(100).optional(),
    cleanLabel: z.string().trim().max(50).default("يوم نظيف ومثالي"),
    relapseLabel: z.string().trim().max(50).default("حدثت زلة أو انتكاسة"),
    targetCleanDays: z.number().int().min(1).default(30),
    urgeTrackingEnabled: z.boolean().default(true),
  })
  .default(DEFAULT_AVOIDANCE_CONFIG);

/**
 * Validate type-specific trackerConfig using the corresponding schema.
 */
export function validateTrackerConfig(
  metricType: TrackerMetricType,
  rawConfig: unknown
) {
  switch (metricType) {
    case "BOOLEAN":
      return BooleanTrackerConfigSchema.safeParse(rawConfig);
    case "COUNTER":
      return CounterTrackerConfigSchema.safeParse(rawConfig);
    case "NUMBER":
      return NumberTrackerConfigSchema.safeParse(rawConfig);
    case "DURATION":
      return DurationTrackerConfigSchema.safeParse(rawConfig);
    case "TIME_RANGE":
      return TimeRangeTrackerConfigSchema.safeParse(rawConfig);
    case "CHECKLIST":
      return ChecklistTrackerConfigSchema.safeParse(rawConfig);
    case "AVOIDANCE":
      return AvoidanceTrackerConfigSchema.safeParse(rawConfig);
    default:
      return {
        success: false as const,
        error: new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            path: ["metricType"],
            message: `نوع القياس غير مدعوم: ${metricType}`,
          },
        ]),
      };
  }
}

// -----------------------------------------------------------------------------
// Schedule Configuration Schema
// -----------------------------------------------------------------------------

export const DEFAULT_SCHEDULE_CONFIG = {
  type: "daily" as const,
  days: [0, 1, 2, 3, 4, 5, 6],
};

export const ScheduleConfigSchema = z
  .object({
    type: z.enum(["daily", "weekdays", "weekly_target", "custom"]).default("daily"),
    days: z
      .array(z.number().int().min(0).max(6))
      .default([0, 1, 2, 3, 4, 5, 6]), // 0=Sunday, 6=Saturday
    targetDaysPerWeek: z.number().int().min(1).max(7).optional(),
    intervalDays: z.number().int().min(1).max(365).optional(),
  })
  .default(DEFAULT_SCHEDULE_CONFIG);

export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>;

// -----------------------------------------------------------------------------
// Display Preferences Schema
// -----------------------------------------------------------------------------

export const DEFAULT_DISPLAY_PREFERENCES = {
  isPinned: false,
  isHidden: false,
  cardStyle: "standard" as const,
  progressColor: "emerald",
};

export const DisplayPreferencesSchema = z
  .object({
    isPinned: z.boolean().default(false),
    isHidden: z.boolean().default(false),
    cardStyle: z.enum(["standard", "compact", "stat_focus"]).default("standard"),
    progressColor: z.string().default("emerald"),
  })
  .default(DEFAULT_DISPLAY_PREFERENCES);

export type DisplayPreferences = z.infer<typeof DisplayPreferencesSchema>;

// -----------------------------------------------------------------------------
// Create & Update Schemas
// -----------------------------------------------------------------------------

export const CreateTrackerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "اسم المتعقب مطلوب")
    .max(100, "اسم المتعقب يجب ألا يتجاوز 100 حرف"),
  description: z.string().trim().max(300).optional().nullable(),
  lifeAreaId: z.string().optional().nullable(),
  icon: z.string().default("Flame"),
  color: z.enum(LIFE_AREA_COLORS).default("emerald"),
  priority: z.number().int().min(1).max(10).default(1),
  metricType: z.enum(TRACKER_METRIC_TYPES),
  unit: z.string().trim().max(30).optional().nullable(),
  targetValue: z.number().optional().nullable(),
  targetFrequency: z.enum(TARGET_FREQUENCIES).default("DAILY"),
  scheduleConfig: ScheduleConfigSchema.optional().default(DEFAULT_SCHEDULE_CONFIG),
  trackerConfig: z.record(z.string(), z.any()).optional().default({}),
  displayPreferences: DisplayPreferencesSchema.optional().default(DEFAULT_DISPLAY_PREFERENCES),
});

export type CreateTrackerInput = z.infer<typeof CreateTrackerSchema>;

export const UpdateTrackerSchema = z.object({
  id: z.string().min(1, "معرف المتعقب مطلوب"),
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(300).optional().nullable(),
  lifeAreaId: z.string().optional().nullable(),
  icon: z.string().optional(),
  color: z.enum(LIFE_AREA_COLORS).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  metricType: z.enum(TRACKER_METRIC_TYPES).optional(),
  unit: z.string().trim().max(30).optional().nullable(),
  targetValue: z.number().optional().nullable(),
  targetFrequency: z.enum(TARGET_FREQUENCIES).optional(),
  scheduleConfig: ScheduleConfigSchema.optional(),
  trackerConfig: z.record(z.string(), z.any()).optional(),
  displayPreferences: DisplayPreferencesSchema.optional(),
  isPaused: z.boolean().optional(),
});

export type UpdateTrackerInput = z.infer<typeof UpdateTrackerSchema>;

export const ReorderTrackersSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      sortOrder: z.number().int().min(0),
    })
  ).min(1, "قائمة الترتيب يجب ألا تكون فارغة"),
});

export type ReorderTrackersInput = z.infer<typeof ReorderTrackersSchema>;
