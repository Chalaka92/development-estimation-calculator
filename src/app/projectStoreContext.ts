import { createContext } from 'react'
import type { ProjectStore } from '../state/projectStore'

export const ProjectStoreContext = createContext<ProjectStore | null>(null)
