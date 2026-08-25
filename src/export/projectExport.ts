import {
  calculateDevelopmentItemHours,
  calculateEstimate,
  calculateActivityHours,
} from '../domain/calculations'
import type { EstimationProject } from '../domain/estimation'
import { serializeProject } from '../persistence/projectPersistence'

export interface LiveEstimateRow {
  number: string
  mainItem: string
  subItem: string
  hours: number
}

const numberFormatter = new Intl.NumberFormat('en', {
  maximumFractionDigits: 2,
})

export function formatExportNumber(value: number): string {
  return numberFormatter.format(value)
}

export function createLiveEstimateRows(
  project: EstimationProject,
): ReadonlyArray<LiveEstimateRow> {
  return project.developmentItems.flatMap((item, itemIndex) => {
    const number = String(itemIndex + 1)
    const mainRow: LiveEstimateRow = {
      number,
      mainItem: item.name,
      subItem: '',
      hours: calculateDevelopmentItemHours(item),
    }

    if (item.subItems.length === 0) return [mainRow]
    return [
      mainRow,
      ...item.subItems.map((subItem, subItemIndex) => ({
        number: `${number}.${subItemIndex + 1}`,
        mainItem: '',
        subItem: subItem.name,
        hours: subItem.estimation.reduce(
          (total, activity) => total + calculateActivityHours(activity),
          0,
        ),
      })),
    ]
  })
}

function escapeMarkdown(value: string): string {
  return value.replaceAll('|', '\\|').replace(/\r?\n/g, '<br>')
}

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function createEditableProjectExport(project: EstimationProject):
  | { status: 'success'; content: string }
  | { status: 'invalid'; error: string } {
  const serialized = serializeProject(project)
  if (serialized.status === 'invalid') return serialized
  return {
    status: 'success',
    content: JSON.stringify(JSON.parse(serialized.serialized), null, 2),
  }
}

export function createMarkdownSummary(project: EstimationProject): string {
  const summary = calculateEstimate(project)
  const lines = [
    `# ${escapeMarkdown(project.name)}`,
    '',
    '## Live Estimation Table',
    '',
    '| No. | Main Item | Sub Item | Final Hours |',
    '| --- | --- | --- | ---: |',
    ...createLiveEstimateRows(project).map(
      (row) =>
        `| ${row.number} | ${escapeMarkdown(row.mainItem)} | ${escapeMarkdown(row.subItem)} | ${formatExportNumber(row.hours)} h |`,
    ),
    '',
    '## QA Estimation',
    '',
    '| No. | Activity | Hours |',
    '| --- | --- | ---: |',
    ...project.qaActivities.map(
      (activity, index) =>
        `| ${index + 1} | ${escapeMarkdown(activity.name)} | ${formatExportNumber(calculateActivityHours(activity))} h |`,
    ),
    '',
    '## Estimate Summary',
    '',
    `- Development: ${formatExportNumber(summary.developmentHours)} h`,
    `- QA: ${formatExportNumber(summary.qaHours)} h`,
    `- Base estimate: ${formatExportNumber(summary.baseHours)} h`,
    `- Risk buffer (${formatExportNumber(summary.riskBufferPercentage)}%): ${formatExportNumber(summary.riskBufferHours)} h`,
    `- Final estimate: ${formatExportNumber(summary.finalHours)} h`,
    `- Delivery: ${formatExportNumber(summary.deliveryWorkingDays)} working days`,
    `- Business weeks: ${formatExportNumber(summary.businessWeeks)}`,
    `- Team: ${formatExportNumber(summary.totalManpower)} FTE`,
    '',
  ]

  return lines.join('\n')
}

export function createCsvSummary(project: EstimationProject): string {
  const summary = calculateEstimate(project)
  const rows: ReadonlyArray<ReadonlyArray<string | number>> = [
    ['Section', 'No.', 'Main Item', 'Sub Item / Activity', 'Hours'],
    ...createLiveEstimateRows(project).map((row) => [
      'Development',
      row.number,
      row.mainItem,
      row.subItem,
      formatExportNumber(row.hours),
    ]),
    ...project.qaActivities.map((activity, index) => [
      'QA',
      index + 1,
      '',
      activity.name,
      formatExportNumber(calculateActivityHours(activity)),
    ]),
    [],
    ['Summary', '', 'Development', '', formatExportNumber(summary.developmentHours)],
    ['Summary', '', 'QA', '', formatExportNumber(summary.qaHours)],
    ['Summary', '', 'Risk buffer', '', formatExportNumber(summary.riskBufferHours)],
    ['Summary', '', 'Final estimate', '', formatExportNumber(summary.finalHours)],
    ['Schedule', '', 'Delivery working days', '', formatExportNumber(summary.deliveryWorkingDays)],
    ['Schedule', '', 'Business weeks', '', formatExportNumber(summary.businessWeeks)],
    ['Schedule', '', 'Total manpower (FTE)', '', formatExportNumber(summary.totalManpower)],
  ]

  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function createExportFilename(
  projectName: string,
  extension: 'json' | 'md' | 'csv' | 'pdf',
): string {
  const base = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return `${base || 'development-estimate'}.${extension}`
}
