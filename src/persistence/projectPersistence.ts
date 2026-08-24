import type { EntityFactoryDependencies } from '../domain/factories'
import { defaultEntityFactoryDependencies } from '../domain/factories'
import type {
  DevelopmentWorkItem,
  EstimationProject,
  QaActivity,
} from '../domain/estimation'
import {
  estimationProjectSchema,
  legacyV16EditableExportSchema,
  legacyV16StorageSnapshotSchema,
  type LegacyV16Activity,
  type LegacyV16Settings,
  type LegacyV16WorkItem,
} from './projectSchemas'

export const PROJECT_STORAGE_KEY = 'developmentEstimation.project.v1'
export const LEGACY_V16_STORAGE_KEY = 'developmentEstimationV4'

export interface KeyValueStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export type ProjectSource = 'current' | 'v16-editable' | 'v16-storage'

export type DeserializeProjectResult =
  | {
      status: 'success'
      project: EstimationProject
      source: ProjectSource
      migrated: boolean
      lastModifiedAt: string | null
    }
  | { status: 'invalid'; error: string }

export type SaveProjectResult =
  | { status: 'saved' }
  | { status: 'invalid'; error: string }
  | { status: 'storage-error'; error: string }

export type LoadProjectResult =
  | { status: 'empty' }
  | {
      status: 'loaded'
      project: EstimationProject
      source: ProjectSource
      migrated: boolean
      lastModifiedAt: string | null
    }
  | {
      status: 'corrupt'
      error: string
      recoveryKey: string | null
      originalPreserved: boolean
    }
  | { status: 'storage-error'; error: string }

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function parseLegacyNumber(value: number | string, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseLegacyScheduleNumber(
  value: number | string,
  fallback: number,
): number {
  const parsed = parseLegacyNumber(value, fallback)
  return parsed === 0 ? fallback : parsed
}

function migrateActivity(
  activity: LegacyV16Activity,
  dependencies: EntityFactoryDependencies,
) {
  return {
    id: dependencies.createId(),
    name: activity.name,
    hours: parseLegacyNumber(activity.hours),
  }
}

function migrateWorkItem(
  item: LegacyV16WorkItem,
  dependencies: EntityFactoryDependencies,
): DevelopmentWorkItem {
  return {
    id: dependencies.createId(),
    name: item.name,
    directEstimation: item.directEstimation.map((activity) =>
      migrateActivity(activity, dependencies),
    ),
    subItems: item.subItems.map((subItem) => ({
      id: dependencies.createId(),
      name: subItem.name,
      estimation: subItem.estimation.map((activity) =>
        migrateActivity(activity, dependencies),
      ),
    })),
  }
}

function migrateLegacyProject(
  settings: LegacyV16Settings,
  items: ReadonlyArray<LegacyV16WorkItem>,
  qaEstimation: ReadonlyArray<LegacyV16Activity>,
  dependencies: EntityFactoryDependencies,
  lastModifiedAt: string | null = null,
): EstimationProject {
  const timestamp = lastModifiedAt ?? dependencies.now()
  const qaActivities: ReadonlyArray<QaActivity> = qaEstimation.map((activity) =>
    migrateActivity(activity, dependencies),
  )

  return {
    id: dependencies.createId(),
    schemaVersion: 1,
    name: settings.projectName.trim() || 'Imported Estimate',
    developmentItems: items.map((item) =>
      migrateWorkItem(item, dependencies),
    ),
    qaActivities,
    schedule: {
      riskBufferPercentage: parseLegacyNumber(settings.buffer),
      workingHoursPerPersonDay: parseLegacyScheduleNumber(
        settings.hoursPerDay,
        8,
      ),
      totalManpower: parseLegacyScheduleNumber(settings.teamSize, 1),
      businessDaysPerWeek: parseLegacyScheduleNumber(settings.daysPerWeek, 5),
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function schemaError(prefix: string, issues: ReadonlyArray<{ message: string }>) {
  const detail = issues
    .slice(0, 3)
    .map((issue) => issue.message)
    .join('; ')
  return detail ? `${prefix}: ${detail}` : prefix
}

export function deserializeProject(
  serialized: string,
  dependencies: EntityFactoryDependencies = defaultEntityFactoryDependencies,
): DeserializeProjectResult {
  let value: unknown
  try {
    value = JSON.parse(serialized)
  } catch (error) {
    return { status: 'invalid', error: `Invalid JSON: ${messageFromError(error)}` }
  }

  const currentResult = estimationProjectSchema.safeParse(value)
  if (currentResult.success) {
    return {
      status: 'success',
      project: currentResult.data,
      source: 'current',
      migrated: false,
      lastModifiedAt: currentResult.data.updatedAt,
    }
  }

  const editableResult = legacyV16EditableExportSchema.safeParse(value)
  if (editableResult.success) {
    return {
      status: 'success',
      project: migrateLegacyProject(
        editableResult.data.settings,
        editableResult.data.development.items,
        editableResult.data.qa.estimation,
        dependencies,
        editableResult.data.exportedAt ?? null,
      ),
      source: 'v16-editable',
      migrated: true,
      lastModifiedAt: editableResult.data.exportedAt ?? null,
    }
  }

  const storageResult = legacyV16StorageSnapshotSchema.safeParse(value)
  if (storageResult.success) {
    return {
      status: 'success',
      project: migrateLegacyProject(
        storageResult.data,
        storageResult.data.items,
        storageResult.data.qaEstimation,
        dependencies,
        storageResult.data.savedAt ?? null,
      ),
      source: 'v16-storage',
      migrated: true,
      lastModifiedAt: storageResult.data.savedAt ?? null,
    }
  }

  return {
    status: 'invalid',
    error: schemaError('Unsupported or invalid estimation project', currentResult.error.issues),
  }
}

export function serializeProject(
  project: EstimationProject,
): { status: 'success'; serialized: string } | { status: 'invalid'; error: string } {
  const result = estimationProjectSchema.safeParse(project)
  if (!result.success) {
    return {
      status: 'invalid',
      error: schemaError('Invalid estimation project', result.error.issues),
    }
  }

  return { status: 'success', serialized: JSON.stringify(result.data) }
}

export function saveProject(
  storage: KeyValueStorage,
  project: EstimationProject,
): SaveProjectResult {
  const serialized = serializeProject(project)
  if (serialized.status === 'invalid') return serialized

  try {
    storage.setItem(PROJECT_STORAGE_KEY, serialized.serialized)
    return { status: 'saved' }
  } catch (error) {
    return { status: 'storage-error', error: messageFromError(error) }
  }
}

function recoveryKey(now: string): string {
  return `${PROJECT_STORAGE_KEY}.recovery.${now.replace(/[^a-z0-9-]/gi, '-')}`
}

function quarantineCorruptProject(
  storage: KeyValueStorage,
  serialized: string,
  dependencies: EntityFactoryDependencies,
): Pick<Extract<LoadProjectResult, { status: 'corrupt' }>, 'recoveryKey' | 'originalPreserved'> {
  const key = recoveryKey(dependencies.now())
  try {
    storage.setItem(key, serialized)
  } catch {
    return { recoveryKey: null, originalPreserved: true }
  }

  try {
    storage.removeItem(PROJECT_STORAGE_KEY)
    return { recoveryKey: key, originalPreserved: false }
  } catch {
    return { recoveryKey: key, originalPreserved: true }
  }
}

export function loadProject(
  storage: KeyValueStorage,
  dependencies: EntityFactoryDependencies = defaultEntityFactoryDependencies,
): LoadProjectResult {
  let serialized: string | null
  try {
    serialized = storage.getItem(PROJECT_STORAGE_KEY)
  } catch (error) {
    return { status: 'storage-error', error: messageFromError(error) }
  }

  if (serialized === null) return { status: 'empty' }

  const result = deserializeProject(serialized, dependencies)
  if (result.status === 'success') {
    return {
      status: 'loaded',
      project: result.project,
      source: result.source,
      migrated: result.migrated,
      lastModifiedAt: result.lastModifiedAt,
    }
  }

  const quarantine = quarantineCorruptProject(storage, serialized, dependencies)
  return { status: 'corrupt', error: result.error, ...quarantine }
}

export function loadLegacyV16Project(
  storage: KeyValueStorage,
  dependencies: EntityFactoryDependencies = defaultEntityFactoryDependencies,
): LoadProjectResult {
  let serialized: string | null
  try {
    serialized = storage.getItem(LEGACY_V16_STORAGE_KEY)
  } catch (error) {
    return { status: 'storage-error', error: messageFromError(error) }
  }

  if (serialized === null) return { status: 'empty' }

  const result = deserializeProject(serialized, dependencies)
  if (result.status === 'invalid') {
    return {
      status: 'corrupt',
      error: result.error,
      recoveryKey: null,
      originalPreserved: true,
    }
  }

  return {
    status: 'loaded',
    project: result.project,
    source: result.source,
    migrated: result.migrated,
    lastModifiedAt: result.lastModifiedAt,
  }
}
