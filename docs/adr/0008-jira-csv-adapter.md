# ADR 0008: Jira CSV adapter over neutral work items

- Status: Accepted
- Date: 2026-08-25

## Context

Users need a practical way to move estimates into Jira before a secure direct API integration exists. Jira CSV imports have provider-specific requirements, including project or space keys, issue types, numeric hierarchy references, repeated columns for multiple labels, and time estimates represented in seconds.

Jira’s standard bulk importer cannot map a hierarchy across multiple levels. The administrator-level External System CSV import supports parent-child mapping through Issue ID and Parent ID fields.

## Decision

Implement Jira CSV as an adapter over the selected provider-neutral work-item preview. Do not add Jira fields to the estimation project or neutral work-item contract.

Map neutral groups, deliverables, activities, and quality items to configurable issue-type names, defaulting to Epic, Story, Sub-task, and Task. Generate deterministic numeric Issue IDs in parent-before-child order and translate neutral parent IDs into Parent IDs. Convert direct estimate hours to whole seconds for Original Estimate. Keep group rollups in descriptions rather than importing them as direct estimates, which avoids double counting.

Support optional labels, component, fix version, and priority. Add source paths, delivery role, risk, confidence, rollup hours, and dependency summaries to descriptions. Dependencies remain descriptive because Jira link creation is not reliably portable through the general CSV field mapper.

## Consequences

- Users can create Jira work in bulk without exposing credentials in the browser.
- Jira-specific terminology and formatting remain isolated under `src/integrations/jira/`.
- Importers must map fields and validate the file in Jira before import.
- Multi-level imports require a Jira administrator and the External System Import workflow.
- Direct creation, returned Jira keys, retries, duplicate prevention, and OAuth remain future backend work.
