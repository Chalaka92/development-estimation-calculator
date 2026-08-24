// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
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

    await user.click(screen.getByRole('button', { name: 'Add first main item' }))
    await user.click(screen.getByRole('button', { name: '+ Add activity' }))
    const developmentHours = screen.getByRole('spinbutton', {
      name: 'Activity 1 hours',
    })
    await user.clear(developmentHours)
    await user.type(developmentHours, '10')
    await user.tab()

    await user.click(
      screen.getByRole('button', { name: 'Add first QA activity' }),
    )
    const qaHours = screen.getByRole('spinbutton', {
      name: 'QA activity 1 hours',
    })
    await user.clear(qaHours)
    await user.type(qaHours, '2')
    await user.tab()

    expect(screen.getByText('13.8 h')).toBeTruthy()
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
    expect(reloadedRuntime.store.getState().project).toMatchObject({
      name: 'Release Candidate',
      developmentItems: [
        { directEstimation: [{ hours: 10 }] },
      ],
      qaActivities: [{ hours: 2 }],
    })
    expect(screen.getByText('13.8 h')).toBeTruthy()
  })
})
