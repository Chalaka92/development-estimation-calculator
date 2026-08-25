import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useProjectStore } from '../../app/useProjectStore'
import { Button } from '../../components/ui'
import { createEmptyEstimationProject } from '../../domain/factories'

export function NewProjectControl() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const replaceProject = useProjectStore(
    (state) => state.actions.replaceProject,
  )

  const createProject = () => {
    replaceProject(createEmptyEstimationProject())
    setOpen(false)
  }

  const closeDialog = () => setOpen(false)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    const trigger = triggerRef.current
    document.body.style.overflow = 'hidden'
    cancelRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      trigger?.focus()
    }
  }, [open])

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeDialog()
      return
    }

    if (event.key !== 'Tab') return
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <>
      <Button
        ref={triggerRef}
        variant="primary"
        className="preview-new-project"
        onClick={() => setOpen(true)}
      >
        New project
      </Button>

      {open && (
        <div className="new-project-backdrop" role="presentation">
          <div
            ref={dialogRef}
            className="new-project-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-project-title"
            aria-describedby="new-project-description"
            onKeyDown={handleDialogKeyDown}
          >
            <span className="new-project-dialog__mark">New</span>
            <h2 id="new-project-title">Start a new estimate?</h2>
            <p id="new-project-description">
              This replaces the active project with a clean estimate. Export an
              editable JSON backup first if you need to keep the current work.
            </p>
            <div className="new-project-dialog__actions">
              <Button ref={cancelRef} onClick={closeDialog}>
                Keep current project
              </Button>
              <Button
                variant="primary"
                className="new-project-dialog__confirm"
                onClick={createProject}
              >
                Start new project
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
