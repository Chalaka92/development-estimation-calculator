import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useProjectStore } from '../../app/useProjectStore'
import { Button } from '../../components/ui'
import { createProjectSnapshot } from '../../persistence/projectArchive'
import type { KeyValueStorage } from '../../persistence/projectPersistence'

export function NewProjectControl({
  storage = globalThis.localStorage,
}: {
  storage?: KeyValueStorage
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const project = useProjectStore((state) => state.project)
  const [recoveryError, setRecoveryError] = useState<string | null>(null)
  const resetProject = useProjectStore(
    (state) => state.actions.resetProject,
  )

  const createProject = () => {
    const recovery = createProjectSnapshot(
      storage,
      project,
      'Before full reset',
      'recovery',
    )
    if (recovery.status !== 'success') {
      setRecoveryError(recovery.error)
      return
    }
    resetProject()
    setRecoveryError(null)
    setOpen(false)
  }

  const closeDialog = () => {
    setRecoveryError(null)
    setOpen(false)
  }

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
        className="calculator-new-project"
        onClick={() => setOpen(true)}
      >
        Reset all
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
            <span className="new-project-dialog__mark">Full reset</span>
            <h2 id="new-project-title">Reset the complete project?</h2>
            <p id="new-project-description">
              This clears project settings, development work, and QA hours, then
              restores all defaults. Export an editable JSON backup first if you
              need to keep the current work.
            </p>
            {recoveryError && <p className="new-project-dialog__error" role="alert">{recoveryError}</p>}
            <div className="new-project-dialog__actions">
              <Button ref={cancelRef} onClick={closeDialog}>
                Keep current project
              </Button>
              <Button
                variant="primary"
                className="new-project-dialog__confirm"
                onClick={createProject}
              >
                Reset everything
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
