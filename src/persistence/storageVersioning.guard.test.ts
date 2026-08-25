import { describe, expect, it } from 'vitest'
import {
  createEmptyEstimationProject,
  type EntityFactoryDependencies,
} from '../domain/factories'
import {
  PROJECT_ARCHIVE_STORAGE_KEY,
  createEmptyProjectArchive,
} from './projectArchive'
import {
  PROJECT_STORAGE_KEY,
  type KeyValueStorage,
} from './projectPersistence'
import {
  PROJECT_WORKSPACE_STORAGE_KEY,
  synchronizeWorkspaceProject,
} from './projectWorkspace'

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

function deterministicDependencies(): EntityFactoryDependencies {
  let id = 0
  return {
    createId: () => `storage-contract-${++id}`,
    now: () => '2026-08-25T18:00:00.000Z',
  }
}

describe('browser storage versioning contract', () => {
  it('pins the current versioned storage keys', () => {
    expect(PROJECT_STORAGE_KEY).toBe('developmentEstimation.project.v1')
    expect(PROJECT_ARCHIVE_STORAGE_KEY).toBe('developmentEstimation.archive.v1')
    expect(PROJECT_WORKSPACE_STORAGE_KEY).toBe('developmentEstimation.workspace.v1')
  })

  it('pins the current project and archive schema versions', () => {
    const project = createEmptyEstimationProject(
      'Storage contract',
      deterministicDependencies(),
    )

    expect(project.schemaVersion).toBe(1)
    expect(createEmptyProjectArchive().schemaVersion).toBe(1)
  })

  it('pins the current workspace container and embedded project version', () => {
    const storage = new MemoryStorage()
    const dependencies = deterministicDependencies()
    const project = createEmptyEstimationProject('Workspace contract', dependencies)

    const result = synchronizeWorkspaceProject(storage, project, dependencies)
    expect(result.status).toBe('success')

    const serialized = storage.getItem(PROJECT_WORKSPACE_STORAGE_KEY)
    expect(serialized).not.toBeNull()

    const saved = JSON.parse(serialized!) as {
      schemaVersion: number
      activeProjectId: string
      projects: Array<{ project: { schemaVersion: number } }>
    }

    expect(saved.schemaVersion).toBe(1)
    expect(saved.activeProjectId).toBe(project.id)
    expect(saved.projects).toHaveLength(1)
    expect(saved.projects[0]?.project.schemaVersion).toBe(1)
  })
})
