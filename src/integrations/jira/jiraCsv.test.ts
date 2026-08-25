import { describe, expect, it } from 'vitest'
import type { GeneratedWorkItem } from '../workItems'
import {
  createJiraCsv,
  createJiraCsvFilename,
  createJiraCsvRows,
  DEFAULT_JIRA_CSV_OPTIONS,
} from './jiraCsv'

function workItems(): ReadonlyArray<GeneratedWorkItem> {
  return [
    {
      id: 'development:billing',
      sourceId: 'billing',
      sourcePath: '1. Billing',
      kind: 'group',
      summary: 'Billing, invoices',
      description: 'Billing scope',
      estimateHours: 0,
      rollupEstimateHours: 13,
      dependencyIds: [],
    },
    {
      id: 'development:import',
      sourceId: 'import',
      sourcePath: '1. Billing / 1.1 Import',
      kind: 'deliverable',
      summary: 'Import feature',
      description: 'Create CSV import.',
      parentId: 'development:billing',
      estimateHours: 8.5,
      rollupEstimateHours: 8.5,
      role: 'Backend Developer',
      riskLevel: 'high',
      confidencePercentage: 70,
      dependencyIds: [],
    },
    {
      id: 'development:email',
      sourceId: 'email',
      sourcePath: '2. Emailing',
      kind: 'deliverable',
      summary: 'Email invoices',
      description: '',
      estimateHours: 3,
      rollupEstimateHours: 3,
      dependencyIds: ['development:import'],
    },
    {
      id: 'quality:regression',
      sourceId: 'regression',
      sourcePath: 'QA / Regression',
      kind: 'quality',
      summary: 'Regression testing',
      description: 'Run regression suite.',
      estimateHours: 4,
      rollupEstimateHours: 4,
      role: 'QA',
      dependencyIds: [],
    },
  ]
}

const options = {
  ...DEFAULT_JIRA_CSV_OPTIONS,
  projectKey: 'ct2',
  component: 'Billing',
  fixVersion: 'Release 2',
  priority: 'Medium',
  labels: ['Capital Trust', 'estimate'],
}

describe('Jira CSV adapter', () => {
  it('maps neutral items to configurable Jira types and hierarchy IDs', () => {
    const rows = createJiraCsvRows(workItems(), options)

    expect(rows[0]).toMatchObject({
      issueId: '10001',
      parentId: '',
      projectKey: 'CT2',
      issueType: 'Epic',
      epicName: 'Billing, invoices',
      originalEstimateSeconds: '',
    })
    expect(rows[1]).toMatchObject({
      issueId: '10002',
      parentId: '10001',
      issueType: 'Story',
      originalEstimateSeconds: 30600,
      component: 'Billing',
      fixVersion: 'Release 2',
      priority: 'Medium',
    })
    expect(rows[1].labels).toEqual([
      'capital-trust',
      'estimate',
      'estimate-deliverable',
      'role-backend-developer',
      'risk-high',
    ])
    expect(rows[2].description).toContain('Depends on: Import feature')
    expect(rows[3]).toMatchObject({ issueType: 'Task' })
    expect(rows[3].labels).toContain('role-qa')
  })

  it('creates an escaped Jira CSV with repeated label columns', () => {
    const result = createJiraCsv(workItems(), options)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return

    expect(result.rowCount).toBe(4)
    expect(result.content).toContain(
      'Issue ID,Parent ID,Project Key,Issue Type,Summary,Description,Original Estimate,Epic Name,Component,Fix Version,Priority,Labels,Labels,Labels,Labels,Labels',
    )
    expect(result.content).toContain('10002,10001,CT2,Story,Import feature')
    expect(result.content).toContain(',30600,,Billing,Release 2,Medium,')
    expect(result.content).toContain('"Billing, invoices"')
  })

  it('omits dependencies that are not part of the selected export', () => {
    const rows = createJiraCsvRows([workItems()[2]], options)

    expect(rows[0].description).not.toContain('Depends on:')
  })

  it('validates project keys, issue types, and selected work', () => {
    expect(createJiraCsv(workItems(), {
      ...options,
      projectKey: 'not valid!',
    })).toMatchObject({ status: 'invalid' })
    expect(createJiraCsv(workItems(), {
      ...options,
      activityIssueType: '',
    })).toMatchObject({ status: 'invalid' })
    expect(createJiraCsv([], options)).toMatchObject({
      status: 'invalid',
      error: 'Select at least one work item to export.',
    })
  })

  it('creates a Jira-specific safe filename', () => {
    expect(createJiraCsvFilename(' Capital Trust / Release 2 ')).toBe(
      'capital-trust-release-2-jira.csv',
    )
  })
})
