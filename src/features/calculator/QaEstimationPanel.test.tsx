// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ProjectStoreProvider } from '../../app/ProjectStoreProvider'
import { createProjectRuntime } from '../../app/projectRuntime'
import type { EntityFactoryDependencies } from '../../domain/factories'
import type { KeyValueStorage } from '../../persistence/projectPersistence'
import { EstimateSummaryPanel } from './EstimateSummaryPanel'
import { QaEstimationPanel } from './QaEstimationPanel'

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
  return {
    createId: () => `qa-${++id}`,
    now: () => '2026-08-24T21:00:00.000Z',
  }
}

function renderEditor() {
  const runtime = createProjectRuntime(new MemoryStorage(), dependencies())
  render(
    <ProjectStoreProvider store={runtime.store}>
      <QaEstimationPanel />
      <EstimateSummaryPanel />
    </ProjectStoreProvider>,
  )
  return runtime
}

afterEach(cleanup)

describe('QaEstimationPanel', () => {
  it('adds and edits decimal QA effort without losing input focus', async () => {
    const user = userEvent.setup()
    const runtime = renderEditor()
    await user.click(
      screen.getByRole('button', { name: 'Add first QA activity' }),
    )

    const name = screen.getByRole('textbox', { name: 'QA activity 1 name' })
    await user.clear(name)
    await user.type(name, 'Regression testing')
    expect(document.activeElement).toBe(name)

    const hours = screen.getByRole('spinbutton', {
      name: 'QA activity 1 hours',
    })
    await user.clear(hours)
    await user.type(hours, '7.5')
    await user.tab()

    expect(runtime.store.getState().project.qaActivities[0]).toMatchObject({
      name: 'Regression testing',
      hours: 7.5,
    })
    expect(screen.getAllByText('7.5 h').length).toBeGreaterThan(1)
    expect(screen.getByText('8.63 h')).toBeTruthy()
  })

  it('duplicates and deletes QA activities', async () => {
    const user = userEvent.setup()
    const runtime = renderEditor()
    await user.click(
      screen.getByRole('button', { name: 'Add first QA activity' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Duplicate QA activity 1' }),
    )

    expect(runtime.store.getState().project.qaActivities).toHaveLength(2)
    expect(runtime.store.getState().project.qaActivities[1].name).toBe(
      'New QA Activity (Copy)',
    )

    await user.click(
      screen.getByRole('button', { name: 'Delete QA activity 1' }),
    )
    expect(runtime.store.getState().project.qaActivities).toHaveLength(1)
  })

  it('collapses and restores the QA editor', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.click(
      screen.getByRole('button', { name: 'Collapse QA estimation' }),
    )
    expect(
      screen.queryByRole('button', { name: 'Add first QA activity' }),
    ).toBeNull()

    await user.click(
      screen.getByRole('button', { name: 'Expand QA estimation' }),
    )
    expect(
      screen.getByRole('button', { name: 'Add first QA activity' }),
    ).toBeTruthy()
  })
})
