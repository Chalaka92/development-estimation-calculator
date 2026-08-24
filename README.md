# Development Estimation Calculator

A standalone, browser-based calculator for preparing software development and QA estimates. The application is contained in a single HTML file and requires no build process or server.

## Features

- Hierarchical development work breakdown with main items, sub-items, and estimation forms
- Expandable and collapsible work items and estimation sections
- Separate QA activity estimation
- Live estimation table and calculated totals
- Configurable risk/uncertainty buffer
- Delivery calculations using hours per day, working days per week, and decimal manpower/FTE values
- Summary export to PDF and Markdown
- Full-data export to an editable file and CSV
- Browser-based autosave using local storage
- Responsive two-panel workspace with an independently scrollable work area

## Run locally

1. Download or clone this repository.
2. Open `index.html` in a modern web browser.
3. Enter the project details and build the work breakdown.

No package installation or build command is required.

## Usage overview

1. Enter the project or release name.
2. Configure the working schedule, manpower, and risk buffer.
3. Add development main items, sub-items, and estimation rows.
4. Add QA activities and hours.
5. Review the live estimation table and delivery summary.
6. Export the required summary or full editable data.

## Export notes

The PDF export opens a printable summary in a new browser window. If nothing happens, allow pop-ups for the page and try again.

## Data storage

Estimation data is saved in the browser's local storage. It is not sent to a server by this application. Use the editable-file export when you need a portable backup or want to move an estimate between browsers.

## Repository structure

```text
.
├── index.html   # Complete application
└── README.md    # Project documentation
```

## Browser support

Use a current version of Chrome, Edge, Firefox, or Safari. JavaScript and local storage must be enabled.
