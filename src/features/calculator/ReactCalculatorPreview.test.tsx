import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { resolveAppMode } from '../../app/appMode'
import { createProjectRuntime } from '../../app/projectRuntime'
import {
  createEmptyEstimationProject,
  type EntityFactoryDependencies,
} from '../../domain/factories'
import {
  saveProject,
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

const dependencies: EntityFactoryDependencies = {
  createId: (() => {
    let id = 0
    return () => `preview-${++id}`
  })(),
  now: () => '2026-08-24T19:00:00.000Z',
}

describe('React calculator preview', () => {
  it('keeps the legacy calculator as the default mode', () => {
    expect(resolveAppMode('')).toBe('legacy')
    expect(resolveAppMode('?ui=legacy')).toBe('legacy')
    expect(resolveAppMode('?ui=react')).toBe('react-preview')
  })

  it('renders typed settings and calculated totals', () => {
    const storage = new MemoryStorage()
    const emptyProject = createEmptyEstimationProject(
      'Capital Trust Release',
      dependencies,
    )
    saveProject(storage, {
      ...emptyProject,
      schedule: {
        ...emptyProject.schedule,
        riskBufferPercentage: 10,
        totalManpower: 1.5,
      },
      developmentItems: [
        {
          id: 'billing',
          name: 'Billing',
          directEstimation: [{ id: 'build', name: 'Build', hours: 20 }],
          subItems: [],
        },
      ],
      qaActivities: [{ id: 'regression', name: 'Regression', hours: 10 }],
    })
    const runtime = createProjectRuntime(storage, dependencies)

    const markup = renderToStaticMarkup(
      <ReactCalculatorPreview runtime={runtime} storage={storage} />,
    )

    expect(markup).toContain('Capital Trust Release')
    expect(markup).toContain('Development</span><strong>20 h')
    expect(markup).toContain('QA</span><strong>10 h')
    expect(markup).toContain('Final estimate</span><strong>33 h')
    expect(markup).toContain('2.75 working days')
    expect(markup).toContain('1.5 FTE')
  })
})
