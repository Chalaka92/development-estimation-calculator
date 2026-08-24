import {
  createEmptyEstimationProject,
  defaultEntityFactoryDependencies,
  type EntityFactoryDependencies,
} from '../domain/factories'
import {
  loadLegacyV16Project,
  loadProject,
  saveProject,
  type KeyValueStorage,
  type LoadProjectResult,
  type ProjectSource,
  type SaveProjectResult,
} from '../persistence/projectPersistence'
import {
  createProjectStore,
  type ProjectStore,
} from '../state/projectStore'

export type ProjectRuntimeWarningCode =
  | 'typed-storage-corrupt'
  | 'typed-storage-error'
  | 'legacy-storage-corrupt'
  | 'legacy-storage-error'
  | 'migration-save-failed'

export interface ProjectRuntimeWarning {
  code: ProjectRuntimeWarningCode
  message: string
}

export interface ProjectRuntime {
  store: ProjectStore
  source: ProjectSource | 'empty'
  migrated: boolean
  warnings: ReadonlyArray<ProjectRuntimeWarning>
}

function loadWarning(
  result: LoadProjectResult,
  storageType: 'typed' | 'legacy',
): ProjectRuntimeWarning | null {
  if (result.status === 'corrupt') {
    return {
      code: `${storageType}-storage-corrupt`,
      message: result.error,
    }
  }

  if (result.status === 'storage-error') {
    return {
      code: `${storageType}-storage-error`,
      message: result.error,
    }
  }

  return null
}

function migrationSaveWarning(
  result: SaveProjectResult,
): ProjectRuntimeWarning | null {
  if (result.status === 'saved') return null
  return { code: 'migration-save-failed', message: result.error }
}

export function createProjectRuntime(
  storage: KeyValueStorage,
  dependencies: EntityFactoryDependencies = defaultEntityFactoryDependencies,
): ProjectRuntime {
  const warnings: ProjectRuntimeWarning[] = []
  const typedResult = loadProject(storage, dependencies)

  if (typedResult.status === 'loaded') {
    if (typedResult.migrated) {
      const warning = migrationSaveWarning(
        saveProject(storage, typedResult.project),
      )
      if (warning) warnings.push(warning)
    }

    return {
      store: createProjectStore(typedResult.project, dependencies),
      source: typedResult.source,
      migrated: typedResult.migrated,
      warnings,
    }
  }

  const warning = loadWarning(typedResult, 'typed')
  if (warning) warnings.push(warning)

  const legacyResult = loadLegacyV16Project(storage, dependencies)
  if (legacyResult.status === 'loaded') {
    const saveWarning = migrationSaveWarning(
      saveProject(storage, legacyResult.project),
    )
    if (saveWarning) warnings.push(saveWarning)

    return {
      store: createProjectStore(legacyResult.project, dependencies),
      source: legacyResult.source,
      migrated: true,
      warnings,
    }
  }

  const legacyWarning = loadWarning(legacyResult, 'legacy')
  if (legacyWarning) warnings.push(legacyWarning)

  return {
    store: createProjectStore(
      createEmptyEstimationProject('Untitled Estimate', dependencies),
      dependencies,
    ),
    source: 'empty',
    migrated: false,
    warnings,
  }
}

export type AutosaveScheduler = (
  callback: () => void,
  delayMilliseconds: number,
) => () => void

export interface ProjectAutosaveOptions {
  delayMilliseconds?: number
  scheduler?: AutosaveScheduler
  onResult?: (result: SaveProjectResult) => void
}

export interface ProjectAutosaveController {
  flush: () => SaveProjectResult | { status: 'skipped' }
  dispose: () => void
}

const defaultAutosaveScheduler: AutosaveScheduler = (callback, delay) => {
  const handle = globalThis.setTimeout(callback, delay)
  return () => globalThis.clearTimeout(handle)
}

export function startProjectAutosave(
  store: ProjectStore,
  storage: KeyValueStorage,
  options: ProjectAutosaveOptions = {},
): ProjectAutosaveController {
  const delayMilliseconds = options.delayMilliseconds ?? 500
  const scheduler = options.scheduler ?? defaultAutosaveScheduler
  let cancelPending: (() => void) | null = null
  let disposed = false

  const flush = (): SaveProjectResult | { status: 'skipped' } => {
    cancelPending?.()
    cancelPending = null

    const state = store.getState()
    if (!state.isDirty) return { status: 'skipped' }

    const project = state.project
    const result = saveProject(storage, project)
    options.onResult?.(result)

    if (
      result.status === 'saved' &&
      store.getState().project === project &&
      store.getState().isDirty
    ) {
      store.getState().actions.markSaved()
    }

    return result
  }

  const unsubscribe = store.subscribe((state, previousState) => {
    if (
      disposed ||
      !state.isDirty ||
      state.project === previousState.project
    ) {
      return
    }

    cancelPending?.()
    cancelPending = scheduler(() => {
      if (!disposed) flush()
    }, delayMilliseconds)
  })

  return {
    flush,
    dispose: () => {
      disposed = true
      cancelPending?.()
      cancelPending = null
      unsubscribe()
    },
  }
}
