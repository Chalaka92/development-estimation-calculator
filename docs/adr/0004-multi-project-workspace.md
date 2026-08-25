# ADR 0004: Browser-local multi-project workspace

- Status: Accepted
- Date: 2026-08-25

## Context

The calculator originally persisted only one active typed project. Templates and snapshots are intentionally separate, but users also need to keep and switch between complete estimates without manually exporting every project.

## Decision

Store the project library in a validated `developmentEstimation.workspace.v1` record. The record contains an active project ID and up to 50 complete project entries with archive and last-opened metadata.

Keep `developmentEstimation.project.v1` as the canonical active-project record for backward compatibility and recovery. Before switching, the current project is written to both records. Autosave also synchronizes successful active-project saves into the workspace.

Project duplication creates fresh IDs for the project and every nested entity. The active project cannot be archived or deleted. Projects, templates, and snapshots remain separate records and remain local to the browser.

## Consequences

- Existing installations bootstrap the workspace from their current typed or migrated legacy project.
- A failed active-project save blocks switching.
- Search, recent ordering, archive, restore, and deletion do not change the editable project schema.
- Clearing browser storage removes the project library, so editable JSON remains the portable backup format.
