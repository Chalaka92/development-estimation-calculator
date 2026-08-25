import { describe, expect, it } from 'vitest'
import {
  DEFAULT_QA_ACTIVITY_NAMES,
  STANDARD_ESTIMATION_ACTIVITY_NAMES,
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
      qaActivities: DEFAULT_QA_ACTIVITY_NAMES.map((name) => ({
        name,
        hours: 0,
      })),
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
    const directActivityId =
      store.getState().project.developmentItems[0].directEstimation[0].id
    actions.updateEstimationActivity(
      { workItemId: itemId },
      directActivityId,
      { name: 'Implementation', hours: 12 },
    )

    expect(actions.updateDevelopmentItem(itemId, 'Billing Screen')).toBe(true)

    const duplicateId = actions.duplicateDevelopmentItem(itemId)
    const [source, duplicate] = store.getState().project.developmentItems

    expect(duplicateId).toBe(duplicate.id)
    expect(duplicate.name).toBe('Billing Screen (Copy)')
    expect(duplicate.id).not.toBe(source.id)
    expect(duplicate.directEstimation[0].id).not.toBe(
      source.directEstimation[0].id,
    )
    expect(duplicate.directEstimation).toHaveLength(8)

    expect(actions.deleteDevelopmentItem(itemId)).toBe(true)
    expect(store.getState().project.developmentItems).toHaveLength(1)
    expect(actions.deleteDevelopmentItem('missing')).toBe(false)
  })

  it('adds, updates, duplicates, and deletes sub-items', () => {
    const store = createTestStore()
    const { actions } = store.getState()
    const itemId = actions.addDevelopmentItem('Feature')
    const subItemId = actions.addSubItem(itemId, 'Settings')!
    const activityId = actions.addEstimationActivity(
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
    expect(subItems[0].estimation).toHaveLength(9)
    expect(activityId).not.toBeNull()
    expect(actions.deleteSubItem(itemId, subItemId)).toBe(true)
    expect(
      store.getState().project.developmentItems[0].subItems,
    ).toHaveLength(1)

    expect(actions.deleteSubItem(itemId, duplicateId!)).toBe(true)
    const workItem = store.getState().project.developmentItems[0]
    expect(workItem.subItems).toHaveLength(0)
    expect(workItem.directEstimation.map(({ name, hours }) => ({ name, hours }))).toEqual(
      STANDARD_ESTIMATION_ACTIVITY_NAMES.map((name) => ({ name, hours: 0 })),
    )
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

    const duplicate = estimation.find((activity) => activity.id === duplicateId)
    expect(duplicate).toMatchObject({
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

    const duplicate = activities.find((activity) => activity.id === duplicateId)
    expect(duplicate).toMatchObject({
      name: 'Regression Testing (Copy)',
      hours: 7.5,
    })
    expect(actions.deleteQaActivity(activityId)).toBe(true)
    expect(store.getState().project.qaActivities).toHaveLength(7)
  })

  it('resets editable sections independently and can reset the full project', () => {
    const store = createTestStore()
    const { actions } = store.getState()
    const initialProjectId = store.getState().project.id
    const firstQaId = store.getState().project.qaActivities[0].id

    actions.renameProject('Changed Project')
    actions.updateSchedule({ riskBufferPercentage: 28, totalManpower: 2.5 })
    actions.addDevelopmentItem('Billing')
    actions.updateQaActivity(firstQaId, { name: 'Changed QA', hours: 9 })

    expect(actions.resetProjectSettings()).toBe(true)
    expect(store.getState().project).toMatchObject({
      name: 'Untitled Estimate',
      schedule: {
        riskBufferPercentage: 15,
        workingHoursPerPersonDay: 8,
        totalManpower: 1,
        businessDaysPerWeek: 5,
      },
    })
    expect(store.getState().project.developmentItems).toHaveLength(1)
    expect(store.getState().project.qaActivities[0]).toMatchObject({
      name: 'Changed QA',
      hours: 9,
    })
    expect(actions.resetProjectSettings()).toBe(false)

    expect(actions.resetDevelopmentWork()).toBe(true)
    expect(store.getState().project.developmentItems).toHaveLength(0)
    expect(actions.resetDevelopmentWork()).toBe(false)

    expect(actions.resetQaEstimation()).toBe(true)
    expect(
      store.getState().project.qaActivities.map(({ name, hours }) => ({
        name,
        hours,
      })),
    ).toEqual(DEFAULT_QA_ACTIVITY_NAMES.map((name) => ({ name, hours: 0 })))
    expect(store.getState().project.qaActivities[0].id).not.toBe(firstQaId)

    actions.renameProject('Reset Everything')
    actions.addDevelopmentItem('Feature')
    expect(actions.resetProject()).toBe(true)
    expect(store.getState()).toMatchObject({
      isDirty: true,
      lastSavedAt: null,
      project: {
        name: 'Untitled Estimate',
        developmentItems: [],
        schedule: { riskBufferPercentage: 15, totalManpower: 1 },
      },
    })
    expect(store.getState().project.qaActivities).toHaveLength(6)
    expect(store.getState().project.id).not.toBe(initialProjectId)
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
