import { useEffect, useState } from 'react'
import {
  getBrowserProjectRuntime,
  ProjectStoreProvider,
  startProjectAutosave,
  useProjectStore,
  type ProjectRuntime,
} from '../../app/index'
import type {
  KeyValueStorage,
  SaveProjectResult,
} from '../../persistence/projectPersistence'
import { EstimateSummaryPanel } from './EstimateSummaryPanel'
import { DevelopmentWorkBreakdownPanel } from './DevelopmentWorkBreakdownPanel'
import { ProjectSettingsPanel } from './ProjectSettingsPanel'
import { QaEstimationPanel } from './QaEstimationPanel'
import { ExportImportPanel } from './ExportImportPanel'
import { NewProjectControl } from './NewProjectControl'
import './ReactCalculatorPreview.css'

interface ReactCalculatorPreviewProps {
  runtime?: ProjectRuntime
  storage?: KeyValueStorage
}

function SaveStatus({ result }: { result: SaveProjectResult | null }) {
  const isDirty = useProjectStore((state) => state.isDirty)
  const lastSavedAt = useProjectStore((state) => state.lastSavedAt)

  if (result?.status === 'storage-error' || result?.status === 'invalid') {
    return <span className="preview-save-status preview-save-status--error">Save failed</span>
  }

  if (isDirty) {
    return <span className="preview-save-status">Saving changes…</span>
  }

  return (
    <span className="preview-save-status">
      {lastSavedAt ? 'All changes saved' : 'Ready'}
    </span>
  )
}

function PreviewContent({
  runtime,
  saveResult,
}: {
  runtime: ProjectRuntime
  saveResult: SaveProjectResult | null
}) {
  return (
    <main className="react-preview">
      <header className="preview-header">
        <div className="preview-brand">
          <span className="preview-brand__mark">DE</span>
          <div>
            <strong>Development Estimation</strong>
            <span>Typed React calculator</span>
          </div>
        </div>
        <div className="preview-header__actions">
          <SaveStatus result={saveResult} />
          <NewProjectControl />
          <a className="preview-legacy-link" href="?ui=legacy">
            Open legacy calculator
          </a>
        </div>
      </header>

      {runtime.warnings.length > 0 && (
        <div className="preview-warning" role="status">
          <strong>Some saved data needs attention.</strong>
          <span>{runtime.warnings.map((warning) => warning.message).join(' ')}</span>
        </div>
      )}

      <div className="preview-workspace">
        <div className="preview-main-column">
          <div className="preview-intro">
            <p className="preview-eyebrow">Project workspace</p>
            <h1>Build a clear, defensible estimate.</h1>
            <p>
              This preview uses the typed project model, validated persistence,
              and live calculation engine. Project settings and the complete
              development, QA, sharing, and editable project data now stay in
              sync automatically.
            </p>
          </div>

          <ProjectSettingsPanel />
          <DevelopmentWorkBreakdownPanel />
          <QaEstimationPanel />
          <ExportImportPanel />
        </div>

        <EstimateSummaryPanel />
      </div>
    </main>
  )
}

export function ReactCalculatorPreview({
  runtime: suppliedRuntime,
  storage,
}: ReactCalculatorPreviewProps) {
  const runtime = suppliedRuntime ?? getBrowserProjectRuntime()
  const [saveResult, setSaveResult] = useState<SaveProjectResult | null>(null)

  useEffect(() => {
    const autosave = startProjectAutosave(
      runtime.store,
      storage ?? globalThis.localStorage,
      { onResult: setSaveResult },
    )
    return autosave.dispose
  }, [runtime, storage])

  return (
    <ProjectStoreProvider store={runtime.store}>
      <PreviewContent runtime={runtime} saveResult={saveResult} />
    </ProjectStoreProvider>
  )
}
