# ADR 0005: Optional per-activity three-point estimation

- Status: Accepted
- Date: 2026-08-25

## Context

The calculator currently stores one final hour value for each development and QA activity. That workflow must remain quick, but uncertain work also benefits from optimistic, most-likely, and pessimistic estimates.

## Decision

Keep `hours` as the default single-point value and add an optional `threePointEstimate` object to development and QA activities. When present, the calculation engine uses the PERT expected-hours formula:

`(optimistic + 4 × most likely + pessimistic) / 6`

Enabling three-point mode initializes all three values from the existing hours. Disabling it copies the current PERT result back to `hours` and removes the optional object. Live totals and every summary export use the shared calculation function.

This is an additive change to schema version 1. Existing project files remain valid, while editable JSON containing three-point data preserves all three inputs.

## Consequences

- Existing users keep the single-hours workflow without a migration prompt.
- Three-point estimation can be mixed with single-point rows in one project.
- Markdown, CSV, PDF, snapshots, templates, and saved-project copies remain calculation-consistent.
- Templates retain the selected method but reset every hour input to zero.
