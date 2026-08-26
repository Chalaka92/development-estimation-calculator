# Changelog

All notable user-visible changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add a header Help icon after `Reset all` that opens an accessible, topic-based user guide modal covering project setup, development, QA, review, export and Jira, history, and reset/recovery workflows.

## [2.1.0] - 2026-08-26

### Added

- Add a CI-enforced Stage C compatibility guard that pins the retained v16 schemas, editable-export reader, `developmentEstimationV4` storage key, and non-destructive browser-storage migration path.
- Document the browser-storage forward-migration contract in ADR 0009 and pin the current project, archive, and workspace `.v1` storage identities in CI so future schema changes require explicit coordinated migration work.
- Add a frontend-only estimation health review that highlights QA gaps, high-risk work, low confidence, incomplete delivery roles, planning metadata, and missing risk-buffer coverage without changing persisted project data.

### Changed

- Keep v16 editable-export and `developmentEstimationV4` browser-storage migration support after retiring the old calculator UI, with browser acceptance covering both compatibility paths.
- Treat the retired `?ui=legacy` query like the normal React application instead of switching application modes.

### Removed

- Remove the deprecated v16 HTML calculator, legacy iframe application mode, and React header link to the old UI.

## [2.0.1] - 2026-08-25

### Added

- Browser acceptance for non-destructive migration of v16 browser storage into typed project storage.
- A staged legacy-retirement plan that separates removal of the old UI from later removal of v16 data compatibility.

### Changed

- Mark the v16 calculator as a temporary compatibility and recovery mode with migration guidance.
- Remove remaining user-facing preview wording from the stable React calculator.
- Refresh the roadmap, README, and feature-parity review with explicit post-`v2.0.0` legacy-removal gates.
- Upgrade GitHub Actions artifact uploads from v5 to v6 so CI, Pages, and release reports use the current Node 24 action runtime.

## [2.0.0] - 2026-08-25

### Changed

- Promoted the accepted `2.0.0-rc.1` release candidate to the first stable `2.0.0` release after post-RC browser acceptance passed across Chromium, Firefox, and WebKit, including version-marker, legacy-fallback, Markdown-export, and PDF-export checks.

### Known issues

- Legacy snapshots created before modification timestamps were introduced cannot be ordered automatically when their content differs; the application surfaces this case for review.

## [2.0.0-rc.1] - 2026-08-25

### Added

- Contributor, security, issue-reporting, pull-request, dependency-update, and architecture-decision standards.
- Full live estimation table, copy-summary action, and print-ready report.
- Skip navigation, accessible dialog focus management, field-help associations, and live status announcements.
- Legacy-aligned eight-row estimation forms for new main items and sub-items.
- The six legacy QA activities as defaults for every new project.
- GitHub Pages deployment with a smoke test against the published application.
- Playwright coverage for critical workflows in Chromium, Firefox, and WebKit.
- Shared panel, header, empty-state, button, and expansion primitives backed by centralized design tokens.
- Confirmation-protected resets for project settings, development work, QA estimation, and the complete project.
- Reusable zero-hour project templates, named version snapshots, comparison, restore, and automatic recovery snapshots before destructive replacement.
- A browser-local project library with create, search, open, rename, deep duplicate, archive, restore, and delete workflows.
- Optional optimistic, most-likely, and pessimistic activity estimates calculated with the PERT expected-hours formula.
- Optional activity delivery roles, risk levels, confidence percentages, and planning notes.
- Acyclic dependencies between development work units with automatic dangling-reference cleanup.
- Live effort-by-role totals and planning metadata in Markdown, CSV, PDF, and editable JSON exports.
- Provider-neutral group, deliverable, activity, and quality work-item generation with editable preview, selection, and versioned JSON/CSV exports.
- Jira-ready CSV export with configurable issue types, project key, hierarchy IDs, labels, component, fix version, priority, and estimates in seconds.
- Named risk-buffer presets with a persistent Custom percentage option.
- An accessible tabbed workspace for Project, Development, QA, Review, Export and Jira, and History while retaining the live summary across sections.
- Release-candidate version injection, consistency checks, generated release notes, verified build archives, checksums, smoke testing, and rollback guidance.

### Fixed

- Keep the calculator header visible at the top while the workspace scrolls.
- Give repeated item actions unique accessible names and all interactive controls a visible keyboard focus.
- Select the newest timestamped project when typed and legacy browser data both exist.
- Warn when legacy data has no timestamp instead of silently hiding a possible conflict.
- Flush pending React autosave before opening the legacy calculator, unloading, or unmounting.
- Left-align the empty QA guidance with the rest of the editor content.

### Known issues

- Legacy snapshots created before modification timestamps were introduced cannot be ordered automatically when their content differs; the application now surfaces this case for review.

## [2.0.0-alpha.1] - 2026-08-25

### Added

- Typed React calculator as the default application.
- Development work-breakdown and QA editors.
- Live estimate and delivery calculations with decimal manpower.
- Versioned Zustand state and Zod-validated persistence.
- Migration support for v16 exports and browser snapshots.
- Editable JSON import/export plus Markdown, CSV, and PDF summaries.
- Confirmation-protected new-project workflow.
- Automated lint, type-check, test, and build checks in GitHub Actions.

### Changed

- Moved the v16 calculator to an explicit `?ui=legacy` fallback.
