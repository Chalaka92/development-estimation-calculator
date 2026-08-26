import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  USER_GUIDE_TOPICS,
  type GuideTopicId,
} from './userGuideContent'
import './UserGuideControl.css'

function getGuideImageUrl(fileName: string) {
  return `${import.meta.env.BASE_URL}user-guide/${fileName}`
}

export function UserGuideControl() {
  const [open, setOpen] = useState(false)
  const [activeTopicId, setActiveTopicId] = useState<GuideTopicId>('getting-started')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const activeTopic =
    USER_GUIDE_TOPICS.find((topic) => topic.id === activeTopicId) ??
    USER_GUIDE_TOPICS[0]

  const closeDrawer = () => setOpen(false)

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

  const handleDrawerKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeDrawer()
      return
    }

    if (event.key !== 'Tab') return

    const focusable = Array.from(
      drawerRef.current?.querySelectorAll<HTMLElement>(
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
    if (event.target === event.currentTarget) closeDrawer()
  }

  const drawer = open
    ? createPortal(
        <div
          className="user-guide-backdrop"
          role="presentation"
          onMouseDown={handleBackdropClick}
        >
          <aside
            ref={drawerRef}
            className="user-guide-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-guide-title"
            aria-describedby="user-guide-description"
            onKeyDown={handleDrawerKeyDown}
          >
            <header className="user-guide-header">
              <div>
                <span className="user-guide-kicker">Help & guidance</span>
                <h2 id="user-guide-title">User guide</h2>
                <p id="user-guide-description">
                  A practical reference for building, reviewing, protecting, and exporting an estimate.
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="user-guide-close"
                aria-label="Close user guide"
                onClick={closeDrawer}
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>

            <nav className="user-guide-nav" aria-label="User guide topics">
              {USER_GUIDE_TOPICS.map((topic) => (
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

              <ol className="user-guide-steps">
                {activeTopic.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>

              {activeTopic.details && (
                <div className="user-guide-details" aria-label="Additional guidance">
                  {activeTopic.details.map((detail) => (
                    <p key={detail}>{detail}</p>
                  ))}
                </div>
              )}

              {activeTopic.tip && (
                <aside className="user-guide-tip">
                  <strong>Tip</strong>
                  <span>{activeTopic.tip}</span>
                </aside>
              )}
            </article>
          </aside>
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
      {drawer}
    </>
  )
}
