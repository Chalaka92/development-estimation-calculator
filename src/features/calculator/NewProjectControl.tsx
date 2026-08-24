import { useState } from 'react'
import { useProjectStore } from '../../app/useProjectStore'
import { createEmptyEstimationProject } from '../../domain/factories'

export function NewProjectControl() {
  const [open, setOpen] = useState(false)
  const replaceProject = useProjectStore(
    (state) => state.actions.replaceProject,
  )

  const createProject = () => {
    replaceProject(createEmptyEstimationProject())
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        className="preview-new-project"
        onClick={() => setOpen(true)}
      >
        New project
      </button>

      {open && (
        <div className="new-project-backdrop" role="presentation">
          <div
            className="new-project-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-project-title"
            aria-describedby="new-project-description"
          >
            <span className="new-project-dialog__mark">New</span>
            <h2 id="new-project-title">Start a new estimate?</h2>
            <p id="new-project-description">
              This replaces the active project with a clean estimate. Export an
              editable JSON backup first if you need to keep the current work.
            </p>
            <div className="new-project-dialog__actions">
              <button type="button" onClick={() => setOpen(false)}>
                Keep current project
              </button>
              <button
                type="button"
                className="new-project-dialog__confirm"
                onClick={createProject}
              >
                Start new project
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
