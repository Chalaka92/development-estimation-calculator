# Legacy v16 Retirement Plan

The v16 calculator remains available only as a temporary compatibility and recovery path after the stable `v2.0.0` release. Removing the legacy user interface is deliberately separate from removing legacy data compatibility.

## Current status

As of `v2.0.0`:

- The typed React calculator is the default application.
- Feature parity and accessibility review is complete.
- GitHub Pages deployment and deployed-site smoke testing are operational.
- Chromium, Firefox, and WebKit acceptance coverage is operational.
- v16 editable exports can be imported into the typed model.
- v16 browser storage can be migrated automatically into typed storage.
- Newer timestamped v16 browser data wins over older typed data.
- Untimestamped conflicting v16 data is surfaced for manual review.
- Migrating v16 storage writes a typed copy and preserves the original legacy key.
- The `?ui=legacy` route is deprecated and presented as recovery mode.

The application has no backend usage telemetry. Absence of bug reports is therefore not proof that nobody still depends on the legacy UI.

## Retirement stages

### Stage A — deprecate and observe

This is the current stage.

Keep all of the following:

- `public/legacy/calculator-v16.html`
- `?ui=legacy`
- v16 editable-export schemas and migration
- `developmentEstimationV4` storage migration
- conflict and corruption recovery behavior
- automated legacy fallback and migration acceptance tests

The legacy screen must clearly explain that it is temporary and direct users back to the React calculator.

### Stage B — remove the legacy UI

The UI can be removed only after every removal gate below is satisfied.

Remove:

- `public/legacy/calculator-v16.html`
- the `legacy` application mode and iframe branch
- the React header link that opens the legacy calculator
- browser acceptance assertions that require the old HTML page

Do **not** remove the v16 import or storage migration readers at this stage. Existing browser data and old editable exports must remain recoverable after the UI disappears.

### Stage C — retire v16 data readers

Consider removing v16 schemas, import migration, `developmentEstimationV4`, and legacy conflict handling only in a later major-version change after a separately documented compatibility window. This requires its own migration review and release note because it can make historical backups unreadable.

## Legacy UI removal gate

All conditions must be true before Stage B:

- [x] Stable `v2.0.0` is published.
- [x] Stable `v2.0.0` is deployed through GitHub Pages.
- [x] Feature parity review is complete.
- [x] Accessibility review is complete.
- [x] Editable v16 import is covered by automated tests.
- [x] v16 browser-storage migration is covered by automated tests.
- [x] Browser acceptance verifies the real legacy fallback while it exists.
- [x] Browser acceptance verifies non-destructive v16 storage migration into typed storage.
- [x] Autosave flushes before navigating into legacy mode.
- [ ] At least one maintenance release after `v2.0.0` has shipped with the deprecation notice and migration acceptance checks enabled.
- [ ] No unresolved high-severity issue requires the legacy UI for recovery.
- [ ] The removal PR demonstrates that old v16 editable exports and browser snapshots still migrate without the legacy HTML page.

The two unchecked operational gates are intentionally the remaining blockers immediately after `v2.0.0`.

## Removal PR checklist

When Stage B is eventually proposed:

1. Delete the legacy HTML asset and legacy app-mode branch.
2. Remove the legacy navigation link from the React header.
3. Keep `legacyV16EditableExportSchema`, `legacyV16StorageSnapshotSchema`, `loadLegacyV16Project`, and `LEGACY_V16_STORAGE_KEY` unless Stage C is separately approved.
4. Convert the legacy fallback browser test into migration-only regression tests.
5. Run `npm run check` and the complete Playwright suite.
6. Verify a representative v16 editable JSON file still imports successfully.
7. Verify a representative `developmentEstimationV4` snapshot still creates typed storage without deleting the original snapshot.
8. Update README, roadmap, changelog, and release notes to state that only the legacy UI was removed.

## Rollback principle

If a legacy-removal release exposes a migration or data-recovery regression, restore the last known-good UI only as a short-term recovery measure. Do not alter or delete a user's legacy browser key during rollback or migration.
