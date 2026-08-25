import { z } from 'zod'
import {
  defaultEntityFactoryDependencies,
  type EntityFactoryDependencies,
} from '../domain/factories'
import { calculateEstimate } from '../domain/calculations'
import type { EstimationProject } from '../domain/estimation'
import { estimationProjectSchema } from './projectSchemas'
import type { KeyValueStorage } from './projectPersistence'

export const PROJECT_ARCHIVE_STORAGE_KEY = 'developmentEstimation.archive.v1'
export const MAX_PROJECT_SNAPSHOTS = 25
export const MAX_PROJECT_TEMPLATES = 20
export const PROJECT_ARCHIVE_CHANGED_EVENT = 'project-archive-changed'

const archiveEntryKindSchema = z.enum(['manual', 'recovery'])
const projectSnapshotSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: archiveEntryKindSchema,
  createdAt: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
  project: estimationProjectSchema,
})
const projectTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
  project: estimationProjectSchema,
})
const projectArchiveSchema = z.object({
  schemaVersion: z.literal(1),
  snapshots: z.array(projectSnapshotSchema),
  templates: z.array(projectTemplateSchema),
})

export type ProjectSnapshotKind = 'manual' | 'recovery'

export interface ProjectSnapshot {
  id: string
  label: string
  kind: ProjectSnapshotKind
  createdAt: string
  project: EstimationProject
}

export interface ProjectTemplate {
  id: string
  name: string
  createdAt: string
  project: EstimationProject
}

export interface ProjectArchive {
  schemaVersion: 1
  snapshots: ProjectSnapshot[]
  templates: ProjectTemplate[]
}

export interface ProjectComparisonMetric {
  label: string
  saved: number
  current: number
  difference: number
  suffix: string
}

export type ArchiveResult<T> =
  | { status: 'success'; value: T; archive: ProjectArchive }
  | { status: 'invalid'; error: string }
  | { status: 'storage-error'; error: string }

export type LoadArchiveResult =
  | { status: 'loaded'; archive: ProjectArchive }
  | { status: 'invalid'; error: string }
  | { status: 'storage-error'; error: string }

