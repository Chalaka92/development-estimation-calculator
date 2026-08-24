# Development Estimation Calculator

A browser-based calculator for preparing software development and QA estimates.

## Migration status

The repository now uses a React, TypeScript and Vite application shell. The existing v16 calculator is preserved under `public/legacy/calculator-v16.html` and loaded by the React shell so the current workflow remains available while features are migrated into React components.

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
- `public/legacy/calculator-v16.html` — current calculator retained during migration
- `index.html` — Vite application entry point
- `vite.config.ts` — build configuration
- `tsconfig*.json` — TypeScript configuration

## Migration approach

Functionality will move from the legacy calculator into typed React features in small, reviewable pull requests. The legacy calculator should only be removed after feature parity and end-to-end verification are complete.

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
