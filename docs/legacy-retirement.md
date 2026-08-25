# Legacy v16 Retirement Plan

The legacy v16 user interface is retired. v16 data compatibility remains supported so historical editable exports and browser snapshots can still be recovered in the typed React calculator.

## Current status

As of the Stage B removal change after `v2.0.1`:

- The typed React calculator is the only application UI.
- `public/legacy/calculator-v16.html` is removed.
- The `?ui=legacy` application mode and iframe branch are removed; that query now leaves the React calculator active.
- The React header no longer links to the legacy calculator.
- Feature parity and accessibility review is complete.
- GitHub Pages deployment and deployed-site smoke testing are operational.
- Chromium, Firefox, and WebKit acceptance coverage is operational.
- v16 editable exports can still be imported into the typed model.
- v16 browser storage can still be migrated automatically into typed storage.
- Newer timestamped v16 browser data still wins over older typed data.
- Untimestamped conflicting v16 data is still surfaced for manual review.
- Migrating v16 storage still writes a typed copy and preserves the original legacy key.
- The first post-`v2.0.0` maintenance release (`v2.0.1`) shipped with deprecation and migration acceptance coverage enabled.
- There were no unresolved repository issues requiring the legacy UI for recovery before Stage B removal.

The application has no backend usage telemetry. For that reason, v16 data readers are intentionally retained after the UI disappears rather than being removed at the same time.

## Retirement stages

### Stage A — deprecate and observe

Complete in `v2.0.1`.

The legacy UI was retained temporarily as a compatibility/recovery path while migration behavior was observed and browser acceptance was strengthened.

### Stage B — remove the legacy UI

Complete in this removal change.

Removed:

- `public/legacy/calculator-v16.html`
- the `legacy` application mode and iframe branch
- the React header link that opened the legacy calculator
- browser acceptance assertions that depended on the old HTML page

Retained:

- `legacyV16EditableExportSchema`
- `legacyV16StorageSnapshotSchema`
- `loadLegacyV16Project`
- `LEGACY_V16_STORAGE_KEY` / `developmentEstimationV4`
- v16 editable-export migration
- v16 browser-storage migration
- conflict and corruption recovery behavior
- automated compatibility acceptance tests

Existing browser data and old editable exports therefore remain recoverable after the UI disappears.

### Stage C — retire v16 data readers

Not started.

Consider removing v16 schemas, import migration, `developmentEstimationV4`, and legacy conflict handling only in a later major-version change after a separately documented compatibility window. This requires its own migration review and release note because it can make historical backups unreadable.

## Legacy UI removal gate

All Stage B conditions are satisfied:

- [x] Stable `v2.0.0` is published.
- [x] Stable `v2.0.0` is deployed through GitHub Pages.
- [x] Feature parity review is complete.
- [x] Accessibility review is complete.
- [x] Editable v16 import is covered by automated tests.
- [x] v16 browser-storage migration is covered by automated tests.
- [x] Browser acceptance verified the real legacy fallback while it existed.
- [x] Browser acceptance verifies non-destructive v16 storage migration into typed storage.
- [x] Autosave flushed before navigating into legacy mode while that mode existed.
- [x] At least one maintenance release after `v2.0.0` shipped with the deprecation notice and migration acceptance checks enabled (`v2.0.1`).
- [x] No unresolved high-severity issue required the legacy UI for recovery.
- [x] The removal PR demonstrates that old v16 editable exports and browser snapshots still migrate without the legacy HTML page.

## Stage B verification checklist

1. [x] Delete the legacy HTML asset and legacy app-mode branch.
2. [x] Remove the legacy navigation link from the React header.
3. [x] Keep `legacyV16EditableExportSchema`, `legacyV16StorageSnapshotSchema`, `loadLegacyV16Project`, and `LEGACY_V16_STORAGE_KEY`.
4. [x] Convert the legacy fallback browser test into compatibility regression tests that do not require the old HTML page.
5. [x] Run `npm run check` and the complete Playwright suite in CI for the removal PR.
6. [x] Add a representative v16 editable JSON browser import that must migrate successfully.
7. [x] Keep a representative `developmentEstimationV4` browser snapshot test that creates typed storage without deleting the original snapshot.
8. [x] Update README, roadmap, changelog, and this retirement plan to state that only the legacy UI is removed.

Stage B CI completed successfully across the repository quality gate and the full Chromium, Firefox, and WebKit Playwright matrix.

## Rollback principle

If a legacy-removal release exposes a migration or data-recovery regression, restore the last known-good UI only as a short-term recovery measure. Do not alter or delete a user's legacy browser key during rollback or migration.
