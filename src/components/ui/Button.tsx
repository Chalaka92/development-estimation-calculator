import { forwardRef, type ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dashed'
type ButtonSize = 'small' | 'medium'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'secondary',
      size = 'medium',
      fullWidth = false,
      className = '',
      type = 'button',
      ...props
    },
    ref,
  ) {
    const classes = [
      'ui-button',
      `ui-button--${variant}`,
      `ui-button--${size}`,
      fullWidth ? 'ui-button--full-width' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return <button ref={ref} type={type} className={classes} {...props} />
  },
)
