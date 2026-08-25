import { useEffect, useState } from 'react'
import {
  APP_VERSION,
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
import { CalculatorWorkspaceTabs } from './CalculatorWorkspaceTabs'
import { EstimateSummaryPanel } from './EstimateSummaryPanel'
import { NewProjectControl } from './NewProjectControl'
import { synchronizeWorkspaceProject } from '../../persistence/projectWorkspace'
import './ReactCalculatorPreview.css'

interface ReactCalculatorPreviewProps {
  runtime?: ProjectRuntime
  storage?: KeyValueStorage
}

function SaveStatus({ result }: { result: SaveProjectResult | null }) {
  const isDirty = useProjectStore((state) => state.isDirty)
  const lastSavedAt = useProjectStore((state) => state.lastSavedAt)
  const failed = result?.status === 'storage-error' || result?.status === 'invalid'
  const className = failed
    ? 'preview-save-status preview-save-status--error'
    : 'preview-save-status'

  const message = failed
    ? 'Save failed'
    : isDirty
      ? 'Saving changes…'
      : lastSavedAt
        ? 'All changes saved'
        : 'Ready'

  return (
    <span
      className={className}
      role={failed ? 'alert' : 'status'}
      aria-live={failed ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {message}
    </span>
  )
}

function PreviewContent({
  runtime,
  saveResult,
  storage,
}: {
  runtime: ProjectRuntime
  saveResult: SaveProjectResult | null
  storage: KeyValueStorage
}) {
  return (
    <main className="react-preview">
      <a className="skip-link" href="#calculator-workspace">
        Skip to calculator workspace
      </a>
      <header className="preview-header">
        <div className="preview-brand">
          <span className="preview-brand__mark">DE</span>
          <div>
            <strong>Development Estimation</strong>
            <span>Typed React calculator · v{APP_VERSION}</span>
          </div>
        </div>
        <div className="preview-header__actions">
          <SaveStatus result={saveResult} />
          <NewProjectControl storage={storage} />
        </div>
      </header>

      {runtime.warnings.length > 0 && (
        <div className="preview-warning" role="alert">
          <strong>Some saved data needs attention.</strong>
          <span>{runtime.warnings.map((warning) => warning.message).join(' ')}</span>
        </div>
      )}

      <div
        className="preview-workspace"
        id="calculator-workspace"
        tabIndex={-1}
      >
        <div className="preview-main-column">
          <div className="preview-intro">
            <p className="preview-eyebrow">Project workspace</p>
            <h1>Build a clear, defensible estimate.</h1>
            <p>
              This calculator uses the typed project model, validated
              persistence, and live calculation engine. Project settings and
              the complete development, QA, review, export, and history
              sections stay in sync automatically without crowding one view.
            </p>
          </div>

          <CalculatorWorkspaceTabs storage={storage} />
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
  const projectStorage = storage ?? globalThis.localStorage
  const [saveResult, setSaveResult] = useState<SaveProjectResult | null>(null)

  useEffect(() => {
    const autosave = startProjectAutosave(
      runtime.store,
      projectStorage,
      {
        onResult: setSaveResult,
        onProjectSaved: (project) => {
          synchronizeWorkspaceProject(projectStorage, project)
        },
      },
    )
    const flushBeforeUnload = () => autosave.flush()
    globalThis.addEventListener('beforeunload', flushBeforeUnload)

    return () => {
      globalThis.removeEventListener('beforeunload', flushBeforeUnload)
      autosave.flush()
      autosave.dispose()
    }
  }, [projectStorage, runtime])

  return (
    <ProjectStoreProvider store={runtime.store}>
      <PreviewContent
        runtime={runtime}
        saveResult={saveResult}
        storage={projectStorage}
      />
    </ProjectStoreProvider>
  )
}
