import { Panel } from '../../components/ui/Panel'
import { PanelHeader } from '../../components/ui/PanelHeader'
import './UserGuidePanel.css'

const QUICK_START_STEPS = [
  'Set the project or release name, team size, and risk buffer in Project.',
  'Add development main items and sub-items, then enter activity hours or enable three-point estimation where useful.',
  'Review the default QA activities and adjust their effort for the release.',
  'Use Review to resolve estimation-health warnings and inspect the consolidated live table.',
  'Use Export & Jira to create backups, summaries, PDFs, CSV files, and Jira-ready work-item files.',
  'Use History to save versions, compare changes, restore snapshots, and recover before destructive replacements.',
] as const

export function UserGuidePanel() {
  return (
    <Panel className="user-guide-panel" aria-labelledby="user-guide-heading">
      <PanelHeader
        eyebrow="Help & guidance"
        title="User guide"
        titleId="user-guide-heading"
        description="A practical reference for building, reviewing, protecting, and exporting an estimate. The guide is versioned with the application so it can grow with future features."
      />

      <div className="user-guide-intro" role="note">
        <strong>Recommended workflow</strong>
        <span>
          Work from Project → Development → QA → Review → Export & Jira → History.
          The live summary stays available while you move between sections.
        </span>
      </div>

      <section className="user-guide-section" aria-labelledby="user-guide-quick-start">
        <h3 id="user-guide-quick-start">Quick start</h3>
        <ol className="user-guide-steps">
          {QUICK_START_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <nav className="user-guide-topics" aria-label="User guide topics">
        <a href="#guide-estimation-basics">Estimation basics</a>
        <a href="#guide-development">Development</a>
        <a href="#guide-qa">QA</a>
        <a href="#guide-review">Review</a>
        <a href="#guide-export">Export & Jira</a>
        <a href="#guide-history">History & recovery</a>
        <a href="#guide-data-safety">Data safety</a>
      </nav>

      <div className="user-guide-accordion">
        <details id="guide-estimation-basics" open>
          <summary>Estimation basics</summary>
          <div className="user-guide-topic-body">
            <p>
              Enter normal activity hours when you already have a reasonable single estimate. For uncertain work, enable three-point estimation and enter optimistic, most-likely, and pessimistic hours. The calculator uses the PERT expected-hours formula: (O + 4M + P) / 6.
            </p>
            <p>
              Team size accepts decimal FTE values such as 1.5. Delivery duration is derived from the total effort and available manpower. The risk buffer is added after development and QA effort, so use it for uncertainty that is not already represented in the activity estimates.
            </p>
          </div>
        </details>

        <details id="guide-development">
          <summary>Development work breakdown</summary>
          <div className="user-guide-topic-body">
            <p>
              Main items represent the major deliverables or features in the release. Sub-items let you break a large item into smaller deliverables. New items use the standard estimation activity template so the estimate is prepared consistently.
            </p>
            <p>
              Activities can also record a delivery role, risk level, confidence percentage, notes, and dependencies. Dependencies cannot point to the same work unit or create a cycle.
            </p>
          </div>
        </details>

        <details id="guide-qa">
          <summary>QA estimation</summary>
          <div className="user-guide-topic-body">
            <p>
              QA starts with the standard six QA activities. Adjust the activity names and effort when the release requires a different testing approach. QA effort participates in the same live totals, role summaries, risk planning, and exports as development effort.
            </p>
          </div>
        </details>

        <details id="guide-review">
          <summary>Review and estimation health</summary>
          <div className="user-guide-topic-body">
            <p>
              The Review section is the final check before sharing an estimate. Estimation health highlights gaps such as missing QA coverage, high-risk work, low confidence, incomplete delivery-role assignments, missing planning metadata, or high-risk work with no project risk buffer.
            </p>
            <p>
              These findings are advisory and do not change the calculation. Use the live estimation table below the health review to verify the final hours for every main item, sub-item, QA effort, and the overall estimate.
            </p>
          </div>
        </details>

        <details id="guide-export">
          <summary>Export, backups, and Jira</summary>
          <div className="user-guide-topic-body">
            <p>
              Editable JSON is the best format for a restorable project backup. Markdown, CSV, and PDF are intended for sharing and review. Provider-neutral work-item exports can include hierarchy, activities, QA items, dependencies, and estimates.
            </p>
            <p>
              Jira support currently produces a configurable Jira-ready CSV. Direct Jira authentication and server-backed issue creation are intentionally not part of the browser-only application yet.
            </p>
          </div>
        </details>

        <details id="guide-history">
          <summary>History, versions, and recovery</summary>
          <div className="user-guide-topic-body">
            <p>
              Use History for named snapshots, comparisons, restore operations, reusable templates, and automatic recovery snapshots created before destructive replacement. The project workspace also supports multiple browser-local projects, including duplicate, archive, restore, and delete workflows.
            </p>
          </div>
        </details>

        <details id="guide-data-safety">
          <summary>Autosave and data safety</summary>
          <div className="user-guide-topic-body">
            <p>
              The active project is automatically saved in browser storage. Saved projects, templates, and snapshots are local to the current browser, so keep an editable JSON backup before clearing browser data or moving to another computer.
            </p>
            <p>
              Historical v16 editable exports and browser snapshots remain supported through the retained migration readers. The old v16 user interface has been removed, but compatible historical data can still migrate into the current React project format.
            </p>
          </div>
        </details>
      </div>
    </Panel>
  )
}
