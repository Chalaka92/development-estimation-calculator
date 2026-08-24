import { useState, type KeyboardEvent } from 'react'

interface InlineNumberFieldProps {
  ariaLabel: string
  value: number
  onCommit: (value: number) => void
}

export function InlineNumberField({
  ariaLabel,
  value,
  onCommit,
}: InlineNumberFieldProps) {
  const [editing, setEditing] = useState({ value, draft: String(value) })
  const draft = editing.value === value ? editing.draft : String(value)

  const commit = () => {
    const parsed = Number.parseFloat(draft)
    const normalized = Number.isFinite(parsed) ? Math.max(parsed, 0) : value
    setEditing({ value: normalized, draft: String(normalized) })
    if (normalized !== value) onCommit(normalized)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur()
    if (event.key === 'Escape') {
      setEditing({ value, draft: String(value) })
      event.currentTarget.blur()
    }
  }

  return (
    <div className="wbs-hours-input">
      <input
        type="number"
        aria-label={ariaLabel}
        min={0}
        step={0.25}
        inputMode="decimal"
        value={draft}
        onChange={(event) =>
          setEditing({ value, draft: event.target.value })
        }
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
      <span>h</span>
    </div>
  )
}
