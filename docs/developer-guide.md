# Developer Guide

This guide explains how the Development Estimation Calculator is implemented, why the main technologies were chosen, where each responsibility belongs, and what a developer must consider when changing or extending the application.

It is intended to be the first technical document a new contributor reads after the project README.

## 1. Architecture at a glance

The application is a static React and TypeScript web application. It deliberately keeps calculation rules, project state, persistence, exports, and provider integrations separate from React UI components.

```text
Browser
  |
  v
React UI
  |
  v
React store adapter / application composition
  |
  v
Zustand vanilla project store
  |
  +--------------------+
  |                    |
  v                    v
Domain rules        Persistence
  |                    |
  |                    +--> Zod validation
  |                    +--> schema migration
  |                    +--> local browser storage
  |
  +--> summaries / calculations
  +--> exports
  +--> provider-neutral work items
                           |
                           +--> Jira CSV adapter

Quality around all layers:
Oxlint + TypeScript + Vitest + Testing Library + Playwright

Development/build runtime:
Vite
```

The most important dependency rule is:

> Domain and state code must not depend on React.

This keeps the estimation engine reusable, independently testable, and easier to migrate if the UI framework changes later.

The architectural decision is recorded in [ADR 0001](adr/0001-react-typescript-vite.md).

## 2. Technology stack and responsibilities

### React

React is the presentation layer. It is responsible for composing the calculator UI, forms, tabs, dialogs, expandable sections, summaries, review screens, export controls, and accessibility behavior.

React components should:

- render application state;
- collect user input;
- call store actions;
- manage temporary UI-only state when appropriate;
- use semantic HTML, accessible labels, keyboard behavior, and visible focus states.

React components should not contain business calculations, storage parsing, migration logic, or provider-specific integration rules.

### TypeScript

TypeScript defines the compile-time contracts for the project model, state actions, calculations, persistence, exports, and integration records.

Use explicit types for important domain data and stable identifiers. TypeScript protects code written by developers, but it cannot guarantee that runtime JSON, localStorage content, or imported files are valid. Runtime validation is therefore handled separately with Zod.

### Vite

Vite is the local development server and production build tool.

Primary commands:

```bash
npm run dev
npm run build
npm run preview
```

`npm run dev` starts the fast local development server with React refresh.

`npm run build` first runs the TypeScript project build and then creates the optimized static application in `dist/`.

The Vite configuration also:

- reads the application version from `package.json`;
- exposes it to the application as `__APP_VERSION__`;
- supports `VITE_BASE_PATH` so the same build can work from root hosting or a sub-path such as GitHub Pages.

Vite is infrastructure only. Application state and business rules must not depend on Vite APIs.

### Zustand

Zustand provides the central project state.

The project deliberately uses `zustand/vanilla` in `src/state/projectStore.ts` rather than making the store itself React-specific. React accesses this store through the application layer.

The store owns mutable application behavior such as:

- replacing or resetting the current project;
- project metadata and scheduling changes;
- adding, updating, duplicating, and deleting development items;
- adding and maintaining sub-items;
- development and QA estimation activities;
- dependencies between work units;
- dirty/revision state and save tracking.

Store actions should update state immutably and preserve domain invariants.

Do not put derived totals into state unless there is a strong reason. Prefer deriving totals from project data through domain functions so there is only one source of truth.

### Zod

Zod performs runtime validation of data that cannot be trusted simply because TypeScript types exist.

It is used for persisted and imported data in `src/persistence/`, including the project schemas and compatibility/migration path.

Typical data flow:

```text
JSON / localStorage / legacy data
          |
          v
      Zod validation
          |
     valid? ----- no ---> reject, quarantine, or surface error
       |
      yes
       v
schema/version migration if required
       |
       v
current EstimationProject
       |
       v
Zustand store
```

Any new persisted field must be considered in all of the following:

1. TypeScript domain model.
2. Zod schema.
3. defaults/factories.
4. persistence serialization.
5. import behavior.
6. migrations or backward-compatible defaults.
7. tests.

Never cast imported JSON directly to a project type and assume it is valid.

### Vitest

