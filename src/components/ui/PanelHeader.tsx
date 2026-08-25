import type { ReactNode } from 'react'
import { StepBadge } from './StepBadge'

interface PanelHeaderProps {
  eyebrow: string
  title: string
  titleId: string
  step?: string
  description?: string
  actions?: ReactNode
  className?: string
  titleDetail?: ReactNode
}

export function PanelHeader({
  eyebrow,
  title,
  titleId,
  step,
  description,
  actions,
  className = '',
  titleDetail,
}: PanelHeaderProps) {
  return (
    <div className={`ui-panel-header calculator-card__heading ${className}`.trim()}>
      <div>
        <p className="calculator-eyebrow">{eyebrow}</p>
        <h2 id={titleId}>{title}</h2>
        {titleDetail}
        {description && <p className="wbs-heading-description">{description}</p>}
      </div>
      {actions ?? (step && <StepBadge>{step}</StepBadge>)}
    </div>
  )
}
