import { useProjectStore } from '../../app/useProjectStore'
import { Button } from '../../components/ui'
import {
  calculateActivityHours,
  calculateEstimationHours,
} from '../../domain/calculations'
import type {
  EstimationActivity,
  EntityId,
} from '../../domain/estimation'
import { createThreePointEstimate } from '../../domain/factories'
import type { EstimationOwner } from '../../state/projectStore'
import { InlineNumberField } from './InlineNumberField'
import { ThreePointEstimateFields } from './ThreePointEstimateFields'

interface EstimationActivityRowsProps {
  owner: EstimationOwner
  activities: ReadonlyArray<EstimationActivity>
  emptyMessage: string
}

export function EstimationActivityRows({
  owner,
  activities,
  emptyMessage,
}: EstimationActivityRowsProps) {
  const actions = useProjectStore((state) => state.actions)

  const updateName = (activityId: EntityId, name: string) =>
    actions.updateEstimationActivity(owner, activityId, { name })

  return (
    <div className="wbs-estimation-form">
      <h4>Estimation form</h4>
      {activities.length === 0 ? (
        <p className="wbs-empty-estimation">{emptyMessage}</p>
      ) : (
        <div className="wbs-activity-list">
          <div className="wbs-activity-list__header" aria-hidden="true">
            <span>Activity</span>
            <span>Final hours</span>
            <span>Actions</span>
          </div>
          {activities.map((activity, index) => (
            <div className="wbs-activity-row" key={activity.id}>
              <span className="wbs-activity-index">{index + 1}</span>
              <input
                className="wbs-name-input"
                aria-label={`Activity ${index + 1} name`}
                value={activity.name}
                onChange={(event) => updateName(activity.id, event.target.value)}
              />
              <div className="activity-estimate-cell">
                {activity.threePointEstimate ? (
                  <strong>{calculateActivityHours(activity).toLocaleString('en', {
                    maximumFractionDigits: 2,
                  })} h</strong>
                ) : (
                  <InlineNumberField
                    ariaLabel={`Activity ${index + 1} hours`}
                    value={activity.hours}
                    onCommit={(hours) =>
                      actions.updateEstimationActivity(owner, activity.id, { hours })
                    }
                  />
                )}
              </div>
              <div className="wbs-row-actions">
                <Button
                  size="small"
                  aria-pressed={Boolean(activity.threePointEstimate)}
                  aria-label={`${activity.threePointEstimate ? 'Use single-point estimate for' : 'Use three-point estimate for'} activity ${index + 1}`}
                  onClick={() =>
                    actions.updateEstimationActivity(owner, activity.id, {
                      hours: calculateActivityHours(activity),
                      threePointEstimate: activity.threePointEstimate
                        ? undefined
                        : createThreePointEstimate(activity.hours),
                    })
                  }
                >
                  {activity.threePointEstimate ? '1-point' : '3-point'}
                </Button>
                <Button
                  size="small"
                  title="Duplicate activity"
                  aria-label={`Duplicate activity ${index + 1}`}
                  onClick={() =>
                    actions.duplicateEstimationActivity(owner, activity.id)
                  }
                >
                  Copy
                </Button>
                <Button
                  variant="danger"
                  size="small"
                  className="wbs-danger-action"
                  title="Delete activity"
                  aria-label={`Delete activity ${index + 1}`}
                  onClick={() =>
                    actions.deleteEstimationActivity(owner, activity.id)
                  }
                >
                  Delete
                </Button>
              </div>
              <ThreePointEstimateFields
                activity={activity}
                labelPrefix={`Activity ${index + 1}`}
                onChange={(threePointEstimate) =>
                  actions.updateEstimationActivity(owner, activity.id, {
                    threePointEstimate,
                  })
                }
              />
            </div>
          ))}
        </div>
      )}
      <div className="wbs-estimation-footer">
        <Button
          variant="dashed"
          size="small"
          className="wbs-add-inline"
          onClick={() => actions.addEstimationActivity(owner)}
        >
          + Add estimation row
        </Button>
        <strong>
          Form total: {calculateEstimationHours(activities).toLocaleString('en', {
            maximumFractionDigits: 2,
          })} h
        </strong>
      </div>
    </div>
  )
}