Vitest is the fast test runner for unit and integration-level code.

Use Vitest for:

- domain calculations;
- project factories;
- state transitions;
- dependency rules;
- Zod schemas;
- persistence and migration behavior;
- export transformations;
- integration mapping logic;
- regressions that do not require a real browser.

Tests should be deterministic and should normally avoid implementation details that are unrelated to the behavior being protected.

### Testing Library

Testing Library is used for React component behavior.

Tests should interact with the UI in the same way a user does: by visible text, labels, roles, and accessible names rather than internal component state or CSS selectors whenever practical.

Good examples include:

- a risk-buffer control updates the visible estimate;
- selecting custom estimation exposes the expected input;
- an accessible button performs the correct action;
- validation feedback appears after invalid input.

Testing Library complements Vitest; Vitest runs the test while Testing Library provides user-oriented React rendering and interaction helpers.

### Playwright

Playwright is the end-to-end browser testing layer.

It runs critical workflows in:

- Chromium;
- Firefox;
- WebKit.

Use Playwright when the behavior depends on a real browser, navigation, browser storage, focus, layout, reloading, import/export flow, or integration between multiple application layers.

Important examples for this project include:

- create and edit an estimate;
- add main items and sub-items;
- enter decimal hours or manpower;
- autosave and reload;
- validate imported data;
- preserve legacy migration compatibility;
- verify user-guide and navigation behavior;
- verify mobile/desktop layout behavior;
- ensure fields retain focus while editing;
- ensure changing form values does not incorrectly scroll the page;
- verify the deployed application with smoke tests.

The Playwright configuration builds and previews the production app locally before browser tests unless `PLAYWRIGHT_BASE_URL` points to an already deployed site.

### Oxlint

Oxlint performs static lint checks over the JavaScript/TypeScript/React codebase.

Run:

```bash
npm run lint
```

The project enables React, TypeScript, and Oxc lint plugins and treats React hook-rule violations as errors.

Linting is not a replacement for TypeScript or tests:

```text
Oxlint      -> suspicious or invalid code patterns
TypeScript  -> type correctness
Vitest      -> logic and component behavior
Playwright  -> complete browser workflows
```

## 3. Repository structure

```text
src/
  app/          Runtime composition, autosave, React access to the store
  components/   Shared UI components
  domain/       Framework-independent types, factories, calculations and rules
  export/       JSON, Markdown, CSV and PDF generation
  features/     User-facing calculator feature areas
  integrations/ Provider-neutral work-item generation and provider adapters
  persistence/  Zod schemas, storage, migration, workspace, archive and recovery
  state/        Vanilla Zustand project store and actions
  styles/       Shared styling

e2e/            Playwright browser workflows
docs/           Technical, release and compatibility documentation
docs/adr/       Architecture Decision Records
.github/         CI, deployment, release automation and repository templates
scripts/         Repository/release verification scripts
```

### Dependency direction

Prefer the following direction:

```text
features/components
      |
      v
app/state
      |
      v
domain
```

Persistence, exports, and integrations may consume domain types, but domain code should not import UI, browser-specific storage, or provider-specific Jira code.

If a new feature creates a circular dependency between these layers, reconsider where the responsibility belongs.

## 4. Domain model and calculation rules

`src/domain/` is the source of truth for estimation concepts and business calculations.

Examples include:

- development work items;
- sub-items;
- estimation activities;
- QA activities;
- scheduling/manpower information;
- delivery roles;
- risk and confidence metadata;
- dependencies;
- standard/default activity factories;
- final effort and delivery calculations;
- optional three-point estimation.

Three-point estimation uses the PERT expected-hours formula:

```text
(O + 4M + P) / 6
```

Do not round intermediate calculations. Round only for UI presentation or export formatting where required.

When changing a calculation:

1. change or add the domain function first;
2. add focused Vitest coverage;
3. update the UI to consume the result;
4. update exports if the displayed/reportable meaning changes;
5. add or update Playwright coverage for important user workflows.

Avoid recalculating the same rule independently in multiple components.

## 5. Project state design

The Zustand store contains the current canonical `EstimationProject` and its actions.

