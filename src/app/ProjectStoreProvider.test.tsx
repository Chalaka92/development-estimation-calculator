import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  createEmptyEstimationProject,
  type EntityFactoryDependencies,
} from '../domain/factories'
import { createProjectStore } from '../state/projectStore'
import {
  ProjectStoreProvider,
} from './ProjectStoreProvider'
import { useProjectStore } from './useProjectStore'

const dependencies: EntityFactoryDependencies = {
  createId: () => 'provider-project',
  now: () => '2026-08-24T18:00:00.000Z',
}

function ProjectName() {
  const name = useProjectStore((state) => state.project.name)
  return <span>{name}</span>
}

describe('ProjectStoreProvider', () => {
  it('exposes selected typed state to React descendants', () => {
    const store = createProjectStore(
      createEmptyEstimationProject('React Runtime', dependencies),
      dependencies,
    )

    expect(
      renderToStaticMarkup(
        <ProjectStoreProvider store={store}>
          <ProjectName />
        </ProjectStoreProvider>,
      ),
    ).toBe('<span>React Runtime</span>')
  })

  it('fails clearly when the hook is used outside the provider', () => {
    expect(() => renderToStaticMarkup(<ProjectName />)).toThrow(
      'useProjectStoreApi must be used within ProjectStoreProvider',
    )
  })
})
