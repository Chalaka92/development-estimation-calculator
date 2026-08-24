import { useState } from 'react'
import { useProjectStore } from '../../app/useProjectStore'
import { calculateQaHours } from '../../domain/calculations'
import { InlineNumberField } from './InlineNumberField'

function formatHours(hours: number): string {
  return `${new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(hours)} h`
}

export function QaEstimationPanel() {
  const [expanded, setExpanded] = useState(true)
  const activities = useProjectStore((state) => state.project.qaActivities)
  const actions = useProjectStore((state) => state.actions)
  const totalHours = calculateQaHours(activities)

  return (
    <section className="preview-card qa-panel" aria-labelledby="qa-title">
      <div className="preview-card__heading qa-panel__heading">
        <div>
          <p className="preview-eyebrow">Verification effort</p>
          <h2 id="qa-title">QA estimation</h2>
          <p className="wbs-heading-description">
            Add testing, review, regression, and release-verification activities.
          </p>
        </div>
        <div className="qa-panel__summary">
          <strong>{formatHours(totalHours)}</strong>
          <span className="preview-step">03</span>
          <button
            type="button"
            className="wbs-expand-button"
            aria-expanded={expanded}
            aria-controls="qa-estimation-body"
            aria-label={`${expanded ? 'Collapse' : 'Expand'} QA estimation`}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? '−' : '+'}
          </button>
        </div>
      </div>

      {expanded && (
        <div id="qa-estimation-body">
          {activities.length === 0 ? (
            <div className="qa-empty-state">
              <h3>No QA activities yet.</h3>
              <p>
                Add the first activity to include quality assurance in the live
                delivery estimate.
              </p>
              <button type="button" onClick={() => actions.addQaActivity()}>
                Add first QA activity
              </button>
            </div>
          ) : (
            <div className="qa-activity-list">
              <div className="qa-activity-list__header" aria-hidden="true">
                <span>Activity</span>
                <span>Hours</span>
                <span>Actions</span>
              </div>
              {activities.map((activity, index) => (
                <div className="qa-activity-row" key={activity.id}>
                  <span className="wbs-activity-index">{index + 1}</span>
                  <input
                    className="wbs-name-input"
                    aria-label={`QA activity ${index + 1} name`}
                    value={activity.name}
                    onChange={(event) =>
                      actions.updateQaActivity(activity.id, {
                        name: event.target.value,
                      })
                    }
                  />
                  <InlineNumberField
                    ariaLabel={`QA activity ${index + 1} hours`}
                    value={activity.hours}
                    onCommit={(hours) =>
                      actions.updateQaActivity(activity.id, { hours })
                    }
                  />
                  <div className="wbs-row-actions">
                    <button
                      type="button"
                      aria-label={`Duplicate QA activity ${index + 1}`}
                      onClick={() => actions.duplicateQaActivity(activity.id)}
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      className="wbs-danger-action"
                      aria-label={`Delete QA activity ${index + 1}`}
                      onClick={() => actions.deleteQaActivity(activity.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activities.length > 0 && (
            <button
              type="button"
              className="wbs-add-main qa-add-activity"
              onClick={() => actions.addQaActivity()}
            >
              + Add QA activity
            </button>
          )}
        </div>
      )}
    </section>
  )
}
