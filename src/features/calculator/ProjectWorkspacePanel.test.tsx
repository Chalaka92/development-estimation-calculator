// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProjectStoreProvider } from '../../app/ProjectStoreProvider'
import { createProjectRuntime } from '../../app/projectRuntime'
import type { KeyValueStorage } from '../../persistence/projectPersistence'
import { loadProjectWorkspace } from '../../persistence/projectWorkspace'
import { ProjectWorkspacePanel } from './ProjectWorkspacePanel'

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

function renderPanel() {
  const storage = new MemoryStorage()
  let id = 0
  const runtime = createProjectRuntime(storage, {
    createId: () => `panel-${++id}`,
    now: () => '2026-08-25T11:00:00.000Z',
  })
  runtime.store.getState().actions.renameProject('Current Project')
  render(
    <ProjectStoreProvider store={runtime.store}>
      <ProjectWorkspacePanel storage={storage} />
    </ProjectStoreProvider>,
  )
  return { runtime, storage }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ProjectWorkspacePanel', () => {
  it('creates a new project while retaining the current project', async () => {
    const user = userEvent.setup()
    const { runtime, storage } = renderPanel()
    vi.spyOn(globalThis, 'prompt').mockReturnValue('Second Project')

    await user.click(screen.getByRole('button', { name: 'New project' }))

    expect(runtime.store.getState().project.name).toBe('Second Project')
    expect(screen.getByText('Current Project')).toBeTruthy()
    expect(screen.getByText('Second Project')).toBeTruthy()
    const loaded = loadProjectWorkspace(storage)
    expect(
      loaded.status === 'loaded' ? loaded.workspace.projects : [],
    ).toHaveLength(2)
  })

  it('searches, duplicates, archives, restores, and opens projects', async () => {
    const user = userEvent.setup()
    const { runtime } = renderPanel()

    await user.click(
      screen.getAllByRole('button', { name: 'Duplicate' })[0],
    )
    expect(screen.getByText('Current Project (Copy)')).toBeTruthy()

    await user.type(screen.getByLabelText('Search projects'), 'Copy')
    expect(screen.queryByText('Current Project', { exact: true })).toBeNull()
    expect(screen.getByText('Current Project (Copy)')).toBeTruthy()

    vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Archive' }))
    await user.clear(screen.getByLabelText('Search projects'))
    await user.click(screen.getByRole('button', { name: 'Archived' }))
    expect(screen.getByText('Current Project (Copy)')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Restore' }))
    await user.click(screen.getByRole('button', { name: 'Active' }))
    await user.click(screen.getAllByRole('button', { name: 'Open' })[0])
    expect(runtime.store.getState().project.name).toBe(
      'Current Project (Copy)',
    )
  })
})
