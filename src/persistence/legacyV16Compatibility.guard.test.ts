import { describe, expect, it } from 'vitest'
import type { EntityFactoryDependencies } from '../domain/factories'
import { createProjectRuntime } from '../app/projectRuntime'
import {
  LEGACY_V16_STORAGE_KEY,
  PROJECT_STORAGE_KEY,
  deserializeProject,
  loadLegacyV16Project,
  type KeyValueStorage,
} from './projectPersistence'
import {
  legacyV16EditableExportSchema,
  legacyV16StorageSnapshotSchema,
} from './projectSchemas'

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
    createId: () => `compat-${++id}`,
    now: () => '2026-08-25T17:30:00.000Z',
  }
}

const legacySettings = {
  projectName: 'Stage C Compatibility Guard',
  buffer: '12.5',
  hoursPerDay: '8',
  teamSize: '1.5',
  daysPerWeek: '5',
}

const legacyItems = [
  {
    name: 'Billing',
    directEstimation: [{ name: 'API work', hours: '7.5' }],
    subItems: [
      {
        name: 'Import',
        estimation: [{ name: 'Validation', hours: '2.5' }],
      },
    ],
  },
]

const editableFixture = {
  fileType: 'DevelopmentEstimationCalculator' as const,
  version: 1 as const,
  exportedAt: '2026-08-24T08:00:00.000Z',
  settings: legacySettings,
  development: { items: legacyItems },
  qa: { estimation: [{ name: 'Regression', hours: '4' }] },
}

const storageFixture = {
  ...legacySettings,
  savedAt: '2026-08-25T08:00:00.000Z',
  items: legacyItems,
  qaEstimation: [{ name: 'Regression', hours: '4' }],
}

describe('Stage C v16 compatibility contract', () => {
  it('keeps the named v16 schemas and legacy browser-storage key available', () => {
    expect(LEGACY_V16_STORAGE_KEY).toBe('developmentEstimationV4')
    expect(legacyV16EditableExportSchema.safeParse(editableFixture).success).toBe(true)
    expect(legacyV16StorageSnapshotSchema.safeParse(storageFixture).success).toBe(true)
  })

  it('keeps both v16 formats readable through the project deserializer', () => {
    const editableResult = deserializeProject(
      JSON.stringify(editableFixture),
      deterministicDependencies(),
    )
    const storageResult = deserializeProject(
      JSON.stringify(storageFixture),
      deterministicDependencies(),
    )

    expect(editableResult).toMatchObject({
      status: 'success',
      source: 'v16-editable',
      migrated: true,
      project: {
        name: 'Stage C Compatibility Guard',
        schedule: { totalManpower: 1.5 },
      },
    })
    expect(storageResult).toMatchObject({
      status: 'success',
      source: 'v16-storage',
      migrated: true,
      project: {
        name: 'Stage C Compatibility Guard',
        schedule: { riskBufferPercentage: 12.5 },
      },
    })
  })

  it('keeps the dedicated legacy reader and non-destructive runtime migration path', () => {
    const storage = new MemoryStorage()
    const rawLegacy = JSON.stringify(storageFixture)
    storage.setItem(LEGACY_V16_STORAGE_KEY, rawLegacy)

    const loadedLegacy = loadLegacyV16Project(
      storage,
      deterministicDependencies(),
    )
    expect(loadedLegacy).toMatchObject({
      status: 'loaded',
      source: 'v16-storage',
      migrated: true,
    })

    const runtime = createProjectRuntime(storage, deterministicDependencies())
    expect(runtime).toMatchObject({ source: 'v16-storage', migrated: true })
    expect(runtime.store.getState().project.name).toBe('Stage C Compatibility Guard')
    expect(storage.getItem(PROJECT_STORAGE_KEY)).not.toBeNull()
    expect(storage.getItem(LEGACY_V16_STORAGE_KEY)).toBe(rawLegacy)
  })
})