export function createEmptyProjectArchive(): ProjectArchive {
  return { schemaVersion: 1, snapshots: [], templates: [] }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function loadProjectArchive(storage: KeyValueStorage): LoadArchiveResult {
  let serialized: string | null
  try {
    serialized = storage.getItem(PROJECT_ARCHIVE_STORAGE_KEY)
  } catch (error) {
    return { status: 'storage-error', error: errorMessage(error) }
  }
  if (serialized === null) {
    return { status: 'loaded', archive: createEmptyProjectArchive() }
  }

  try {
    const result = projectArchiveSchema.safeParse(JSON.parse(serialized))
    return result.success
      ? { status: 'loaded', archive: result.data }
      : { status: 'invalid', error: 'Saved project history is invalid.' }
  } catch (error) {
    return { status: 'invalid', error: `Invalid project history: ${errorMessage(error)}` }
  }
}

function saveProjectArchive(
  storage: KeyValueStorage,
  archive: ProjectArchive,
): LoadArchiveResult {
  const result = projectArchiveSchema.safeParse(archive)
  if (!result.success) {
    return { status: 'invalid', error: 'Project history could not be validated.' }
  }
  try {
    storage.setItem(PROJECT_ARCHIVE_STORAGE_KEY, JSON.stringify(result.data))
    if (typeof globalThis.dispatchEvent === 'function') {
      globalThis.dispatchEvent(new Event(PROJECT_ARCHIVE_CHANGED_EVENT))
    }
    return { status: 'loaded', archive: result.data }
  } catch (error) {
    return { status: 'storage-error', error: errorMessage(error) }
  }
}

function cloneProject(project: EstimationProject): EstimationProject {
  return structuredClone(project)
}

export function createProjectSnapshot(
  storage: KeyValueStorage,
  project: EstimationProject,
  label: string,
  kind: ProjectSnapshotKind = 'manual',
  dependencies: EntityFactoryDependencies = defaultEntityFactoryDependencies,
): ArchiveResult<ProjectSnapshot> {
  const loaded = loadProjectArchive(storage)
  if (loaded.status !== 'loaded') return loaded
  const trimmedLabel = label.trim()
  if (!trimmedLabel) return { status: 'invalid', error: 'Snapshot name is required.' }

  const snapshot: ProjectSnapshot = {
    id: dependencies.createId(),
    label: trimmedLabel,
    kind,
    createdAt: dependencies.now(),
    project: cloneProject(project),
  }
  const archive: ProjectArchive = {
    ...loaded.archive,
    snapshots: [snapshot, ...loaded.archive.snapshots].slice(
      0,
      MAX_PROJECT_SNAPSHOTS,
    ),
  }
  const saved = saveProjectArchive(storage, archive)
  return saved.status === 'loaded'
    ? { status: 'success', value: snapshot, archive: saved.archive }
    : saved
}

function createTemplateSource(project: EstimationProject): EstimationProject {
  return {
    ...cloneProject(project),
    developmentItems: project.developmentItems.map((item) => ({
      ...item,
      directEstimation: item.directEstimation.map((activity) => ({
        ...activity,
        hours: 0,
      })),
      subItems: item.subItems.map((subItem) => ({
        ...subItem,
        estimation: subItem.estimation.map((activity) => ({
          ...activity,
          hours: 0,
        })),
      })),
    })),
    qaActivities: project.qaActivities.map((activity) => ({
      ...activity,
      hours: 0,
    })),
  }
}

export function createProjectTemplate(
  storage: KeyValueStorage,
  project: EstimationProject,
  name: string,
  dependencies: EntityFactoryDependencies = defaultEntityFactoryDependencies,
): ArchiveResult<ProjectTemplate> {
  const loaded = loadProjectArchive(storage)
  if (loaded.status !== 'loaded') return loaded
  const trimmedName = name.trim()
  if (!trimmedName) return { status: 'invalid', error: 'Template name is required.' }

  const template: ProjectTemplate = {
    id: dependencies.createId(),
    name: trimmedName,
    createdAt: dependencies.now(),
    project: createTemplateSource(project),
  }
  const archive: ProjectArchive = {
    ...loaded.archive,
    templates: [
      template,
      ...loaded.archive.templates.filter(
        (current) => current.name.toLocaleLowerCase() !== trimmedName.toLocaleLowerCase(),
      ),
    ].slice(0, MAX_PROJECT_TEMPLATES),
  }
  const saved = saveProjectArchive(storage, archive)
  return saved.status === 'loaded'
    ? { status: 'success', value: template, archive: saved.archive }
    : saved
}

export function instantiateProjectTemplate(
  template: ProjectTemplate,
  dependencies: EntityFactoryDependencies = defaultEntityFactoryDependencies,
): EstimationProject {
  const timestamp = dependencies.now()
  const createActivities = (
    activities: EstimationProject['qaActivities'],
  ) => activities.map((activity) => ({
    ...activity,
    id: dependencies.createId(),
    hours: 0,
  }))

  return {
    ...template.project,
    id: dependencies.createId(),
    name: template.name,
    developmentItems: template.project.developmentItems.map((item) => ({
      ...item,
      id: dependencies.createId(),
      directEstimation: createActivities(item.directEstimation),
      subItems: item.subItems.map((subItem) => ({
        ...subItem,
        id: dependencies.createId(),
        estimation: createActivities(subItem.estimation),
      })),
    })),
    qaActivities: createActivities(template.project.qaActivities),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function deleteArchiveEntry(
  storage: KeyValueStorage,
  type: 'snapshot' | 'template',
  id: string,
): LoadArchiveResult {
  const loaded = loadProjectArchive(storage)
  if (loaded.status !== 'loaded') return loaded
  const archive: ProjectArchive = type === 'snapshot'
    ? {
        ...loaded.archive,
        snapshots: loaded.archive.snapshots.filter((entry) => entry.id !== id),
      }
    : {
        ...loaded.archive,
        templates: loaded.archive.templates.filter((entry) => entry.id !== id),
      }
  return saveProjectArchive(storage, archive)
}

export function deleteProjectSnapshot(storage: KeyValueStorage, id: string) {
  return deleteArchiveEntry(storage, 'snapshot', id)
}

export function deleteProjectTemplate(storage: KeyValueStorage, id: string) {
  return deleteArchiveEntry(storage, 'template', id)
}

export function compareProjects(
  savedProject: EstimationProject,
  currentProject: EstimationProject,
): ReadonlyArray<ProjectComparisonMetric> {
  const saved = calculateEstimate(savedProject)
  const current = calculateEstimate(currentProject)
  const savedSubItems = savedProject.developmentItems.reduce(
    (total, item) => total + item.subItems.length,
    0,
  )
  const currentSubItems = currentProject.developmentItems.reduce(
    (total, item) => total + item.subItems.length,
    0,
  )
  const metric = (
    label: string,
    savedValue: number,
    currentValue: number,
    suffix = '',
  ): ProjectComparisonMetric => ({
    label,
    saved: savedValue,
    current: currentValue,
    difference: currentValue - savedValue,
    suffix,
  })

  return [
    metric('Main items', savedProject.developmentItems.length, currentProject.developmentItems.length),
    metric('Sub-items', savedSubItems, currentSubItems),
    metric('Development', saved.developmentHours, current.developmentHours, ' h'),
    metric('QA', saved.qaHours, current.qaHours, ' h'),
    metric('Final estimate', saved.finalHours, current.finalHours, ' h'),
  ]
}
