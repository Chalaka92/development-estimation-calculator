// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { UserGuideControl } from './UserGuideControl'

afterEach(cleanup)

describe('UserGuideControl', () => {
  it('opens from the help icon and switches guide topics', async () => {
    const user = userEvent.setup()
    render(<UserGuideControl />)

    await user.click(screen.getByRole('button', { name: 'Open user guide' }))

    expect(screen.getByRole('dialog', { name: 'User guide' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Getting started' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'QA estimation' }))

    expect(screen.getByRole('heading', { name: 'QA estimation' })).toBeTruthy()
    expect(screen.getByText(/default QA activities/i)).toBeTruthy()
  })

  it('shows the relevant in-app screenshot for visual guide topics', async () => {
    const user = userEvent.setup()
    render(<UserGuideControl />)

    await user.click(screen.getByRole('button', { name: 'Open user guide' }))
    await user.click(screen.getByRole('button', { name: 'Project setup' }))

    const image = screen.getByRole('img', {
      name: 'Project settings area of the development estimation calculator',
    })
    expect(image.getAttribute('src')).toContain('user-guide/project-setup.png')
    expect(screen.getByText('Project settings and delivery assumptions.')).toBeTruthy()
  })

  it('closes with Escape and restores focus to the help icon', async () => {
    const user = userEvent.setup()
    render(<UserGuideControl />)
    const trigger = screen.getByRole('button', { name: 'Open user guide' })

    await user.click(trigger)
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Close user guide' }),
    )

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
})
