# Contributing

Thank you for improving the Development Estimation Calculator.

Before making implementation changes, read [docs/developer-guide.md](docs/developer-guide.md). It explains the application architecture, technology responsibilities, state and persistence boundaries, testing strategy, compatibility rules, CI/build workflow, and the change surfaces that developers must consider when extending the calculator.

## Before starting

1. Search existing issues and pull requests.
2. Open an issue for a material behavior or architecture change.
3. Keep Jira-specific integration out of the core application until that roadmap item is approved.
4. Never place credentials, tokens, customer data, or private estimates in the repository.

## Local setup

```bash
nvm use
npm ci
npm run check
npx playwright install chromium firefox webkit
npm run test:e2e
```

## Branches and commits

- Branch from the latest `main`.
- Use a short-lived branch such as `feature/export-preview` or `fix/autosave-navigation`.
- Prefer Conventional Commit messages such as `feat: add project templates`, `fix: flush autosave before navigation`, or `docs: record persistence decision`.
- Keep each pull request focused on one outcome.

## Engineering rules

- Keep calculation rules pure and framework-independent under `src/domain/`.
- Represent project data with explicit TypeScript types and stable IDs.
- Validate untrusted storage and imports with Zod.
- Do not round intermediate calculations; round only for display or export.
- Preserve backward compatibility or add an explicit schema migration.
- Use accessible labels, keyboard behavior, visible focus, and semantic controls.
- Do not store secrets in frontend code.
- Add tests for changed calculations, state transitions, persistence, exports, and important UI workflows.

## Pull-request checklist

Run the complete gate before opening a pull request:

```bash
npm run check
npm run test:e2e
```

Then confirm:

- The change has tests appropriate to its risk.
- Existing projects and legacy data remain safe.
- Documentation and `CHANGELOG.md` are updated when behavior changes.
- No unrelated formatting or dependency changes are included.
- Screenshots are attached for meaningful visual changes.
- New dependencies are justified in the pull-request description.

## Architecture decisions

For a significant dependency, data-model change, persistence strategy, integration boundary, or irreversible design choice, copy `docs/adr/0000-template.md`, assign the next number, and document the decision and consequences.

## Review and merge

Pull requests should pass CI and be reviewed before squash merging. Resolve review comments or explain why a suggestion is not being applied. Delete the feature branch after merge.
