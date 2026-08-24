# Development Estimation Calculator

A browser-based calculator for preparing software development and QA estimates.

## Application status

The typed React calculator is now the default application. It includes project settings, development work breakdown, QA estimation, live calculations, autosave, validated import, and summary exports.

The previous v16 calculator remains available as a temporary fallback under `public/legacy/calculator-v16.html` and through the `?ui=legacy` query parameter. Its `developmentEstimationV4` browser data remains separate and read-only to the React persistence layer.

## Technology

- React 19
- TypeScript
- Vite
- Oxlint

## Requirements

- Node.js 22 or newer
- npm 10 or newer

## Development

```bash
npm install
npm run dev
```

Open the local URL displayed by Vite.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

Run all checks with:

```bash
npm run check
```

## Production preview

```bash
npm run build
npm run preview
```

## Current application features

- Hierarchical development work breakdown
- Separate QA estimation
- Live totals and delivery calculations
- Decimal manpower/FTE values
- Risk and uncertainty buffer
- PDF and Markdown summary exports
- Editable-file and CSV exports
- Browser-based autosave

## Repository structure

- `src/` — React application shell
- `src/domain/` — framework-independent estimation types and calculations
- `src/state/` — typed project state and immutable project actions
- `src/persistence/` — validation, migration, storage, and recovery
- `src/app/` — runtime bootstrap, autosave orchestration, and React store access
- `public/legacy/calculator-v16.html` — current calculator retained during migration
- `index.html` — Vite application entry point
- `vite.config.ts` — build configuration
- `tsconfig*.json` — TypeScript configuration

## Migration approach

Functionality moved from the legacy calculator into typed React features through small, reviewable pull requests. The React application is now the default after feature parity and end-to-end persistence verification. The legacy calculator is retained temporarily as a fallback and should be removed only after a stable transition period.

## Domain model and calculation engine

The typed model and pure calculation functions live under `src/domain/`. They do not import React or browser APIs, allowing the rules to be reused by the future React screens, exports, and integrations.

The calculation tests cover development totals, sub-item behavior, QA effort, risk buffer, decimal manpower, schedule fallbacks, and delivery duration.

```bash
npm run test
npm run test:watch
```

## Project state

The vanilla Zustand store under `src/state/` manages the typed project independently of React. Its actions cover project and schedule changes plus add, update, duplicate, and delete operations for development items, sub-items, estimation activities, and QA activities.

ID and time providers are injected into the store, keeping production behavior reliable and tests deterministic. Every successful project change increments a revision, updates the modification timestamp, and marks the project as dirty. Missing entities produce safe no-op results.

## Persistence and migration

Typed projects are validated with Zod and stored under the versioned `developmentEstimation.project.v1` key. The persistence layer supports serialization, safe load/save results, migration from v16 editable exports, and explicit migration from the existing `developmentEstimationV4` browser snapshot.

The v16 key is read-only to the new persistence layer: it is never overwritten or removed. Invalid typed storage is moved to a timestamped recovery key when possible; if recovery storage fails, the original value remains untouched.

## React application integration

The application integration layer under `src/app/` composes the domain, state, and persistence modules without coupling them to the current UI. It loads a valid typed project first, falls back to a migrated v16 browser snapshot, and creates an empty project only when neither source is usable. Migration warnings remain available to future UI components instead of being silently discarded.

`ProjectStoreProvider` and the typed selector hook make the vanilla Zustand store available to future React screens. The autosave controller debounces project changes, marks only successful writes as saved, keeps failed writes dirty for retry, and cancels pending work when disposed.

The current v16 iframe is deliberately unchanged. The runtime is not mounted until React screens begin consuming it, avoiding a stale typed copy while edits still occur inside the legacy calculator.

## React calculator and legacy fallback

The normal application URL opens the React calculator. The legacy v16 application is available explicitly when needed:

The preview currently provides project naming, risk buffer, working hours, decimal manpower/FTE, business days, autosave status, a complete development work-breakdown editor, QA estimation, and a live estimate summary. Main items and sub-items can be expanded, renamed, duplicated, and deleted. Development and QA activities support stable inline name and decimal-hour editing.

Summary exports are available as Markdown, CSV, and PDF and contain the live development table, QA estimate, totals, and delivery schedule. Editable JSON exports preserve the complete typed project. Imports accept validated typed projects and supported v16 files; invalid files are rejected without replacing the active project.

Each main item uses either direct estimation activities or sub-items. The UI prevents these modes from being mixed, matching the calculation engine's hierarchy and avoiding hidden or excluded hours. The preview uses the typed runtime and migrates existing v16 browser data on first use. A clear link returns to the current calculator.

```text
http://localhost:5173/?ui=legacy
```

The header provides a safe new-project workflow that requires confirmation before replacing the active estimate. All pull requests and main-branch pushes run the complete lint, type-check, test, and production-build suite in GitHub Actions.
