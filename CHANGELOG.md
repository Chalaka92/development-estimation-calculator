# Changelog

All notable user-visible changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project intends to use [Semantic Versioning](https://semver.org/spec/v2.0.0.html) when stable releases begin.

## [Unreleased]

### Added

- Contributor, security, issue-reporting, pull-request, dependency-update, and architecture-decision standards.

### Known issues

- The legacy-to-React transition still needs explicit reconciliation when both storage formats contain different revisions.
- Pending autosave should be flushed before navigating to the legacy calculator.

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
