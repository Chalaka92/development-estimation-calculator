// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ProjectStoreProvider } from '../../app/ProjectStoreProvider'
import { createProjectRuntime } from '../../app/projectRuntime'
import type { KeyValueStorage } from '../../persistence/projectPersistence'
import { NewProjectControl } from './NewProjectControl'

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

function renderControl() {
  let id = 0
  const runtime = createProjectRuntime(new MemoryStorage(), {
    createId: () => `new-${++id}`,
    now: () => '2026-08-25T00:00:00.000Z',
  })
  runtime.store.getState().actions.renameProject('Keep Me')
  runtime.store.getState().actions.addDevelopmentItem('Existing Item')
  render(
    <ProjectStoreProvider store={runtime.store}>
      <NewProjectControl />
    </ProjectStoreProvider>,
  )
  return runtime
}

afterEach(cleanup)

describe('NewProjectControl', () => {
  it('cancels without changing the active project', async () => {
    const user = userEvent.setup()
    const runtime = renderControl()
    const project = runtime.store.getState().project

    await user.click(screen.getByRole('button', { name: 'New project' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    const cancel = screen.getByRole('button', { name: 'Keep current project' })
    expect(document.activeElement).toBe(cancel)
    await user.click(cancel)

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(runtime.store.getState().project).toBe(project)
  })

  it('contains keyboard focus, closes with Escape, and restores focus', async () => {
    const user = userEvent.setup()
    renderControl()
    const trigger = screen.getByRole('button', { name: 'New project' })

    await user.click(trigger)
    const cancel = screen.getByRole('button', { name: 'Keep current project' })
    const confirm = screen.getByRole('button', { name: 'Start new project' })
    expect(document.activeElement).toBe(cancel)

    await user.tab()
    expect(document.activeElement).toBe(confirm)
    await user.tab()
    expect(document.activeElement).toBe(cancel)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('replaces the active project only after confirmation', async () => {
    const user = userEvent.setup()
    const runtime = renderControl()
    const previousId = runtime.store.getState().project.id

    await user.click(screen.getByRole('button', { name: 'New project' }))
    await user.click(screen.getByRole('button', { name: 'Start new project' }))

    expect(runtime.store.getState()).toMatchObject({
      isDirty: true,
      project: {
        name: 'Untitled Estimate',
        developmentItems: [],
        qaActivities: expect.arrayContaining([
          expect.objectContaining({
            name: 'QA Analysis / Test Planning',
            hours: 0,
          }),
          expect.objectContaining({
            name: 'UAT / Release Validation Support',
            hours: 0,
          }),
        ]),
      },
    })
    expect(runtime.store.getState().project.qaActivities).toHaveLength(6)
    expect(runtime.store.getState().project.id).not.toBe(previousId)
  })
})
