import { z } from 'zod'
import {
  defaultEntityFactoryDependencies,
  type EntityFactoryDependencies,
} from '../domain/factories'
import type { EstimationProject } from '../domain/estimation'
import { estimationProjectSchema } from './projectSchemas'
import type { KeyValueStorage } from './projectPersistence'

export const PROJECT_WORKSPACE_STORAGE_KEY = 'developmentEstimation.workspace.v1'
export const PROJECT_WORKSPACE_CHANGED_EVENT = 'project-workspace-changed'
export const MAX_WORKSPACE_PROJECTS = 50

const workspaceProjectSchema = z.object({
  project: estimationProjectSchema,
  archived: z.boolean(),
  lastOpenedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
})

const projectWorkspaceSchema = z.object({
  schemaVersion: z.literal(1),
  activeProjectId: z.string().min(1),
  projects: z.array(workspaceProjectSchema).min(1).max(MAX_WORKSPACE_PROJECTS),
})

export interface WorkspaceProject {
  project: EstimationProject
  archived: boolean
  lastOpenedAt: string
}

export interface ProjectWorkspace {
  schemaVersion: 1
  activeProjectId: string
  projects: WorkspaceProject[]
}

export type WorkspaceResult<T = ProjectWorkspace> =
  | { status: 'success'; value: T; workspace: ProjectWorkspace }
  | { status: 'invalid'; error: string }
  | { status: 'storage-error'; error: string }

export type LoadWorkspaceResult =
  | { status: 'loaded'; workspace: ProjectWorkspace }
  | { status: 'empty' }
  | { status: 'invalid'; error: string }
  | { status: 'storage-error'; error: string }

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function cloneProject(project: EstimationProject): EstimationProject {
  return structuredClone(project)
}

export function loadProjectWorkspace(storage: KeyValueStorage): LoadWorkspaceResult {
  let serialized: string | null
  try {
    serialized = storage.getItem(PROJECT_WORKSPACE_STORAGE_KEY)
  } catch (error) {
    return { status: 'storage-error', error: errorMessage(error) }
  }
  if (serialized === null) return { status: 'empty' }

  try {
    const result = projectWorkspaceSchema.safeParse(JSON.parse(serialized))
    if (!result.success) {
      return { status: 'invalid', error: 'Saved project workspace is invalid.' }
    }
    if (
      !result.data.projects.some(
        ({ project }) => project.id === result.data.activeProjectId,
      )
    ) {
      return { status: 'invalid', error: 'The active workspace project is missing.' }
    }
    return { status: 'loaded', workspace: result.data }
  } catch (error) {
    return {
      status: 'invalid',
      error: `Invalid project workspace: ${errorMessage(error)}`,
    }
  }
}

function saveProjectWorkspace(
  storage: KeyValueStorage,
  workspace: ProjectWorkspace,
): WorkspaceResult {
  const result = projectWorkspaceSchema.safeParse(workspace)
  if (!result.success) {
    return { status: 'invalid', error: 'Project workspace could not be validated.' }
  }
  try {
    storage.setItem(PROJECT_WORKSPACE_STORAGE_KEY, JSON.stringify(result.data))
    globalThis.dispatchEvent?.(new Event(PROJECT_WORKSPACE_CHANGED_EVENT))
    return { status: 'success', value: result.data, workspace: result.data }
  } catch (error) {
    return { status: 'storage-error', error: errorMessage(error) }
  }
}

