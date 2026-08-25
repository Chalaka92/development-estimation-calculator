import { describe, expect, it } from 'vitest'
import { createEmptyEstimationProject } from '../domain/factories'
import type { EstimationProject } from '../domain/estimation'
import { deserializeProject } from '../persistence/projectPersistence'
import {
  createCsvSummary,
  createEditableProjectExport,
  createExportFilename,
  createLiveEstimateRows,
  createMarkdownSummary,
} from './projectExport'
import { createProjectPdf } from './projectPdf'

function projectFixture(): EstimationProject {
  const project = createEmptyEstimationProject('Capital Trust / Release 2', {
    createId: () => 'project',
    now: () => '2026-08-24T22:00:00.000Z',
  })
  return {
    ...project,
    schedule: { ...project.schedule, riskBufferPercentage: 10, totalManpower: 1.5 },
    developmentItems: [
      {
        id: 'billing',
        name: 'Billing | Invoices',
        directEstimation: [],
        subItems: [
          {
            id: 'import',
            name: 'Import, validation',
            dependencyIds: ['foundation'],
            estimation: [{
              id: 'api',
              name: 'API',
              hours: 999,
              role: 'Backend',
              riskLevel: 'high',
              confidencePercentage: 70,
              notes: 'Coordinate | with platform',
              threePointEstimate: {
                optimisticHours: 14,
                mostLikelyHours: 20,
                pessimisticHours: 26,
              },
            }],
          },
        ],
      },
      {
        id: 'foundation',
        name: 'Foundation',
        directEstimation: [],
        subItems: [],
      },
    ],
    qaActivities: [{
      id: 'qa',
      name: 'Regression "suite"',
      hours: 999,
      threePointEstimate: {
        optimisticHours: 4,
        mostLikelyHours: 10,
        pessimisticHours: 16,
      },
    }],
  }
}

describe('project export', () => {
  it('builds hierarchical live-estimation rows', () => {
    expect(createLiveEstimateRows(projectFixture())).toEqual([
      {
        number: '1',
        mainItem: 'Billing | Invoices',
        subItem: '',
        hours: 20,
      },
      {
        number: '1.1',
        mainItem: '',
        subItem: 'Import, validation',
        hours: 20,
      },
      {
        number: '2',
        mainItem: 'Foundation',
        subItem: '',
        hours: 0,
      },
    ])
  })

  it('creates a Markdown summary with escaped table data and totals', () => {
    const markdown = createMarkdownSummary(projectFixture())
    expect(markdown).toContain('# Capital Trust / Release 2')
    expect(markdown).toContain('Billing \\| Invoices')
    expect(markdown).toContain('| 1.1 |  | Import, validation | 20 h |')
    expect(markdown).toContain('- Final estimate: 33 h')
    expect(markdown).toContain('- Team: 1.5 FTE')
    expect(markdown).toContain('| Backend | 20 h |')
    expect(markdown).toContain('| Billing \\| Invoices / Import, validation | API | Backend | high | 70% | Coordinate \\| with platform | 20 h |')
    expect(markdown).toContain('| 1.1 Import, validation | 2. Foundation |')
  })

  it('creates CSV with correct quoting and summary values', () => {
    const csv = createCsvSummary(projectFixture())
    expect(csv).toContain('Development,1,Billing | Invoices,,20')
    expect(csv).toContain('Development,1.1,,"Import, validation",20')
    expect(csv).toContain('QA,1,,"Regression ""suite""",10')
    expect(csv).toContain('Summary,,Final estimate,,33')
    expect(csv).toContain('Activity detail,"Billing | Invoices / Import, validation",API,Backend,high,70,Coordinate | with platform,20')
    expect(csv).toContain('Role effort,Backend,20')
    expect(csv).toContain('Dependency,"1.1 Import, validation",2. Foundation')
  })

  it('creates an editable export that round-trips through validation', () => {
    const project = projectFixture()
    const exported = createEditableProjectExport(project)
    expect(exported.status).toBe('success')
    if (exported.status !== 'success') return

    expect(deserializeProject(exported.content)).toMatchObject({
      status: 'success',
      source: 'current',
      migrated: false,
      project,
    })
  })

  it('creates safe, predictable filenames', () => {
    expect(createExportFilename(' Capital Trust / Release 2 ', 'pdf')).toBe(
      'capital-trust-release-2.pdf',
    )
    expect(createExportFilename('---', 'json')).toBe(
      'development-estimate.json',
    )
  })

  it('generates a valid PDF byte stream', () => {
    const pdf = createProjectPdf(projectFixture())
    const bytes = new Uint8Array(pdf)
    expect(bytes.byteLength).toBeGreaterThan(1_000)
    expect(new TextDecoder().decode(bytes.slice(0, 8))).toContain('%PDF-')
  })
})
