import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { APP_VERSION } from '../../app/appVersion'
import { createProjectRuntime } from '../../app/projectRuntime'
import {
  createEmptyEstimationProject,
  type EntityFactoryDependencies,
} from '../../domain/factories'
import {
  saveProject,
  type KeyValueStorage,
} from '../../persistence/projectPersistence'
import { ReactCalculator } from './ReactCalculator'

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
    return () => `calculator-${++id}`
  })(),
  now: () => '2026-08-24T19:00:00.000Z',
}

describe('React calculator', () => {
  it('renders typed settings and calculated totals without a legacy UI entry point', () => {
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
      <ReactCalculator runtime={runtime} storage={storage} />,
    )

    expect(markup).toContain('Capital Trust Release')
    expect(markup).toContain(`Typed React calculator · v${APP_VERSION}`)
    expect(markup).not.toContain('Open legacy calculator')
    expect(markup).not.toContain('?ui=legacy')
    expect(markup).toContain('Development</span><strong>20 h')
    expect(markup).toContain('QA</span><strong>10 h')
    expect(markup).toContain('Final estimate</span><strong>33 h')
    expect(markup).toContain('2.75 working days')
    expect(markup).toContain('1.5 FTE')
    expect(markup).toContain('Skip to calculator workspace')
    expect(markup).toContain('aria-describedby="total-manpower-hint"')
    expect(markup).toContain('aria-live="polite"')
    expect(markup).toContain('aria-label="Duplicate main item 1"')
    expect(markup).toContain('Live estimation table')
    expect(markup).toContain('Generate work items')
    expect(markup).toContain('role="tablist"')
    expect(markup).toContain('aria-label="Calculator sections"')
    expect(markup).toContain('aria-selected="true"')
  })
})
