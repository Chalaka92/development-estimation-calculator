import { Button } from '../../components/ui'

interface SectionResetButtonProps {
  sectionName: string
  confirmation: string
  onReset: () => void
}

export function SectionResetButton({
  sectionName,
  confirmation,
  onReset,
}: SectionResetButtonProps) {
  const reset = () => {
    if (globalThis.confirm(confirmation)) onReset()
  }

  return (
    <Button
      variant="danger"
      size="small"
      className="section-reset-button"
      aria-label={`Reset ${sectionName}`}
      onClick={reset}
    >
      Reset
    </Button>
  )
}
