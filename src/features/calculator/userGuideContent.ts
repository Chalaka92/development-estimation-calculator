export type GuideTopicId =
  | 'getting-started'
  | 'estimation-basics'
  | 'project'
  | 'development'
  | 'qa'
  | 'review'
  | 'export'
  | 'history'
  | 'data-safety'
  | 'reset'

export interface GuideImage {
  fileName: string
  alt: string
  caption: string
}

export interface GuideTopic {
  id: GuideTopicId
  title: string
  description: string
  steps: readonly string[]
  details?: readonly string[]
  tip?: string
  image?: GuideImage
}

export const USER_GUIDE_TOPICS: readonly GuideTopic[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    description: 'Follow the estimation workflow from project setup through review, export, and recovery.',
    steps: [
      'Set the project or release name, manpower, and risk buffer in Project.',
      'Add development main items and sub-items, then estimate their activities.',
      'Review the default QA activities and adjust their effort for the release.',
      'Use Review to resolve estimation-health findings and inspect the consolidated live table.',
      'Use Export & Jira for readable reports, backups, and Jira-ready work-item files.',
      'Use History for snapshots, comparisons, restores, and recovery before destructive changes.',
    ],
    details: [
      'Recommended workflow: Project → Development → QA → Review → Export & Jira → History. The live summary remains available while you move between sections.',
    ],
    tip: 'Your active project is autosaved in this browser as you work.',
  },
  {
    id: 'estimation-basics',
    title: 'Estimation basics',
    description: 'Understand how direct hours, three-point estimation, manpower, and the risk buffer affect the result.',
    steps: [
      'Use normal activity hours when you already have a reasonable single estimate.',
      'For uncertain work, enable three-point estimation and enter optimistic, most-likely, and pessimistic hours.',
      'Use decimal manpower such as 1.5 FTE when the available team is not a whole number.',
      'Use the project risk buffer for uncertainty that is not already represented inside activity estimates.',
    ],
    details: [
      'Three-point estimation uses the PERT expected-hours formula: (Optimistic + 4 × Most likely + Pessimistic) / 6.',
      'Delivery duration is derived from total effort and available manpower. Changing manpower changes estimated business duration, not the underlying effort hours.',
      'The risk buffer is added after development and QA effort, so avoid using it to count uncertainty twice.',
    ],
  },
  {
    id: 'project',
    title: 'Project setup',
    description: 'Project settings define the delivery assumptions used by the live estimate.',
    steps: [
      'Give the estimate a clear project or release name.',
      'Set total manpower, including decimal values such as 1.5 FTE when appropriate.',
      'Choose a predefined risk buffer or enter a custom percentage.',
      'Use the project workspace controls to create, duplicate, archive, restore, or switch between browser-local projects.',
    ],
    tip: 'Changing manpower affects estimated business duration, not the underlying effort hours.',
    image: {
      fileName: 'project-setup.png',
      alt: 'Project settings area of the development estimation calculator',
      caption: 'Project settings and delivery assumptions.',
    },
  },
  {
    id: 'development',
    title: 'Development work',
    description: 'Build the development work breakdown using main items, sub-items, activities, and planning metadata.',
    steps: [
      'Add a main item for each meaningful feature or delivery area.',
      'Add sub-items when a feature needs a clearer breakdown.',
      'Enter direct hours or use three-point estimation for uncertain activities.',
      'Add delivery role, risk, confidence, dependencies, and notes when they improve planning quality.',
      'Collapse completed items to keep large estimates manageable.',
    ],
    details: [
      'New items use the standard estimation activity template so estimates are prepared consistently.',
      'Dependencies cannot point to the same work unit or create a dependency cycle.',
    ],
    image: {
      fileName: 'development-work.png',
      alt: 'Development work breakdown area with a main item and estimation activities',
      caption: 'Development work breakdown with the standard activity template.',
    },
  },
  {
    id: 'qa',
    title: 'QA estimation',
    description: 'Keep QA visible as a separate part of the estimate instead of hiding it inside development hours.',
    steps: [
      'Review the standard six QA activities provided by the calculator.',
      'Adjust activity names and hours to match the release and testing approach.',
      'Add or remove QA activities when the project needs a different testing profile.',
      'Review the QA share of the estimate before finalising the result.',
    ],
    details: [
      'QA effort participates in the same live totals, role summaries, risk planning, and exports as development effort.',
    ],
  },
  {
    id: 'review',
    title: 'Review the estimate',
    description: 'Use Review as the final quality check before you communicate the estimate.',
    steps: [
      'Read the Estimation Health findings for missing or risky planning information.',
      'Check high-risk or low-confidence activities before treating the estimate as final.',
      'Review the Live Estimation Table for development, QA, risk buffer, and final hours.',
      'Confirm the business duration and manpower shown in the summary panel.',
    ],
    details: [
      'Estimation Health can highlight QA gaps, high-risk work, low confidence, incomplete delivery-role assignments, missing planning metadata, or high-risk work with no project risk buffer.',
      'Health findings are advisory and never change the calculated hours.',
    ],
    tip: 'Resolve important health findings before sharing a final estimate.',
    image: {
      fileName: 'review-estimate.png',
      alt: 'Review area showing estimation health and the live estimation table',
      caption: 'Review combines estimation health findings with the complete live estimate.',
    },
  },
  {
    id: 'export',
    title: 'Export & Jira',
    description: 'Use the export area once the estimate has been reviewed and is ready to distribute or back up.',
    steps: [
      'Generate provider-neutral work items when you need a structured delivery breakdown.',
      'Export Markdown or PDF for readable estimation documentation.',
      'Export CSV when you need a spreadsheet-friendly or Jira-oriented format.',
      'Export editable JSON for a restorable project backup.',
      'Import supported editable JSON when restoring or transferring an estimate.',
    ],
    details: [
      'Provider-neutral work-item exports can include hierarchy, activities, QA items, dependencies, and estimates.',
      'Jira support currently produces a configurable Jira-ready CSV. Direct Jira authentication and server-backed issue creation are intentionally not part of the browser-only application yet.',
    ],
    tip: 'Editable JSON is the best format when you need to reopen the estimate later.',
  },
  {
    id: 'history',
    title: 'History & recovery',
    description: 'Use History to protect useful checkpoints and return to an earlier project state when necessary.',
    steps: [
      'Create named snapshots before significant estimate changes.',
      'Compare saved versions when you need to understand what changed.',
      'Restore a suitable snapshot when a later change must be reversed.',
      'Use reusable templates and automatic recovery snapshots where appropriate.',
    ],
    details: [
      'The project workspace supports multiple browser-local projects, including duplicate, archive, restore, and delete workflows.',
      'Keep an editable JSON export for important estimates that must remain portable outside the current browser.',
    ],
  },
  {
    id: 'data-safety',
    title: 'Data safety',
    description: 'Understand what is stored locally and how to protect estimates before browser or device changes.',
    steps: [
      'Allow autosave to complete before closing the application after important edits.',
      'Keep editable JSON backups for important estimates.',
      'Export before clearing browser data or moving to another computer.',
      'Use History and recovery snapshots before destructive replacements or resets.',
    ],
    details: [
      'The active project, saved projects, templates, and snapshots are stored locally in the current browser.',
      'Historical v16 editable exports and browser snapshots remain supported through retained migration readers. The old v16 UI has been removed, but compatible historical data can still migrate into the current React project format.',
    ],
  },
  {
    id: 'reset',
    title: 'Reset & recovery',
    description: 'Reset actions are available for individual sections and for the complete current project.',
    steps: [
      'Use a section reset when only one part of the estimate needs to return to its defaults.',
      'Use Reset all in the header only when you want to clear the complete current project.',
      'The full reset creates a recovery snapshot before replacing the project with defaults.',
      'For important work, export an editable JSON backup before performing a full reset.',
    ],
    tip: 'Reset all is intentionally separate from Help to reduce accidental destructive actions.',
  },
]
