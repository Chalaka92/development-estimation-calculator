import { useCallback, useEffect, useState } from 'react'
import { useProjectStore } from '../../app/useProjectStore'
import { Button, Panel, PanelHeader } from '../../components/ui'
import { calculateEstimate } from '../../domain/calculations'
import { createEmptyEstimationProject } from '../../domain/factories'
import {
  activateWorkspaceProject,
  deleteWorkspaceProject,
  duplicateWorkspaceProject,
  loadProjectWorkspace,
  PROJECT_WORKSPACE_CHANGED_EVENT,
  renameWorkspaceProject,
  setWorkspaceProjectArchived,
  synchronizeWorkspaceProject,
  type ProjectWorkspace,
} from '../../persistence/projectWorkspace'
import {
  saveProject,
  type KeyValueStorage,
} from '../../persistence/projectPersistence'

interface WorkspaceMessage {
  tone: 'success' | 'error'
  text: string
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function ProjectWorkspacePanel({
  storage,
}: {
  storage: KeyValueStorage
}) {
  const project = useProjectStore((state) => state.project)
  const replaceProject = useProjectStore(
    (state) => state.actions.replaceProject,
  )
  const renameActiveProject = useProjectStore(
    (state) => state.actions.renameProject,
  )
  const markSaved = useProjectStore((state) => state.actions.markSaved)
  const [initialLoad] = useState(() =>
    synchronizeWorkspaceProject(storage, project),
  )
  const [workspace, setWorkspace] = useState<ProjectWorkspace | null>(
    initialLoad.status === 'success' ? initialLoad.workspace : null,
  )
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [message, setMessage] = useState<WorkspaceMessage | null>(
    initialLoad.status === 'success'
      ? null
      : { tone: 'error', text: initialLoad.error },
  )

  const refresh = useCallback(() => {
    const loaded = loadProjectWorkspace(storage)
    if (loaded.status === 'loaded') {
      setWorkspace(loaded.workspace)
    } else if (loaded.status !== 'empty') {
      setMessage({ tone: 'error', text: loaded.error })
    }
  }, [storage])

  useEffect(() => {
    globalThis.addEventListener(PROJECT_WORKSPACE_CHANGED_EVENT, refresh)
    return () =>
      globalThis.removeEventListener(PROJECT_WORKSPACE_CHANGED_EVENT, refresh)
  }, [refresh])

  const persistCurrent = () => {
    const saved = saveProject(storage, project)
    if (saved.status !== 'saved') {
      setMessage({ tone: 'error', text: saved.error })
      return false
    }
    const synchronized = synchronizeWorkspaceProject(storage, project)
    if (synchronized.status !== 'success') {
      setMessage({ tone: 'error', text: synchronized.error })
      return false
    }
    markSaved()
    return true
  }

  const createProject = () => {
    const requested = globalThis.prompt(
      'Name the new project:',
      'Untitled Estimate',
    )
    if (requested === null) return
    const name = requested.trim()
    if (!name) {
      setMessage({ tone: 'error', text: 'Project name is required.' })
      return
    }
    if (!persistCurrent()) return

    const created = createEmptyEstimationProject(name)
    const saved = saveProject(storage, created)
    if (saved.status !== 'saved') {
      setMessage({ tone: 'error', text: saved.error })
      return
    }
    const synchronized = synchronizeWorkspaceProject(storage, created)
    if (synchronized.status !== 'success') {
      setMessage({ tone: 'error', text: synchronized.error })
      return
    }

    replaceProject(created)
    markSaved()
    setMessage({
      tone: 'success',
      text: `Created and opened “${name}”.`,
    })
  }

  const openProject = (projectId: string) => {
    if (projectId === project.id || !persistCurrent()) return

    const activated = activateWorkspaceProject(storage, project, projectId)
    if (activated.status !== 'success') {
      setMessage({ tone: 'error', text: activated.error })
      return
    }
    const saved = saveProject(storage, activated.value)
    if (saved.status !== 'saved') {
      setMessage({ tone: 'error', text: saved.error })
      return
    }

    replaceProject(activated.value)
    markSaved()
    setMessage({
      tone: 'success',
      text: `Opened “${activated.value.name}”.`,
    })
  }

  const renameProject = (projectId: string, currentName: string) => {
    const requested = globalThis.prompt('Rename project:', currentName)
    if (requested === null) return
    const result = renameWorkspaceProject(storage, projectId, requested)
    if (result.status !== 'success') {
      setMessage({ tone: 'error', text: result.error })
      return
    }
    if (projectId === project.id) {
      renameActiveProject(result.value.project.name)
    }
    setMessage({ tone: 'success', text: 'Project renamed.' })
  }

  const duplicateProject = (projectId: string) => {
    if (!persistCurrent()) return
    const result = duplicateWorkspaceProject(storage, projectId)
    if (result.status !== 'success') {
      setMessage({ tone: 'error', text: result.error })
      return
    }
    setMessage({
      tone: 'success',
      text: `Created “${result.value.project.name}”.`,
    })
  }

  const toggleArchived = (
    projectId: string,
    archived: boolean,
    name: string,
  ) => {
    if (archived && !globalThis.confirm(`Archive “${name}”?`)) return
    const result = setWorkspaceProjectArchived(storage, projectId, archived)
    if (result.status !== 'success') {
      setMessage({ tone: 'error', text: result.error })
      return
    }
    setMessage({
      tone: 'success',
      text: archived ? 'Project archived.' : 'Project restored.',
    })
  }

  const removeProject = (projectId: string, name: string) => {
    if (
      !globalThis.confirm(
        `Permanently delete “${name}” from this browser?`,
      )
    ) {
      return
    }
    const result = deleteWorkspaceProject(storage, projectId)
    if (result.status !== 'success') {
      setMessage({ tone: 'error', text: result.error })
      return
    }
    setMessage({ tone: 'success', text: 'Project deleted.' })
  }

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const projects = (workspace?.projects ?? [])
    .filter((entry) => entry.archived === showArchived)
    .filter((entry) =>
      entry.project.name.toLocaleLowerCase().includes(normalizedQuery),
    )
    .sort(
      (first, second) =>
        Date.parse(second.lastOpenedAt) - Date.parse(first.lastOpenedAt),
    )

  return (
    <Panel className="workspace-panel" aria-labelledby="workspace-title">
      <PanelHeader
        eyebrow="Project library"
        title="Saved projects"
        titleId="workspace-title"
        description="Keep several estimates in this browser and switch without exporting files."
        actions={
          <Button
            variant="primary"
            size="small"
            onClick={createProject}
          >
            New project
          </Button>
        }
      />

      <div className="workspace-toolbar">
        <label>
          <span>Search projects</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name"
          />
        </label>
        <div className="workspace-filter" aria-label="Project status filter">
          <Button
            size="small"
            variant={showArchived ? 'secondary' : 'primary'}
            onClick={() => setShowArchived(false)}
          >
            Active
          </Button>
          <Button
            size="small"
            variant={showArchived ? 'primary' : 'secondary'}
            onClick={() => setShowArchived(true)}
          >
            Archived
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <p className="workspace-empty">
          No {showArchived ? 'archived' : 'active'} projects match this search.
        </p>
      ) : (
        <ul className="workspace-project-list">
          {projects.map((entry) => {
            const active = entry.project.id === project.id
            const displayedProject = active ? project : entry.project
            const summary = calculateEstimate(displayedProject)
            const name = displayedProject.name

            return (
              <li
                key={entry.project.id}
                className={
                  active
                    ? 'workspace-project workspace-project--active'
                    : 'workspace-project'
                }
              >
                <div className="workspace-project__details">
                  <div>
                    <strong>{name}</strong>
                    {active && (
                      <span className="workspace-active-badge">Open</span>
                    )}
                  </div>
                  <span>
                    {summary.finalHours.toLocaleString()} h · Last opened{' '}
                    {formatDate(entry.lastOpenedAt)}
                  </span>
                </div>
                <div className="workspace-project__actions">
                  {!entry.archived && !active && (
                    <Button
                      size="small"
                      variant="primary"
                      onClick={() => openProject(entry.project.id)}
                    >
                      Open
                    </Button>
                  )}
                  <Button
                    size="small"
                    onClick={() => renameProject(entry.project.id, name)}
                  >
                    Rename
                  </Button>
                  <Button
                    size="small"
                    onClick={() => duplicateProject(entry.project.id)}
                  >
                    Duplicate
                  </Button>
                  {!active && (
                    <Button
                      size="small"
                      onClick={() =>
                        toggleArchived(entry.project.id, !entry.archived, name)
                      }
                    >
                      {entry.archived ? 'Restore' : 'Archive'}
                    </Button>
                  )}
                  {!active && (
                    <Button
                      size="small"
                      variant="danger"
                      onClick={() => removeProject(entry.project.id, name)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {message && (
        <p
          className={`workspace-message workspace-message--${message.tone}`}
          role={message.tone === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      )}
      <p className="workspace-local-note">
        Projects are stored only in this browser. Export editable JSON for
        portable backups.
      </p>
    </Panel>
  )
}