State changes should follow these rules:

- update immutably;
- keep entity IDs stable;
- clean up invalid dependencies after deletion;
- prevent self-dependencies and cycles;
- preserve dirty/revision semantics;
- use factories for new default entities where available;
- do not allow UI components to mutate project arrays/objects directly.

A useful mental model is:

```text
User action
  -> React event handler
  -> store action
  -> immutable project update
  -> derived calculations
  -> React re-render
  -> autosave/persistence
```

For temporary state that has no project meaning, such as whether a local panel is expanded, prefer component-local state unless that state must survive navigation or be shared widely.

## 6. Persistence, browser storage and migration safety

Persistence is intentionally separated from the state store.

Current browser storage responsibilities include:

- active project;
- multi-project workspace;
- templates and project history/archive;
- recovery before destructive replacement;
- migration from supported legacy v16 data.

The current typed storage keys are documented in the README and persistence code. The legacy `developmentEstimationV4` value is intentionally kept separate and must not be overwritten by the typed persistence layer.

### Compatibility rule

Removing the old UI does not mean old data can be removed.

The application currently preserves v16 compatibility for:

- browser data migration;
- editable JSON import migration.

Compatibility readers must only be retired through the staged process described in [legacy-retirement.md](legacy-retirement.md).

When changing stored data:

- make the new field optional or provide migration/default behavior where reasonable;
- validate old and new versions explicitly;
- keep destructive migrations out of UI code;
- preserve the original legacy value when migration safety requires it;
- add regression tests for current storage and legacy fixtures;
- consider rollback implications.

See [ADR 0009](adr/0009-browser-storage-forward-migration.md) for the storage-forward-migration decision.

## 7. Import and export boundaries

Editable project JSON is a data interchange format and must go through validation and migration before replacing the active project.

Summary/report exports are separate concerns. The application currently supports JSON, Markdown, CSV, PDF, provider-neutral work-item exports, and a Jira-oriented CSV adapter.

Rules:

- do not make provider-specific concepts part of the core domain unless they are genuinely domain concepts;
- keep Jira field names and mappings in the Jira adapter;
- preserve hierarchy and stable parent/dependency IDs;
- avoid double-counting effort when exporting activity-level detail;
- ensure new project fields are deliberately either included or excluded from each export format;
- add tests for totals and hierarchy whenever export mapping changes.

The provider-neutral integration boundary is described by [ADR 0007](adr/0007-provider-neutral-work-item-generation.md), and the Jira CSV adapter by [ADR 0008](adr/0008-jira-csv-adapter.md).

## 8. UI implementation rules

The calculator should remain usable on common desktop resolutions and smaller/mobile layouts.

When implementing UI changes:

- use semantic controls instead of clickable generic elements;
- every form control must have an accessible label;
- preserve keyboard navigation;
- preserve visible focus;
- do not cause page scroll jumps after state updates;
- do not recreate keyed form rows unnecessarily, because doing so can cause inputs to lose focus;
- keep stable React keys based on stable entity IDs;
- avoid unnecessary global state for visual-only concerns;
- check overflow and scroll ownership intentionally;
- verify empty states and alignment as well as populated states;
- test expansion/collapse behavior for hierarchical work items;
- consider print/PDF layout when modifying exportable summaries.

The completed feature-parity and accessibility review is available in [feature-parity-accessibility-review.md](feature-parity-accessibility-review.md).

## 9. Testing strategy

Use the lowest testing layer that gives reliable protection, then add higher-level coverage for important user journeys.

### Level 1: domain/unit tests — Vitest

Fastest and most focused.

Use for calculations, validation helpers, state actions, migrations, exports and mappings.

### Level 2: component tests — Vitest + Testing Library

Use for meaningful component behavior and accessible user interaction.

Do not duplicate every domain test through the UI.

### Level 3: browser tests — Playwright

Use for critical workflows that cross layers or depend on the browser.

The goal is not to reproduce every unit test in Playwright. Keep the browser suite focused on high-value workflows and regressions.

### Regression expectation

Every bug fix should normally include a test that would have failed before the fix.

Examples:

