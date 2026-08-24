// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ProjectStoreProvider } from '../../app/ProjectStoreProvider'
import { createProjectRuntime } from '../../app/projectRuntime'
import { createEmptyEstimationProject } from '../../domain/factories'
import type { KeyValueStorage } from '../../persistence/projectPersistence'
import { ExportImportPanel } from './ExportImportPanel'

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
  let id = 0
  const dependencies = {
    createId: () => `transfer-${++id}`,
    now: () => '2026-08-24T23:00:00.000Z',
  }
  const runtime = createProjectRuntime(new MemoryStorage(), dependencies)
  render(
    <ProjectStoreProvider store={runtime.store}>
      <ExportImportPanel />
    </ProjectStoreProvider>,
  )
  return { runtime, dependencies }
}

function fileWithText(content: string, name = 'estimate.json'): File {
  const file = new File([content], name, { type: 'application/json' })
  Object.defineProperty(file, 'text', { value: async () => content })
  return file
}

afterEach(cleanup)

describe('ExportImportPanel', () => {
  it('imports a validated typed project into the active store', async () => {
    const { runtime, dependencies } = renderPanel()
    const imported = createEmptyEstimationProject(
      'Imported Release',
      dependencies,
    )
    const input = screen.getByLabelText('Import editable estimate')

    fireEvent.change(input, {
      target: { files: [fileWithText(JSON.stringify(imported))] },
    })

    await waitFor(() =>
      expect(runtime.store.getState().project.name).toBe('Imported Release'),
    )
    expect(screen.getByRole('status').textContent).toBe(
      'Project imported successfully.',
    )
    expect(runtime.store.getState().isDirty).toBe(true)
  })

  it('rejects invalid imports without replacing the project', async () => {
    const { runtime } = renderPanel()
    const original = runtime.store.getState().project

    fireEvent.change(screen.getByLabelText('Import editable estimate'), {
      target: { files: [fileWithText('{not-json')] },
    })

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Invalid JSON'),
    )
    expect(runtime.store.getState().project).toBe(original)
  })

  it('migrates a supported v16 project during import', async () => {
    const { runtime } = renderPanel()
    const legacy = JSON.stringify({
      projectName: 'Legacy Release',
      buffer: '20',
      hoursPerDay: '8',
      teamSize: '1.5',
      daysPerWeek: '5',
      items: [],
      qaEstimation: [{ name: 'Regression', hours: '6.5' }],
    })

    fireEvent.change(screen.getByLabelText('Import editable estimate'), {
      target: { files: [fileWithText(legacy, 'legacy.json')] },
    })

    await waitFor(() =>
      expect(runtime.store.getState().project.name).toBe('Legacy Release'),
    )
    expect(runtime.store.getState().project).toMatchObject({
      qaActivities: [{ name: 'Regression', hours: 6.5 }],
      schedule: { totalManpower: 1.5 },
    })
    expect(screen.getByRole('status').textContent).toBe(
      'Legacy project imported and migrated successfully.',
    )
  })

  it('presents all supported export formats', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: 'Markdown' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'CSV' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'PDF' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Export JSON' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Import project' })).toBeTruthy()
  })
})
