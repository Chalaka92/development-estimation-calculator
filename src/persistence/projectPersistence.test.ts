import { describe, expect, it } from 'vitest'
import {
  createEmptyEstimationProject,
  type EntityFactoryDependencies,
} from '../domain/factories'
import {
  LEGACY_V16_STORAGE_KEY,
  PROJECT_STORAGE_KEY,
  deserializeProject,
  loadLegacyV16Project,
  loadProject,
  saveProject,
  serializeProject,
  type KeyValueStorage,
} from './projectPersistence'

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>()
  failGet = false
  failSet = false
  failRemove = false

  getItem(key: string) {
    if (this.failGet) throw new Error('get failed')
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    if (this.failSet) throw new Error('set failed')
    this.values.set(key, value)
  }

  removeItem(key: string) {
    if (this.failRemove) throw new Error('remove failed')
    this.values.delete(key)
  }
}

function deterministicDependencies(): EntityFactoryDependencies {
  let id = 0
  return {
    createId: () => `migrated-${++id}`,
    now: () => '2026-08-24T12:00:00.000Z',
  }
}

function legacySettings() {
  return {
    projectName: 'Legacy Release',
    buffer: '20',
    hoursPerDay: '6',
    teamSize: '1.5',
    daysPerWeek: '4',
  }
}

function legacyItems() {
  return [
    {
      name: 'Billing',
      expanded: true,
      directEstimation: [{ name: 'Direct work', hours: '10' }],
      subItems: [
        {
          name: 'Import',
          expanded: false,
          estimation: [{ name: 'Import API', hours: '8.5' }],
        },
      ],
    },
  ]
}

describe('project persistence', () => {
  it('round-trips a current typed project', () => {
    const dependencies = deterministicDependencies()
    const project = createEmptyEstimationProject('Typed Project', dependencies)
    const serialized = serializeProject(project)

    expect(serialized.status).toBe('success')
    if (serialized.status !== 'success') return

    const result = deserializeProject(serialized.serialized, dependencies)
    expect(result).toEqual({
      status: 'success',
      project,
      source: 'current',
      migrated: false,
      lastModifiedAt: project.updatedAt,
    })
  })

  it('migrates a v16 editable export into the typed model', () => {
    const result = deserializeProject(
      JSON.stringify({
        fileType: 'DevelopmentEstimationCalculator',
        version: 1,
        exportedAt: '2026-08-20T10:00:00.000Z',
        settings: legacySettings(),
        development: { items: legacyItems() },
        qa: { estimation: [{ name: 'Regression', hours: '6' }] },
      }),
      deterministicDependencies(),
    )

    expect(result.status).toBe('success')
    if (result.status !== 'success') return

    expect(result).toMatchObject({ source: 'v16-editable', migrated: true })
    expect(result.project).toMatchObject({
      schemaVersion: 1,
      name: 'Legacy Release',
      schedule: {
        riskBufferPercentage: 20,
        workingHoursPerPersonDay: 6,
        totalManpower: 1.5,
        businessDaysPerWeek: 4,
      },
      developmentItems: [
        {
          name: 'Billing',
          directEstimation: [{ name: 'Direct work', hours: 10 }],
          subItems: [
            {
              name: 'Import',
              estimation: [{ name: 'Import API', hours: 8.5 }],
            },
          ],
        },
      ],
      qaActivities: [{ name: 'Regression', hours: 6 }],
    })
  })

  it('loads a v16 browser snapshot without changing its legacy key', () => {
    const storage = new MemoryStorage()
    const legacy = JSON.stringify({
      ...legacySettings(),
      savedAt: '2026-08-24T11:30:00.000Z',
      items: legacyItems(),
      qaEstimation: [{ name: 'QA', hours: 4 }],
    })
    storage.setItem(LEGACY_V16_STORAGE_KEY, legacy)

    const result = loadLegacyV16Project(storage, deterministicDependencies())

    expect(result.status).toBe('loaded')
    expect(result).toMatchObject({ source: 'v16-storage', migrated: true })
    expect(result).toMatchObject({
      lastModifiedAt: '2026-08-24T11:30:00.000Z',
      project: { updatedAt: '2026-08-24T11:30:00.000Z' },
    })
    expect(storage.getItem(LEGACY_V16_STORAGE_KEY)).toBe(legacy)
    expect(storage.getItem(PROJECT_STORAGE_KEY)).toBeNull()
  })

  it('saves and loads the typed project without touching v16 storage', () => {
    const storage = new MemoryStorage()
    const dependencies = deterministicDependencies()
    const project = createEmptyEstimationProject('Current', dependencies)
    storage.setItem(LEGACY_V16_STORAGE_KEY, 'legacy-data')

    expect(saveProject(storage, project)).toEqual({ status: 'saved' })
    expect(loadProject(storage, dependencies)).toMatchObject({
      status: 'loaded',
      project,
      source: 'current',
      migrated: false,
    })
    expect(storage.getItem(LEGACY_V16_STORAGE_KEY)).toBe('legacy-data')
  })

  it('rejects an invalid typed project before writing', () => {
    const storage = new MemoryStorage()
    const project = createEmptyEstimationProject(
      'Invalid',
      deterministicDependencies(),
    )
    const invalidProject = {
      ...project,
      schedule: { ...project.schedule, totalManpower: Number.NaN },
    }

    expect(saveProject(storage, invalidProject).status).toBe('invalid')
    expect(storage.getItem(PROJECT_STORAGE_KEY)).toBeNull()
  })

  it('quarantines corrupted typed storage and makes the raw value recoverable', () => {
    const storage = new MemoryStorage()
    storage.setItem(PROJECT_STORAGE_KEY, '{not-json')

    const result = loadProject(storage, deterministicDependencies())

    expect(result.status).toBe('corrupt')
    if (result.status !== 'corrupt') return
    expect(result.recoveryKey).not.toBeNull()
    expect(result.originalPreserved).toBe(false)
    expect(storage.getItem(PROJECT_STORAGE_KEY)).toBeNull()
    expect(storage.getItem(result.recoveryKey!)).toBe('{not-json')
  })

  it('preserves the original corrupted value when quarantine cannot be written', () => {
    const storage = new MemoryStorage()
    storage.values.set(PROJECT_STORAGE_KEY, 'broken')
    storage.failSet = true

    const result = loadProject(storage, deterministicDependencies())

    expect(result).toMatchObject({
      status: 'corrupt',
      recoveryKey: null,
      originalPreserved: true,
    })
    expect(storage.values.get(PROJECT_STORAGE_KEY)).toBe('broken')
  })

  it('reports storage access failures without throwing', () => {
    const storage = new MemoryStorage()
    storage.failGet = true
    expect(loadProject(storage)).toEqual({
      status: 'storage-error',
      error: 'get failed',
    })

    storage.failGet = false
    storage.failSet = true
    const project = createEmptyEstimationProject(
      'Current',
      deterministicDependencies(),
    )
    expect(saveProject(storage, project)).toEqual({
      status: 'storage-error',
      error: 'set failed',
    })
  })
})
