// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ProjectStoreProvider } from '../../app/ProjectStoreProvider'
import { createProjectRuntime } from '../../app/projectRuntime'
import type { EntityFactoryDependencies } from '../../domain/factories'
import type { KeyValueStorage } from '../../persistence/projectPersistence'
import { CalculatorWorkspaceTabs } from './CalculatorWorkspaceTabs'

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>()
  getItem(key: string) {
    return this.values.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
  removeItem(key: string) {
    this.values.delete(key)
  }
}

const dependencies: EntityFactoryDependencies = {
  createId: (() => {
    let id = 0
    return () => `tabs-${++id}`
  })(),
  now: () => '2026-08-25T13:00:00.000Z',
}

function renderTabs() {
  const storage = new MemoryStorage()
  const runtime = createProjectRuntime(storage, dependencies)
  render(
    <ProjectStoreProvider store={runtime.store}>
      <CalculatorWorkspaceTabs storage={storage} />
    </ProjectStoreProvider>,
  )
}

afterEach(cleanup)

describe('CalculatorWorkspaceTabs', () => {
  it('shows one section while keeping every section mounted', async () => {
    const user = userEvent.setup()
    renderTabs()

    const projectTab = screen.getByRole('tab', { name: 'Project' })
    const developmentTab = screen.getByRole('tab', { name: 'Development' })
    const projectPanel = screen.getByRole('tabpanel', {
      name: 'Project',
    }) as HTMLElement
    const developmentPanel = document.getElementById(
      'workspace-panel-development',
    ) as HTMLElement

    expect(projectTab.getAttribute('aria-selected')).toBe('true')
    expect(projectPanel.hidden).toBe(false)
    expect(developmentPanel.hidden).toBe(true)

    await user.click(developmentTab)

    expect(developmentTab.getAttribute('aria-selected')).toBe('true')
    expect(projectPanel.hidden).toBe(true)
    expect(developmentPanel.hidden).toBe(false)
    expect(screen.getByRole('button', {
      name: 'Add first main item',
    })).toBeTruthy()
  })

  it('shows estimation health before the consolidated table in Review', async () => {
    const user = userEvent.setup()
    renderTabs()

    await user.click(screen.getByRole('tab', { name: 'Review' }))

    expect(screen.getByRole('heading', {
      name: 'Estimation health review',
    })).toBeTruthy()
    expect(screen.getByText('Needs review')).toBeTruthy()
    expect(screen.getByRole('heading', {
      name: 'Live estimation table',
    })).toBeTruthy()
  })

  it('provides a built-in user guide for the complete workflow', async () => {
    const user = userEvent.setup()
    renderTabs()

    await user.click(screen.getByRole('tab', { name: 'User Guide' }))

    expect(screen.getByRole('heading', { name: 'User guide' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Quick start' })).toBeTruthy()
    expect(screen.getByText('Recommended workflow')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Estimation basics' })).toBeTruthy()
    expect(screen.getByText('Autosave and data safety')).toBeTruthy()
  })

  it('supports arrow, Home, and End keyboard navigation', async () => {
    const user = userEvent.setup()
    renderTabs()

    const project = screen.getByRole('tab', { name: 'Project' })
    project.focus()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(
      screen.getByRole('tab', { name: 'Development' }),
    )

    await user.keyboard('{End}')
    const guide = screen.getByRole('tab', { name: 'User Guide' })
    expect(document.activeElement).toBe(guide)
    expect(guide.getAttribute('aria-selected')).toBe('true')

    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(project)
    expect(project.getAttribute('aria-selected')).toBe('true')
  })
})
