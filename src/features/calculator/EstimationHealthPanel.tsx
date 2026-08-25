import { useMemo } from 'react'
import { useProjectStore } from '../../app/useProjectStore'
import { Panel, PanelHeader } from '../../components/ui'
import { reviewEstimationHealth } from '../../domain/estimateHealth'
import './EstimationHealthPanel.css'

const STATUS_LABELS = {
  ready: 'Ready for review',
  attention: 'Check details',
  warning: 'Needs review',
} as const

export function EstimationHealthPanel() {
  const project = useProjectStore((state) => state.project)
  const health = useMemo(() => reviewEstimationHealth(project), [project])

  return (
    <Panel
      className="estimation-health-panel"
      aria-labelledby="estimation-health-title"
    >
      <PanelHeader
        eyebrow="Estimate quality"
        title="Estimation health review"
        titleId="estimation-health-title"
        description="Use the existing effort, role, risk, confidence, QA, and buffer data to spot areas that deserve another review before sharing the estimate."
        actions={
          <span
            className={`estimation-health-status estimation-health-status--${health.status}`}
            role="status"
          >
            {STATUS_LABELS[health.status]}
          </span>
        }
      />

      <dl className="estimation-health-metrics" aria-label="Estimation health summary">
        <div>
          <dt>Estimated activities</dt>
          <dd>{health.estimatedActivities}</dd>
        </div>
        <div>
          <dt>High risk</dt>
          <dd>{health.highRiskActivities}</dd>
        </div>
        <div>
          <dt>Confidence below 60%</dt>
          <dd>{health.lowConfidenceActivities}</dd>
        </div>
        <div>
          <dt>Unassigned dev roles</dt>
          <dd>{health.unassignedDevelopmentRoles}</dd>
        </div>
      </dl>

      {health.issues.length === 0 ? (
        <div className="estimation-health-ready" role="status">
          <strong>No immediate review flags.</strong>
          <span>
            The currently estimated work has QA coverage and the planning details checked by this review are complete.
          </span>
        </div>
      ) : (
        <ul className="estimation-health-issues" aria-label="Estimate review findings">
          {health.issues.map((issue) => (
            <li
              key={issue.id}
              className={`estimation-health-issue estimation-health-issue--${issue.severity}`}
            >
              <span className="estimation-health-issue__marker" aria-hidden="true" />
              <div>
                <strong>{issue.title}</strong>
                <p>{issue.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="estimation-health-note">
        These are review prompts, not validation errors. They do not change the estimate or block export.
      </p>
    </Panel>
  )
}
