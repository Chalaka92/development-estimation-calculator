import { useEffect, useMemo, useState } from 'react'
import { useProjectStore } from '../../app/useProjectStore'
import { Button, Panel, PanelHeader } from '../../components/ui'
import {
  compareProjects,
  createProjectSnapshot,
  createProjectTemplate,
  deleteProjectSnapshot,
  deleteProjectTemplate,
  instantiateProjectTemplate,
  loadProjectArchive,
  PROJECT_ARCHIVE_CHANGED_EVENT,
  type ProjectArchive,
} from '../../persistence/projectArchive'
import type { KeyValueStorage } from '../../persistence/projectPersistence'

interface ProjectHistoryPanelProps {
  storage: KeyValueStorage
}

interface HistoryMessage {
  tone: 'success' | 'error'
  text: string
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function resultError(result: { status: string; error?: string }): string {
  return result.error ?? 'Project history could not be updated.'
}

export function ProjectHistoryPanel({ storage }: ProjectHistoryPanelProps) {
  const project = useProjectStore((state) => state.project)
  const replaceProject = useProjectStore((state) => state.actions.replaceProject)
  const initialLoad = useMemo(() => loadProjectArchive(storage), [storage])
  const [archive, setArchive] = useState<ProjectArchive>(
    initialLoad.status === 'loaded'
      ? initialLoad.archive
      : { schemaVersion: 1, snapshots: [], templates: [] },
  )
  const [snapshotName, setSnapshotName] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(
    archive.snapshots[0]?.id ?? '',
  )
  const [message, setMessage] = useState<HistoryMessage | null>(
    initialLoad.status === 'loaded'
      ? null
      : { tone: 'error', text: initialLoad.error },
  )
  const selectedSnapshot = archive.snapshots.find(
    (snapshot) => snapshot.id === selectedSnapshotId,
  )
  const comparison = selectedSnapshot
    ? compareProjects(selectedSnapshot.project, project)
    : []

  useEffect(() => {
    const refresh = () => {
      const result = loadProjectArchive(storage)
      if (result.status !== 'loaded') {
        setMessage({ tone: 'error', text: result.error })
        return
      }
      setArchive(result.archive)
      setSelectedSnapshotId((current) =>
        result.archive.snapshots.some((snapshot) => snapshot.id === current)
          ? current
          : result.archive.snapshots[0]?.id ?? '',
      )
    }
    globalThis.addEventListener(PROJECT_ARCHIVE_CHANGED_EVENT, refresh)
    return () => globalThis.removeEventListener(PROJECT_ARCHIVE_CHANGED_EVENT, refresh)
  }, [storage])

  const saveSnapshot = () => {
    const label = snapshotName.trim() || `${project.name} snapshot`
    const result = createProjectSnapshot(storage, project, label)
    if (result.status !== 'success') {
      setMessage({ tone: 'error', text: resultError(result) })
      return
    }
    setArchive(result.archive)
    setSelectedSnapshotId(result.value.id)
    setSnapshotName('')
    setMessage({ tone: 'success', text: 'Project snapshot saved.' })
  }

  const saveTemplate = () => {
    const result = createProjectTemplate(storage, project, templateName)
    if (result.status !== 'success') {
      setMessage({ tone: 'error', text: resultError(result) })
      return
    }
    setArchive(result.archive)
    setTemplateName('')
    setMessage({ tone: 'success', text: 'Reusable template saved with zero hours.' })
  }

  const restoreSnapshot = () => {
    if (!selectedSnapshot) return
    if (!globalThis.confirm(`Restore snapshot “${selectedSnapshot.label}”?`)) return
    const recovery = createProjectSnapshot(
      storage,
      project,
      'Before snapshot restore',
      'recovery',
    )
    if (recovery.status !== 'success') {
      setMessage({ tone: 'error', text: resultError(recovery) })
      return
    }
    replaceProject(selectedSnapshot.project)
    setArchive(recovery.archive)
    setMessage({ tone: 'success', text: 'Snapshot restored. A recovery copy was saved.' })
  }

  const removeSnapshot = () => {
    if (!selectedSnapshot) return
    if (!globalThis.confirm(`Delete snapshot “${selectedSnapshot.label}”?`)) return
    const result = deleteProjectSnapshot(storage, selectedSnapshot.id)
    if (result.status !== 'loaded') {
      setMessage({ tone: 'error', text: resultError(result) })
      return
    }
    setArchive(result.archive)
    setSelectedSnapshotId(result.archive.snapshots[0]?.id ?? '')
    setMessage({ tone: 'success', text: 'Snapshot deleted.' })
  }

  const applyTemplate = (templateId: string) => {
    const template = archive.templates.find((entry) => entry.id === templateId)
    if (!template) return
    if (!globalThis.confirm(`Apply template “${template.name}” to a clean project?`)) return
    const recovery = createProjectSnapshot(
      storage,
      project,
      'Before applying template',
      'recovery',
    )
    if (recovery.status !== 'success') {
      setMessage({ tone: 'error', text: resultError(recovery) })
      return
    }
    replaceProject(instantiateProjectTemplate(template))
    setArchive(recovery.archive)
    setMessage({ tone: 'success', text: 'Template applied with all hours reset to zero.' })
  }

  const removeTemplate = (templateId: string) => {
    const template = archive.templates.find((entry) => entry.id === templateId)
    if (!template || !globalThis.confirm(`Delete template “${template.name}”?`)) return
    const result = deleteProjectTemplate(storage, templateId)
    if (result.status !== 'loaded') {
      setMessage({ tone: 'error', text: resultError(result) })
      return
    }
    setArchive(result.archive)
    setMessage({ tone: 'success', text: 'Template deleted.' })
  }

  return (
    <Panel className="history-panel" aria-labelledby="history-title">
      <PanelHeader
        eyebrow="Reuse and recover"
        title="Templates and project history"
        titleId="history-title"
        description="Save reusable zero-hour structures or capture exact versions before major changes."
        step="07"
      />

      <div className="history-grid">
        <section className="history-group" aria-labelledby="templates-title">
          <h3 id="templates-title">Reusable templates</h3>
          <p>Templates keep structure and settings while clearing every estimate.</p>
          <div className="history-create-row">
            <input
              aria-label="Template name"
              value={templateName}
              placeholder="Template name"
              onChange={(event) => setTemplateName(event.target.value)}
            />
            <Button variant="primary" size="small" onClick={saveTemplate}>
              Save template
            </Button>
          </div>
          {archive.templates.length === 0 ? (
            <p className="history-empty">No templates saved yet.</p>
          ) : (
            <ul className="history-list">
              {archive.templates.map((template) => (
                <li key={template.id}>
                  <div>
                    <strong>{template.name}</strong>
                    <span>{formatDate(template.createdAt)}</span>
                  </div>
                  <div className="history-row-actions">
                    <Button size="small" onClick={() => applyTemplate(template.id)}>
                      Apply
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      aria-label={`Delete template ${template.name}`}
                      onClick={() => removeTemplate(template.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="history-group" aria-labelledby="snapshots-title">
          <h3 id="snapshots-title">Version snapshots</h3>
          <p>Snapshots preserve the exact project, including every hour.</p>
          <div className="history-create-row">
            <input
              aria-label="Snapshot name"
              value={snapshotName}
              placeholder={`${project.name} snapshot`}
              onChange={(event) => setSnapshotName(event.target.value)}
            />
            <Button variant="primary" size="small" onClick={saveSnapshot}>
              Save snapshot
            </Button>
          </div>
          {archive.snapshots.length === 0 ? (
            <p className="history-empty">No snapshots saved yet.</p>
          ) : (
            <>
              <label className="history-select-label" htmlFor="snapshot-version">
                Compare with current project
              </label>
              <select
                id="snapshot-version"
                value={selectedSnapshotId}
                onChange={(event) => setSelectedSnapshotId(event.target.value)}
              >
                {archive.snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.kind === 'recovery' ? 'Recovery: ' : ''}
                    {snapshot.label} — {formatDate(snapshot.createdAt)}
                  </option>
                ))}
              </select>
              <div
                className="history-comparison"
                role="region"
                aria-label="Snapshot comparison"
                tabIndex={0}
              >
                <table aria-live="polite">
                  <caption className="visually-hidden">
                    Selected snapshot compared with the current project
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Metric</th>
                      <th scope="col">Saved</th>
                      <th scope="col">Current</th>
                      <th scope="col">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((metric) => (
                      <tr className="history-comparison__row" key={metric.label}>
                        <th scope="row">{metric.label}</th>
                        <td>{metric.saved.toLocaleString('en')}{metric.suffix}</td>
                        <td>{metric.current.toLocaleString('en')}{metric.suffix}</td>
                        <td>{metric.difference > 0 ? '+' : ''}{metric.difference.toLocaleString('en')}{metric.suffix}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="history-snapshot-actions">
                <Button variant="primary" size="small" onClick={restoreSnapshot}>
                  Restore selected
                </Button>
                <Button variant="danger" size="small" onClick={removeSnapshot}>
                  Delete selected
                </Button>
              </div>
            </>
          )}
        </section>
      </div>

      {message && (
        <p className={`history-message history-message--${message.tone}`} role="status">
          {message.text}
        </p>
      )}
    </Panel>
  )
}
