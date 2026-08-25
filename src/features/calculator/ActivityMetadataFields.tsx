import type {
  EstimationActivity,
  RiskLevel,
} from '../../domain/estimation'
import {
  ESTIMATION_ROLE_OPTIONS,
  RISK_LEVEL_OPTIONS,
} from '../../domain/metadata'
import type {
  EstimationActivityChanges,
  QaActivityChanges,
} from '../../state/projectStore'

type MetadataActivity = Pick<
  EstimationActivity,
  'role' | 'riskLevel' | 'confidencePercentage' | 'notes'
>

interface ActivityMetadataFieldsProps {
  activity: MetadataActivity
  labelPrefix: string
  onChange: (changes: EstimationActivityChanges | QaActivityChanges) => void
}

export function ActivityMetadataFields({
  activity,
  labelPrefix,
  onChange,
}: ActivityMetadataFieldsProps) {
  return (
    <fieldset className="activity-metadata-fields">
      <legend>Planning details</legend>
      <label>
        <span>Delivery role</span>
        <select
          aria-label={`${labelPrefix} delivery role`}
          value={activity.role ?? ''}
          onChange={(event) =>
            onChange({ role: event.target.value || undefined })
          }
        >
          <option value="">Unassigned</option>
          {ESTIMATION_ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Risk</span>
        <select
          aria-label={`${labelPrefix} risk level`}
          value={activity.riskLevel ?? ''}
          onChange={(event) =>
            onChange({
              riskLevel: (event.target.value || undefined) as
                | RiskLevel
                | undefined,
            })
          }
        >
          <option value="">Not set</option>
          {RISK_LEVEL_OPTIONS.map((risk) => (
            <option key={risk.value} value={risk.value}>{risk.label}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Confidence</span>
        <input
          aria-label={`${labelPrefix} confidence percentage`}
          type="number"
          inputMode="numeric"
          min="0"
          max="100"
          step="1"
          value={activity.confidencePercentage ?? ''}
          placeholder="Not set"
          onChange={(event) => {
            const value = event.target.value
            onChange({
              confidencePercentage: value === ''
                ? undefined
                : Math.min(Math.max(Number(value), 0), 100),
            })
          }}
        />
      </label>
      <label className="activity-notes-field">
        <span>Notes</span>
        <textarea
          aria-label={`${labelPrefix} notes`}
          maxLength={4000}
          value={activity.notes ?? ''}
          placeholder="Assumptions, constraints, or implementation notes"
          onChange={(event) => onChange({ notes: event.target.value })}
        />
      </label>
    </fieldset>
  )
}
