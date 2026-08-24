// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProjectStoreProvider } from '../../app/ProjectStoreProvider'
import { createProjectRuntime } from '../../app/projectRuntime'
import type { EntityFactoryDependencies } from '../../domain/factories'
import type { KeyValueStorage } from '../../persistence/projectPersistence'
import { EstimateSummaryPanel } from './EstimateSummaryPanel'
import { DevelopmentWorkBreakdownPanel } from './DevelopmentWorkBreakdownPanel'

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
    createId: () => `wbs-${++id}`,
    now: () => '2026-08-24T20:00:00.000Z',
  }
}

function renderEditor() {
  const runtime = createProjectRuntime(new MemoryStorage(), dependencies())
  render(
    <ProjectStoreProvider store={runtime.store}>
      <DevelopmentWorkBreakdownPanel />
      <EstimateSummaryPanel />
    </ProjectStoreProvider>,
  )
  return runtime
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('DevelopmentWorkBreakdownPanel', () => {
  it('adds and edits a direct activity without losing input focus', async () => {
    const user = userEvent.setup()
    const runtime = renderEditor()

    await user.click(screen.getByRole('button', { name: 'Add first main item' }))
    const itemName = screen.getByRole('textbox', { name: 'Main item 1 name' })
    await user.clear(itemName)
    await user.type(itemName, 'Billing')

    expect(document.activeElement).toBe(itemName)
    expect(runtime.store.getState().project.developmentItems[0].name).toBe(
      'Billing',
    )

    const activityName = screen.getByRole('textbox', {
      name: 'Activity 1 name',
    })
    await user.clear(activityName)
    await user.type(activityName, 'Implementation')
    const hours = screen.getByRole('spinbutton', {
      name: 'Activity 1 hours',
    })
    await user.clear(hours)
    await user.type(hours, '12.5')
    await user.tab()

    expect(runtime.store.getState().project.developmentItems[0]).toMatchObject({
      name: 'Billing',
    })
    expect(
      runtime.store.getState().project.developmentItems[0].directEstimation,
    ).toHaveLength(8)
    expect(
      runtime.store.getState().project.developmentItems[0].directEstimation[0],
    ).toMatchObject({ name: 'Implementation', hours: 12.5 })
    expect(screen.getByRole('heading', { name: 'Estimation form' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '+ Add estimation row' })).toBeTruthy()
    expect(
      within(itemName.closest('article')!).getByText('12.5 h'),
    ).toBeTruthy()
    expect(screen.getAllByText('12.5 h').length).toBeGreaterThan(1)
  })

  it('supports sub-items, duplication, deletion, and expansion', async () => {
    const user = userEvent.setup()
    const runtime = renderEditor()
    await user.click(screen.getByRole('button', { name: 'Add first main item' }))
    await user.click(screen.getByRole('button', { name: '+ Add sub-item' }))

    const subItemName = screen.getByRole('textbox', {
      name: 'Sub-item 1 name',
    })
    await user.clear(subItemName)
    await user.type(subItemName, 'Import')

    const subItem = subItemName.closest('article')!
    await user.click(
      within(subItem).getByRole('button', { name: '+ Add estimation row' }),
    )
    await user.click(
      within(subItem).getByRole('button', { name: 'Duplicate sub-item 1' }),
    )

    expect(runtime.store.getState().project.developmentItems[0].subItems).toHaveLength(2)

    await user.click(
      screen.getByRole('button', { name: 'Collapse sub-item 1' }),
    )
    expect(
      screen.queryByText('No estimation activities in this sub-item yet.'),
    ).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Expand sub-item 1' }))

    const firstSubItem = screen
      .getByRole('textbox', { name: 'Sub-item 1 name' })
      .closest('article')!
    await user.click(
      within(firstSubItem).getByRole('button', { name: 'Delete sub-item 1' }),
    )

    expect(runtime.store.getState().project.developmentItems[0].subItems).toHaveLength(1)
  })

  it('confirms before replacing a direct form that contains hours', async () => {
    const user = userEvent.setup()
    const runtime = renderEditor()
    await user.click(screen.getByRole('button', { name: 'Add first main item' }))
    const hours = screen.getByRole('spinbutton', { name: 'Activity 1 hours' })
    await user.clear(hours)
    await user.type(hours, '2')
    await user.tab()

    const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(false)
    const addSubItem = screen.getByRole('button', { name: '+ Add sub-item' })
    await user.click(addSubItem)
    expect(confirm).toHaveBeenCalledOnce()
    expect(runtime.store.getState().project.developmentItems[0].subItems).toHaveLength(0)

    confirm.mockReturnValue(true)
    await user.click(addSubItem)
    const workItem = runtime.store.getState().project.developmentItems[0]
    expect(workItem.directEstimation).toHaveLength(0)
    expect(workItem.subItems).toHaveLength(1)
    expect(workItem.subItems[0].estimation).toHaveLength(8)
  })
})
