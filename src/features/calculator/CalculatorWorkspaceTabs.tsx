import {
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import type { KeyValueStorage } from '../../persistence/projectPersistence'
import { DevelopmentWorkBreakdownPanel } from './DevelopmentWorkBreakdownPanel'
import { ExportImportPanel } from './ExportImportPanel'
import { LiveEstimationTable } from './LiveEstimationTable'
import { ProjectHistoryPanel } from './ProjectHistoryPanel'
import { ProjectSettingsPanel } from './ProjectSettingsPanel'
import { ProjectWorkspacePanel } from './ProjectWorkspacePanel'
import { QaEstimationPanel } from './QaEstimationPanel'
import { WorkItemGenerationPanel } from './WorkItemGenerationPanel'

const TAB_IDS = [
  'project',
  'development',
  'qa',
  'review',
  'export',
  'history',
] as const

type WorkspaceTabId = (typeof TAB_IDS)[number]

interface WorkspaceTab {
  id: WorkspaceTabId
  label: string
  shortLabel?: string
  content: ReactNode
}

export function CalculatorWorkspaceTabs({
  storage,
}: {
  storage: KeyValueStorage
}) {
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>('project')
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const tabs: ReadonlyArray<WorkspaceTab> = [
    {
      id: 'project',
      label: 'Project',
      content: (
        <>
          <ProjectSettingsPanel />
          <ProjectWorkspacePanel storage={storage} />
        </>
      ),
    },
    {
      id: 'development',
      label: 'Development',
      content: <DevelopmentWorkBreakdownPanel />,
    },
    { id: 'qa', label: 'QA', content: <QaEstimationPanel /> },
    {
      id: 'review',
      label: 'Review',
      content: <LiveEstimationTable />,
    },
    {
      id: 'export',
      label: 'Export & Jira',
      shortLabel: 'Export',
      content: (
        <>
          <WorkItemGenerationPanel />
          <ExportImportPanel storage={storage} />
        </>
      ),
    },
    {
      id: 'history',
      label: 'History',
      content: <ProjectHistoryPanel storage={storage} />,
    },
  ]

  const activateTab = (index: number) => {
    const normalizedIndex = (index + tabs.length) % tabs.length
    setActiveTab(tabs[normalizedIndex].id)
    tabRefs.current[normalizedIndex]?.focus()
  }

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      activateTab(index + 1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      activateTab(index - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      activateTab(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      activateTab(tabs.length - 1)
    }
  }

  return (
    <div className="workspace-tabs">
      <div
        className="workspace-tab-list"
        role="tablist"
        aria-label="Calculator sections"
      >
        {tabs.map((tab, index) => {
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              ref={(element) => { tabRefs.current[index] = element }}
              id={`workspace-tab-${tab.id}`}
              className={selected ? 'workspace-tab workspace-tab--active' : 'workspace-tab'}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`workspace-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <span className="workspace-tab__label">{tab.label}</span>
              {tab.shortLabel && (
                <span className="workspace-tab__short-label" aria-hidden="true">
                  {tab.shortLabel}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {tabs.map((tab) => (
        <section
          key={tab.id}
          id={`workspace-panel-${tab.id}`}
          className={`workspace-tab-panel workspace-tab-panel--${tab.id}`}
          role="tabpanel"
          aria-labelledby={`workspace-tab-${tab.id}`}
          tabIndex={0}
          hidden={activeTab !== tab.id}
        >
          {tab.content}
        </section>
      ))}
    </div>
  )
}
