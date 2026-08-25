import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  createDefaultQaActivities,
  createDefaultSchedule,
  createEmptyEstimationProject,
  createStandardEstimationActivities,
  defaultEntityFactoryDependencies,
  type EntityFactoryDependencies,
} from '../domain/factories'
import type {
  DevelopmentSubItem,
  DevelopmentWorkItem,
  EntityId,
  EstimationActivity,
  EstimationProject,
  EstimationSchedule,
  IsoDateTimeString,
  QaActivity,
} from '../domain/estimation'

export interface EstimationOwner {
  workItemId: EntityId
  subItemId?: EntityId
}

export type EstimationActivityChanges = Partial<
  Pick<
    EstimationActivity,
    | 'name'
    | 'hours'
    | 'threePointEstimate'
    | 'role'
    | 'riskLevel'
    | 'confidencePercentage'
    | 'notes'
  >
>

export type QaActivityChanges = Partial<
  Pick<
    QaActivity,
    | 'name'
    | 'hours'
    | 'threePointEstimate'
    | 'role'
    | 'riskLevel'
    | 'confidencePercentage'
    | 'notes'
  >
>
export type ScheduleChanges = Partial<EstimationSchedule>

export interface ProjectActions {
  replaceProject: (project: EstimationProject) => boolean
  resetProject: () => boolean
  resetProjectSettings: () => boolean
  resetDevelopmentWork: () => boolean
  resetQaEstimation: () => boolean
  renameProject: (name: string) => boolean
  updateSchedule: (changes: ScheduleChanges) => boolean
  addDevelopmentItem: (name?: string) => EntityId
  updateDevelopmentItem: (itemId: EntityId, name: string) => boolean
  updateDevelopmentDependencies: (
    itemId: EntityId,
    dependencyIds: ReadonlyArray<EntityId>,
  ) => boolean
  duplicateDevelopmentItem: (itemId: EntityId) => EntityId | null
  deleteDevelopmentItem: (itemId: EntityId) => boolean
  addSubItem: (workItemId: EntityId, name?: string) => EntityId | null
  updateSubItem: (
    workItemId: EntityId,
    subItemId: EntityId,
    name: string,
  ) => boolean
  updateSubItemDependencies: (
    workItemId: EntityId,
    subItemId: EntityId,
    dependencyIds: ReadonlyArray<EntityId>,
  ) => boolean
  duplicateSubItem: (
    workItemId: EntityId,
    subItemId: EntityId,
  ) => EntityId | null
  deleteSubItem: (workItemId: EntityId, subItemId: EntityId) => boolean
  addEstimationActivity: (
    owner: EstimationOwner,
    name?: string,
    hours?: number,
  ) => EntityId | null
  updateEstimationActivity: (
    owner: EstimationOwner,
    activityId: EntityId,
    changes: EstimationActivityChanges,
  ) => boolean
  duplicateEstimationActivity: (
    owner: EstimationOwner,
    activityId: EntityId,
  ) => EntityId | null
  deleteEstimationActivity: (
    owner: EstimationOwner,
    activityId: EntityId,
  ) => boolean
  addQaActivity: (name?: string, hours?: number) => EntityId
  updateQaActivity: (
    activityId: EntityId,
    changes: QaActivityChanges,
  ) => boolean
  duplicateQaActivity: (activityId: EntityId) => EntityId | null
  deleteQaActivity: (activityId: EntityId) => boolean
  markSaved: () => void
}

export interface ProjectStoreState {
  project: EstimationProject
  revision: number
  isDirty: boolean
  lastSavedAt: IsoDateTimeString | null
  actions: ProjectActions
}

export type ProjectStore = StoreApi<ProjectStoreState>

function copyName(name: string): string {
  return `${name} (Copy)`
}

function findWorkItem(
  project: EstimationProject,
  itemId: EntityId,
): DevelopmentWorkItem | undefined {
  return project.developmentItems.find((item) => item.id === itemId)
}

function findSubItem(
  item: DevelopmentWorkItem,
  subItemId: EntityId,
): DevelopmentSubItem | undefined {
  return item.subItems.find((subItem) => subItem.id === subItemId)
}

