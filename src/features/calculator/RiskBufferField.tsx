import { useState, type KeyboardEvent } from 'react'

const RISK_BUFFER_PRESETS = [
  { value: 0, label: 'None (0%)' },
  { value: 5, label: 'Low (5%)' },
  { value: 10, label: 'Medium (10%)' },
  { value: 15, label: 'Standard (15%)' },
  { value: 20, label: 'High (20%)' },
  { value: 25, label: 'Very high (25%)' },
] as const

interface RiskBufferFieldProps {
  value: number
  onCommit: (value: number) => void
}

function isPreset(value: number): boolean {
  return RISK_BUFFER_PRESETS.some((preset) => preset.value === value)
}

export function RiskBufferField({ value, onCommit }: RiskBufferFieldProps) {
  const [customSelection, setCustomSelection] = useState<number | null>(null)
  const [editing, setEditing] = useState({ value, draft: String(value) })
  const customSelected = customSelection === value || !isPreset(value)
  const selectedValue = customSelected ? 'custom' : String(value)
  const draft = editing.value === value ? editing.draft : String(value)
  const hintId = 'risk-buffer-hint'

  const commitCustomValue = () => {
    const parsed = Number.parseFloat(draft)
    if (!Number.isFinite(parsed)) {
      setEditing({ value, draft: String(value) })
      return
    }

    const normalized = Math.min(Math.max(parsed, 0), 500)
    setCustomSelection(normalized)
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
    <div className="calculator-field risk-buffer-field">
      <label htmlFor="risk-buffer">Risk buffer</label>
      <div className="risk-buffer-controls">
        <select
          id="risk-buffer"
          aria-describedby={hintId}
          value={selectedValue}
          onChange={(event) => {
            if (event.target.value === 'custom') {
              setCustomSelection(value)
              setEditing({ value, draft: String(value) })
              return
            }

            const riskBufferPercentage = Number(event.target.value)
            setCustomSelection(null)
            onCommit(riskBufferPercentage)
          }}
        >
          {RISK_BUFFER_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
          <option value="custom">
            {customSelected ? `Custom (${value}%)` : 'Custom'}
          </option>
        </select>

        {customSelected && (
          <div className="calculator-number-input risk-buffer-custom-input">
            <input
              aria-label="Custom risk buffer"
              aria-describedby={hintId}
              type="number"
              inputMode="decimal"
              min={0}
              max={500}
              step={0.5}
              value={draft}
              onChange={(event) =>
                setEditing({ value, draft: event.target.value })
              }
              onBlur={commitCustomValue}
              onKeyDown={handleKeyDown}
            />
            <span>%</span>
          </div>
        )}
      </div>
      <small id={hintId}>
        Applied after development and QA. Choose Custom for another percentage.
      </small>
    </div>
  )
}
