# Feature Parity and Accessibility Review

Date: 2026-08-25

This review compares the typed React calculator with the temporary v16 fallback and records the accessibility work completed before legacy removal.

## Feature parity

| Capability | React status |
| --- | --- |
| Project and schedule settings | Complete |
| Main items, sub-items, activities, and decimal hours | Complete |
| QA estimation | Complete |
| Live totals and delivery calculations | Complete |
| Full live estimation table | Complete in this review |
| Markdown, CSV, PDF, and editable JSON export | Complete |
| Validated typed and v16 import | Complete |
| Copy full summary | Complete in this review |
| Print the complete report | Complete in this review |
| Browser save | Replaced by validated autosave with unload flush |
| Reset | Replaced by confirmation-protected new-project workflow |

## Accessibility review

Completed in this review:

- Sticky top header and skip navigation.
- Visible keyboard focus for interactive controls.
- Dialog initial focus, focus containment, Escape dismissal, scroll locking, and focus restoration.
- Programmatic associations between numeric fields and their help text.
- Unique accessible names for repeated duplicate and delete actions.
- Polite save-status announcements and atomic live-summary updates.
- Named scrollable table region with semantic headers, caption, and totals.
- Reduced-motion and print styles.

## Legacy removal gate

Functional parity is complete. Automated browser-matrix testing and a deployed production preview remain required before removing `public/legacy/calculator-v16.html`.
