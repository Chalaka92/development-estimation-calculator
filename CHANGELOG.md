# Changelog

All notable user-visible changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project intends to use [Semantic Versioning](https://semver.org/spec/v2.0.0.html) when stable releases begin.

## [Unreleased]

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
