import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  action: ReactNode
  badge?: string
  className?: string
}

export function EmptyState({
  title,
  description,
  action,
  badge,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`ui-empty-state ${className}`.trim()}>
      {badge && <span className="ui-empty-state__badge">{badge}</span>}
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}
