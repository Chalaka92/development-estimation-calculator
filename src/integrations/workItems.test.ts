import { describe, expect, it } from 'vitest'
import type { EstimationProject } from '../domain/estimation'
import {
  createWorkItemCollection,
  createWorkItemCsv,
  createWorkItemExportFilename,
  generateWorkItems,
} from './workItems'

function projectFixture(): EstimationProject {
  return {
    id: 'project-1',
    schemaVersion: 1,
    name: 'Capital Trust / Release 2',
    createdAt: '2026-08-25T00:00:00.000Z',
    updatedAt: '2026-08-25T01:00:00.000Z',
    schedule: {
      riskBufferPercentage: 15,
      workingHoursPerPersonDay: 8,
      totalManpower: 1,
      businessDaysPerWeek: 5,
    },
    developmentItems: [
      {
        id: 'billing',
        name: 'Billing',
        directEstimation: [],
        subItems: [
          {
            id: 'import',
            name: 'Import',
            estimation: [
              {
                id: 'import-api',
                name: 'API implementation',
                hours: 8,
                role: 'Backend',
                riskLevel: 'high',
                confidencePercentage: 70,
                notes: 'Coordinate with platform.',
              },
              { id: 'import-docs', name: 'Documentation', hours: 0 },
            ],
          },
          {
            id: 'settings',
            name: 'Settings',
            dependencyIds: ['import'],
            estimation: [{ id: 'settings-ui', name: 'Settings UI', hours: 5 }],
          },
        ],
      },
      {
        id: 'email',
        name: 'Invoice emailing',
        dependencyIds: ['billing'],
        directEstimation: [{ id: 'email-build', name: 'Build', hours: 3 }],
        subItems: [],
      },
    ],
    qaActivities: [
      { id: 'regression', name: 'Regression', hours: 4, role: 'QA' },
      { id: 'uat', name: 'UAT support', hours: 0 },
    ],
  }
}

describe('provider-neutral work-item generation', () => {
  it('creates hierarchy, rollups, QA work, and translated dependencies', () => {
    const items = generateWorkItems(projectFixture())

    expect(items).toHaveLength(5)
    expect(items[0]).toMatchObject({
      id: 'development:billing',
      kind: 'group',
      estimateHours: 0,
      rollupEstimateHours: 13,
    })
    expect(items[1]).toMatchObject({
      id: 'development:import',
      parentId: 'development:billing',
      kind: 'deliverable',
      estimateHours: 8,
      rollupEstimateHours: 8,
    })
    expect(items[2].dependencyIds).toEqual(['development:import'])
    expect(items[3]).toMatchObject({
      id: 'development:email',
      estimateHours: 3,
      dependencyIds: ['development:billing'],
    })
    expect(items[4]).toMatchObject({
      id: 'quality:regression',
      kind: 'quality',
      estimateHours: 4,
      role: 'QA',
    })
  })

  it('moves estimates to leaf activities without double counting', () => {
    const items = generateWorkItems(projectFixture(), {
      includeEstimationActivities: true,
      includeQaActivities: false,
      includeZeroHourActivities: false,
    })

    expect(items.map(({ id }) => id)).toEqual([
      'development:billing',
      'development:import',
      'activity:import-api',
      'development:settings',
      'activity:settings-ui',
      'development:email',
      'activity:email-build',
    ])
    expect(items.find(({ id }) => id === 'development:import')).toMatchObject({
      estimateHours: 0,
      rollupEstimateHours: 8,
    })
    expect(items.find(({ id }) => id === 'activity:import-api')).toMatchObject({
      parentId: 'development:import',
      estimateHours: 8,
      role: 'Backend',
      riskLevel: 'high',
      confidencePercentage: 70,
    })
    expect(items.reduce((total, item) => total + item.estimateHours, 0)).toBe(16)
  })

  it('can include zero-hour activity rows explicitly', () => {
    const items = generateWorkItems(projectFixture(), {
      includeEstimationActivities: true,
      includeQaActivities: true,
      includeZeroHourActivities: true,
    })
    expect(items.some(({ id }) => id === 'activity:import-docs')).toBe(true)
    expect(items.some(({ id }) => id === 'quality:uat')).toBe(true)
  })

  it('creates a versioned export and removes references to omitted items', () => {
    const project = projectFixture()
    const options = {
      includeEstimationActivities: false,
      includeQaActivities: true,
      includeZeroHourActivities: false,
    }
    const items = generateWorkItems(project, options).filter(
      ({ id }) => id !== 'development:billing',
    )
    const collection = createWorkItemCollection(
      project,
      options,
      items,
      () => '2026-08-25T02:00:00.000Z',
    )

    expect(collection).toMatchObject({
      fileType: 'DevelopmentEstimationWorkItems',
      schemaVersion: 1,
      generatedAt: '2026-08-25T02:00:00.000Z',
      project: { id: 'project-1', name: 'Capital Trust / Release 2' },
    })
    expect(collection.workItems[0].parentId).toBeUndefined()
    expect(
      collection.workItems.find(({ id }) => id === 'development:email')
        ?.dependencyIds,
    ).toEqual([])
  })

  it('exports escaped CSV and safe filenames', () => {
    const items = generateWorkItems(projectFixture()).map((item, index) =>
      index === 0
        ? { ...item, summary: 'Billing, "Release"', description: 'Line 1\nLine 2' }
        : item,
    )
    const csv = createWorkItemCsv(items)
    expect(csv).toContain('"Billing, ""Release"""')
    expect(csv).toContain('"Line 1\nLine 2"')
    expect(csv).toContain('development:import')
    expect(createWorkItemExportFilename('Capital Trust / Release 2', 'json')).toBe(
      'capital-trust-release-2-work-items.json',
    )
  })
})