- calculation defect -> Vitest;
- component behavior defect -> Testing Library;
- focus/scroll/reload/browser-storage defect -> Playwright.

## 10. Local development workflow

Requirements:

- Node.js 22, as defined by `.nvmrc`;
- npm 10 or newer.

Recommended setup:

```bash
nvm use
npm ci
npm run dev
```

Use `npm ci` for reproducible dependency installation. Use `npm install` only when intentionally adding, removing, or updating dependencies.

Before opening a pull request:

```bash
npm run check
npx playwright install chromium firefox webkit
npm run test:e2e
```

`npm run check` runs:

```text
version check
  -> Oxlint
  -> TypeScript typecheck
  -> Vitest
  -> production build
```

## 11. CI and browser quality gate

Pull requests to `main` and pushes to `main` run GitHub Actions.

The CI quality job:

1. installs Node.js 22;
2. runs `npm ci`;
3. runs `npm run check`.

After that passes, the browser job:

1. installs Playwright and browser dependencies;
2. runs Chromium, Firefox, and WebKit workflows;
3. uploads the Playwright HTML report as an artifact.

Do not weaken CI checks to make a pull request pass. Fix the underlying failure or explicitly document an intentional architecture change.

## 12. Build, deployment and environment behavior

The production output is a static `dist/` directory.

GitHub Pages deployment uses the production build. The deployed-site workflow also performs a Chromium smoke test.

Important environment variables:

- `VITE_BASE_PATH` — changes the static-site base path used by Vite;
- `PLAYWRIGHT_BASE_URL` — points Playwright at an already deployed environment instead of starting a local preview server.

Do not put secrets in Vite environment variables or frontend source code. Anything delivered to the browser must be treated as public.

## 13. Linting, formatting and code quality

Run:

```bash
npm run lint
npm run typecheck
```

The repository also includes `.editorconfig` for basic editor consistency.

General expectations:

- prefer small focused modules;
- use clear domain names rather than UI-specific abbreviations;
- keep public function behavior explicit;
- avoid `any` unless the boundary genuinely requires it and is immediately narrowed/validated;
- delete dead code rather than commenting it out;
- avoid unrelated formatting churn in functional pull requests;
- justify new dependencies.

## 14. Accessibility expectations

Accessibility is a product requirement, not only a review step.

For new or changed UI:

- use correct headings and landmarks;
- associate labels with controls;
- ensure buttons have meaningful accessible names;
- support keyboard operation;
- preserve logical tab order;
- keep focus visible;
- communicate validation/status changes clearly;
- avoid relying only on color to communicate meaning;
- test responsive layouts and zoom-sensitive areas where relevant.

Testing Library queries by role/label are useful because they encourage accessible markup.

## 15. Security and data safety

This is a browser-only application, so client-side code must never contain secrets.

Never commit:

- API tokens;
- passwords;
- customer/private project estimates;
- Jira credentials;
- production secrets.

Treat imported files and browser storage as untrusted input and validate them before use.

Because projects are stored locally in the browser, developers must consider data loss and rollback behavior before changing storage. Keep editable JSON backup/export capability working across schema changes.

See [SECURITY.md](../SECURITY.md) for reporting guidance.

## 16. Adding a new feature safely

Use this sequence for most material features:

1. Define the user-visible behavior and acceptance criteria.
2. Decide whether the concept belongs in the domain model.
3. Update TypeScript domain types if required.
4. Add or update factories/defaults.
5. Add domain calculations/rules with Vitest coverage.
6. Add or update Zustand actions if project state changes.
7. Update Zod schemas if data is persisted/imported.
8. Add migration/backward-compatible defaults if required.
9. Implement the React UI.
10. Update exports/integrations intentionally.
11. Add component tests where valuable.
12. Add/update Playwright coverage for critical workflows.
13. Run `npm run check` and `npm run test:e2e`.
14. Update documentation and `CHANGELOG.md` if behavior changes.
15. Add an ADR if the change introduces a significant dependency, persistence strategy, integration boundary, or irreversible architecture choice.

## 17. Adding or changing a persisted field

A persisted field has a larger change surface than a UI-only field.

