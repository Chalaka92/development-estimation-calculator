// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ProjectStoreProvider } from '../../app/ProjectStoreProvider'
import { createProjectRuntime } from '../../app/projectRuntime'
import type { EntityFactoryDependencies } from '../../domain/factories'
import type { KeyValueStorage } from '../../persistence/projectPersistence'
import { ProjectSettingsPanel } from './ProjectSettingsPanel'

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
  createId: () => 'settings-id',
  now: () => '2026-08-25T12:00:00.000Z',
}

function renderSettings(riskBufferPercentage = 15) {
  const runtime = createProjectRuntime(new MemoryStorage(), dependencies)
  runtime.store.getState().actions.updateSchedule({ riskBufferPercentage })
  render(
    <ProjectStoreProvider store={runtime.store}>
      <ProjectSettingsPanel />
    </ProjectStoreProvider>,
  )
  return runtime
}

afterEach(cleanup)

describe('ProjectSettingsPanel risk buffer', () => {
  it('offers named presets and applies a selected percentage', async () => {
    const user = userEvent.setup()
    const runtime = renderSettings()
    const riskBuffer = screen.getByRole('combobox', { name: 'Risk buffer' })

    expect((riskBuffer as HTMLSelectElement).value).toBe('15')
    expect(screen.getByRole('option', { name: 'None (0%)' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Very high (25%)' })).toBeTruthy()

    await user.selectOptions(riskBuffer, '10')

    expect(runtime.store.getState().project.schedule.riskBufferPercentage).toBe(10)
    expect(screen.queryByRole('spinbutton', {
      name: 'Custom risk buffer',
    })).toBeNull()
  })

  it('shows, stores, and retains a custom percentage as the custom item', async () => {
    const user = userEvent.setup()
    const runtime = renderSettings()
    const riskBuffer = screen.getByRole('combobox', { name: 'Risk buffer' })

    await user.selectOptions(riskBuffer, 'custom')
    const custom = screen.getByRole('spinbutton', {
      name: 'Custom risk buffer',
    })
    await user.clear(custom)
    await user.type(custom, '12.5')
    await user.tab()

    expect(runtime.store.getState().project.schedule.riskBufferPercentage).toBe(12.5)
    expect((riskBuffer as HTMLSelectElement).value).toBe('custom')
    expect(screen.getByRole('option', { name: 'Custom (12.5%)' })).toBeTruthy()
  })

  it('restores a previously saved non-preset percentage as Custom', () => {
    renderSettings(18.5)

    expect((screen.getByRole('combobox', {
      name: 'Risk buffer',
    }) as HTMLSelectElement).value).toBe('custom')
    expect(screen.getByRole('option', { name: 'Custom (18.5%)' })).toBeTruthy()
    expect((screen.getByRole('spinbutton', {
      name: 'Custom risk buffer',
    }) as HTMLInputElement).value).toBe('18.5')
  })
})
