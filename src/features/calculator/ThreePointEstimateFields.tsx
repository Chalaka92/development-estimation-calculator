import { calculateActivityHours } from '../../domain/calculations'
import type {
  EstimationActivity,
  ThreePointEstimate,
} from '../../domain/estimation'
import { InlineNumberField } from './InlineNumberField'

type ThreePointActivity = Pick<
  EstimationActivity,
  'hours' | 'threePointEstimate'
>

interface ThreePointEstimateFieldsProps {
  activity: ThreePointActivity
  labelPrefix: string
  onChange: (estimate: ThreePointEstimate) => void
}

export function ThreePointEstimateFields({
  activity,
  labelPrefix,
  onChange,
}: ThreePointEstimateFieldsProps) {
  const estimate = activity.threePointEstimate
  if (!estimate) return null

  const update = (changes: Partial<ThreePointEstimate>) =>
    onChange({ ...estimate, ...changes })

  return (
    <fieldset className="three-point-fields">
      <legend>Three-point estimate</legend>
      <label>
        <span>Optimistic</span>
        <InlineNumberField
          ariaLabel={`${labelPrefix} optimistic hours`}
          value={estimate.optimisticHours}
          onCommit={(optimisticHours) => update({ optimisticHours })}
        />
      </label>
      <label>
        <span>Most likely</span>
        <InlineNumberField
          ariaLabel={`${labelPrefix} most likely hours`}
          value={estimate.mostLikelyHours}
          onCommit={(mostLikelyHours) => update({ mostLikelyHours })}
        />
      </label>
      <label>
        <span>Pessimistic</span>
        <InlineNumberField
          ariaLabel={`${labelPrefix} pessimistic hours`}
          value={estimate.pessimisticHours}
          onCommit={(pessimisticHours) => update({ pessimisticHours })}
        />
      </label>
      <div className="three-point-result">
        <span>PERT expected</span>
        <strong>
          {calculateActivityHours(activity).toLocaleString('en', {
            maximumFractionDigits: 2,
          })} h
        </strong>
        <small>(O + 4M + P) / 6</small>
      </div>
    </fieldset>
  )
}
