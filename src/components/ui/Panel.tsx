import type { HTMLAttributes, ReactNode } from 'react'

interface PanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
}

export function Panel({ children, className = '', ...props }: PanelProps) {
  return (
    <section className={`ui-panel preview-card ${className}`.trim()} {...props}>
      {children}
    </section>
  )
}
