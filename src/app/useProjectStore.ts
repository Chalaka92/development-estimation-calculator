import { useContext } from 'react'
import { useStore } from 'zustand'
import { ProjectStoreContext } from './projectStoreContext'
import type {
  ProjectStore,
  ProjectStoreState,
} from '../state/projectStore'

export function useProjectStoreApi(): ProjectStore {
  const store = useContext(ProjectStoreContext)
  if (!store) {
    throw new Error('useProjectStoreApi must be used within ProjectStoreProvider')
  }
  return store
}

export function useProjectStore<T>(
  selector: (state: ProjectStoreState) => T,
): T {
  return useStore(useProjectStoreApi(), selector)
}
