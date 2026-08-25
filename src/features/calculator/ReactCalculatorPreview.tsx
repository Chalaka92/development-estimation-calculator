import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import {
  getBrowserProjectRuntime,
  ProjectStoreProvider,
  startProjectAutosave,
  useProjectStore,
  type ProjectRuntime,
  type ProjectAutosaveController,
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
import { LiveEstimationTable } from './LiveEstimationTable'
import { ProjectHistoryPanel } from './ProjectHistoryPanel'
import { ProjectWorkspacePanel } from './ProjectWorkspacePanel'
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
  onLegacyNavigation,
  storage,
}: {
  runtime: ProjectRuntime
  saveResult: SaveProjectResult | null
  onLegacyNavigation: (event: MouseEvent<HTMLAnchorElement>) => void
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
            <span>Typed React calculator</span>
          </div>
        </div>
        <div className="preview-header__actions">
          <SaveStatus result={saveResult} />
          <NewProjectControl storage={storage} />
          <a
            className="preview-legacy-link"
            href="?ui=legacy"
            onClick={onLegacyNavigation}
          >
            Open legacy calculator
          </a>
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
              This preview uses the typed project model, validated persistence,
              and live calculation engine. Project settings and the complete
              development, QA, sharing, and editable project data now stay in
              sync automatically.
            </p>
          </div>

          <ProjectSettingsPanel />
          <ProjectWorkspacePanel storage={storage} />
          <DevelopmentWorkBreakdownPanel />
          <QaEstimationPanel />
          <LiveEstimationTable />
          <ExportImportPanel storage={storage} />
          <ProjectHistoryPanel storage={storage} />
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
  const autosaveRef = useRef<ProjectAutosaveController | null>(null)

  const handleLegacyNavigation = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      const result = autosaveRef.current?.flush()
      if (result?.status === 'invalid' || result?.status === 'storage-error') {
        event.preventDefault()
      }
    },
    [],
  )

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
    autosaveRef.current = autosave
    const flushBeforeUnload = () => autosave.flush()
    globalThis.addEventListener('beforeunload', flushBeforeUnload)

    return () => {
      globalThis.removeEventListener('beforeunload', flushBeforeUnload)
      autosave.flush()
      autosave.dispose()
      if (autosaveRef.current === autosave) autosaveRef.current = null
    }
  }, [projectStorage, runtime])

  return (
    <ProjectStoreProvider store={runtime.store}>
      <PreviewContent
        runtime={runtime}
        saveResult={saveResult}
        onLegacyNavigation={handleLegacyNavigation}
        storage={projectStorage}
      />
    </ProjectStoreProvider>
  )
}
