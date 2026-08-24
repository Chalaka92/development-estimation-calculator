import { useMemo } from 'react'
import { useProjectStore } from '../../app/useProjectStore'
import { calculateEstimate } from '../../domain/calculations'

const numberFormatter = new Intl.NumberFormat('en', {
  maximumFractionDigits: 2,
})

function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

interface SummaryMetricProps {
  label: string
  value: string
  emphasis?: boolean
}

function SummaryMetric({ label, value, emphasis = false }: SummaryMetricProps) {
  return (
    <div className={emphasis ? 'summary-metric summary-metric--accent' : 'summary-metric'}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function EstimateSummaryPanel() {
  const project = useProjectStore((state) => state.project)
  const summary = useMemo(() => calculateEstimate(project), [project])
  const subItemCount = project.developmentItems.reduce(
    (total, item) => total + item.subItems.length,
    0,
  )

  return (
    <aside
      className="preview-summary"
      aria-labelledby="summary-title"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="preview-summary__heading">
        <div>
          <p className="preview-eyebrow preview-eyebrow--light">Live calculation</p>
          <h2 id="summary-title">Estimate summary</h2>
        </div>
        <span className="preview-live-indicator">Live</span>
      </div>

      <div className="summary-metrics">
        <SummaryMetric
          label="Main items"
          value={formatNumber(project.developmentItems.length)}
        />
        <SummaryMetric label="Sub-items" value={formatNumber(subItemCount)} />
        <SummaryMetric
          label="Development"
          value={`${formatNumber(summary.developmentHours)} h`}
        />
        <SummaryMetric label="QA" value={`${formatNumber(summary.qaHours)} h`} />
        <SummaryMetric
          label="Base effort"
          value={`${formatNumber(summary.baseHours)} h`}
        />
        <SummaryMetric
          label={`Risk buffer (${formatNumber(summary.riskBufferPercentage)}%)`}
          value={`${formatNumber(summary.riskBufferHours)} h`}
        />
        <SummaryMetric
          label="Final estimate"
          value={`${formatNumber(summary.finalHours)} h`}
          emphasis
        />
      </div>

      <div className="delivery-card">
        <p>Expected delivery</p>
        <strong>{formatNumber(summary.deliveryWorkingDays)} working days</strong>
        <span>
          {formatNumber(summary.businessWeeks)} business weeks at{' '}
          {formatNumber(summary.totalManpower)} FTE
        </span>
      </div>

      <dl className="capacity-list">
        <div>
          <dt>Person-days</dt>
          <dd>{formatNumber(summary.personDays)}</dd>
        </div>
        <div>
          <dt>Weekly capacity</dt>
          <dd>{formatNumber(summary.weeklyCapacityHours)} h</dd>
        </div>
        <div>
          <dt>Working pattern</dt>
          <dd>
            {formatNumber(summary.workingHoursPerPersonDay)} h ×{' '}
            {formatNumber(summary.businessDaysPerWeek)} days
          </dd>
        </div>
      </dl>
    </aside>
  )
}
