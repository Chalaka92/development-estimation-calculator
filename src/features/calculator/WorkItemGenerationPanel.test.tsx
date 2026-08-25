// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ProjectStoreProvider } from '../../app/ProjectStoreProvider'
import { createProjectRuntime } from '../../app/projectRuntime'
import type { EntityFactoryDependencies } from '../../domain/factories'
import type { KeyValueStorage } from '../../persistence/projectPersistence'
import { WorkItemGenerationPanel } from './WorkItemGenerationPanel'

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function dependencies(): EntityFactoryDependencies {
  let id = 0
  return {
    createId: () => `work-item-${++id}`,
    now: () => '2026-08-25T03:00:00.000Z',
  }
}

function renderPanel() {
  const runtime = createProjectRuntime(new MemoryStorage(), dependencies())
  const actions = runtime.store.getState().actions
  const foundationId = actions.addDevelopmentItem('Foundation')
  const featureId = actions.addDevelopmentItem('Billing')
  const activityId = runtime.store.getState().project.developmentItems[0]
    .directEstimation[0].id
  actions.updateEstimationActivity(
    { workItemId: foundationId },
    activityId,
    { hours: 5, role: 'Backend' },
  )
  actions.updateDevelopmentDependencies(featureId, [foundationId])
  render(
    <ProjectStoreProvider store={runtime.store}>
      <WorkItemGenerationPanel />
    </ProjectStoreProvider>,
  )
  return runtime
}

afterEach(cleanup)

describe('WorkItemGenerationPanel', () => {
  it('previews neutral deliverables and supports local editing and exclusion', async () => {
    const user = userEvent.setup()
    renderPanel()

    expect(document.querySelector('.work-item-toolbar')?.textContent).toContain(
      '2 of 2 items',
    )
    const firstSummary = screen.getByRole('textbox', {
      name: 'Work item 1 summary',
    }) as HTMLInputElement
    expect(firstSummary.value).toBe('Foundation')
    await user.clear(firstSummary)
    await user.type(firstSummary, 'Platform foundation')
    expect(firstSummary.value).toBe('Platform foundation')

    await user.click(screen.getByRole('checkbox', { name: 'Include work item 1' }))
    expect(firstSummary.disabled).toBe(true)
    expect(document.querySelector('.work-item-toolbar')?.textContent).toContain(
      '1 of 2 items',
    )

    await user.click(screen.getByRole('button', { name: 'Reset preview' }))
    expect((screen.getByRole('textbox', {
      name: 'Work item 1 summary',
    }) as HTMLInputElement).value).toBe('Foundation')
    expect(document.querySelector('.work-item-toolbar')?.textContent).toContain(
      '2 of 2 items',
    )
  })

  it('generates detailed child activities without duplicating assigned hours', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('checkbox', {
      name: 'Generate estimation activities as child work items',
    }))
    expect(document.querySelector('.work-item-toolbar')?.textContent).toContain(
      '3 of 3 items',
    )
    expect(document.querySelector('.work-item-toolbar')?.textContent).toContain(
      '5 h assigned to exported items',
    )
    expect(screen.getByDisplayValue('Requirement Analysis / Investigation')).toBeTruthy()

    const activityCard = screen
      .getByDisplayValue('Requirement Analysis / Investigation')
      .closest('article')!
    expect(within(activityCard).getByText('activity')).toBeTruthy()
    expect(within(activityCard).getAllByText('Foundation')).toHaveLength(1)
  })

  it('can include the default zero-hour QA backlog', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('checkbox', { name: 'Include zero-hour activities' }))

    expect(screen.getByDisplayValue('QA Analysis / Test Planning')).toBeTruthy()
    expect(screen.getAllByText('quality').length).toBe(6)
  })

  it('validates Jira CSV mapping before download', async () => {
    const user = userEvent.setup()
    renderPanel()

    expect((screen.getByRole('textbox', {
      name: 'Jira group issue type',
    }) as HTMLInputElement).value).toBe('Epic')
    expect((screen.getByRole('textbox', {
      name: 'Jira deliverable issue type',
    }) as HTMLInputElement).value).toBe('Story')
    await user.click(screen.getByRole('button', { name: 'Export Jira CSV' }))
    expect(screen.getByRole('alert').textContent).toContain(
      'Enter a Jira project or space key',
    )

    const projectKey = screen.getByRole('textbox', {
      name: 'Jira project or space key',
    }) as HTMLInputElement
    await user.type(projectKey, 'ct2')
    expect(projectKey.value).toBe('CT2')
  })
})
