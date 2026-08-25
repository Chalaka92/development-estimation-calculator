import {
  calculateActivityHours,
  calculateDevelopmentItemHours,
  calculateEstimationHours,
} from '../domain/calculations'
import type {
  EstimationActivity,
  EstimationProject,
  QaActivity,
  RiskLevel,
} from '../domain/estimation'

export const WORK_ITEM_EXPORT_FILE_TYPE = 'DevelopmentEstimationWorkItems'
export const WORK_ITEM_EXPORT_SCHEMA_VERSION = 1 as const

export type GeneratedWorkItemKind =
  | 'group'
  | 'deliverable'
  | 'activity'
  | 'quality'

export interface WorkItemGenerationOptions {
  includeEstimationActivities: boolean
  includeQaActivities: boolean
  includeZeroHourActivities: boolean
}

export interface GeneratedWorkItem {
  id: string
  sourceId: string
  sourcePath: string
  kind: GeneratedWorkItemKind
  summary: string
  description: string
  parentId?: string
  estimateHours: number
  rollupEstimateHours: number
  role?: string
  riskLevel?: RiskLevel
  confidencePercentage?: number
  dependencyIds: ReadonlyArray<string>
}

export interface GeneratedWorkItemCollection {
  fileType: typeof WORK_ITEM_EXPORT_FILE_TYPE
  schemaVersion: typeof WORK_ITEM_EXPORT_SCHEMA_VERSION
  generatedAt: string
  project: {
    id: string
    name: string
    updatedAt: string
  }
  options: WorkItemGenerationOptions
  workItems: ReadonlyArray<GeneratedWorkItem>
}

export const DEFAULT_WORK_ITEM_GENERATION_OPTIONS: WorkItemGenerationOptions = {
  includeEstimationActivities: false,
  includeQaActivities: true,
  includeZeroHourActivities: false,
}

const developmentId = (sourceId: string) => `development:${sourceId}`
const activityId = (sourceId: string) => `activity:${sourceId}`
const qualityId = (sourceId: string) => `quality:${sourceId}`
const hoursFormatter = new Intl.NumberFormat('en', { maximumFractionDigits: 2 })

function activityDescription(activity: EstimationActivity | QaActivity): string {
  const details = [
    activity.notes?.trim(),
    activity.role?.trim() ? `Delivery role: ${activity.role.trim()}` : '',
    activity.riskLevel ? `Risk: ${activity.riskLevel}` : '',
    activity.confidencePercentage === undefined
      ? ''
      : `Confidence: ${activity.confidencePercentage}%`,
  ].filter(Boolean)
  return details.join('\n')
}

function estimationDescription(
  activities: ReadonlyArray<EstimationActivity>,
): string {
  const populated = activities.filter(
    (activity) => calculateActivityHours(activity) > 0 || activity.notes?.trim(),
  )
  if (populated.length === 0) return ''
  return populated.map((activity) => {
    const role = activity.role?.trim() ? ` · ${activity.role.trim()}` : ''
    return `- ${activity.name}: ${hoursFormatter.format(calculateActivityHours(activity))} h${role}`
  }).join('\n')
}

function createActivityWorkItems(
  activities: ReadonlyArray<EstimationActivity>,
  parentId: string,
  sourcePath: string,
  includeZeroHourActivities: boolean,
): ReadonlyArray<GeneratedWorkItem> {
  return activities
    .filter(
      (activity) =>
        includeZeroHourActivities || calculateActivityHours(activity) > 0,
    )
    .map((activity) => {
      const hours = calculateActivityHours(activity)
      return {
        id: activityId(activity.id),
        sourceId: activity.id,
        sourcePath: `${sourcePath} / ${activity.name}`,
        kind: 'activity' as const,
        summary: activity.name,
        description: activityDescription(activity),
        parentId,
        estimateHours: hours,
        rollupEstimateHours: hours,
        role: activity.role?.trim() || undefined,
        riskLevel: activity.riskLevel,
        confidencePercentage: activity.confidencePercentage,
        dependencyIds: [],
      }
    })
}

