import {
  calculateDevelopmentItemHours,
  calculateEstimate,
  calculateActivityHours,
  calculateRoleEffort,
} from '../domain/calculations'
import type {
  EstimationActivity,
  EstimationProject,
  QaActivity,
} from '../domain/estimation'
import { serializeProject } from '../persistence/projectPersistence'

export interface LiveEstimateRow {
  number: string
  mainItem: string
  subItem: string
  hours: number
}

export interface ActivityDetailRow {
  path: string
  activity: EstimationActivity | QaActivity
  hours: number
}

export interface DependencyDetailRow {
  workItem: string
  dependsOn: string
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

export function createActivityDetailRows(
  project: EstimationProject,
): ReadonlyArray<ActivityDetailRow> {
  const development = project.developmentItems.flatMap((item) => {
    if (item.subItems.length === 0) {
      return item.directEstimation.map((activity) => ({
        path: item.name,
        activity,
        hours: calculateActivityHours(activity),
      }))
    }
    return item.subItems.flatMap((subItem) =>
      subItem.estimation.map((activity) => ({
        path: `${item.name} / ${subItem.name}`,
        activity,
        hours: calculateActivityHours(activity),
      })),
    )
  })
  return [
    ...development,
    ...project.qaActivities.map((activity) => ({
      path: 'QA',
      activity,
      hours: calculateActivityHours(activity),
    })),
  ]
}

export function createDependencyDetailRows(
  project: EstimationProject,
): ReadonlyArray<DependencyDetailRow> {
  const labels = new Map<string, string>()
  project.developmentItems.forEach((item, itemIndex) => {
    labels.set(item.id, `${itemIndex + 1}. ${item.name}`)
    item.subItems.forEach((subItem, subItemIndex) => {
      labels.set(
        subItem.id,
        `${itemIndex + 1}.${subItemIndex + 1} ${subItem.name}`,
      )
    })
  })
  return project.developmentItems.flatMap((item, itemIndex) => {
    const mainLabel = `${itemIndex + 1}. ${item.name}`
    const mainRows = (item.dependencyIds ?? []).flatMap((id) => {
      const dependsOn = labels.get(id)
      return dependsOn ? [{ workItem: mainLabel, dependsOn }] : []
    })
    const subRows = item.subItems.flatMap((subItem, subItemIndex) =>
      (subItem.dependencyIds ?? []).flatMap((id) => {
        const dependsOn = labels.get(id)
        return dependsOn
          ? [{
              workItem: `${itemIndex + 1}.${subItemIndex + 1} ${subItem.name}`,
              dependsOn,
            }]
          : []
      }),
    )
    return [...mainRows, ...subRows]
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
  const roleEffort = calculateRoleEffort(project)
  const activityDetails = createActivityDetailRows(project)
  const dependencyDetails = createDependencyDetailRows(project)
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
    '## Effort by Role',
    '',
    '| Role | Hours |',
    '| --- | ---: |',
    ...roleEffort.map(
      (entry) =>
        `| ${escapeMarkdown(entry.role)} | ${formatExportNumber(entry.hours)} h |`,
    ),
    '',
    '## Activity Planning Details',
    '',
    '| Work item | Activity | Role | Risk | Confidence | Notes | Hours |',
    '| --- | --- | --- | --- | ---: | --- | ---: |',
    ...activityDetails.map(({ path, activity, hours }) =>
      `| ${escapeMarkdown(path)} | ${escapeMarkdown(activity.name)} | ${escapeMarkdown(activity.role ?? (path === 'QA' ? 'QA' : 'Unassigned'))} | ${activity.riskLevel ?? '—'} | ${activity.confidencePercentage === undefined ? '—' : `${formatExportNumber(activity.confidencePercentage)}%`} | ${escapeMarkdown(activity.notes ?? '')} | ${formatExportNumber(hours)} h |`,
    ),
    '',
    '## Dependencies',
    '',
    ...(dependencyDetails.length === 0
      ? ['No dependencies recorded.']
      : [
          '| Work item | Depends on |',
          '| --- | --- |',
          ...dependencyDetails.map(
            (entry) =>
              `| ${escapeMarkdown(entry.workItem)} | ${escapeMarkdown(entry.dependsOn)} |`,
          ),
        ]),
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
  const roleEffort = calculateRoleEffort(project)
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
    ['Activity detail', 'Work item', 'Activity', 'Role', 'Risk', 'Confidence %', 'Notes', 'Hours'],
    ...createActivityDetailRows(project).map(({ path, activity, hours }) => [
      'Activity detail',
      path,
      activity.name,
      activity.role ?? (path === 'QA' ? 'QA' : 'Unassigned'),
      activity.riskLevel ?? '',
      activity.confidencePercentage ?? '',
      activity.notes ?? '',
      formatExportNumber(hours),
    ]),
    [],
    ['Role effort', 'Role', 'Hours'],
    ...roleEffort.map((entry) => [
      'Role effort',
      entry.role,
      formatExportNumber(entry.hours),
    ]),
    [],
    ['Dependency', 'Work item', 'Depends on'],
    ...createDependencyDetailRows(project).map((entry) => [
      'Dependency',
      entry.workItem,
      entry.dependsOn,
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
