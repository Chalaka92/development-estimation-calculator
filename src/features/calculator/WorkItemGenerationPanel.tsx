import { useMemo, useState } from 'react'
import { useProjectStore } from '../../app/useProjectStore'
import { Button, EmptyState, Panel, PanelHeader } from '../../components/ui'
import { downloadText } from '../../export/browserDownloads'
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
  const [message, setMessage] = useState('')
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
    setMessage('')
  }

  const updateItem = (
    id: string,
    changes: WorkItemOverride,
  ) => {
    setOverrides((current) => ({
      ...current,
      [id]: { ...current[id], ...changes },
    }))
    setMessage('')
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
    setMessage('')
  }

  const exportJson = () => {
    const collection = createWorkItemCollection(project, options, selectedItems)
    downloadText(
      JSON.stringify(collection, null, 2),
      createWorkItemExportFilename(project.name, 'json'),
      'application/json;charset=utf-8',
    )
    setMessage(`${selectedItems.length} work items exported as JSON.`)
  }

  const exportCsv = () => {
    downloadText(
      createWorkItemCsv(selectedItems),
      createWorkItemExportFilename(project.name, 'csv'),
      'text/csv;charset=utf-8',
    )
    setMessage(`${selectedItems.length} work items exported as CSV.`)
  }

  const resetPreview = () => {
    setOverrides({})
    setExcludedIds(new Set())
    setMessage('Work-item preview reset from the current estimate.')
  }

  return (
    <Panel className="work-item-panel" aria-labelledby="work-item-title">
      <PanelHeader
        eyebrow="Integration-ready backlog"
        title="Generate work items"
        titleId="work-item-title"
        description="Review and edit a provider-neutral backlog before exporting it to another system. Jira-specific mapping remains separate."
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

      {message && <p className="work-item-message" role="status">{message}</p>}
    </Panel>
  )
}