export function generateWorkItems(
  project: EstimationProject,
  options: WorkItemGenerationOptions = DEFAULT_WORK_ITEM_GENERATION_OPTIONS,
): ReadonlyArray<GeneratedWorkItem> {
  const sourceToGeneratedId = new Map<string, string>()
  project.developmentItems.forEach((item) => {
    sourceToGeneratedId.set(item.id, developmentId(item.id))
    item.subItems.forEach((subItem) => {
      sourceToGeneratedId.set(subItem.id, developmentId(subItem.id))
    })
  })
  const dependencies = (sourceIds: ReadonlyArray<string> | undefined) =>
    (sourceIds ?? []).flatMap((sourceId) => {
      const generatedId = sourceToGeneratedId.get(sourceId)
      return generatedId ? [generatedId] : []
    })

  const developmentItems = project.developmentItems.flatMap((item, itemIndex) => {
    const mainId = developmentId(item.id)
    const mainPath = `${itemIndex + 1}. ${item.name}`
    const mainHours = calculateDevelopmentItemHours(item)
    if (item.subItems.length === 0) {
      const children = options.includeEstimationActivities
        ? createActivityWorkItems(
            item.directEstimation,
            mainId,
            mainPath,
            options.includeZeroHourActivities,
          )
        : []
      return [
        {
          id: mainId,
          sourceId: item.id,
          sourcePath: mainPath,
          kind: 'deliverable' as const,
          summary: item.name,
          description: estimationDescription(item.directEstimation),
          estimateHours: options.includeEstimationActivities ? 0 : mainHours,
          rollupEstimateHours: mainHours,
          dependencyIds: dependencies(item.dependencyIds),
        },
        ...children,
      ]
    }

    const subItems = item.subItems.flatMap((subItem, subItemIndex) => {
      const subId = developmentId(subItem.id)
      const subPath = `${mainPath} / ${itemIndex + 1}.${subItemIndex + 1} ${subItem.name}`
      const subHours = calculateEstimationHours(subItem.estimation)
      const children = options.includeEstimationActivities
        ? createActivityWorkItems(
            subItem.estimation,
            subId,
            subPath,
            options.includeZeroHourActivities,
          )
        : []
      return [
        {
          id: subId,
          sourceId: subItem.id,
          sourcePath: subPath,
          kind: 'deliverable' as const,
          summary: subItem.name,
          description: estimationDescription(subItem.estimation),
          parentId: mainId,
          estimateHours: options.includeEstimationActivities ? 0 : subHours,
          rollupEstimateHours: subHours,
          dependencyIds: dependencies(subItem.dependencyIds),
        },
        ...children,
      ]
    })
    return [
      {
        id: mainId,
        sourceId: item.id,
        sourcePath: mainPath,
        kind: 'group' as const,
        summary: item.name,
        description: `Contains ${item.subItems.length} deliverable${item.subItems.length === 1 ? '' : 's'}.`,
        estimateHours: 0,
        rollupEstimateHours: mainHours,
        dependencyIds: dependencies(item.dependencyIds),
      },
      ...subItems,
    ]
  })

  const qualityItems = options.includeQaActivities
    ? project.qaActivities
        .filter(
          (activity) =>
            options.includeZeroHourActivities || calculateActivityHours(activity) > 0,
        )
        .map((activity): GeneratedWorkItem => {
          const hours = calculateActivityHours(activity)
          return {
            id: qualityId(activity.id),
            sourceId: activity.id,
            sourcePath: `QA / ${activity.name}`,
            kind: 'quality',
            summary: activity.name,
            description: activityDescription(activity),
            estimateHours: hours,
            rollupEstimateHours: hours,
            role: activity.role?.trim() || 'QA',
            riskLevel: activity.riskLevel,
            confidencePercentage: activity.confidencePercentage,
            dependencyIds: [],
          }
        })
    : []

  return [...developmentItems, ...qualityItems]
}

export function createWorkItemCollection(
  project: EstimationProject,
  options: WorkItemGenerationOptions,
  workItems: ReadonlyArray<GeneratedWorkItem> = generateWorkItems(project, options),
  now: () => string = () => new Date().toISOString(),
): GeneratedWorkItemCollection {
  const includedIds = new Set(workItems.map((item) => item.id))
  return {
    fileType: WORK_ITEM_EXPORT_FILE_TYPE,
    schemaVersion: WORK_ITEM_EXPORT_SCHEMA_VERSION,
    generatedAt: now(),
    project: { id: project.id, name: project.name, updatedAt: project.updatedAt },
    options,
    workItems: workItems.map((item) => ({
      ...item,
      parentId: item.parentId && includedIds.has(item.parentId)
        ? item.parentId
        : undefined,
      dependencyIds: item.dependencyIds.filter((id) => includedIds.has(id)),
    })),
  }
}

function csvCell(value: string | number | undefined): string {
  const text = value === undefined ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function createWorkItemCsv(
  workItems: ReadonlyArray<GeneratedWorkItem>,
): string {
  const rows: ReadonlyArray<ReadonlyArray<string | number | undefined>> = [
    [
      'ID',
      'Kind',
      'Parent ID',
      'Summary',
      'Description',
      'Estimate Hours',
      'Rollup Hours',
      'Role',
      'Risk',
      'Confidence %',
      'Dependency IDs',
      'Source Path',
    ],
    ...workItems.map((item) => [
      item.id,
      item.kind,
      item.parentId,
      item.summary,
      item.description,
      item.estimateHours,
      item.rollupEstimateHours,
      item.role,
      item.riskLevel,
      item.confidencePercentage,
      item.dependencyIds.join(' | '),
      item.sourcePath,
    ]),
  ]
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function createWorkItemExportFilename(
  projectName: string,
  extension: 'json' | 'csv',
): string {
  const base = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 68)
  return `${base || 'development-estimate'}-work-items.${extension}`
}
