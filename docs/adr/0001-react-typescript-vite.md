# ADR 0001: Use React, TypeScript, and Vite

- Status: Accepted
- Date: 2026-08-24
- Deciders: Repository owner

## Context

The calculator began as a large, single HTML file containing UI, styling, calculations, persistence, and exports. That structure made changes difficult to isolate and test.

## Decision

Use React for component composition, TypeScript for the project and calculation contracts, and Vite for local development and production builds. Keep domain calculations and the vanilla Zustand store independent of React.

## Consequences

### Positive

- UI features can be migrated and reviewed in focused components.
- Calculation, state, persistence, and export code can be tested separately.
- The application remains deployable as static files.

### Negative

- Contributors need a Node.js toolchain.
- Dependency and build configuration require maintenance.
- Legacy browser data needs an explicit transition strategy.

### Follow-up

- Maintain the versioned project schema and migration tests.
- Remove the v16 fallback only after the roadmap's legacy-removal gate is met.

## Alternatives considered

- Continue with a single HTML file: rejected because responsibilities and tests could not be isolated cleanly.
- Next.js: not selected because the calculator currently needs neither server rendering nor a backend routing framework.
