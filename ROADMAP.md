# Roadmap

This roadmap records direction, not a delivery commitment. Jira integration remains parked until the core repository and transition are stable.

## Immediate hardening

- [x] Reconcile typed and legacy browser data when both exist, so the newest timestamped project is selected and an unversioned legacy conflict is surfaced.
- [x] Flush pending autosave before navigating to the legacy calculator or leaving the page.
- [x] Complete a feature-parity and accessibility review before removing the legacy fallback.
- [ ] Complete the first GitHub Pages deployment and deployed-site smoke test. The automated workflow and production URL are configured.

## Maintainability

- Split shared UI primitives and design tokens from calculator-specific components.
- [x] Add Playwright coverage for critical workflows in Chromium, Firefox, and WebKit with retained CI reports.
- Add project templates, version snapshots, comparison, and recovery UX.
- Add automated release notes and tagged releases after the alpha period.

## Future capabilities

- Optional three-point estimation.
- Role-based effort, dependencies, risk, confidence, and notes.
- Multiple saved projects and project history.
- Provider-neutral work-item generation.
- Jira CSV export, followed later by a secure server-backed Jira integration.

## Legacy removal gate

Remove `public/legacy/calculator-v16.html` only after data reconciliation, autosave-on-navigation, feature parity, accessibility, import/export compatibility, the first successful deployed-site smoke test, and a stable transition period are verified.
