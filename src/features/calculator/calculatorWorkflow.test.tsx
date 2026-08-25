// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { createProjectRuntime } from '../../app/projectRuntime'
import type { EntityFactoryDependencies } from '../../domain/factories'
import {
  loadProject,
  type KeyValueStorage,
} from '../../persistence/projectPersistence'
import { ReactCalculatorPreview } from './ReactCalculatorPreview'

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

function dependencies(): EntityFactoryDependencies {
  let id = 0
  let time = 0
  return {
    createId: () => `workflow-${++id}`,
    now: () => `2026-08-25T01:00:${String(time++).padStart(2, '0')}.000Z`,
  }
}

afterEach(cleanup)

describe('calculator workflow', () => {
  it('persists a complete React estimate and restores it on reload', async () => {
    const user = userEvent.setup()
    const storage = new MemoryStorage()
    const firstRuntime = createProjectRuntime(storage, dependencies())
    const firstRender = render(
      <ReactCalculatorPreview runtime={firstRuntime} storage={storage} />,
    )

    const projectName = screen.getByRole('textbox', {
      name: 'Project or release name',
    })
    await user.clear(projectName)
    await user.type(projectName, 'Release Candidate')

    await user.click(screen.getByRole('tab', { name: 'Development' }))
    await user.click(screen.getByRole('button', { name: 'Add first main item' }))
    const developmentHours = screen.getByRole('spinbutton', {
      name: 'Activity 1 hours',
    })
    await user.clear(developmentHours)
    await user.type(developmentHours, '10')
    await user.tab()

    await user.click(screen.getByRole('tab', { name: 'QA' }))
    const qaHours = screen.getByRole('spinbutton', {
      name: 'QA activity 1 hours',
    })
    await user.clear(qaHours)
    await user.type(qaHours, '2')
    await user.tab()

    expect(screen.getAllByText('13.8 h').length).toBeGreaterThan(1)
    await waitFor(
      () => expect(loadProject(storage).status).toBe('loaded'),
      { timeout: 1_500 },
    )

    firstRender.unmount()
    const reloadedRuntime = createProjectRuntime(storage, dependencies())
    render(
      <ReactCalculatorPreview runtime={reloadedRuntime} storage={storage} />,
    )

    expect(
      screen.getByRole('textbox', { name: 'Project or release name' }),
    ).toHaveProperty('value', 'Release Candidate')
    const reloadedProject = reloadedRuntime.store.getState().project
    expect(reloadedProject.name).toBe('Release Candidate')
    expect(reloadedProject.developmentItems[0].directEstimation).toHaveLength(8)
    expect(reloadedProject.developmentItems[0].directEstimation[0].hours).toBe(10)
    expect(reloadedProject.qaActivities).toHaveLength(6)
    expect(reloadedProject.qaActivities[0].hours).toBe(2)
    expect(screen.getAllByText('13.8 h').length).toBeGreaterThan(1)
  })

  it('flushes pending changes before opening the legacy calculator', () => {
    const storage = new MemoryStorage()
    const runtime = createProjectRuntime(storage, dependencies())
    render(<ReactCalculatorPreview runtime={runtime} storage={storage} />)
    runtime.store.getState().actions.renameProject('Saved Before Legacy')

    const legacyLink = screen.getByRole('link', {
      name: 'Open legacy calculator',
    })
    legacyLink.addEventListener('click', (event) => event.preventDefault())
    fireEvent.click(legacyLink)

    expect(loadProject(storage)).toMatchObject({
      status: 'loaded',
      project: { name: 'Saved Before Legacy' },
    })
    expect(runtime.store.getState().isDirty).toBe(false)
  })

  it('flushes pending changes when the page is leaving', () => {
    const storage = new MemoryStorage()
    const runtime = createProjectRuntime(storage, dependencies())
    render(<ReactCalculatorPreview runtime={runtime} storage={storage} />)
    runtime.store.getState().actions.renameProject('Saved Before Unload')

    globalThis.dispatchEvent(new Event('beforeunload'))

    expect(loadProject(storage)).toMatchObject({
      status: 'loaded',
      project: { name: 'Saved Before Unload' },
    })
    expect(runtime.store.getState().isDirty).toBe(false)
  })
})