function getOwnerEstimation(
  project: EstimationProject,
  owner: EstimationOwner,
): ReadonlyArray<EstimationActivity> | null {
  const item = findWorkItem(project, owner.workItemId)
  if (!item) return null

  if (owner.subItemId === undefined) return item.directEstimation

  return findSubItem(item, owner.subItemId)?.estimation ?? null
}

function updateWorkItem(
  project: EstimationProject,
  itemId: EntityId,
  update: (item: DevelopmentWorkItem) => DevelopmentWorkItem,
): EstimationProject {
  let changed = false
  const developmentItems = project.developmentItems.map((item) => {
    if (item.id !== itemId) return item
    const updatedItem = update(item)
    changed = updatedItem !== item
    return updatedItem
  })

  return changed ? { ...project, developmentItems } : project
}

function updateOwnerEstimation(
  project: EstimationProject,
  owner: EstimationOwner,
  update: (
    estimation: ReadonlyArray<EstimationActivity>,
  ) => ReadonlyArray<EstimationActivity>,
): EstimationProject {
  return updateWorkItem(project, owner.workItemId, (item) => {
    if (owner.subItemId === undefined) {
      const directEstimation = update(item.directEstimation)
      return directEstimation === item.directEstimation
        ? item
        : { ...item, directEstimation }
    }

    let changed = false
    const subItems = item.subItems.map((subItem) => {
      if (subItem.id !== owner.subItemId) return subItem
      const estimation = update(subItem.estimation)
      if (estimation === subItem.estimation) return subItem
      changed = true
      return { ...subItem, estimation }
    })

    return changed ? { ...item, subItems } : item
  })
}

function allWorkUnitIds(project: EstimationProject): Set<EntityId> {
  return new Set(
    project.developmentItems.flatMap((item) => [
      item.id,
      ...item.subItems.map((subItem) => subItem.id),
    ]),
  )
}

function normalizeDependencyIds(
  project: EstimationProject,
  ownerId: EntityId,
  dependencyIds: ReadonlyArray<EntityId>,
): ReadonlyArray<EntityId> {
  const available = allWorkUnitIds(project)
  return [...new Set(dependencyIds)].filter(
    (dependencyId) =>
      dependencyId !== ownerId &&
      available.has(dependencyId) &&
      !wouldCreateDependencyCycle(project, ownerId, dependencyId),
  )
}

function dependencyIdsFor(
  project: EstimationProject,
  workUnitId: EntityId,
): ReadonlyArray<EntityId> {
  for (const item of project.developmentItems) {
    if (item.id === workUnitId) return item.dependencyIds ?? []
    const subItem = item.subItems.find((current) => current.id === workUnitId)
    if (subItem) return subItem.dependencyIds ?? []
  }
  return []
}

function wouldCreateDependencyCycle(
  project: EstimationProject,
  ownerId: EntityId,
  targetId: EntityId,
): boolean {
  const pending = [targetId]
  const visited = new Set<EntityId>()
  while (pending.length > 0) {
    const current = pending.pop()!
    if (current === ownerId) return true
    if (visited.has(current)) continue
    visited.add(current)
    pending.push(...dependencyIdsFor(project, current))
  }
  return false
}

function sameIds(
  first: ReadonlyArray<EntityId> | undefined,
  second: ReadonlyArray<EntityId>,
): boolean {
  return (first ?? []).length === second.length &&
    (first ?? []).every((id, index) => id === second[index])
}

function removeDanglingDependencies(
  items: ReadonlyArray<DevelopmentWorkItem>,
  removedIds: ReadonlySet<EntityId>,
): ReadonlyArray<DevelopmentWorkItem> {
  return items.map((item) => ({
    ...item,
    dependencyIds: (item.dependencyIds ?? []).filter(
      (id) => !removedIds.has(id),
    ),
    subItems: item.subItems.map((subItem) => ({
      ...subItem,
      dependencyIds: (subItem.dependencyIds ?? []).filter(
        (id) => !removedIds.has(id),
      ),
    })),
  }))
}

