// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SectionResetButton } from './SectionResetButton'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('SectionResetButton', () => {
  it('does not reset the section when confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()
    vi.spyOn(globalThis, 'confirm').mockReturnValue(false)

    render(
      <SectionResetButton
        sectionName="QA estimation"
        confirmation="Reset QA?"
        onReset={onReset}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Reset QA estimation' }))

    expect(globalThis.confirm).toHaveBeenCalledWith('Reset QA?')
    expect(onReset).not.toHaveBeenCalled()
  })

  it('resets the section only after confirmation', async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true)

    render(
      <SectionResetButton
        sectionName="development work breakdown"
        confirmation="Reset development?"
        onReset={onReset}
      />,
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Reset development work breakdown',
      }),
    )

    expect(onReset).toHaveBeenCalledOnce()
  })
})