export function synchronizeWorkspaceProject(
  storage: KeyValueStorage,
  project: EstimationProject,
  dependencies: EntityFactoryDependencies = defaultEntityFactoryDependencies,
): WorkspaceResult {
  const loaded = loadProjectWorkspace(storage)
  if (loaded.status === 'invalid' || loaded.status === 'storage-error') return loaded
  const now = dependencies.now()

  if (loaded.status === 'empty') {
    return saveProjectWorkspace(storage, {
      schemaVersion: 1,
      activeProjectId: project.id,
      projects: [
        { project: cloneProject(project), archived: false, lastOpenedAt: now },
      ],
    })
  }

  const exists = loaded.workspace.projects.some(
    ({ project: entry }) => entry.id === project.id,
  )
  const projects = exists
    ? loaded.workspace.projects.map((entry) =>
        entry.project.id === project.id
          ? { ...entry, project: cloneProject(project), archived: false }
          : entry,
      )
    : [
        { project: cloneProject(project), archived: false, lastOpenedAt: now },
        ...loaded.workspace.projects,
      ].slice(0, MAX_WORKSPACE_PROJECTS)

  return saveProjectWorkspace(storage, {
    ...loaded.workspace,
    activeProjectId: project.id,
    projects,
  })
}

export function activateWorkspaceProject(
  storage: KeyValueStorage,
  currentProject: EstimationProject,
  projectId: string,
  dependencies: EntityFactoryDependencies = defaultEntityFactoryDependencies,
): WorkspaceResult<EstimationProject> {
  const synchronized = synchronizeWorkspaceProject(
    storage,
    currentProject,
    dependencies,
  )
  if (synchronized.status !== 'success') return synchronized

  const target = synchronized.workspace.projects.find(
    ({ project }) => project.id === projectId,
  )
  if (!target) {
    return { status: 'invalid', error: 'The selected project no longer exists.' }
  }
  if (target.archived) {
    return {
      status: 'invalid',
      error: 'Restore the archived project before opening it.',
    }
  }

  const workspace: ProjectWorkspace = {
    ...synchronized.workspace,
    activeProjectId: projectId,
    projects: synchronized.workspace.projects.map((entry) =>
      entry.project.id === projectId
        ? { ...entry, lastOpenedAt: dependencies.now() }
        : entry,
    ),
  }
  const saved = saveProjectWorkspace(storage, workspace)
  return saved.status === 'success'
    ? {
        status: 'success',
        value: cloneProject(target.project),
        workspace: saved.workspace,
      }
    : saved
}

function cloneWithFreshIds(
  source: EstimationProject,
  name: string,
  dependencies: EntityFactoryDependencies,
): EstimationProject {
  const now = dependencies.now()
  const activities = (entries: EstimationProject['qaActivities']) =>
    entries.map((entry) => ({ ...entry, id: dependencies.createId() }))

  return {
    ...cloneProject(source),
    id: dependencies.createId(),
    name,
    developmentItems: source.developmentItems.map((item) => ({
      ...item,
      id: dependencies.createId(),
      directEstimation: activities(item.directEstimation),
      subItems: item.subItems.map((subItem) => ({
        ...subItem,
        id: dependencies.createId(),
        estimation: activities(subItem.estimation),
      })),
    })),
    qaActivities: activities(source.qaActivities),
    createdAt: now,
    updatedAt: now,
  }
}

export function duplicateWorkspaceProject(
  storage: KeyValueStorage,
  projectId: string,
  dependencies: EntityFactoryDependencies = defaultEntityFactoryDependencies,
): WorkspaceResult<WorkspaceProject> {
  const loaded = loadProjectWorkspace(storage)
  if (loaded.status !== 'loaded') {
    return loaded.status === 'empty'
      ? { status: 'invalid', error: 'No saved projects are available.' }
      : loaded
  }
  if (loaded.workspace.projects.length >= MAX_WORKSPACE_PROJECTS) {
    return {
      status: 'invalid',
      error: `A maximum of ${MAX_WORKSPACE_PROJECTS} projects can be saved.`,
    }
  }
  const source = loaded.workspace.projects.find(
    ({ project }) => project.id === projectId,
  )
  if (!source) {
    return { status: 'invalid', error: 'The selected project no longer exists.' }
  }

  const copy: WorkspaceProject = {
    project: cloneWithFreshIds(
      source.project,
      `${source.project.name} (Copy)`,
      dependencies,
    ),
    archived: false,
    lastOpenedAt: dependencies.now(),
  }
  const workspace = {
    ...loaded.workspace,
    projects: [copy, ...loaded.workspace.projects],
  }
  const saved = saveProjectWorkspace(storage, workspace)
  return saved.status === 'success'
    ? { status: 'success', value: copy, workspace: saved.workspace }
    : saved
}

