import type { GeneratedWorkItem } from '../workItems'

export interface JiraCsvOptions {
  projectKey: string
  groupIssueType: string
  deliverableIssueType: string
  activityIssueType: string
  qualityIssueType: string
  component: string
  fixVersion: string
  priority: string
  labels: ReadonlyArray<string>
}

export interface JiraCsvRow {
  issueId: string
  parentId: string
  projectKey: string
  issueType: string
  summary: string
  description: string
  originalEstimateSeconds: number | ''
  epicName: string
  component: string
  fixVersion: string
  priority: string
  labels: ReadonlyArray<string>
}

export const DEFAULT_JIRA_CSV_OPTIONS: JiraCsvOptions = {
  projectKey: '',
  groupIssueType: 'Epic',
  deliverableIssueType: 'Story',
  activityIssueType: 'Sub-task',
  qualityIssueType: 'Task',
  component: '',
  fixVersion: '',
  priority: '',
  labels: ['estimation-calculator'],
}

function issueTypeFor(
  item: GeneratedWorkItem,
  options: JiraCsvOptions,
): string {
  switch (item.kind) {
    case 'group': return options.groupIssueType.trim()
    case 'deliverable': return options.deliverableIssueType.trim()
    case 'activity': return options.activityIssueType.trim()
    case 'quality': return options.qualityIssueType.trim()
  }
}

function sanitizeLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255)
}

function createDescription(
  item: GeneratedWorkItem,
  labels: ReadonlyMap<string, string>,
): string {
  const dependencies = item.dependencyIds.flatMap((id) => {
    const summary = labels.get(id)
    return summary ? [summary] : []
  })
  const planning = [
    item.description.trim(),
    `Source: ${item.sourcePath}`,
    item.role ? `Delivery role: ${item.role}` : '',
    item.riskLevel ? `Risk: ${item.riskLevel}` : '',
    item.confidencePercentage === undefined
      ? ''
      : `Confidence: ${item.confidencePercentage}%`,
    item.rollupEstimateHours !== item.estimateHours
      ? `Rollup estimate: ${item.rollupEstimateHours} h`
      : '',
    dependencies.length > 0
      ? `Depends on: ${dependencies.join(', ')}`
      : '',
  ].filter(Boolean)
  return planning.join('\n\n')
}

export function createJiraCsvRows(
  workItems: ReadonlyArray<GeneratedWorkItem>,
  options: JiraCsvOptions,
): ReadonlyArray<JiraCsvRow> {
  const issueIds = new Map(
    workItems.map((item, index) => [item.id, String(10001 + index)]),
  )
  const summaries = new Map(workItems.map((item) => [item.id, item.summary]))
  const baseLabels = options.labels.map(sanitizeLabel).filter(Boolean)

  return workItems.map((item) => {
    const labels = [
      ...baseLabels,
      sanitizeLabel(`estimate-${item.kind}`),
      item.role ? sanitizeLabel(`role-${item.role}`) : '',
      item.riskLevel ? sanitizeLabel(`risk-${item.riskLevel}`) : '',
    ].filter(Boolean)
    return {
      issueId: issueIds.get(item.id)!,
      parentId: item.parentId ? issueIds.get(item.parentId) ?? '' : '',
      projectKey: options.projectKey.trim().toUpperCase(),
      issueType: issueTypeFor(item, options),
      summary: item.summary.trim() || 'Untitled work item',
      description: createDescription(item, summaries),
      originalEstimateSeconds: item.estimateHours > 0
        ? Math.round(item.estimateHours * 3600)
        : '',
      epicName: item.kind === 'group' ? item.summary.trim() : '',
      component: options.component.trim(),
      fixVersion: options.fixVersion.trim(),
      priority: options.priority.trim(),
      labels: [...new Set(labels)],
    }
  })
}

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function createJiraCsv(
  workItems: ReadonlyArray<GeneratedWorkItem>,
  options: JiraCsvOptions,
):
  | { status: 'success'; content: string; rowCount: number }
  | { status: 'invalid'; error: string } {
  const projectKey = options.projectKey.trim().toUpperCase()
  if (!/^[A-Z][A-Z0-9]+$/.test(projectKey)) {
    return {
      status: 'invalid',
      error: 'Enter a Jira project or space key with at least two uppercase letters or numbers, starting with a letter.',
    }
  }
  if (workItems.length === 0) {
    return { status: 'invalid', error: 'Select at least one work item to export.' }
  }
  const requiredTypes = [
    options.groupIssueType,
    options.deliverableIssueType,
    options.activityIssueType,
    options.qualityIssueType,
  ]
  if (requiredTypes.some((value) => !value.trim())) {
    return { status: 'invalid', error: 'Every Jira issue-type mapping must have a value.' }
  }

  const rows = createJiraCsvRows(workItems, { ...options, projectKey })
  const labelColumnCount = Math.max(1, ...rows.map((row) => row.labels.length))
  const header = [
    'Issue ID',
    'Parent ID',
    'Project Key',
    'Issue Type',
    'Summary',
    'Description',
    'Original Estimate',
    'Epic Name',
    'Component',
    'Fix Version',
    'Priority',
    ...Array.from({ length: labelColumnCount }, () => 'Labels'),
  ]
  const contentRows = rows.map((row) => [
    row.issueId,
    row.parentId,
    row.projectKey,
    row.issueType,
    row.summary,
    row.description,
    row.originalEstimateSeconds,
    row.epicName,
    row.component,
    row.fixVersion,
    row.priority,
    ...row.labels,
    ...Array.from(
      { length: labelColumnCount - row.labels.length },
      () => '',
    ),
  ])
  return {
    status: 'success',
    content: [header, ...contentRows]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n'),
    rowCount: rows.length,
  }
}

export function createJiraCsvFilename(projectName: string): string {
  const base = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
  return `${base || 'development-estimate'}-jira.csv`
}
