import { describe, expect, it } from 'vitest'
import { createEmptyEstimationProject } from '../domain/factories'
import type { EntityFactoryDependencies } from '../domain/factories'
import type { KeyValueStorage } from './projectPersistence'
import {
  activateWorkspaceProject,
  deleteWorkspaceProject,
  duplicateWorkspaceProject,
  loadProjectWorkspace,
  setWorkspaceProjectArchived,
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

function dependencies(): EntityFactoryDependencies {
  let id = 0
  let minute = 0
  return {
    createId: () => \`workspace-\${++id}\`,
    now: () =>
      \`2026-08-25T10:\${String(minute++).padStart(2, '0')}:00.000Z\`,
  }
}

describe('project workspace persistence', () => {
  it('bootstraps from the existing project and keeps its latest content', () => {
    const storage = new MemoryStorage()
    const deps = dependencies()
    const project = createEmptyEstimationProject('Alpha', deps)

    expect(
      synchronizeWorkspaceProject(storage, project, deps).status,
    ).toBe('success')

    const renamed = { ...project, name: 'Alpha release' }
    expect(
      synchronizeWorkspaceProject(storage, renamed, deps).status,
    ).toBe('success')
    expect(loadProjectWorkspace(storage)).toMatchObject({
      status: 'loaded',
      workspace: {
        activeProjectId: project.id,
        projects: [
          { project: { name: 'Alpha release' }, archived: false },
        ],
      },
    })
  })

  it('switches projects without losing the current project', () => {
    const storage = new MemoryStorage()
    const deps = dependencies()
    const alpha = createEmptyEstimationProject('Alpha', deps)
    const beta = createEmptyEstimationProject('Beta', deps)
    synchronizeWorkspaceProject(storage, alpha, deps)
    synchronizeWorkspaceProject(storage, beta, deps)

    const result = activateWorkspaceProject(storage, beta, alpha.id, deps)
    expect(result).toMatchObject({
      status: 'success',
      value: { name: 'Alpha' },
    })
    expect(
      result.status === 'success'
        ? result.workspace.projects.map(({ project }) => project.name)
        : [],
    ).toEqual(['Beta', 'Alpha'])
  })

  it('duplicates every entity with fresh IDs', () => {
    const storage = new MemoryStorage()
    const deps = dependencies()
    const source = createEmptyEstimationProject('Source', deps)
    const project = {
      ...source,
      developmentItems: [
        {
          id: deps.createId(),
          name: 'Feature',
          directEstimation: [
            { id: deps.createId(), name: 'Build', hours: 3 },
          ],
          subItems: [],
        },
      ],
    }
    synchronizeWorkspaceProject(storage, project, deps)

    const result = duplicateWorkspaceProject(storage, project.id, deps)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return

    expect(result.value.project.name).toBe('Source (Copy)')
    expect(result.value.project.id).not.toBe(project.id)
    expect(result.value.project.developmentItems[0].id).not.toBe(
      project.developmentItems[0].id,
    )
    expect(
      result.value.project.developmentItems[0].directEstimation[0].id,
    ).not.toBe(project.developmentItems[0].directEstimation[0].id)
  })

  it('protects the active project and deletes only inactive projects', () => {
    const storage = new MemoryStorage()
    const deps = dependencies()
    const alpha = createEmptyEstimationProject('Alpha', deps)
    const beta = createEmptyEstimationProject('Beta', deps)
    synchronizeWorkspaceProject(storage, alpha, deps)
    synchronizeWorkspaceProject(storage, beta, deps)

    expect(
      setWorkspaceProjectArchived(storage, beta.id, true).status,
    ).toBe('invalid')
    expect(
      setWorkspaceProjectArchived(storage, alpha.id, true).status,
    ).toBe('success')
    expect(deleteWorkspaceProject(storage, beta.id).status).toBe('invalid')
    expect(deleteWorkspaceProject(storage, alpha.id).status).toBe('success')
  })
})
