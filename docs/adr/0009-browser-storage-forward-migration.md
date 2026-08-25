# ADR 0009: Version browser storage with non-destructive forward migration

- Status: Accepted
- Date: 2026-08-25
- Deciders: Repository owner

## Context

The calculator now has several browser-persistence domains instead of one record. Their current contracts are:

| Domain | Storage key | Container/schema version | Notes |
| --- | --- | --- | --- |
| Active project | `developmentEstimation.project.v1` | project `schemaVersion: 1` | Current editable project |
| Project archive | `developmentEstimation.archive.v1` | archive `schemaVersion: 1` | Embeds project schema v1 in snapshots/templates |
| Project workspace | `developmentEstimation.workspace.v1` | workspace `schemaVersion: 1` | Embeds project schema v1 for every saved project |
| Legacy v16 snapshot | `developmentEstimationV4` | legacy v16 reader contract | Retained for compatibility; Stage C governs retirement |

The archive and workspace both embed `estimationProjectSchema`. A future project-schema change can therefore make those records unreadable even if their outer container shape does not change. Introducing another persistence schema without a coordinated migration policy risks silent data loss, destructive overwrites, or users being unable to open saved projects/history after an upgrade.

## Decision

Treat browser-storage keys and their schema versions as durable compatibility contracts. Any future persisted schema version must use an explicit forward migration and follow these rules.

### 1. Version changes are explicit

- A breaking persisted shape gets a new schema version.
- When a browser-storage container changes incompatibly, use a new versioned key such as `.v2`; do not silently repurpose an existing `.v1` key.
- Editable JSON import/versioning is reviewed together with the active-project schema because both use the same project reader.

### 2. Project changes are reviewed across all persistence domains

A change to `estimationProjectSchema` must review, in the same change set, all records that embed it:

- active project storage;
- project archive snapshots/templates;
- multi-project workspace entries;
- editable JSON import/export;
- retained v16 migration readers.

A project schema must not be bumped while archive/workspace records are left with no reader or migration path for their previous embedded projects.

### 3. Migration is read-old, validate-new, then write-new

A forward migration must:

1. read the previous record without modifying it;
2. validate it with the previous-version reader;
3. transform it into the new model;
4. validate the transformed record with the new schema;
5. write the new versioned record;
6. re-read/verify the new record before it becomes authoritative.

If any step fails, the previous record remains untouched and authoritative.

### 4. Previous data is preserved

- A migration must not delete or overwrite the source-version key as part of the initial migration write.
- Source data remains available for rollback/recovery until a separate, explicit retirement decision removes that reader/key.
- Corrupt or unsupported source data must never be replaced with an empty/default record merely to make loading succeed.
- Existing quarantine/recovery behavior for the active typed project remains valid and must not be weakened by a future migration.

### 5. Migration is idempotent and deterministic

- Re-running a successful migration must not duplicate projects, templates, snapshots, or other logical records.
- Stable IDs and timestamps from the source should be preserved unless the migration has a documented reason to replace them.
- If both old and new records exist, the reader must have a documented precedence rule; it must not switch unpredictably between versions.

### 6. Reader compatibility is intentional

- New readers may accept current and explicitly supported historical versions, but historical readers are not removed incidentally during cleanup.
- The v16 contracts (`legacyV16EditableExportSchema`, `legacyV16StorageSnapshotSchema`, `loadLegacyV16Project`, and `developmentEstimationV4`) remain protected by the Stage C compatibility guard throughout v2.1.
- Retiring any historical reader is a separate compatibility decision with release notes and migration evidence.

### 7. A schema bump has mandatory evidence

Before merging a future persistence-version bump, automated tests must prove at minimum:

- previous active-project storage migrates to the new version;
- previous archive storage migrates without losing snapshots/templates;
- previous workspace storage migrates without losing projects, archive flags, active-project identity, or recent-access metadata;
- migration leaves the previous-version keys unchanged;
- migration is safe when run more than once;
- invalid/corrupt source data is preserved and reported rather than overwritten;
- editable imports from the immediately previous project version still work, or an explicit breaking-import decision is recorded;
- the retained v16 compatibility guard remains green unless Stage C is separately approved.

For user-facing storage migrations, browser acceptance must also exercise a representative upgrade path in Chromium, Firefox, and WebKit before release.

## Consequences

### Positive

- Future schema evolution has an explicit rollback and recovery path.
- Archive/workspace coupling to the project schema cannot be overlooked during a version bump.
- Old browser data is preserved until migration success is proven.
- Persistence changes become reviewable as compatibility changes rather than ordinary refactors.

### Negative

- Schema changes require more implementation and test work than in-place mutation.
- Old keys/readers may remain in the codebase for multiple releases.
- Browser storage can temporarily contain both old and new versions of the same logical data.

### Follow-up

- Keep the current v1 storage identities pinned by a CI guard so changing a key/version requires an intentional test update.
- When a v2 persistence schema is first proposed, add concrete v1-to-v2 migrators and the migration matrix described above before changing the authoritative write path.
- Stage C remains out of scope for v2.1.

## Alternatives considered

- **Overwrite v1 records in place.** Rejected because a failed transformation can destroy the only recoverable copy and makes rollback difficult.
- **Change only `schemaVersion` inside the same key.** Rejected for breaking container changes because old builds cannot distinguish or safely recover a repurposed key.
- **Migrate only the active project.** Rejected because archive and workspace embed the same project schema and would become stranded.
