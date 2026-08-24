// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ProjectStoreProvider } from '../../app/ProjectStoreProvider'
import { createProjectRuntime } from '../../app/projectRuntime'
import type { KeyValueStorage } from '../../persistence/projectPersistence'
import { LiveEstimationTable } from './LiveEstimationTable'

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

afterEach(cleanup)

describe('LiveEstimationTable', () => {
  it('shows main items, sub-items, QA, and the risk-adjusted final total', () => {
    let id = 0
    const runtime = createProjectRuntime(new MemoryStorage(), {
      createId: () => `table-${++id}`,
      now: () => '2026-08-25T02:00:00.000Z',
    })
    runtime.store.getState().actions.replaceProject({
      ...runtime.store.getState().project,
      name: 'Parity Review',
      schedule: {
        ...runtime.store.getState().project.schedule,
        riskBufferPercentage: 10,
      },
      developmentItems: [
        {
          id: 'billing',
          name: 'Billing',
          directEstimation: [],
          subItems: [
            {
              id: 'import',
              name: 'Import',
              estimation: [{ id: 'api', name: 'API', hours: 12.5 }],
            },
          ],
        },
      ],
      qaActivities: [{ id: 'qa', name: 'Regression', hours: 2.5 }],
    })

    render(
      <ProjectStoreProvider store={runtime.store}>
        <LiveEstimationTable />
      </ProjectStoreProvider>,
    )

    const table = screen.getByRole('table')
    expect(within(table).getByRole('rowheader', { name: '1' })).toBeTruthy()
    expect(within(table).getByRole('rowheader', { name: '1.1' })).toBeTruthy()
    expect(within(table).getAllByText('12.5 h')).toHaveLength(2)
    expect(within(table).getByRole('rowheader', { name: 'QA' })).toBeTruthy()
    expect(within(table).getByText('16.5 h')).toBeTruthy()
  })
})
