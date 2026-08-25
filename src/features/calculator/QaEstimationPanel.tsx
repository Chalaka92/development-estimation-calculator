import { useState } from 'react'
import { useProjectStore } from '../../app/useProjectStore'
import {
  Button,
  EmptyState,
  ExpandButton,
  Panel,
  PanelHeader,
  StepBadge,
} from '../../components/ui'
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
    <Panel className="qa-panel" aria-labelledby="qa-title">
      <PanelHeader
        className="qa-panel__heading"
        eyebrow="Verification effort"
        title="QA estimation"
        titleId="qa-title"
        description="Add testing, review, regression, and release-verification activities."
        actions={
          <div className="qa-panel__summary">
            <strong>{formatHours(totalHours)}</strong>
            <StepBadge>03</StepBadge>
            <ExpandButton
              expanded={expanded}
              aria-controls="qa-estimation-body"
              aria-label={`${expanded ? 'Collapse' : 'Expand'} QA estimation`}
              onClick={() => setExpanded((current) => !current)}
            />
          </div>
        }
      />

      {expanded && (
        <div id="qa-estimation-body">
          {activities.length === 0 ? (
            <EmptyState
              className="qa-empty-state"
              title="No QA activities yet."
              description="Add the first activity to include quality assurance in the live delivery estimate."
              action={
                <Button variant="primary" onClick={() => actions.addQaActivity()}>
                  Add first QA activity
                </Button>
              }
            />
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
                    <Button
                      size="small"
                      aria-label={`Duplicate QA activity ${index + 1}`}
                      onClick={() => actions.duplicateQaActivity(activity.id)}
                    >
                      Copy
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      className="wbs-danger-action"
                      aria-label={`Delete QA activity ${index + 1}`}
                      onClick={() => actions.deleteQaActivity(activity.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activities.length > 0 && (
            <Button
              variant="dashed"
              className="wbs-add-main qa-add-activity"
              onClick={() => actions.addQaActivity()}
            >
              + Add QA activity
            </Button>
          )}
        </div>
      )}
    </Panel>
  )
}
