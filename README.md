# Development Estimation Calculator

A browser-based React application for preparing transparent software-development and QA estimates, calculating delivery duration, and exporting the result.

## Features

- Hierarchical development work breakdown with main items, sub-items, and activities
- Separate QA estimation
- Live development, QA, risk-buffer, and delivery calculations
- Decimal manpower/FTE and decimal-hour support
- Versioned browser autosave and safe legacy-data migration
- Editable JSON import/export with validation
- Markdown, CSV, and A4 PDF summary exports
- Temporary v16 fallback at `?ui=legacy`

## Technology

- React 19 and TypeScript
- Vite
- Zustand for framework-independent project state
- Zod for persisted/imported data validation
- Vitest and Testing Library
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
| `npm run build` | Type-check and create the production build |
| `npm run preview` | Preview the production build locally |
| `npm run check` | Run the complete local quality gate |

Pull requests and pushes to `main` run `npm ci` and `npm run check` in GitHub Actions.

## Repository structure

```text
src/
  app/          Runtime composition, autosave, and React store access
  domain/       Framework-independent types and calculation rules
  export/       JSON, Markdown, CSV, and PDF generation
  features/     Calculator UI components
  persistence/  Validation, schema migration, storage, and recovery
  state/        Typed project store and immutable actions
public/legacy/  Temporary v16 fallback
docs/adr/       Architecture decision records
```

Calculation rules belong in `src/domain/`, not React components. Browser persistence is versioned under `developmentEstimation.project.v1`; the legacy `developmentEstimationV4` key remains separate and is never overwritten by the typed persistence layer.

## Data and migration safety

The application validates imported and stored projects before replacing active data. Invalid typed storage is quarantined when possible. The legacy calculator remains available at:

```text
http://localhost:5173/?ui=legacy
```

Before relying on the legacy fallback during the transition, export an editable JSON backup. The remaining legacy-to-React handoff risks are tracked in `ROADMAP.md`.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Use the issue templates for reproducible bugs and well-scoped features. Significant technical decisions should be recorded under `docs/adr/`.

## Security

Do not report sensitive vulnerabilities in a public issue. Follow [SECURITY.md](SECURITY.md).

## Releases and roadmap

- Current package version: `2.0.0-alpha.1`
- Completed and upcoming work: [ROADMAP.md](ROADMAP.md)
- User-visible history: [CHANGELOG.md](CHANGELOG.md)

This repository does not currently declare an open-source licence. Copyright remains with the repository owner unless a licence is added later.
