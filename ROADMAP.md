# Roadmap

This roadmap records direction, not a delivery commitment. Direct Jira API integration remains parked until authentication and backend hosting are designed.

## Immediate hardening

- [x] Reconcile typed and legacy browser data when both exist, so the newest timestamped project is selected and an unversioned legacy conflict is surfaced.
- [x] Flush pending autosave before leaving the page and, while the fallback existed, before navigating to the legacy calculator.
- [x] Complete a feature-parity and accessibility review before removing the legacy fallback.
- [x] Complete the first GitHub Pages deployment and deployed-site smoke test.

## Maintainability

- [x] Split shared UI primitives and design tokens from calculator-specific components.
- [x] Add Playwright coverage for critical workflows in Chromium, Firefox, and WebKit with retained CI reports.
- [x] Add project templates, version snapshots, comparison, and recovery UX.
- [x] Add version consistency checks, automated release notes, verified tagged releases, build checksums, and release rollback guidance.

## Post-v2.0.0 cleanup

- [x] Publish stable `v2.0.0` and verify the tagged release, Pages deployment, build archive, checksum, and smoke report.
- [x] Mark the v16 UI as a temporary compatibility/recovery mode rather than a parallel calculator.
- [x] Remove remaining user-facing preview wording from the stable React experience.
- [x] Add browser acceptance for non-destructive v16 browser-storage migration into typed storage.
- [x] Document staged legacy retirement so UI removal does not remove v16 data compatibility.
- [x] Ship at least one maintenance release with the legacy deprecation notice and migration acceptance checks enabled (`v2.0.1`).
- [x] Confirm no unresolved high-severity issue still requires the legacy UI for recovery.
- [x] Remove the legacy HTML UI and navigation while preserving v16 editable-export and browser-storage migration compatibility.

## v2.1 direction

Stage C is explicitly out of scope for v2.1. The v16 schemas, import readers, browser-storage migration, and conflict recovery remain compatibility contracts throughout this line.

- [x] Replace the preview-era root component and test identity with the stable `ReactCalculator` name without changing runtime behavior.
- [x] Normalize the remaining preview-era stylesheet and CSS selector namespace without changing the visual design.
- [ ] Add an explicit compatibility guard that fails if the retained v16 reader contracts are accidentally removed during v2.1 cleanup.
- [ ] Review browser-storage/versioning boundaries and document the forward-migration contract before introducing another persistence schema.
- [ ] Select the next frontend-safe user-facing capability after the post-legacy cleanup is complete.

## Future capabilities

- [x] Optional per-activity three-point estimation with PERT calculations and export parity.
- [x] Role-based effort, acyclic dependencies, risk, confidence, notes, and export parity.
- [x] Multiple saved projects with search, recent access, duplication, archive, and deletion.
- [x] Provider-neutral work-item generation with editable preview and JSON/CSV export.
- [x] Jira CSV export with configurable issue types, hierarchy, estimates, and planning fields.
- Secure server-backed Jira authentication and direct work-item creation.

## Legacy retirement status

Stage B removed `public/legacy/calculator-v16.html`, the `?ui=legacy` application mode, and the React header link to the old calculator. Browser acceptance continues to prove that representative v16 editable exports and `developmentEstimationV4` browser snapshots migrate successfully without the legacy HTML page.

Stage B deliberately keeps the v16 schemas, import readers, storage migration, and conflict-recovery behavior. Retiring those compatibility readers is Stage C and requires a separate later major-version decision. See `docs/legacy-retirement.md` for the staged retirement contract.
