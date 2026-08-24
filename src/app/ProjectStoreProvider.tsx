import {
  type PropsWithChildren,
} from 'react'
import type { ProjectStore } from '../state/projectStore'
import { ProjectStoreContext } from './projectStoreContext'

export interface ProjectStoreProviderProps extends PropsWithChildren {
  store: ProjectStore
}

export function ProjectStoreProvider({
  store,
  children,
}: ProjectStoreProviderProps) {
  return (
    <ProjectStoreContext.Provider value={store}>
      {children}
    </ProjectStoreContext.Provider>
  )
}
