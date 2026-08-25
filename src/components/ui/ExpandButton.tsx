import type { ButtonHTMLAttributes } from 'react'
import { Button } from './Button'

interface ExpandButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  expanded: boolean
}

export function ExpandButton({
  expanded,
  className = '',
  ...props
}: ExpandButtonProps) {
  return (
    <Button
      className={`ui-expand-button wbs-expand-button ${className}`.trim()}
      size="small"
      aria-expanded={expanded}
      {...props}
    >
      <span aria-hidden="true">{expanded ? '−' : '+'}</span>
    </Button>
  )
}
