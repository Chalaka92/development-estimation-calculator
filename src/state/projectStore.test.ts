import { describe, expect, it } from 'vitest'
import {
  createEmptyEstimationProject,
  type EntityFactoryDependencies,
} from '../domain/factories'
import { createProjectStore } from './projectStore'

function deterministicDependencies(): EntityFactoryDependencies {
  let id = 0
  let time = 0
  return {
    createId: () => `id-${++id}`,
    now: () => `2026-08-24T00:00:${String(time++).padStart(2, '0')}.000Z`,
  }
}

function createTestStore() {
  const dependencies = deterministicDependencies()
  const project = createEmptyEstimationProject('Test Project', dependencies)
  return createProjectStore(project, dependencies)
}

describe('project store', () => {
  it('creates an empty project with estimation defaults', () => {
    const dependencies = deterministicDependencies()
    const project = createEmptyEstimationProject('Capital Trust', dependencies)

    expect(project).toMatchObject({
      id: 'id-1',
      schemaVersion: 1,
      name: 'Capital Trust',
      developmentItems: [],
      qaActivities: [],
      schedule: {
        riskBufferPercentage: 15,
        workingHoursPerPersonDay: 8,
        totalManpower: 1,
        businessDaysPerWeek: 5,
      },
    })
    expect(project.createdAt).toBe(project.updatedAt)
  })

  it('renames the project, updates the schedule, and tracks revisions', () => {
    const store = createTestStore()
    const { actions } = store.getState()

    expect(actions.renameProject('Release 2')).toBe(true)
    expect(actions.updateSchedule({ totalManpower: 1.5 })).toBe(true)

    expect(store.getState()).toMatchObject({
      revision: 2,
      isDirty: true,
      project: {
        name: 'Release 2',
        schedule: { totalManpower: 1.5 },
      },
    })

    expect(actions.renameProject('Release 2')).toBe(false)
    expect(store.getState().revision).toBe(2)
  })

  it('adds, updates, deeply duplicates, and deletes development items', () => {
    const store = createTestStore()
    const { actions } = store.getState()
    const itemId = actions.addDevelopmentItem('Billing')
    const directActivityId = actions.addEstimationActivity(
      { workItemId: itemId },
      'Implementation',
      12,
    )
    const subItemId = actions.addSubItem(itemId, 'Import')
    expect(subItemId).not.toBeNull()
    const subActivityId = actions.addEstimationActivity(
      { workItemId: itemId, subItemId: subItemId! },
      'Import API',
      8,
    )

    expect(directActivityId).not.toBeNull()
    expect(subActivityId).not.toBeNull()
    expect(actions.updateDevelopmentItem(itemId, 'Billing Screen')).toBe(true)

    const duplicateId = actions.duplicateDevelopmentItem(itemId)
    const [source, duplicate] = store.getState().project.developmentItems

    expect(duplicateId).toBe(duplicate.id)
    expect(duplicate.name).toBe('Billing Screen (Copy)')
    expect(duplicate.id).not.toBe(source.id)
    expect(duplicate.directEstimation[0].id).not.toBe(
      source.directEstimation[0].id,
    )
    expect(duplicate.subItems[0].id).not.toBe(source.subItems[0].id)
    expect(duplicate.subItems[0].estimation[0].id).not.toBe(
      source.subItems[0].estimation[0].id,
    )

    expect(actions.deleteDevelopmentItem(itemId)).toBe(true)
    expect(store.getState().project.developmentItems).toHaveLength(1)
    expect(actions.deleteDevelopmentItem('missing')).toBe(false)
  })

  it('adds, updates, duplicates, and deletes sub-items', () => {
    const store = createTestStore()
    const { actions } = store.getState()
    const itemId = actions.addDevelopmentItem('Feature')
    const subItemId = actions.addSubItem(itemId, 'Settings')!
    actions.addEstimationActivity(
      { workItemId: itemId, subItemId },
      'Settings UI',
      5,
    )

    expect(actions.updateSubItem(itemId, subItemId, 'Configuration')).toBe(true)
    const duplicateId = actions.duplicateSubItem(itemId, subItemId)
    const subItems = store.getState().project.developmentItems[0].subItems

    expect(duplicateId).toBe(subItems[1].id)
    expect(subItems[1].name).toBe('Configuration (Copy)')
    expect(subItems[1].estimation[0].id).not.toBe(
      subItems[0].estimation[0].id,
    )
    expect(actions.deleteSubItem(itemId, subItemId)).toBe(true)
    expect(
      store.getState().project.developmentItems[0].subItems,
    ).toHaveLength(1)
  })

  it('manages direct and sub-item estimation activities immutably', () => {
    const store = createTestStore()
    const { actions } = store.getState()
    const itemId = actions.addDevelopmentItem('Feature')
    const activityId = actions.addEstimationActivity(
      { workItemId: itemId },
      'Analysis',
      3,
    )!

    expect(
      actions.updateEstimationActivity(
        { workItemId: itemId },
        activityId,
        { name: 'Detailed Analysis', hours: 4.5 },
      ),
    ).toBe(true)

    const duplicateId = actions.duplicateEstimationActivity(
      { workItemId: itemId },
      activityId,
    )
    const estimation =
      store.getState().project.developmentItems[0].directEstimation

    expect(duplicateId).toBe(estimation[1].id)
    expect(estimation[1]).toMatchObject({
      name: 'Detailed Analysis (Copy)',
      hours: 4.5,
    })
    expect(actions.deleteEstimationActivity({ workItemId: itemId }, activityId)).toBe(
      true,
    )
  })

  it('adds, updates, duplicates, and deletes QA activities', () => {
    const store = createTestStore()
    const { actions } = store.getState()
    const activityId = actions.addQaActivity('Regression Testing', 6)

    expect(actions.updateQaActivity(activityId, { hours: 7.5 })).toBe(true)
    const duplicateId = actions.duplicateQaActivity(activityId)
    const activities = store.getState().project.qaActivities

    expect(duplicateId).toBe(activities[1].id)
    expect(activities[1]).toMatchObject({
      name: 'Regression Testing (Copy)',
      hours: 7.5,
    })
    expect(actions.deleteQaActivity(activityId)).toBe(true)
    expect(store.getState().project.qaActivities).toHaveLength(1)
  })

  it('does not change state for missing parents or entities', () => {
    const store = createTestStore()
    const { actions } = store.getState()

    expect(actions.addSubItem('missing')).toBeNull()
    expect(
      actions.addEstimationActivity({ workItemId: 'missing' }),
    ).toBeNull()
    expect(actions.updateDevelopmentItem('missing', 'No-op')).toBe(false)
    expect(actions.duplicateDevelopmentItem('missing')).toBeNull()
    expect(actions.deleteQaActivity('missing')).toBe(false)
    expect(store.getState()).toMatchObject({ revision: 0, isDirty: false })
  })

  it('marks the current revision as saved without changing project data', () => {
    const store = createTestStore()
    const { actions } = store.getState()
    actions.addDevelopmentItem('Feature')
    const projectBeforeSave = store.getState().project

    actions.markSaved()

    expect(store.getState()).toMatchObject({
      revision: 1,
      isDirty: false,
    })
    expect(store.getState().lastSavedAt).not.toBeNull()
    expect(store.getState().project).toBe(projectBeforeSave)
  })

  it('replaces the complete project for a validated import', () => {
    const dependencies = deterministicDependencies()
    const store = createProjectStore(
      createEmptyEstimationProject('Current', dependencies),
      dependencies,
    )
    const imported = createEmptyEstimationProject('Imported', dependencies)

    expect(store.getState().actions.replaceProject(imported)).toBe(true)
    expect(store.getState()).toMatchObject({
      revision: 1,
      isDirty: true,
      lastSavedAt: null,
      project: { id: imported.id, name: 'Imported' },
    })
    expect(store.getState().project.updatedAt).not.toBe(imported.updatedAt)
    expect(store.getState().actions.replaceProject(store.getState().project)).toBe(
      false,
    )
    expect(store.getState().revision).toBe(1)
  })
})
