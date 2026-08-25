import { describe, expect, it } from 'vitest'
import {
  createEmptyEstimationProject,
  type EntityFactoryDependencies,
} from '../domain/factories'
import type { KeyValueStorage } from './projectPersistence'
import {
  compareProjects,
  createProjectSnapshot,
  createProjectTemplate,
  deleteProjectSnapshot,
  instantiateProjectTemplate,
  loadProjectArchive,
  PROJECT_ARCHIVE_STORAGE_KEY,
} from './projectArchive'

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function dependencies(prefix: string): EntityFactoryDependencies {
  let id = 0
  let second = 0
  return {
    createId: () => `${prefix}-${++id}`,
    now: () => `2026-08-25T08:00:${String(second++).padStart(2, '0')}.000Z`,
  }
}

function estimatedProject(factory: EntityFactoryDependencies) {
  const project = createEmptyEstimationProject('Billing Release', factory)
  return {
    ...project,
    developmentItems: [{
      id: factory.createId(),
      name: 'Billing',
      directEstimation: [{
        id: factory.createId(),
        name: 'Build',
        hours: 12,
        threePointEstimate: {
          optimisticHours: 8,
          mostLikelyHours: 12,
          pessimisticHours: 16,
        },
      }],
      subItems: [],
    }],
    qaActivities: [{ id: factory.createId(), name: 'Regression', hours: 3 }],
  }
}

describe('project archive', () => {
  it('loads an empty versioned archive when none exists', () => {
    expect(loadProjectArchive(new MemoryStorage())).toEqual({
      status: 'loaded',
      archive: { schemaVersion: 1, snapshots: [], templates: [] },
    })
  })

  it('saves exact snapshots, compares them, and deletes them', () => {
    const storage = new MemoryStorage()
    const factory = dependencies('snapshot')
    const project = estimatedProject(factory)
    const saved = createProjectSnapshot(storage, project, 'Before change', 'manual', factory)
    expect(saved.status).toBe('success')
    if (saved.status !== 'success') return
    expect(saved.value.project).toEqual(project)

    const current = {
      ...project,
      developmentItems: [{
        ...project.developmentItems[0],
        directEstimation: [{
          ...project.developmentItems[0].directEstimation[0],
          hours: 20,
          threePointEstimate: {
            optimisticHours: 16,
            mostLikelyHours: 20,
            pessimisticHours: 24,
          },
        }],
      }],
    }
    expect(compareProjects(saved.value.project, current)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Development', difference: 8 }),
        expect.objectContaining({ label: 'Final estimate', difference: 9.2 }),
      ]),
    )

    expect(deleteProjectSnapshot(storage, saved.value.id)).toMatchObject({
      status: 'loaded',
      archive: { snapshots: [] },
    })
  })

  it('saves reusable templates with zero hours and creates fresh identities', () => {
    const storage = new MemoryStorage()
    const sourceFactory = dependencies('source')
    const project = estimatedProject(sourceFactory)
    const saved = createProjectTemplate(
      storage,
      project,
      'Standard Billing',
      sourceFactory,
    )
    expect(saved.status).toBe('success')
    if (saved.status !== 'success') return
    expect(saved.value.project.developmentItems[0].directEstimation[0].hours).toBe(0)
    expect(
      saved.value.project.developmentItems[0].directEstimation[0]
        .threePointEstimate,
    ).toEqual({ optimisticHours: 0, mostLikelyHours: 0, pessimisticHours: 0 })
    expect(saved.value.project.qaActivities[0].hours).toBe(0)

    const instance = instantiateProjectTemplate(saved.value, dependencies('new'))
    expect(instance.name).toBe('Standard Billing')
    expect(instance.id).not.toBe(project.id)
    expect(instance.developmentItems[0].id).not.toBe(
      project.developmentItems[0].id,
    )
    expect(instance.developmentItems[0].directEstimation[0].hours).toBe(0)
  })

  it('rejects corrupt history without overwriting it', () => {
    const storage = new MemoryStorage()
    storage.setItem(PROJECT_ARCHIVE_STORAGE_KEY, '{broken')
    expect(loadProjectArchive(storage)).toMatchObject({ status: 'invalid' })
    expect(createProjectSnapshot(
      storage,
      createEmptyEstimationProject(),
      'Blocked',
    )).toMatchObject({ status: 'invalid' })
    expect(storage.getItem(PROJECT_ARCHIVE_STORAGE_KEY)).toBe('{broken')
  })
})
