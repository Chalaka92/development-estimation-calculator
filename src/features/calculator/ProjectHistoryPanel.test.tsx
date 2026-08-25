// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProjectStoreProvider } from '../../app/ProjectStoreProvider'
import { createProjectRuntime } from '../../app/projectRuntime'
import type { KeyValueStorage } from '../../persistence/projectPersistence'
import { ProjectHistoryPanel } from './ProjectHistoryPanel'

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function renderPanel() {
  const storage = new MemoryStorage()
  let id = 0
  const runtime = createProjectRuntime(storage, {
    createId: () => `history-${++id}`,
    now: () => '2026-08-25T08:30:00.000Z',
  })
  const itemId = runtime.store.getState().actions.addDevelopmentItem('Billing')
  const activityId = runtime.store.getState().project.developmentItems[0]
    .directEstimation[0].id
  runtime.store.getState().actions.updateEstimationActivity(
    { workItemId: itemId },
    activityId,
    { hours: 10 },
  )
  render(
    <ProjectStoreProvider store={runtime.store}>
      <ProjectHistoryPanel storage={storage} />
    </ProjectStoreProvider>,
  )
  return { runtime, storage, itemId, activityId }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ProjectHistoryPanel', () => {
  it('saves, compares, and restores a named snapshot with recovery', async () => {
    const user = userEvent.setup()
    const { runtime, itemId, activityId } = renderPanel()
    await user.type(screen.getByLabelText('Snapshot name'), 'Baseline')
    await user.click(screen.getByRole('button', { name: 'Save snapshot' }))
    expect(screen.getByRole('option', { name: /Baseline/ })).toBeTruthy()

    act(() => {
      runtime.store.getState().actions.updateEstimationActivity(
        { workItemId: itemId },
        activityId,
        { hours: 18 },
      )
    })
    expect(screen.getByText('+9.2 h')).toBeTruthy()

    vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Restore selected' }))
    expect(
      runtime.store.getState().project.developmentItems[0].directEstimation[0].hours,
    ).toBe(10)
    expect(screen.getByRole('option', { name: /Recovery: Before snapshot restore/ })).toBeTruthy()
  })

  it('saves and applies a reusable template with zero hours', async () => {
    const user = userEvent.setup()
    const { runtime } = renderPanel()
    await user.type(screen.getByLabelText('Template name'), 'Billing Template')
    await user.click(screen.getByRole('button', { name: 'Save template' }))
    expect(screen.getByText('Billing Template')).toBeTruthy()

    vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(runtime.store.getState().project.name).toBe('Billing Template')
    expect(
      runtime.store.getState().project.developmentItems[0].directEstimation[0].hours,
    ).toBe(0)
    expect(screen.getByText(/Template applied/)).toBeTruthy()
  })
})