export function renameWorkspaceProject(
  storage: KeyValueStorage,
  projectId: string,
  name: string,
  dependencies: EntityFactoryDependencies = defaultEntityFactoryDependencies,
): WorkspaceResult<WorkspaceProject> {
  const trimmed = name.trim()
  if (!trimmed) {
    return { status: 'invalid', error: 'Project name is required.' }
  }
  const loaded = loadProjectWorkspace(storage)
  if (loaded.status !== 'loaded') {
    return loaded.status === 'empty'
      ? { status: 'invalid', error: 'No saved projects are available.' }
      : loaded
  }
  const existing = loaded.workspace.projects.find(
    ({ project }) => project.id === projectId,
  )
  if (!existing) {
    return { status: 'invalid', error: 'The selected project no longer exists.' }
  }

  const updated: WorkspaceProject = {
    ...existing,
    project: {
      ...existing.project,
      name: trimmed,
      updatedAt: dependencies.now(),
    },
  }
  const workspace = {
    ...loaded.workspace,
    projects: loaded.workspace.projects.map((entry) =>
      entry.project.id === projectId ? updated : entry,
    ),
  }
  const saved = saveProjectWorkspace(storage, workspace)
  return saved.status === 'success'
    ? { status: 'success', value: updated, workspace: saved.workspace }
    : saved
}

export function setWorkspaceProjectArchived(
  storage: KeyValueStorage,
  projectId: string,
  archived: boolean,
): WorkspaceResult<WorkspaceProject> {
  const loaded = loadProjectWorkspace(storage)
  if (loaded.status !== 'loaded') {
    return loaded.status === 'empty'
      ? { status: 'invalid', error: 'No saved projects are available.' }
      : loaded
  }
  if (archived && loaded.workspace.activeProjectId === projectId) {
    return {
      status: 'invalid',
      error: 'Open another project before archiving the active project.',
    }
  }
  const existing = loaded.workspace.projects.find(
    ({ project }) => project.id === projectId,
  )
  if (!existing) {
    return { status: 'invalid', error: 'The selected project no longer exists.' }
  }

  const updated = { ...existing, archived }
  const workspace = {
    ...loaded.workspace,
    projects: loaded.workspace.projects.map((entry) =>
      entry.project.id === projectId ? updated : entry,
    ),
  }
  const saved = saveProjectWorkspace(storage, workspace)
  return saved.status === 'success'
    ? { status: 'success', value: updated, workspace: saved.workspace }
    : saved
}

export function deleteWorkspaceProject(
  storage: KeyValueStorage,
  projectId: string,
): WorkspaceResult<string> {
  const loaded = loadProjectWorkspace(storage)
  if (loaded.status !== 'loaded') {
    return loaded.status === 'empty'
      ? { status: 'invalid', error: 'No saved projects are available.' }
      : loaded
  }
  if (loaded.workspace.activeProjectId === projectId) {
    return { status: 'invalid', error: 'The active project cannot be deleted.' }
  }

  const projects = loaded.workspace.projects.filter(
    ({ project }) => project.id !== projectId,
  )
  if (projects.length === loaded.workspace.projects.length) {
    return { status: 'invalid', error: 'The selected project no longer exists.' }
  }
  const workspace = { ...loaded.workspace, projects }
  const saved = saveProjectWorkspace(storage, workspace)
  return saved.status === 'success'
    ? { status: 'success', value: projectId, workspace: saved.workspace }
    : saved
}
