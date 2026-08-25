# Release process

`package.json` is the single source of truth for the application version. Vite injects that version into the user interface, while `npm run version:check` verifies the lockfile, changelog, and README agree.

## Prepare a release

1. Start from an up-to-date `main` branch.
2. Choose the next Semantic Version. Use a prerelease such as `2.0.0-rc.1` until the stable-transition checks are complete.
3. Run `npm version <version> --no-git-tag-version`.
4. Move completed entries from `[Unreleased]` into a dated changelog section matching the version.
5. Update the current version in `README.md`.
6. Run `npm ci` and `npm run release:verify`.
7. Open and merge a pull request with all required checks passing.

## Publish a release

Create and push an annotated tag from the verified merge commit:

```bash
git switch main
git pull --ff-only
git tag -a v2.0.0-rc.1 -m "Release v2.0.0-rc.1"
git push origin v2.0.0-rc.1
```

The Release workflow rejects a tag that differs from `package.json` or points to a commit outside `main`. It then runs the full quality gate, builds a portable static site, smoke-tests it in Chromium, produces a compressed archive and SHA-256 checksum, and creates a GitHub prerelease or stable release with generated notes.

The workflow can be rerun through **Actions → Release → Run workflow** by entering an existing tag. Existing release assets are replaced safely.

GitHub generates notes from `.github/release.yml`. Pull requests should use `feature`, `enhancement`, `bug`, `fix`, `documentation`, `dependencies`, or `maintenance` labels when practical. Use `skip-changelog` only when a merged change should not appear in release notes.

See GitHub's documentation for [automatically generated release notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes) and [managing releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository).

## Verify and promote

For a release candidate:

- Download the archive and verify its checksum.
- Confirm the GitHub Pages deployment and deployed-site smoke workflow pass for the same commit.
- Complete manual checks for project creation, autosave/reload, import/export, printing, mobile layout, and legacy fallback.
- Record issues before preparing the next release candidate.

Promote to stable only after the transition period is complete. Prepare a new version such as `2.0.0`; never move or reuse the release-candidate tag.

## Roll back

Application data is stored in the browser and schema version 1 remains compatible across this release candidate. Before rollback, export an editable JSON backup from the application.

To restore the deployed application, revert the problematic merge through a pull request. After the revert reaches `main`, the Pages workflow redeploys and smoke-tests that commit. Do not rewrite a published tag. If a GitHub release itself is invalid, mark it as a prerelease or remove the release entry, retain the tag for audit history, and publish a corrected patch or release-candidate version.
