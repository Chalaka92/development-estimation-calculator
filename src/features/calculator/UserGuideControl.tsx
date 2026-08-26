import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import './UserGuideControl.css'

type GuideTopicId =
  | 'getting-started'
  | 'project'
  | 'development'
  | 'qa'
  | 'review'
  | 'export'
  | 'history'
  | 'reset'

interface GuideImage {
  fileName: string
  alt: string
  caption: string
}

interface GuideTopic {
  id: GuideTopicId
  title: string
  description: string
  steps: readonly string[]
  tip?: string
  image?: GuideImage
}

const GUIDE_TOPICS: readonly GuideTopic[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    description: 'Use the calculator from left to right, then review the result before exporting or sharing it.',
    steps: [
      'Enter the project or release name and set the delivery assumptions in Project.',
      'Break development work into main items and optional sub-items in Development.',
      'Confirm the QA activities and hours in QA.',
      'Use Review to check estimation health and the complete live estimate.',
      'Use Export & Jira when the estimate is ready to share or convert into work items.',
    ],
    tip: 'Your project is autosaved in this browser as you work.',
  },
  {
    id: 'project',
    title: 'Project setup',
    description: 'Project settings control the delivery assumptions used by the live estimate.',
    steps: [
      'Give the estimate a clear project or release name.',
      'Set total manpower, including decimal values such as 1.5 FTE when appropriate.',
      'Choose a predefined risk buffer or enter a custom percentage.',
      'Use the project workspace controls when you need to manage multiple estimates.',
    ],
    tip: 'Changing manpower affects estimated business duration, not the underlying effort hours.',
    image: {
      fileName: 'project-setup.png',
      alt: 'Project settings area of the development estimation calculator',
      caption: 'Project settings and delivery assumptions.',
    },
  },
  {
    id: 'development',
    title: 'Development work',
    description: 'Build the development work breakdown using main items, sub-items, activities, and planning metadata.',
    steps: [
      'Add a main item for each meaningful feature or delivery area.',
      'Add sub-items when a feature needs a clearer breakdown.',
      'Enter direct hours or use the supported estimation inputs for each activity.',
      'Add delivery role, risk, confidence, dependencies, and notes when they improve planning quality.',
      'Collapse completed items to keep large estimates manageable.',
    ],
    image: {
      fileName: 'development-work.png',
      alt: 'Development work breakdown area with a main item and estimation activities',
      caption: 'Development work breakdown with the standard activity template.',
    },
  },
  {
    id: 'qa',
    title: 'QA estimation',
    description: 'Keep QA visible as a separate part of the estimate instead of hiding it inside development hours.',
    steps: [
      'Review the default QA activities provided by the calculator.',
      'Adjust hours to match the scope and expected testing effort.',
      'Add or remove QA activities when the project needs a different testing profile.',
      'Review the QA share of the estimate before finalising the result.',
    ],
  },
  {
    id: 'review',
    title: 'Review the estimate',
    description: 'Use Review as the final quality check before you communicate the estimate.',
    steps: [
      'Read the Estimation Health findings for missing or risky planning information.',
      'Check high-risk or low-confidence activities before treating the estimate as final.',
      'Review the Live Estimation Table for development, QA, risk buffer, and final hours.',
      'Confirm the business duration and manpower shown in the summary panel.',
    ],
    tip: 'Health findings are advisory. They do not change the calculated hours.',
    image: {
      fileName: 'review-estimate.png',
      alt: 'Review area showing estimation health and the live estimation table',
      caption: 'Review combines estimation health findings with the complete live estimate.',
    },
  },
  {
    id: 'export',
    title: 'Export & Jira',
    description: 'Use the export area once the estimate has been reviewed and is ready to distribute.',
    steps: [
      'Generate work items when you need a structured delivery breakdown.',
      'Export Markdown or PDF for readable estimation documentation.',
      'Export CSV when you need a spreadsheet-friendly or Jira-oriented format.',
      'Export editable JSON when you need a backup that can be imported again later.',
      'Import supported editable JSON when restoring or transferring an estimate.',
    ],
  },
  {
    id: 'history',
    title: 'History & recovery',
    description: 'History protects useful checkpoints and helps recover work when you need to return to an earlier state.',
    steps: [
      'Open History to review saved project snapshots.',
      'Use snapshots before major changes when you want an easy recovery point.',
      'Restore a suitable snapshot if a later change needs to be reversed.',
      'Keep an editable JSON export for important estimates that must be portable outside this browser.',
    ],
  },
  {
    id: 'reset',
    title: 'Reset & recovery',
    description: 'Reset actions are available for individual sections and for the complete project.',
    steps: [
      'Use a section reset when only one part of the estimate needs to return to its defaults.',
      'Use Reset all in the header only when you want to clear the complete current project.',
      'The full reset creates a recovery snapshot before replacing the project with defaults.',
      'For important work, export an editable JSON backup before performing a full reset.',
    ],
    tip: 'Reset all is intentionally separate from this Help button to reduce accidental destructive actions.',
  },
]

