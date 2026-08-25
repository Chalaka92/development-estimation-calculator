# ADR 0002: Use GitHub Pages and Playwright browser verification

- Status: Accepted
- Date: 2026-08-25
- Deciders: Repository owner

## Context

The React calculator needs a repeatable production deployment and evidence that its critical workflows behave consistently in the major browser engines before the legacy fallback can be removed.

## Decision

Deploy the static Vite build from `main` with the official GitHub Pages Actions. Use Playwright to run critical workflows in Chromium, Firefox, and WebKit for pull requests and `main`, retain the HTML report, and run a Chromium smoke test against each deployed Pages URL.

## Consequences

### Positive

- Every production deployment is built from a verified `main` commit.
- Critical calculations, persistence, import/export, responsive layout, and legacy-default behavior are checked in three browser engines.
- Failed browser runs retain traces, screenshots, and an HTML report for diagnosis.
- The published application has a stable URL without introducing a server runtime.

### Negative

- Browser installation increases CI duration and artifact storage.
- Pages must be enabled with GitHub Actions as the repository publishing source.
- The deployed smoke test runs only after a production deployment.

### Follow-up

- Confirm the first Pages deployment and deployed smoke test after merge.
- Observe a stable transition period before deleting the v16 fallback.
- Keep the test suite focused on high-value workflows to control CI duration.

## Alternatives considered

- GitHub Pages branch publishing: rejected because it would require committing generated build output.
- Chromium-only PR testing: rejected because Firefox and WebKit regressions would remain undetected.
- Manual browser checks only: rejected because they are not repeatable merge gates.
