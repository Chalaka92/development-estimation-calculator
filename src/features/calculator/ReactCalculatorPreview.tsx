import { useEffect, useState } from 'react'
import {
  getBrowserProjectRuntime,
  ProjectStoreProvider,
  startProjectAutosave,
  useProjectStore,
  type ProjectRuntime,
} from '../../app'
import type {
  KeyValueStorage,
  SaveProjectResult,
} from '../../persistence/projectPersistence'
import { EstimateSummaryPanel } from './EstimateSummaryPanel'
import { ProjectSettingsPanel } from './ProjectSettingsPanel'
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
            <span>React migration preview</span>
          </div>
        </div>
        <div className="preview-header__actions">
          <SaveStatus result={saveResult} />
          <a className="preview-legacy-link" href="./">
            Open current calculator
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
            <p className="preview-eyebrow">React migration · Stage 1</p>
            <h1>Set the delivery assumptions.</h1>
            <p>
              This preview uses the typed project model, validated persistence,
              and live calculation engine. Work-breakdown editing will follow in
              the next migration slice.
            </p>
          </div>

          <ProjectSettingsPanel />

          <section className="preview-upcoming" aria-labelledby="upcoming-title">
            <span>Next</span>
            <div>
              <h2 id="upcoming-title">Development work breakdown</h2>
              <p>
                Add, group, duplicate, and estimate main items and sub-items in React.
              </p>
            </div>
          </section>
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
