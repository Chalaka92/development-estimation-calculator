# ADR 0007: Provider-neutral work-item generation

- Status: Accepted
- Date: 2026-08-25

## Context

The calculator must eventually create tickets in external systems, but the estimation domain should not depend on Jira issue types, project keys, custom fields, credentials, or API behavior. Users also need to review and adjust generated ticket content before sending it elsewhere.

## Decision

Generate a separate, versioned work-item collection from the active estimation project. The neutral kinds are `group`, `deliverable`, `activity`, and `quality`. Generated records contain stable IDs, source identity and path, editable summary and description, parent and dependency IDs, direct and rollup estimates, delivery role, risk, and confidence.

Main items containing sub-items become groups. Sub-items and direct main items become deliverables. Estimation rows can optionally become child activities, and QA rows become quality items. Zero-hour activity generation is opt-in.

When activity detail is disabled, effort is assigned to its deliverable. When activity detail is enabled, direct effort moves to the activity children while the parent retains only its rollup value. This prevents totals from being counted twice.

The preview allows local editing and item exclusion without changing the source estimate. JSON exports use a named file type and schema version; CSV carries the same provider-neutral fields. References to excluded parents or dependencies are removed from the exported collection.

## Consequences

- Jira and other providers can be implemented as adapters over one stable contract.
- The estimation project remains the source of truth and does not store external-system fields.
- Users can inspect and refine generated summaries before export.
- Generated preview edits are intentionally temporary and do not alter saved project data.
- Direct Jira creation and Jira CSV mapping remain separate future work.
