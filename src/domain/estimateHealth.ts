import { calculateActivityHours, calculateEstimate } from './calculations'
import type {
  EstimationActivity,
  EstimationProject,
  QaActivity,
} from './estimation'

export type EstimationHealthSeverity = 'warning' | 'attention'

export interface EstimationHealthIssue {
  id: string
  severity: EstimationHealthSeverity
  title: string
  detail: string
}

export interface EstimationHealthSummary {
  estimatedActivities: number
  highRiskActivities: number
  lowConfidenceActivities: number
  unassignedDevelopmentRoles: number
  issues: ReadonlyArray<EstimationHealthIssue>
  status: 'ready' | 'attention' | 'warning'
}

type EffectiveActivity = EstimationActivity | QaActivity

function effectiveDevelopmentActivities(
  project: EstimationProject,
): ReadonlyArray<EstimationActivity> {
  return project.developmentItems.flatMap((item) =>
    item.subItems.length > 0
      ? item.subItems.flatMap((subItem) => subItem.estimation)
      : item.directEstimation,
  )
}

function estimated<T extends EffectiveActivity>(
  activities: ReadonlyArray<T>,
): ReadonlyArray<T> {
  return activities.filter((activity) => calculateActivityHours(activity) > 0)
}

export function reviewEstimationHealth(
  project: EstimationProject,
): EstimationHealthSummary {
  const summary = calculateEstimate(project)
  const developmentActivities = estimated(effectiveDevelopmentActivities(project))
  const qaActivities = estimated(project.qaActivities)
  const estimatedActivities = [...developmentActivities, ...qaActivities]

  const highRiskActivities = estimatedActivities.filter(
    (activity) => activity.riskLevel === 'high',
  ).length
  const lowConfidenceActivities = estimatedActivities.filter(
    (activity) =>
      activity.confidencePercentage !== undefined &&
      activity.confidencePercentage < 60,
  ).length
  const unassignedDevelopmentRoles = developmentActivities.filter(
    (activity) => !activity.role?.trim(),
  ).length
  const missingRisk = estimatedActivities.filter(
    (activity) => activity.riskLevel === undefined,
  ).length
  const missingConfidence = estimatedActivities.filter(
    (activity) => activity.confidencePercentage === undefined,
  ).length

  const issues: EstimationHealthIssue[] = []

  if (summary.developmentHours === 0) {
    issues.push({
      id: 'development-zero',
      severity: 'warning',
      title: 'Development effort is still zero',
      detail: 'Add development estimates before treating the project total as delivery-ready.',
    })
  }

  if (summary.developmentHours > 0 && summary.qaHours === 0) {
    issues.push({
      id: 'qa-zero',
      severity: 'warning',
      title: 'QA effort is still zero',
      detail: 'Development work is estimated, but no QA effort is currently included.',
    })
  }

  if (highRiskActivities > 0 && project.schedule.riskBufferPercentage <= 0) {
    issues.push({
      id: 'high-risk-zero-buffer',
      severity: 'warning',
      title: 'High-risk work has no risk buffer',
      detail: `${highRiskActivities} estimated ${highRiskActivities === 1 ? 'activity is' : 'activities are'} marked high risk while the project risk buffer is 0%.`,
    })
  } else if (highRiskActivities > 0) {
    issues.push({
      id: 'high-risk',
      severity: 'attention',
      title: 'High-risk activities need review',
      detail: `${highRiskActivities} estimated ${highRiskActivities === 1 ? 'activity is' : 'activities are'} marked high risk. Confirm assumptions, mitigation, and buffer coverage.`,
    })
  }

  if (lowConfidenceActivities > 0) {
    issues.push({
      id: 'low-confidence',
      severity: 'attention',
      title: 'Low-confidence estimates need review',
      detail: `${lowConfidenceActivities} estimated ${lowConfidenceActivities === 1 ? 'activity has' : 'activities have'} confidence below 60%.`,
    })
  }

  if (unassignedDevelopmentRoles > 0) {
    issues.push({
      id: 'unassigned-role',
      severity: 'attention',
      title: 'Development delivery roles are incomplete',
      detail: `${unassignedDevelopmentRoles} estimated development ${unassignedDevelopmentRoles === 1 ? 'activity has' : 'activities have'} no delivery role assigned.`,
    })
  }

  if (missingRisk > 0 || missingConfidence > 0) {
    const details = [
      missingRisk > 0
        ? `${missingRisk} without a risk rating`
        : null,
      missingConfidence > 0
        ? `${missingConfidence} without confidence`
        : null,
    ].filter(Boolean)

    issues.push({
      id: 'planning-metadata',
      severity: 'attention',
      title: 'Planning metadata is incomplete',
      detail: `Estimated activities include ${details.join(' and ')}. Add these details where they improve the review decision.`,
    })
  }

  const status = issues.some((issue) => issue.severity === 'warning')
    ? 'warning'
    : issues.length > 0
      ? 'attention'
      : 'ready'

  return {
    estimatedActivities: estimatedActivities.length,
    highRiskActivities,
    lowConfidenceActivities,
    unassignedDevelopmentRoles,
    issues,
    status,
  }
}
