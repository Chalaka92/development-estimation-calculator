import { z } from 'zod'

const finiteNumberSchema = z.number().finite()
const entityIdSchema = z.string().min(1)
const isoDateTimeSchema = z.string().refine(
  (value) => !Number.isNaN(Date.parse(value)),
  'Expected an ISO date-time string',
)

const estimationActivitySchema = z
  .object({
    id: entityIdSchema,
    name: z.string(),
    hours: finiteNumberSchema,
  })
  .strict()

const developmentSubItemSchema = z
  .object({
    id: entityIdSchema,
    name: z.string(),
    estimation: z.array(estimationActivitySchema),
  })
  .strict()

const developmentWorkItemSchema = z
  .object({
    id: entityIdSchema,
    name: z.string(),
    directEstimation: z.array(estimationActivitySchema),
    subItems: z.array(developmentSubItemSchema),
  })
  .strict()

const qaActivitySchema = z
  .object({
    id: entityIdSchema,
    name: z.string(),
    hours: finiteNumberSchema,
  })
  .strict()

const estimationScheduleSchema = z
  .object({
    riskBufferPercentage: finiteNumberSchema,
    workingHoursPerPersonDay: finiteNumberSchema,
    totalManpower: finiteNumberSchema,
    businessDaysPerWeek: finiteNumberSchema,
  })
  .strict()

export const estimationProjectSchema = z
  .object({
    id: entityIdSchema,
    schemaVersion: z.literal(1),
    name: z.string(),
    developmentItems: z.array(developmentWorkItemSchema),
    qaActivities: z.array(qaActivitySchema),
    schedule: estimationScheduleSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()

const legacyNumberSchema = z.union([z.number(), z.string()])

const legacyActivitySchema = z.object({
  name: z.string(),
  hours: legacyNumberSchema,
})

const legacySubItemSchema = z.object({
  name: z.string(),
  estimation: z.array(legacyActivitySchema),
})

const legacyWorkItemSchema = z.object({
  name: z.string(),
  directEstimation: z.array(legacyActivitySchema),
  subItems: z.array(legacySubItemSchema),
})

const legacySettingsSchema = z.object({
  projectName: z.string(),
  buffer: legacyNumberSchema,
  hoursPerDay: legacyNumberSchema,
  teamSize: legacyNumberSchema,
  daysPerWeek: legacyNumberSchema,
})

export const legacyV16EditableExportSchema = z.object({
  fileType: z.literal('DevelopmentEstimationCalculator'),
  version: z.union([z.literal(1), z.literal('1')]),
  exportedAt: isoDateTimeSchema.optional(),
  settings: legacySettingsSchema,
  development: z.object({
    items: z.array(legacyWorkItemSchema),
  }),
  qa: z.object({
    estimation: z.array(legacyActivitySchema),
  }),
})

export const legacyV16StorageSnapshotSchema = legacySettingsSchema.extend({
  savedAt: isoDateTimeSchema.optional(),
  items: z.array(legacyWorkItemSchema),
  qaEstimation: z.array(legacyActivitySchema),
})

export type LegacyV16Activity = z.infer<typeof legacyActivitySchema>
export type LegacyV16WorkItem = z.infer<typeof legacyWorkItemSchema>
export type LegacyV16Settings = z.infer<typeof legacySettingsSchema>
