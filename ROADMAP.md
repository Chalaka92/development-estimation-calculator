# Roadmap

This roadmap records direction, not a delivery commitment. Direct Jira API integration remains parked until authentication and backend hosting are designed.

## Immediate hardening

- [x] Reconcile typed and legacy browser data when both exist, so the newest timestamped project is selected and an unversioned legacy conflict is surfaced.
- [x] Flush pending autosave before navigating to the legacy calculator or leaving the page.
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
- [ ] Ship at least one maintenance release with the legacy deprecation notice and migration acceptance checks enabled.
- [ ] Confirm no unresolved high-severity issue still requires the legacy UI for recovery.

## Future capabilities

- [x] Optional per-activity three-point estimation with PERT calculations and export parity.
- [x] Role-based effort, acyclic dependencies, risk, confidence, notes, and export parity.
- [x] Multiple saved projects with search, recent access, duplication, archive, and deletion.
- [x] Provider-neutral work-item generation with editable preview and JSON/CSV export.
- [x] Jira CSV export with configurable issue types, hierarchy, estimates, and planning fields.
- Secure server-backed Jira authentication and direct work-item creation.

## Legacy removal gate

The legacy UI is now deprecated. Remove `public/legacy/calculator-v16.html` only after the remaining post-v2.0.0 operational gates are complete and a removal PR proves that v16 editable exports and `developmentEstimationV4` browser snapshots still migrate without the old HTML page.

Legacy UI removal must not remove the v16 schemas, import readers, storage migration, or conflict-recovery behavior. Those compatibility readers require a separate later major-version decision. See `docs/legacy-retirement.md` for the staged retirement contract and checklist.
