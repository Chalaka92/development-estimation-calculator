interface StepBadgeProps {
  children: string
}

export function StepBadge({ children }: StepBadgeProps) {
  return <span className="ui-step calculator-step">{children}</span>
}