Check all of these areas:

```text
src/domain/          Type definition / meaning
src/domain/factories Defaults
src/state/           Actions and immutable updates
src/persistence/     Zod schema and migration
src/export/          Editable JSON and reports
src/integrations/    Provider mapping if applicable
src/features/        UI input/display
Vitest               Schema/state/calculation tests
Playwright            Import/reload/critical workflow tests
```

Never change only the TypeScript interface and assume persistence will follow automatically.

## 18. Adding a new dependency

Before adding a package, confirm that the requirement cannot be met cleanly with the current stack or a small internal utility.

A new dependency should have:

- a clear responsibility;
- active maintenance;
- acceptable bundle impact;
- compatible licensing;
- no unnecessary access to sensitive browser APIs;
- tests covering its important integration boundary.

Significant dependencies should be recorded in an ADR.

## 19. Architecture Decision Records

Use ADRs for decisions that future developers might otherwise question or accidentally reverse.

Examples:

- framework/build-system choices;
- persistence strategy;
- major dependencies;
- provider integration boundaries;
- schema/versioning strategy;
- deployment architecture;
- compatibility retirement decisions.

Copy `docs/adr/0000-template.md`, assign the next number, and record context, decision, consequences, and alternatives.

## 20. Release process

`package.json` is the source of truth for the application version.

Before proposing a release tag, run:

```bash
npm run release:verify
```

The release workflow validates version metadata, runs the complete quality gate, builds the portable application, smoke-tests it, creates release assets/checksums, and publishes generated GitHub release notes.

Do not move or reuse an already published tag.

Full instructions are in [releasing.md](releasing.md).

## 21. Pull request expectations

Keep each pull request focused on one outcome.

A PR should normally answer:

- What behavior changes?
- Why is the change needed?
- Which architecture layer owns the change?
- Is persisted/imported data affected?
- Is legacy compatibility affected?
- Are calculations or exports affected?
- What tests protect the change?
- Does accessibility change?
- Does this need an ADR?
- Does the changelog/documentation need updating?

See [CONTRIBUTING.md](../CONTRIBUTING.md) for branch, commit, review, and merge conventions.

## 22. Troubleshooting guide

### The app runs but the production build fails

Run:

```bash
npm run typecheck
npm run build
```

Vite development mode can expose different timing or module behavior than a complete production typecheck/build.

### An imported project fails unexpectedly

Check the Zod schema and migration path before changing the UI. Do not bypass validation.

### An input loses focus while typing

Check whether the component or row is being remounted. Stable entity IDs should be used as React keys. Avoid generating keys during render.

### The page jumps or scroll position resets after editing

Check for remounting, focus side effects, navigation, or elements being programmatically focused after every store update. Reproduce it in Playwright and add a regression test.

### A calculation differs between the UI and export

Both paths should consume the same domain calculation. Remove duplicated calculation logic from whichever layer has reimplemented it.

### Browser tests pass locally but fail in CI

Use the Playwright report and retry trace. Check browser-specific behavior, timing assumptions, fixed viewport/layout assumptions, and dependency installation. Avoid solving timing issues with arbitrary long sleeps.

### A storage change breaks old projects

Do not patch around it only in React. Add an explicit compatibility/migration path in `src/persistence/` and regression tests for the previous format.

## 23. Source-of-truth documents

Use these documents together:

- [README.md](../README.md) — product overview, setup and high-level repository information.
- [Developer Guide](developer-guide.md) — implementation responsibilities and developer workflow.
- [CONTRIBUTING.md](../CONTRIBUTING.md) — contribution and pull-request rules.
- [ROADMAP.md](../ROADMAP.md) — completed and planned product work.
- [CHANGELOG.md](../CHANGELOG.md) — user-visible version history.
- [SECURITY.md](../SECURITY.md) — vulnerability and security guidance.
- [Release process](releasing.md) — version/tag/release procedure.
- [Legacy retirement](legacy-retirement.md) — compatibility retirement contract.
- [ADRs](adr/) — why important architecture decisions were made.

When documentation and implementation disagree, treat that as a defect: verify the current implementation and update the affected documentation in the same change.