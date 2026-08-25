# ADR 0006: Optional estimation metadata and acyclic dependencies

- Status: Accepted
- Date: 2026-08-25

## Context

Hours alone do not explain who is expected to deliver work, how certain an estimate is, or which work must finish first. This information must be useful in the calculator now and remain provider-neutral for a future ticket-generation integration.

## Decision

Add optional `role`, `riskLevel`, `confidencePercentage`, and `notes` fields to development and QA activities. Calculate role totals from the same effective activities and PERT-aware hour function used by the estimate summary. Unassigned development effort is reported as `Unassigned`; unassigned QA effort uses the `QA` fallback.

Add optional `dependencyIds` to main items and sub-items. Dependencies reference stable work-unit IDs. Store actions normalize duplicates, reject missing targets and self-references, prevent directed cycles, clear dependencies from duplicated work, and remove references when a target is deleted.

The additions remain backward-compatible within schema version 1. Existing saved projects without these optional fields continue to validate. Editable JSON retains the fields, and Markdown, CSV, and PDF summaries report them.

## Consequences

- Simple estimates remain uncluttered because planning fields are collapsed by default.
- Role totals stay consistent with direct-versus-sub-item and single-versus-three-point calculation rules.
- Dependency graphs remain valid after editing, duplication, and deletion.
- Future work-item providers can translate neutral roles, notes, risk, confidence, and dependencies without introducing Jira-specific fields into the domain model.
- Cross-project dependencies are intentionally unsupported because editable projects are self-contained.
