# Development Estimation Calculator

A browser-based React application for preparing transparent software-development and QA estimates, calculating delivery duration, and exporting the result.

Live application: [https://chalaka92.github.io/development-estimation-calculator/](https://chalaka92.github.io/development-estimation-calculator/)

## Features

- Accessible tabbed workspace for Project, Development, QA, Review, Export and Jira, and History, with the live summary retained across sections
- Hierarchical development work breakdown with legacy-aligned estimation templates for new main items and sub-items
- Separate QA estimation prefilled with the six legacy QA activities
- Live development, QA, risk-buffer, and delivery calculations
- Full live estimation table, copyable summary, and print-ready report
- Decimal manpower/FTE and decimal-hour support
- Optional per-activity three-point estimation using the PERT expected-hours formula
- Optional delivery role, risk, confidence, and notes for every development and QA activity
- Acyclic dependencies between main items and sub-items, with automatic cleanup after deletion
- Live effort totals by delivery role and planning metadata in every summary export
- Editable provider-neutral work-item preview with hierarchy, dependencies, and JSON/CSV exports
- Configurable Jira-ready CSV export with hierarchy IDs and estimates expressed in seconds
- Versioned browser autosave and safe legacy-data migration
- Multiple saved projects with search, duplication, archive, and recent-project switching
- Reusable templates, project snapshots, comparison, restore, and automatic recovery before destructive replacement
- Editable JSON import/export with validation
- Markdown, CSV, and A4 PDF summary exports
- Deprecated v16 recovery fallback at `?ui=legacy` during the transition period

## Technology

- React 19 and TypeScript
- Vite
- Zustand for framework-independent project state
- Zod for persisted/imported data validation
- Vitest and Testing Library
- Playwright browser testing
- Oxlint

## Requirements

- Node.js 22 (see `.nvmrc`)
- npm 10 or newer

## Getting started

```bash
npm ci
npm run dev
```

Open the local URL displayed by Vite. Use `npm install` only when intentionally changing dependencies; use `npm ci` for reproducible setup and CI parity.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run Oxlint |
| `npm run typecheck` | Run the TypeScript compiler checks |
| `npm run test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:e2e` | Run critical workflows in Chromium, Firefox, and WebKit |
| `npm run test:e2e:smoke` | Smoke-test the configured site in Chromium |
| `npm run build` | Type-check and create the production build |
| `npm run preview` | Preview the production build locally |
| `npm run check` | Run the complete local quality gate |

Pull requests and pushes to `main` run the repository quality gate and the critical Playwright workflows in GitHub Actions. Playwright requires its browser binaries locally:

```bash
npx playwright install chromium firefox webkit
npm run test:e2e
```

Run `npm run release:verify` before proposing a version tag. It validates version metadata, runs the complete quality gate, and creates a portable production build. Tagged releases are verified and published through GitHub Actions; see [docs/releasing.md](docs/releasing.md).

## Deployment and browser support

Every successful push to `main` builds and deploys `dist/` through GitHub Pages. The deployment workflow then runs a Chromium smoke test against the published URL. In **Repository Settings → Pages**, the publishing source must be **GitHub Actions**.

CI verifies the critical create, calculate, autosave/reload, sub-item, import/export, and mobile-layout workflows using:

- Chromium
- Firefox
- WebKit (Safari engine)

Playwright reports are retained as GitHub Actions artifacts for 14 days.

## Repository structure

```text
src/
  app/          Runtime composition, autosave, and React store access
  domain/       Framework-independent types and calculation rules
  export/       JSON, Markdown, CSV, and PDF generation
  features/     Calculator UI components
  integrations/ Provider-neutral work-item generation and export contracts
  persistence/  Validation, schema migration, storage, and recovery
  state/        Typed project store and immutable actions
public/legacy/  Deprecated v16 recovery fallback
docs/adr/       Architecture decision records
```

Calculation rules belong in `src/domain/`, not React components. Browser persistence keeps the active project under `developmentEstimation.project.v1`, the multi-project library under `developmentEstimation.workspace.v1`, and templates/project history under `developmentEstimation.archive.v1`. The legacy `developmentEstimationV4` key remains separate and is never overwritten by the typed persistence layer.

The completed feature-parity and accessibility assessment is recorded in [docs/feature-parity-accessibility-review.md](docs/feature-parity-accessibility-review.md). The staged legacy UI and data-compatibility retirement contract is recorded in [docs/legacy-retirement.md](docs/legacy-retirement.md).

## Data and migration safety

The application validates imported and stored projects before replacing active data. Invalid typed storage is quarantined when possible. The deprecated legacy calculator remains available during the transition at:

```text
http://localhost:5173/?ui=legacy
```

Use the legacy screen only to review or recover older v16 estimates. Save any required changes there, then return to the React calculator. Newer timestamped v16 browser data is migrated automatically into typed storage while the original `developmentEstimationV4` value is preserved. Untimestamped conflicting data is surfaced for manual review rather than silently overwritten.

Removing the legacy HTML user interface will not remove v16 editable-export or browser-storage migration support. Those compatibility readers have a separate, later retirement stage; see `docs/legacy-retirement.md`.

Saved projects, templates, and snapshots are currently local to the active browser and are not included in an editable project JSON export. The calculator retains the newest 25 snapshots and 20 templates.

Development and QA activities use normal hours by default. A row can optionally use optimistic, most-likely, and pessimistic hours; live totals and summary exports then use `(O + 4M + P) / 6`. Editable JSON retains the original three input values.

Planning details are optional. Assigned delivery roles appear in the live summary; unassigned development effort is grouped as `Unassigned`, while unassigned QA effort is grouped as `QA`. Dependency choices cannot point to the same work unit, create a cycle, or survive deletion of their target. Editable JSON, Markdown, CSV, and PDF exports retain or report this planning information.

The work-item generator converts the estimate into provider-neutral `group`, `deliverable`, `activity`, and `quality` records. It supports an editable preview, item selection, optional activity-level detail, QA inclusion, stable parent/dependency IDs, and versioned JSON or CSV output. When activity detail is enabled, effort moves to leaf activities so exported totals are not duplicated. Jira-specific field mapping and authentication remain outside the core domain.

The optional Jira CSV adapter maps those neutral records to configurable Jira issue types, with defaults of Epic, Story, Sub-task, and Task. Enter the Jira project or space key and optionally set labels, component, fix version, and priority before downloading. The file includes Issue ID and Parent ID columns for hierarchy, repeated Labels columns, and Original Estimate values converted from hours to seconds.

Multi-level hierarchy import requires Jira administration’s **External System Import**. Jira’s standard bulk CSV importer cannot map a hierarchy through multiple levels. During import, map the CSV columns to the matching Jira fields and validate before creating work items. See Atlassian’s [CSV importer guidance](https://support.atlassian.com/jira-software-cloud/docs/create-issues-using-the-csv-importer/) and [administrator CSV import reference](https://support.atlassian.com/jira-cloud-administration/docs/import-data-from-a-csv-file/).

Before relying on browser-only project storage, export an editable JSON backup. Legacy-to-React retirement gates are tracked in `ROADMAP.md` and `docs/legacy-retirement.md`.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Use the issue templates for reproducible bugs and well-scoped features. Significant technical decisions should be recorded under `docs/adr/`.

## Security

Do not report sensitive vulnerabilities in a public issue. Follow [SECURITY.md](SECURITY.md).

## Releases and roadmap

- Current package version: `2.0.0`
- Completed and upcoming work: [ROADMAP.md](ROADMAP.md)
- User-visible history: [CHANGELOG.md](CHANGELOG.md)

This repository does not currently declare an open-source licence. Copyright remains with the repository owner unless a licence is added later.
