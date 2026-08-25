import { useMemo } from 'react'
import { useProjectStore } from '../../app/useProjectStore'
import { Panel, PanelHeader } from '../../components/ui'
import {
  calculateDevelopmentItemHours,
  calculateEstimate,
  calculateEstimationHours,
} from '../../domain/calculations'

const numberFormatter = new Intl.NumberFormat('en', {
  maximumFractionDigits: 2,
})

function formatHours(value: number): string {
  return `${numberFormatter.format(value)} h`
}

export function LiveEstimationTable() {
  const project = useProjectStore((state) => state.project)
  const summary = useMemo(() => calculateEstimate(project), [project])

  return (
    <Panel className="live-table-panel" aria-labelledby="live-table-title">
      <PanelHeader
        className="live-table-panel__heading"
        eyebrow="Consolidated estimate"
        title="Live estimation table"
        titleId="live-table-title"
        step="04"
        titleDetail={
          <p className="live-table-project-name">
            {project.name || 'Untitled Estimate'}
          </p>
        }
        description="Review every main item, sub-item, QA total, and final estimate in one place."
      />

      <div
        className="live-table-scroll"
        role="region"
        aria-label="Scrollable live estimation table"
        tabIndex={0}
      >
        <table className="live-table">
          <caption className="visually-hidden">
            Development and QA work items with their calculated hours
          </caption>
          <thead>
            <tr>
              <th scope="col">No.</th>
              <th scope="col">Main item</th>
              <th scope="col">Sub-item</th>
              <th scope="col">Final hours</th>
            </tr>
          </thead>
          <tbody>
            {project.developmentItems.length === 0 && (
              <tr>
                <td className="live-table__empty" colSpan={4}>
                  Add development work items to populate this table.
                </td>
              </tr>
            )}
            {project.developmentItems.flatMap((item, itemIndex) => {
              const mainNumber = String(itemIndex + 1)
              const mainRow = (
                <tr className="live-table__main-row" key={item.id}>
                  <th scope="row">{mainNumber}</th>
                  <td>{item.name || 'Untitled main item'}</td>
                  <td>—</td>
                  <td>{formatHours(calculateDevelopmentItemHours(item))}</td>
                </tr>
              )

              if (item.subItems.length === 0) return [mainRow]

              return [
                mainRow,
                ...item.subItems.map((subItem, subItemIndex) => (
                  <tr key={subItem.id}>
                    <th scope="row">
                      {mainNumber}.{subItemIndex + 1}
                    </th>
                    <td>
                      <span className="visually-hidden">Main item: </span>
                      {item.name || 'Untitled main item'}
                    </td>
                    <td>{subItem.name || 'Untitled sub-item'}</td>
                    <td>{formatHours(calculateEstimationHours(subItem.estimation))}</td>
                  </tr>
                )),
              ]
            })}
            <tr className="live-table__qa-row">
              <th scope="row">QA</th>
              <td>Quality assurance</td>
              <td>—</td>
              <td>{formatHours(summary.qaHours)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>Final estimate including risk</th>
              <td>{formatHours(summary.finalHours)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  )
}
