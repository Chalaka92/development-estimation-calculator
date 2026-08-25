# Feature Parity and Accessibility Review

Date: 2026-08-25

This review compares the typed React calculator with the former v16 fallback and records the accessibility work completed before legacy UI removal.

## Feature parity

| Capability | React status |
| --- | --- |
| Project and schedule settings | Complete |
| Main items, sub-items, activities, and decimal hours | Complete, including the legacy eight-row defaults and form totals |
| QA estimation | Complete, including the six legacy default activities |
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
- Left-aligned QA empty-state guidance that follows the editor's reading edge.

## Legacy removal result

Functional parity is complete. Automated Chromium, Firefox, and WebKit coverage is active, GitHub Pages deployment and deployed-site smoke testing are successful, stable `v2.0.0` was published on 2026-08-25, and `v2.0.1` completed the required maintenance-release observation period with migration acceptance enabled.

Stage B removes the old v16 HTML calculator, legacy iframe application mode, and React navigation link. The browser suite replaces old-page assertions with compatibility tests that prove both a representative v16 editable export and a `developmentEstimationV4` browser snapshot still migrate after the HTML page is gone.

Legacy data compatibility is not part of Stage B removal. v16 editable-export schemas, browser-storage readers, migration logic, original-key preservation, and conflict-recovery behavior remain supported until a separate Stage C major-version decision. See `legacy-retirement.md` for the staged retirement contract.
