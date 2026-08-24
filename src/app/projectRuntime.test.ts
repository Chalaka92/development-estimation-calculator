import { describe, expect, it } from 'vitest'
import {
  createEmptyEstimationProject,
  type EntityFactoryDependencies,
} from '../domain/factories'
import {
  LEGACY_V16_STORAGE_KEY,
  PROJECT_STORAGE_KEY,
  loadProject,
  saveProject,
  type KeyValueStorage,
} from '../persistence/projectPersistence'
import {
  createProjectRuntime,
  startProjectAutosave,
  type AutosaveScheduler,
} from './projectRuntime'

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>()
  failGetFor = new Set<string>()
  failSet = false

  getItem(key: string) {
    if (this.failGetFor.has(key)) throw new Error(`get failed for ${key}`)
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    if (this.failSet) throw new Error('set failed')
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

function deterministicDependencies(): EntityFactoryDependencies {
  let id = 0
  let time = 0
  return {
    createId: () => `runtime-${++id}`,
    now: () => `2026-08-24T18:00:${String(time++).padStart(2, '0')}.000Z`,
  }
}

function legacySnapshot() {
  return JSON.stringify({
    projectName: 'Migrated Runtime',
    buffer: '12',
    hoursPerDay: '8',
    teamSize: '1.5',
    daysPerWeek: '5',
    items: [],
    qaEstimation: [],
  })
}

function controlledScheduler() {
  const callbacks: Array<() => void> = []
  const cancelled = new Set<number>()
  const scheduler: AutosaveScheduler = (callback) => {
    const index = callbacks.push(callback) - 1
    return () => cancelled.add(index)
  }

  return {
    scheduler,
    runPending: () =>
      callbacks.forEach((callback, index) => {
        if (!cancelled.has(index)) callback()
      }),
    wasCancelled: (index: number) => cancelled.has(index),
  }
}

describe('project runtime', () => {
  it('uses a valid typed project before considering legacy storage', () => {
    const storage = new MemoryStorage()
    const dependencies = deterministicDependencies()
    const project = createEmptyEstimationProject('Typed Runtime', dependencies)
    saveProject(storage, project)
    storage.setItem(LEGACY_V16_STORAGE_KEY, legacySnapshot())

    const runtime = createProjectRuntime(storage, dependencies)

    expect(runtime).toMatchObject({
      source: 'current',
      migrated: false,
      warnings: [],
    })
    expect(runtime.store.getState().project).toEqual(project)
  })

  it('migrates legacy v16 storage and saves a typed copy', () => {
    const storage = new MemoryStorage()
    const dependencies = deterministicDependencies()
    const legacy = legacySnapshot()
    storage.setItem(LEGACY_V16_STORAGE_KEY, legacy)

    const runtime = createProjectRuntime(storage, dependencies)

    expect(runtime).toMatchObject({
      source: 'v16-storage',
      migrated: true,
      warnings: [],
    })
    expect(runtime.store.getState().project).toMatchObject({
      name: 'Migrated Runtime',
      schedule: { totalManpower: 1.5 },
    })
    expect(loadProject(storage, dependencies).status).toBe('loaded')
    expect(storage.getItem(LEGACY_V16_STORAGE_KEY)).toBe(legacy)
  })

  it('recovers from corrupt typed storage by falling back to v16', () => {
    const storage = new MemoryStorage()
    storage.setItem(PROJECT_STORAGE_KEY, '{broken')
    storage.setItem(LEGACY_V16_STORAGE_KEY, legacySnapshot())

    const runtime = createProjectRuntime(
      storage,
      deterministicDependencies(),
    )

    expect(runtime.source).toBe('v16-storage')
    expect(runtime.warnings).toEqual([
      expect.objectContaining({ code: 'typed-storage-corrupt' }),
    ])
    expect(runtime.store.getState().project.name).toBe('Migrated Runtime')
  })

  it('creates a clean empty project when no saved data exists', () => {
    const runtime = createProjectRuntime(
      new MemoryStorage(),
      deterministicDependencies(),
    )

    expect(runtime).toMatchObject({
      source: 'empty',
      migrated: false,
      warnings: [],
    })
    expect(runtime.store.getState()).toMatchObject({
      isDirty: false,
      revision: 0,
      project: { name: 'Untitled Estimate' },
    })
  })

  it('debounces project changes and marks a successful save', () => {
    const storage = new MemoryStorage()
    const runtime = createProjectRuntime(
      storage,
      deterministicDependencies(),
    )
    const timer = controlledScheduler()
    const results: string[] = []
    const autosave = startProjectAutosave(runtime.store, storage, {
      delayMilliseconds: 250,
      scheduler: timer.scheduler,
      onResult: (result) => results.push(result.status),
    })

    runtime.store.getState().actions.renameProject('First')
    runtime.store.getState().actions.renameProject('Final')

    expect(timer.wasCancelled(0)).toBe(true)
    timer.runPending()

    expect(results).toEqual(['saved'])
    expect(runtime.store.getState().isDirty).toBe(false)
    expect(loadProject(storage)).toMatchObject({
      status: 'loaded',
      project: { name: 'Final' },
    })
    autosave.dispose()
  })

  it('keeps changes dirty when autosave fails and can retry with flush', () => {
    const storage = new MemoryStorage()
    const runtime = createProjectRuntime(
      storage,
      deterministicDependencies(),
    )
    const timer = controlledScheduler()
    const autosave = startProjectAutosave(runtime.store, storage, {
      scheduler: timer.scheduler,
    })
    runtime.store.getState().actions.renameProject('Needs Save')
    storage.failSet = true

    timer.runPending()

    expect(runtime.store.getState().isDirty).toBe(true)
    storage.failSet = false
    expect(autosave.flush()).toEqual({ status: 'saved' })
    expect(runtime.store.getState().isDirty).toBe(false)
    autosave.dispose()
  })

  it('cancels pending writes when autosave is disposed', () => {
    const storage = new MemoryStorage()
    const runtime = createProjectRuntime(
      storage,
      deterministicDependencies(),
    )
    const timer = controlledScheduler()
    const autosave = startProjectAutosave(runtime.store, storage, {
      scheduler: timer.scheduler,
    })
    runtime.store.getState().actions.renameProject('Not Saved')

    autosave.dispose()
    timer.runPending()

    expect(storage.getItem(PROJECT_STORAGE_KEY)).toBeNull()
    expect(runtime.store.getState().isDirty).toBe(true)
  })
})
