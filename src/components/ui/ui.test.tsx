// @vitest-environment jsdom

import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { Button, EmptyState, ExpandButton, Panel, PanelHeader } from './index'

afterEach(cleanup)

describe('shared UI primitives', () => {
  it('renders a safe button with its variant and forwards its ref', () => {
    const ref = createRef<HTMLButtonElement>()

    render(
      <Button ref={ref} variant="primary">
        Save estimate
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Save estimate' })
    expect(button.getAttribute('type')).toBe('button')
    expect(button.className).toContain('ui-button--primary')
    expect(ref.current).toBe(button)
  })

  it('exposes expansion state and keeps the icon decorative', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()

    render(
      <ExpandButton
        expanded={false}
        aria-label="Expand QA estimation"
        onClick={onClick}
      />,
    )

    const button = screen.getByRole('button', { name: 'Expand QA estimation' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    await user.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('composes a labelled panel header and reusable empty state', () => {
    render(
      <Panel aria-labelledby="panel-title">
        <PanelHeader
          eyebrow="Scope"
          title="Work breakdown"
          titleId="panel-title"
          description="Add work items."
          step="02"
        />
        <EmptyState
          badge="0 items"
          title="No work yet"
          description="Add the first item."
          action={<Button>Add item</Button>}
        />
      </Panel>,
    )

    expect(screen.getByRole('region', { name: 'Work breakdown' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'No work yet' })).toBeTruthy()
    expect(screen.getByText('0 items')).toBeTruthy()
  })
})
