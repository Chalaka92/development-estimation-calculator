# ADR 0003: Keep templates and project history in a separate browser archive

- Status: Accepted
- Date: 2026-08-25
- Deciders: Repository owner

## Context

The calculator needs reusable templates, exact version snapshots, comparison, restore, and recovery before destructive operations. Adding these records to every editable project file would change the stable project schema and make imports unnecessarily large.

## Decision

Store templates and snapshots in a separately validated, versioned browser record under `developmentEstimation.archive.v1`.

- Snapshots preserve the exact project and estimates.
- Templates preserve structure and schedule settings but store and instantiate every effort value as zero.
- Applying a template or restoring a snapshot first creates a recovery snapshot.
- Importing a project or performing a full reset first creates a recovery snapshot.
- Retain at most 25 snapshots and 20 templates, newest first.
- Block a destructive replacement when its recovery snapshot cannot be saved.

## Consequences

### Positive

- The existing editable-project schema and legacy migration remain unchanged.
- Recovery is available after the highest-risk replacement operations.
- Reused templates receive fresh entity IDs and cannot collide with the source project.
- Invalid archive data is rejected without overwriting the original browser record.

### Negative

- Templates and snapshots remain local to the current browser and device.
- Browser storage quotas limit the practical size of project history.
- Editable JSON export currently contains the active project only, not its archive.

## Follow-up

- Consider an archive export when multiple-project management is introduced.
- Re-evaluate IndexedDB when project history grows beyond local-storage limits.