function getGuideImageUrl(fileName: string) {
  return `${import.meta.env.BASE_URL}user-guide/${fileName}`
}

export function UserGuideControl() {
  const [open, setOpen] = useState(false)
  const [activeTopicId, setActiveTopicId] = useState<GuideTopicId>('getting-started')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const activeTopic = GUIDE_TOPICS.find((topic) => topic.id === activeTopicId) ?? GUIDE_TOPICS[0]

  const closeDialog = () => setOpen(false)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    const trigger = triggerRef.current
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

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

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) closeDialog()
  }

  const dialog = open
    ? createPortal(
        <div
          className="user-guide-backdrop"
          role="presentation"
          onMouseDown={handleBackdropClick}
        >
          <div
            ref={dialogRef}
            className="user-guide-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-guide-title"
            aria-describedby="user-guide-description"
            onKeyDown={handleDialogKeyDown}
          >
            <header className="user-guide-header">
              <div>
                <span className="user-guide-kicker">Help</span>
                <h2 id="user-guide-title">User guide</h2>
                <p id="user-guide-description">
                  Choose a topic for a quick explanation of the current calculator workflow.
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="user-guide-close"
                aria-label="Close user guide"
                onClick={closeDialog}
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>

            <div className="user-guide-layout">
              <nav className="user-guide-nav" aria-label="User guide topics">
                {GUIDE_TOPICS.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    className={
                      topic.id === activeTopic.id
                        ? 'user-guide-nav__item user-guide-nav__item--active'
                        : 'user-guide-nav__item'
                    }
                    aria-current={topic.id === activeTopic.id ? 'page' : undefined}
                    onClick={() => setActiveTopicId(topic.id)}
                  >
                    {topic.title}
                  </button>
                ))}
              </nav>

              <article className="user-guide-content" aria-live="polite">
                <p className="user-guide-eyebrow">Guide topic</p>
                <h3>{activeTopic.title}</h3>
                <p className="user-guide-summary">{activeTopic.description}</p>
                {activeTopic.image && (
                  <figure className="user-guide-figure">
                    <img
                      src={getGuideImageUrl(activeTopic.image.fileName)}
                      alt={activeTopic.image.alt}
                      loading="lazy"
                    />
                    <figcaption>{activeTopic.image.caption}</figcaption>
                  </figure>
                )}
                <ol>
                  {activeTopic.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                {activeTopic.tip && (
                  <aside className="user-guide-tip">
                    <strong>Tip</strong>
                    <span>{activeTopic.tip}</span>
                  </aside>
                )}
              </article>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="calculator-help-button"
        aria-label="Open user guide"
        title="User guide"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">?</span>
      </button>
      {dialog}
    </>
  )
}
