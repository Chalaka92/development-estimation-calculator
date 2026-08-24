import { useState, type KeyboardEvent } from 'react'

interface NumberFieldProps {
  id: string
  label: string
  value: number
  min: number
  max?: number
  step?: number
  suffix: string
  hint: string
  onCommit: (value: number) => void
}

export function NumberField({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  hint,
  onCommit,
}: NumberFieldProps) {
  const [editing, setEditing] = useState({ value, draft: String(value) })
  const draft = editing.value === value ? editing.draft : String(value)
  const setDraft = (nextDraft: string) =>
    setEditing({ value, draft: nextDraft })

  const commit = () => {
    const parsed = Number.parseFloat(draft)
    if (!Number.isFinite(parsed)) {
      setEditing({ value, draft: String(value) })
      return
    }

    const upperBound = max ?? Number.POSITIVE_INFINITY
    const normalized = Math.min(Math.max(parsed, min), upperBound)
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
    <div className="preview-field">
      <label htmlFor={id}>{label}</label>
      <div className="preview-number-input">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
        />
        <span>{suffix}</span>
      </div>
      <small>{hint}</small>
    </div>
  )
}
