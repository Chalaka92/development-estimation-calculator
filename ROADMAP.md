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

## Future capabilities

- [x] Optional per-activity three-point estimation with PERT calculations and export parity.
- [x] Role-based effort, acyclic dependencies, risk, confidence, notes, and export parity.
- [x] Multiple saved projects with search, recent access, duplication, archive, and deletion.
- [x] Provider-neutral work-item generation with editable preview and JSON/CSV export.
- [x] Jira CSV export with configurable issue types, hierarchy, estimates, and planning fields.
- Secure server-backed Jira authentication and direct work-item creation.

## Legacy removal gate

Remove `public/legacy/calculator-v16.html` only after data reconciliation, autosave-on-navigation, feature parity, accessibility, import/export compatibility, the first successful deployed-site smoke test, and a stable transition period are verified.
