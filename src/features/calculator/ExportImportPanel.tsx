import { useRef, useState, type ChangeEvent } from 'react'
import { useProjectStore } from '../../app/useProjectStore'
import { Button, Panel, PanelHeader } from '../../components/ui'
import {
  createCsvSummary,
  createEditableProjectExport,
  createExportFilename,
  createMarkdownSummary,
} from '../../export/projectExport'
import {
  copyTextToClipboard,
  downloadBlob,
  downloadText,
  printCurrentPage,
} from '../../export/browserDownloads'
import { deserializeProject } from '../../persistence/projectPersistence'
import { createProjectSnapshot } from '../../persistence/projectArchive'
import type { KeyValueStorage } from '../../persistence/projectPersistence'

const MAX_IMPORT_BYTES = 5 * 1024 * 1024

interface PanelMessage {
  tone: 'success' | 'error'
  text: string
}

export function ExportImportPanel({
  storage = globalThis.localStorage,
}: {
  storage?: KeyValueStorage
}) {
  const project = useProjectStore((state) => state.project)
  const replaceProject = useProjectStore(
    (state) => state.actions.replaceProject,
  )
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<PanelMessage | null>(null)
  const [creatingPdf, setCreatingPdf] = useState(false)

  const exportEditable = () => {
    const result = createEditableProjectExport(project)
    if (result.status === 'invalid') {
      setMessage({ tone: 'error', text: result.error })
      return
    }
    downloadText(
      result.content,
      createExportFilename(project.name, 'json'),
      'application/json;charset=utf-8',
    )
    setMessage({ tone: 'success', text: 'Editable project file exported.' })
  }

  const exportMarkdown = () => {
    downloadText(
      createMarkdownSummary(project),
      createExportFilename(project.name, 'md'),
      'text/markdown;charset=utf-8',
    )
    setMessage({ tone: 'success', text: 'Markdown summary exported.' })
  }

  const exportCsv = () => {
    downloadText(
      createCsvSummary(project),
      createExportFilename(project.name, 'csv'),
      'text/csv;charset=utf-8',
    )
    setMessage({ tone: 'success', text: 'CSV summary exported.' })
  }

  const copySummary = async () => {
    try {
      await copyTextToClipboard(createMarkdownSummary(project))
      setMessage({ tone: 'success', text: 'Full summary copied.' })
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Copy failed.',
      })
    }
  }

  const exportPdf = async () => {
    setCreatingPdf(true)
    try {
      const { createProjectPdf } = await import('../../export/projectPdf')
      const bytes = createProjectPdf(project)
      downloadBlob(
        new Blob([bytes], { type: 'application/pdf' }),
        createExportFilename(project.name, 'pdf'),
      )
      setMessage({ tone: 'success', text: 'PDF summary exported.' })
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'PDF export failed.',
      })
    } finally {
      setCreatingPdf(false)
    }
  }

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_IMPORT_BYTES) {
      setMessage({
        tone: 'error',
        text: 'The selected file is larger than the 5 MB import limit.',
      })
      return
    }

    try {
      const result = deserializeProject(await file.text())
      if (result.status === 'invalid') {
        setMessage({ tone: 'error', text: result.error })
        return
      }
      const recovery = createProjectSnapshot(
        storage,
        project,
        'Before project import',
        'recovery',
      )
      if (recovery.status !== 'success') {
        setMessage({ tone: 'error', text: recovery.error })
        return
      }
      replaceProject(result.project)
      setMessage({
        tone: 'success',
        text: result.migrated
          ? 'Legacy project imported and migrated successfully.'
          : 'Project imported successfully.',
      })
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Project import failed.',
      })
    }
  }

  return (
    <Panel className="transfer-panel" aria-labelledby="transfer-title">
      <PanelHeader
        className="transfer-panel__heading"
        eyebrow="Share and continue"
        title="Export or import"
        titleId="transfer-title"
        description="Share summary-only files, or keep an editable validated project backup."
        step="05"
      />

      <div className="transfer-grid">
        <div className="transfer-group">
          <h3>Summary exports</h3>
          <p>Development table, QA estimate, totals, and delivery schedule.</p>
          <div className="transfer-actions">
            <Button size="small" onClick={exportMarkdown}>
              Markdown
            </Button>
            <Button size="small" onClick={exportCsv}>
              CSV
            </Button>
            <Button size="small" disabled={creatingPdf} onClick={exportPdf}>
              {creatingPdf ? 'Creating PDF…' : 'PDF'}
            </Button>
            <Button size="small" onClick={copySummary}>
              Copy full summary
            </Button>
            <Button size="small" onClick={printCurrentPage}>
              Print report
            </Button>
          </div>
        </div>

        <div className="transfer-group transfer-group--editable">
          <h3>Editable project</h3>
          <p>Validated JSON for backup, transfer, and future editing.</p>
          <div className="transfer-actions">
            <Button size="small" onClick={exportEditable}>
              Export JSON
            </Button>
            <Button
              variant="primary"
              size="small"
              className="transfer-import-button"
              onClick={() => inputRef.current?.click()}
            >
              Import project
            </Button>
          </div>
          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            aria-label="Import editable estimate"
            onChange={importFile}
          />
        </div>
      </div>

      {message && (
        <p
          className={`transfer-message transfer-message--${message.tone}`}
          role="status"
        >
          {message.text}
        </p>
      )}
    </Panel>
  )
}
