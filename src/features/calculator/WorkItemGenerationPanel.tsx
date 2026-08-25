import { useMemo, useState } from 'react'
import { useProjectStore } from '../../app/useProjectStore'
import { Button, EmptyState, Panel, PanelHeader } from '../../components/ui'
import { downloadText } from '../../export/browserDownloads'
import {
  createJiraCsv,
  createJiraCsvFilename,
  DEFAULT_JIRA_CSV_OPTIONS,
  type JiraCsvOptions,
} from '../../integrations/jira'
import {
  createWorkItemCollection,
  createWorkItemCsv,
  createWorkItemExportFilename,
  DEFAULT_WORK_ITEM_GENERATION_OPTIONS,
  generateWorkItems,
  type GeneratedWorkItem,
  type WorkItemGenerationOptions,
} from '../../integrations/workItems'

interface WorkItemOverride {
  summary?: string
  description?: string
}

interface WorkItemMessage {
  tone: 'success' | 'error'
  text: string
}

const numberFormatter = new Intl.NumberFormat('en', {
  maximumFractionDigits: 2,
})

function formatHours(value: number): string {
  return `${numberFormatter.format(value)} h`
}

export function WorkItemGenerationPanel() {
  const project = useProjectStore((state) => state.project)
  const [options, setOptions] = useState<WorkItemGenerationOptions>(
    DEFAULT_WORK_ITEM_GENERATION_OPTIONS,
  )
  const [overrides, setOverrides] = useState<Record<string, WorkItemOverride>>({})
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => new Set())
  const [jiraOptions, setJiraOptions] = useState<JiraCsvOptions>(
    DEFAULT_JIRA_CSV_OPTIONS,
  )
  const [jiraLabels, setJiraLabels] = useState(
    DEFAULT_JIRA_CSV_OPTIONS.labels.join(', '),
  )
  const [message, setMessage] = useState<WorkItemMessage | null>(null)
  const generatedItems = useMemo(
    () => generateWorkItems(project, options),
    [options, project],
  )
  const previewItems = useMemo(
    () => generatedItems.map((item) => ({ ...item, ...overrides[item.id] })),
    [generatedItems, overrides],
  )
  const previewById = new Map(previewItems.map((item) => [item.id, item]))
  const isIncluded = (item: GeneratedWorkItem) => {
    let current: GeneratedWorkItem | undefined = item
    while (current) {
      if (excludedIds.has(current.id)) return false
      current = current.parentId ? previewById.get(current.parentId) : undefined
    }
    return true
  }
  const selectedItems = previewItems.filter(isIncluded)
  const selectedIds = new Set(selectedItems.map((item) => item.id))
  const selectedHours = selectedItems.reduce(
    (total, item) => total + item.estimateHours,
    0,
  )
  const itemLabels = new Map(previewItems.map((item) => [item.id, item.summary]))

  const updateOption = (
    key: keyof WorkItemGenerationOptions,
    checked: boolean,
  ) => {
    setOptions((current) => ({ ...current, [key]: checked }))
    setMessage(null)
  }

  const updateItem = (
    id: string,
    changes: WorkItemOverride,
  ) => {
    setOverrides((current) => ({
      ...current,
      [id]: { ...current[id], ...changes },
    }))
    setMessage(null)
  }

  const toggleItem = (item: GeneratedWorkItem, included: boolean) => {
    const descendants = new Set<string>()
    const pending = [item.id]
    while (pending.length > 0) {
      const parentId = pending.pop()!
      previewItems.forEach((candidate) => {
        if (candidate.parentId === parentId && !descendants.has(candidate.id)) {
          descendants.add(candidate.id)
          pending.push(candidate.id)
        }
      })
    }

    setExcludedIds((current) => {
      const next = new Set(current)
      if (!included) {
        next.add(item.id)
        descendants.forEach((id) => next.add(id))
        return next
      }

      next.delete(item.id)
      let parentId = item.parentId
      while (parentId) {
        next.delete(parentId)
        parentId = previewItems.find((candidate) => candidate.id === parentId)?.parentId
      }
      return next
    })
    setMessage(null)
  }

  const exportJson = () => {
    const collection = createWorkItemCollection(project, options, selectedItems)
    downloadText(
      JSON.stringify(collection, null, 2),
      createWorkItemExportFilename(project.name, 'json'),
      'application/json;charset=utf-8',
    )
    setMessage({
      tone: 'success',
      text: `${selectedItems.length} work items exported as JSON.`,
    })
  }

  const exportCsv = () => {
    downloadText(
      createWorkItemCsv(selectedItems),
      createWorkItemExportFilename(project.name, 'csv'),
      'text/csv;charset=utf-8',
    )
    setMessage({
      tone: 'success',
      text: `${selectedItems.length} work items exported as CSV.`,
    })
  }

  const exportJiraCsv = () => {
    const result = createJiraCsv(selectedItems, {
      ...jiraOptions,
      labels: jiraLabels.split(',').map((label) => label.trim()),
    })
    if (result.status === 'invalid') {
      setMessage({ tone: 'error', text: result.error })
      return
    }
    downloadText(
      result.content,
      createJiraCsvFilename(project.name),
      'text/csv;charset=utf-8',
    )
    setMessage({
      tone: 'success',
      text: `${result.rowCount} Jira-ready work items exported.`,
    })
  }

  const resetPreview = () => {
    setOverrides({})
    setExcludedIds(new Set())
    setMessage({
      tone: 'success',
      text: 'Work-item preview reset from the current estimate.',
    })
  }

  return (
    <Panel className="work-item-panel" aria-labelledby="work-item-title">
      <PanelHeader
        eyebrow="Integration-ready backlog"
        title="Generate work items"
        titleId="work-item-title"
        description="Review and edit a provider-neutral backlog, then export neutral files or map the selected items into a Jira-ready CSV."
        step="05"
      />

      <fieldset className="work-item-options">
        <legend>Generation options</legend>
        <label>
          <input
            type="checkbox"
            checked={options.includeEstimationActivities}
            onChange={(event) =>
              updateOption('includeEstimationActivities', event.target.checked)
            }
          />
          <span>Generate estimation activities as child work items</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={options.includeQaActivities}
            onChange={(event) =>
              updateOption('includeQaActivities', event.target.checked)
            }
          />
          <span>Include QA activities</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={options.includeZeroHourActivities}
            onChange={(event) =>
              updateOption('includeZeroHourActivities', event.target.checked)
            }
          />
          <span>Include zero-hour activities</span>
        </label>
      </fieldset>

      <fieldset className="jira-csv-options">
        <legend>Jira CSV mapping</legend>
        <div className="jira-csv-grid">
          <label>
            <span>Project or space key</span>
            <input
              aria-label="Jira project or space key"
              value={jiraOptions.projectKey}
              placeholder="PROJ"
              onChange={(event) => {
                setJiraOptions((current) => ({
                  ...current,
                  projectKey: event.target.value.toUpperCase(),
                }))
                setMessage(null)
              }}
            />
          </label>
          <label>
            <span>Group type</span>
            <input
              aria-label="Jira group issue type"
              value={jiraOptions.groupIssueType}
              onChange={(event) => setJiraOptions((current) => ({
                ...current,
                groupIssueType: event.target.value,
              }))}
            />
          </label>
          <label>
            <span>Deliverable type</span>
            <input
              aria-label="Jira deliverable issue type"
              value={jiraOptions.deliverableIssueType}
              onChange={(event) => setJiraOptions((current) => ({
                ...current,
                deliverableIssueType: event.target.value,
              }))}
            />
          </label>
          <label>
            <span>Activity type</span>
            <input
              aria-label="Jira activity issue type"
              value={jiraOptions.activityIssueType}
              onChange={(event) => setJiraOptions((current) => ({
                ...current,
                activityIssueType: event.target.value,
              }))}
            />
          </label>
          <label>
            <span>QA type</span>
            <input
              aria-label="Jira QA issue type"
              value={jiraOptions.qualityIssueType}
              onChange={(event) => setJiraOptions((current) => ({
                ...current,
                qualityIssueType: event.target.value,
              }))}
            />
          </label>
          <label>
            <span>Component</span>
            <input
              aria-label="Jira component"
              value={jiraOptions.component}
              placeholder="Optional"
              onChange={(event) => setJiraOptions((current) => ({
                ...current,
                component: event.target.value,
              }))}
            />
          </label>
          <label>
            <span>Fix version</span>
            <input
              aria-label="Jira fix version"
              value={jiraOptions.fixVersion}
              placeholder="Optional"
              onChange={(event) => setJiraOptions((current) => ({
                ...current,
                fixVersion: event.target.value,
              }))}
            />
          </label>
          <label>
            <span>Priority</span>
            <input
              aria-label="Jira priority"
              value={jiraOptions.priority}
              placeholder="Optional"
              onChange={(event) => setJiraOptions((current) => ({
                ...current,
                priority: event.target.value,
              }))}
            />
          </label>
          <label className="jira-labels-field">
            <span>Labels</span>
            <input
              aria-label="Jira labels"
              value={jiraLabels}
              placeholder="estimate, release"
              onChange={(event) => setJiraLabels(event.target.value)}
            />
          </label>
        </div>
        <p>
          For parent/child hierarchy, use Jira administration’s External System
          CSV import and map Issue ID, Parent ID, Issue Type, and Original Estimate.
          Estimates are exported in seconds as required by Jira.
        </p>
      </fieldset>

      <div className="work-item-toolbar">
        <p>
          <strong>{selectedItems.length}</strong> of {previewItems.length} items ·{' '}
          {formatHours(selectedHours)} assigned to exported items
        </p>
        <div>
          <Button size="small" onClick={resetPreview}>Reset preview</Button>
          <Button size="small" onClick={exportCsv} disabled={selectedItems.length === 0}>
            Export work-item CSV
          </Button>
          <Button
            size="small"
            onClick={exportJiraCsv}
            disabled={selectedItems.length === 0}
          >
            Export Jira CSV
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={exportJson}
            disabled={selectedItems.length === 0}
          >
            Export work-item JSON
          </Button>
        </div>
      </div>

      {previewItems.length === 0 ? (
        <EmptyState
          className="work-item-empty"
          title="No work items to generate yet."
          description="Add development effort or enable zero-hour QA activities to build the backlog preview."
          action={null}
        />
      ) : (
        <div className="work-item-list">
          {previewItems.map((item, index) => {
            const included = selectedIds.has(item.id)
            return (
              <article
                className={`work-item-card${included ? '' : ' work-item-card--excluded'}`}
                key={item.id}
              >
                <div className="work-item-card__heading">
                  <label>
                    <input
                      type="checkbox"
                      aria-label={`Include work item ${index + 1}`}
                      checked={included}
                      onChange={(event) => toggleItem(item, event.target.checked)}
                    />
                    <span className={`work-item-kind work-item-kind--${item.kind}`}>
                      {item.kind}
                    </span>
                  </label>
                  <strong>{formatHours(item.estimateHours)}</strong>
                </div>
                <label>
                  <span>Summary</span>
                  <input
                    aria-label={`Work item ${index + 1} summary`}
                    value={item.summary}
                    disabled={!included}
                    onChange={(event) =>
                      updateItem(item.id, { summary: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Description</span>
                  <textarea
                    aria-label={`Work item ${index + 1} description`}
                    value={item.description}
                    disabled={!included}
                    onChange={(event) =>
                      updateItem(item.id, { description: event.target.value })
                    }
                  />
                </label>
                <dl>
                  <div><dt>Source</dt><dd>{item.sourcePath}</dd></div>
                  <div>
                    <dt>Parent</dt>
                    <dd>{item.parentId ? itemLabels.get(item.parentId) ?? 'Not included' : 'Root'}</dd>
                  </div>
                  <div><dt>Rollup</dt><dd>{formatHours(item.rollupEstimateHours)}</dd></div>
                  <div>
                    <dt>Dependencies</dt>
                    <dd>
                      {item.dependencyIds.length === 0
                        ? 'None'
                        : item.dependencyIds.map((id) => itemLabels.get(id) ?? id).join(', ')}
                    </dd>
                  </div>
                </dl>
              </article>
            )
          })}
        </div>
      )}

      {message && (
        <p
          className={`work-item-message work-item-message--${message.tone}`}
          role={message.tone === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      )}
    </Panel>
  )
}