export function createProjectStore(
  initialProject: EstimationProject,
  dependencies: EntityFactoryDependencies = defaultEntityFactoryDependencies,
): ProjectStore {
  return createStore<ProjectStoreState>()((set, get) => {
    const commitProject = (
      update: (project: EstimationProject) => EstimationProject,
    ): boolean => {
      const currentProject = get().project
      const project = update(currentProject)
      if (project === currentProject) return false

      set((state) => ({
        project: { ...project, updatedAt: dependencies.now() },
        revision: state.revision + 1,
        isDirty: true,
      }))
      return true
    }

    const cloneActivity = (activity: EstimationActivity): EstimationActivity => ({
      ...activity,
      id: dependencies.createId(),
    })

    const actions: ProjectActions = {
      replaceProject: (project) => {
        if (project === get().project) return false
        set((state) => ({
          project: { ...project, updatedAt: dependencies.now() },
          revision: state.revision + 1,
          isDirty: true,
          lastSavedAt: null,
        }))
        return true
      },

      resetProject: () =>
        actions.replaceProject(
          createEmptyEstimationProject('Untitled Estimate', dependencies),
        ),

      resetProjectSettings: () =>
        commitProject((project) => {
          const schedule = createDefaultSchedule()
          const scheduleIsDefault = Object.keys(schedule).every(
            (key) =>
              project.schedule[key as keyof EstimationSchedule] ===
              schedule[key as keyof EstimationSchedule],
          )
          return project.name === 'Untitled Estimate' && scheduleIsDefault
            ? project
            : { ...project, name: 'Untitled Estimate', schedule }
        }),

      resetDevelopmentWork: () =>
        commitProject((project) =>
          project.developmentItems.length === 0
            ? project
            : { ...project, developmentItems: [] },
        ),

      resetQaEstimation: () =>
        commitProject((project) => ({
          ...project,
          qaActivities: createDefaultQaActivities(dependencies),
        })),

      renameProject: (name) =>
        commitProject((project) =>
          project.name === name ? project : { ...project, name },
        ),

      updateSchedule: (changes) =>
        commitProject((project) => {
          const schedule = { ...project.schedule, ...changes }
          const changed = Object.keys(changes).some(
            (key) =>
              project.schedule[key as keyof EstimationSchedule] !==
              schedule[key as keyof EstimationSchedule],
          )
          return changed ? { ...project, schedule } : project
        }),

      addDevelopmentItem: (name = 'New Main Item') => {
        const id = dependencies.createId()
        const item: DevelopmentWorkItem = {
          id,
          name,
          directEstimation: createStandardEstimationActivities(dependencies),
          subItems: [],
        }
        commitProject((project) => ({
          ...project,
          developmentItems: [...project.developmentItems, item],
        }))
        return id
      },

      updateDevelopmentItem: (itemId, name) =>
        commitProject((project) =>
          updateWorkItem(project, itemId, (item) =>
            item.name === name ? item : { ...item, name },
          ),
        ),

      updateDevelopmentDependencies: (itemId, dependencyIds) =>
        commitProject((project) => {
          const normalized = normalizeDependencyIds(
            project,
            itemId,
            dependencyIds,
          )
          return updateWorkItem(project, itemId, (item) =>
            sameIds(item.dependencyIds, normalized)
              ? item
              : { ...item, dependencyIds: normalized },
          )
        }),

      duplicateDevelopmentItem: (itemId) => {
        const source = findWorkItem(get().project, itemId)
        if (!source) return null

        const duplicate: DevelopmentWorkItem = {
          ...source,
          id: dependencies.createId(),
          name: copyName(source.name),
          dependencyIds: [],
          directEstimation: source.directEstimation.map(cloneActivity),
          subItems: source.subItems.map((subItem) => ({
            ...subItem,
            id: dependencies.createId(),
            dependencyIds: [],
            estimation: subItem.estimation.map(cloneActivity),
          })),
        }

        commitProject((project) => {
          const sourceIndex = project.developmentItems.findIndex(
            (item) => item.id === itemId,
          )
          if (sourceIndex < 0) return project
          const developmentItems = [...project.developmentItems]
          developmentItems.splice(sourceIndex + 1, 0, duplicate)
          return { ...project, developmentItems }
        })
        return duplicate.id
      },

      deleteDevelopmentItem: (itemId) =>
        commitProject((project) => {
          const source = findWorkItem(project, itemId)
          if (!source) return project
          const removedIds = new Set([
            itemId,
            ...source.subItems.map((subItem) => subItem.id),
          ])
          const developmentItems = project.developmentItems.filter(
            (item) => item.id !== itemId,
          )
          return {
            ...project,
            developmentItems: removeDanglingDependencies(
              developmentItems,
              removedIds,
            ),
          }
        }),

      addSubItem: (workItemId, name = 'New Sub Item') => {
        if (!findWorkItem(get().project, workItemId)) return null
        const id = dependencies.createId()
        const subItem: DevelopmentSubItem = {
          id,
          name,
          estimation: createStandardEstimationActivities(dependencies),
        }
        commitProject((project) =>
          updateWorkItem(project, workItemId, (item) => ({
            ...item,
            directEstimation: item.subItems.length === 0
              ? []
              : item.directEstimation,
            subItems: [...item.subItems, subItem],
          })),
        )
        return id
      },

      updateSubItem: (workItemId, subItemId, name) =>
        commitProject((project) =>
          updateWorkItem(project, workItemId, (item) => {
            let changed = false
            const subItems = item.subItems.map((subItem) => {
              if (subItem.id !== subItemId || subItem.name === name) {
                return subItem
              }
              changed = true
              return { ...subItem, name }
            })
            return changed ? { ...item, subItems } : item
          }),
        ),

      updateSubItemDependencies: (
        workItemId,
        subItemId,
        dependencyIds,
      ) =>
        commitProject((project) => {
          const normalized = normalizeDependencyIds(
            project,
            subItemId,
            dependencyIds,
          )
          return updateWorkItem(project, workItemId, (item) => {
            let changed = false
            const subItems = item.subItems.map((subItem) => {
              if (
                subItem.id !== subItemId ||
                sameIds(subItem.dependencyIds, normalized)
              ) {
                return subItem
              }
              changed = true
              return { ...subItem, dependencyIds: normalized }
            })
            return changed ? { ...item, subItems } : item
          })
        }),

      duplicateSubItem: (workItemId, subItemId) => {
        const item = findWorkItem(get().project, workItemId)
        const source = item && findSubItem(item, subItemId)
        if (!source) return null

        const duplicate: DevelopmentSubItem = {
          ...source,
          id: dependencies.createId(),
          name: copyName(source.name),
          dependencyIds: [],
          estimation: source.estimation.map(cloneActivity),
        }

        commitProject((project) =>
          updateWorkItem(project, workItemId, (currentItem) => {
            const sourceIndex = currentItem.subItems.findIndex(
              (subItem) => subItem.id === subItemId,
            )
            if (sourceIndex < 0) return currentItem
            const subItems = [...currentItem.subItems]
            subItems.splice(sourceIndex + 1, 0, duplicate)
            return { ...currentItem, subItems }
          }),
        )
        return duplicate.id
      },

      deleteSubItem: (workItemId, subItemId) =>
        commitProject((project) => {
          const updatedProject = updateWorkItem(project, workItemId, (item) => {
            const subItems = item.subItems.filter(
              (subItem) => subItem.id !== subItemId,
            )
            return subItems.length === item.subItems.length
              ? item
              : {
                  ...item,
                  directEstimation: subItems.length === 0
                    ? createStandardEstimationActivities(dependencies)
                    : item.directEstimation,
                  subItems,
                }
          })
          if (updatedProject === project) return project
          return {
            ...updatedProject,
            developmentItems: removeDanglingDependencies(
              updatedProject.developmentItems,
              new Set([subItemId]),
            ),
          }
        }),

      addEstimationActivity: (
        owner,
        name = 'New Estimation Activity',
        hours = 0,
      ) => {
        if (getOwnerEstimation(get().project, owner) === null) return null
        const id = dependencies.createId()
        const activity: EstimationActivity = { id, name, hours }
        commitProject((project) =>
          updateOwnerEstimation(project, owner, (estimation) => [
            ...estimation,
            activity,
          ]),
        )
        return id
      },

      updateEstimationActivity: (owner, activityId, changes) =>
        commitProject((project) =>
          updateOwnerEstimation(project, owner, (estimation) => {
            let changed = false
            const updated = estimation.map((activity) => {
              if (activity.id !== activityId) return activity
              const nextActivity = { ...activity, ...changes }
              const activityChanged = Object.keys(changes).some(
                (key) =>
                  activity[key as keyof EstimationActivityChanges] !==
                  nextActivity[key as keyof EstimationActivityChanges],
              )
              if (!activityChanged) return activity
              changed = true
              return nextActivity
            })
            return changed ? updated : estimation
          }),
        ),

      duplicateEstimationActivity: (owner, activityId) => {
        const estimation = getOwnerEstimation(get().project, owner)
        const source = estimation?.find((activity) => activity.id === activityId)
        if (!source) return null

        const duplicate: EstimationActivity = {
          ...source,
          id: dependencies.createId(),
          name: copyName(source.name),
        }
        commitProject((project) =>
          updateOwnerEstimation(project, owner, (currentEstimation) => {
            const sourceIndex = currentEstimation.findIndex(
              (activity) => activity.id === activityId,
            )
            if (sourceIndex < 0) return currentEstimation
            const updated = [...currentEstimation]
            updated.splice(sourceIndex + 1, 0, duplicate)
            return updated
          }),
        )
        return duplicate.id
      },

      deleteEstimationActivity: (owner, activityId) =>
        commitProject((project) =>
          updateOwnerEstimation(project, owner, (estimation) => {
            const updated = estimation.filter(
              (activity) => activity.id !== activityId,
            )
            return updated.length === estimation.length ? estimation : updated
          }),
        ),

      addQaActivity: (name = 'New QA Activity', hours = 0) => {
        const id = dependencies.createId()
        const activity: QaActivity = { id, name, hours }
        commitProject((project) => ({
          ...project,
          qaActivities: [...project.qaActivities, activity],
        }))
        return id
      },

      updateQaActivity: (activityId, changes) =>
        commitProject((project) => {
          let changed = false
          const qaActivities = project.qaActivities.map((activity) => {
            if (activity.id !== activityId) return activity
            const updated = { ...activity, ...changes }
            const activityChanged = Object.keys(changes).some(
              (key) =>
                activity[key as keyof QaActivityChanges] !==
                updated[key as keyof QaActivityChanges],
            )
            if (!activityChanged) return activity
            changed = true
            return updated
          })
          return changed ? { ...project, qaActivities } : project
        }),

      duplicateQaActivity: (activityId) => {
        const source = get().project.qaActivities.find(
          (activity) => activity.id === activityId,
        )
        if (!source) return null
        const duplicate: QaActivity = {
          ...source,
          id: dependencies.createId(),
          name: copyName(source.name),
        }
        commitProject((project) => {
          const sourceIndex = project.qaActivities.findIndex(
            (activity) => activity.id === activityId,
          )
          if (sourceIndex < 0) return project
          const qaActivities = [...project.qaActivities]
          qaActivities.splice(sourceIndex + 1, 0, duplicate)
          return { ...project, qaActivities }
        })
        return duplicate.id
      },

      deleteQaActivity: (activityId) =>
        commitProject((project) => {
          const qaActivities = project.qaActivities.filter(
            (activity) => activity.id !== activityId,
          )
          return qaActivities.length === project.qaActivities.length
            ? project
            : { ...project, qaActivities }
        }),

      markSaved: () =>
        set({ isDirty: false, lastSavedAt: dependencies.now() }),
    }

    return {
      project: initialProject,
      revision: 0,
      isDirty: false,
      lastSavedAt: null,
      actions,
    }
  })
}
