import { describe, expect, it } from 'vitest'
import type { EstimationProject } from './estimation'
import { reviewEstimationHealth } from './estimateHealth'

function project(overrides: Partial<EstimationProject> = {}): EstimationProject {
  return {
    id: 'project-1',
    schemaVersion: 1,
    name: 'Health Review',
    developmentItems: [],
    qaActivities: [],
    schedule: {
      riskBufferPercentage: 10,
      workingHoursPerPersonDay: 8,
      totalManpower: 1,
      businessDaysPerWeek: 5,
    },
    createdAt: '2026-08-25T18:30:00.000Z',
    updatedAt: '2026-08-25T18:30:00.000Z',
    ...overrides,
  }
}

function estimatedProject(): EstimationProject {
  return project({
    developmentItems: [
      {
        id: 'dev-1',
        name: 'Billing',
        directEstimation: [
          {
            id: 'activity-1',
            name: 'Implementation',
            hours: 12,
            role: 'Backend Developer',
            riskLevel: 'low',
            confidencePercentage: 90,
          },
        ],
        subItems: [],
      },
    ],
    qaActivities: [
      {
        id: 'qa-1',
        name: 'Regression testing',
        hours: 4,
        riskLevel: 'low',
        confidencePercentage: 85,
      },
    ],
  })
}

describe('reviewEstimationHealth', () => {
  it('reports a ready estimate when effective work has complete planning details', () => {
    const result = reviewEstimationHealth(estimatedProject())

    expect(result).toEqual({
      estimatedActivities: 2,
      highRiskActivities: 0,
      lowConfidenceActivities: 0,
      unassignedDevelopmentRoles: 0,
      issues: [],
      status: 'ready',
    })
  })

  it('flags zero development and QA gaps without treating default zero rows as estimated activities', () => {
    const empty = reviewEstimationHealth(project())
    expect(empty.status).toBe('warning')
    expect(empty.estimatedActivities).toBe(0)
    expect(empty.issues.map((issue) => issue.id)).toEqual(['development-zero'])

    const noQa = reviewEstimationHealth({
      ...estimatedProject(),
      qaActivities: [],
    })
    expect(noQa.issues.map((issue) => issue.id)).toContain('qa-zero')
  })

  it('flags high risk, low confidence, missing role, and incomplete metadata', () => {
    const result = reviewEstimationHealth(project({
      schedule: {
        riskBufferPercentage: 0,
        workingHoursPerPersonDay: 8,
        totalManpower: 1,
        businessDaysPerWeek: 5,
      },
      developmentItems: [
        {
          id: 'dev-1',
          name: 'Import',
          directEstimation: [
            {
              id: 'activity-1',
              name: 'Importer',
              hours: 10,
              riskLevel: 'high',
              confidencePercentage: 45,
            },
            {
              id: 'activity-2',
              name: 'Validation',
              hours: 6,
            },
          ],
          subItems: [],
        },
      ],
      qaActivities: [
        {
          id: 'qa-1',
          name: 'Regression',
          hours: 4,
          riskLevel: 'medium',
        },
      ],
    }))

    expect(result).toMatchObject({
      status: 'warning',
      estimatedActivities: 3,
      highRiskActivities: 1,
      lowConfidenceActivities: 1,
      unassignedDevelopmentRoles: 2,
    })
    expect(result.issues.map((issue) => issue.id)).toEqual([
      'high-risk-zero-buffer',
      'low-confidence',
      'unassigned-role',
      'planning-metadata',
    ])
  })

  it('reviews only effective sub-item activities when a main item has sub-items', () => {
    const result = reviewEstimationHealth(project({
      developmentItems: [
        {
          id: 'dev-1',
          name: 'Feature',
          directEstimation: [
            {
              id: 'ignored-direct',
              name: 'Ignored direct estimate',
              hours: 100,
              riskLevel: 'high',
              confidencePercentage: 10,
            },
          ],
          subItems: [
            {
              id: 'sub-1',
              name: 'API',
              estimation: [
                {
                  id: 'effective',
                  name: 'Build API',
                  hours: 8,
                  role: 'Backend Developer',
                  riskLevel: 'low',
                  confidencePercentage: 90,
                },
              ],
            },
          ],
        },
      ],
      qaActivities: [
        {
          id: 'qa-1',
          name: 'QA',
          hours: 2,
          riskLevel: 'low',
          confidencePercentage: 90,
        },
      ],
    }))

    expect(result.highRiskActivities).toBe(0)
    expect(result.lowConfidenceActivities).toBe(0)
    expect(result.estimatedActivities).toBe(2)
  })
})
