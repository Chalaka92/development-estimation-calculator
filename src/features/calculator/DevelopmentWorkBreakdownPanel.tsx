import { useState } from 'react'
import { useProjectStore } from '../../app/useProjectStore'
import {
  calculateDevelopmentItemHours,
  calculateEstimationHours,
} from '../../domain/calculations'
import type {
  DevelopmentSubItem,
  DevelopmentWorkItem,
} from '../../domain/estimation'
import { EstimationActivityRows } from './EstimationActivityRows'

function formatHours(hours: number): string {
  return `${new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(hours)} h`
}

interface SubItemCardProps {
  workItemId: string
  subItem: DevelopmentSubItem
  index: number
}

function SubItemCard({ workItemId, subItem, index }: SubItemCardProps) {
  const [expanded, setExpanded] = useState(true)
  const actions = useProjectStore((state) => state.actions)
  const owner = { workItemId, subItemId: subItem.id }

  return (
    <article className="wbs-sub-item">
      <div className="wbs-item-header wbs-item-header--sub">
        <button
          type="button"
          className="wbs-expand-button"
          aria-expanded={expanded}
          aria-controls={`sub-item-${subItem.id}`}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} sub-item ${index + 1}`}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? '−' : '+'}
        </button>
        <span className="wbs-item-number">{index + 1}</span>
        <input
          className="wbs-title-input"
          aria-label={`Sub-item ${index + 1} name`}
          value={subItem.name}
          onChange={(event) =>
            actions.updateSubItem(workItemId, subItem.id, event.target.value)
          }
        />
        <strong className="wbs-item-hours">
          {formatHours(calculateEstimationHours(subItem.estimation))}
        </strong>
        <div className="wbs-item-actions">
          <button
            type="button"
            onClick={() => actions.duplicateSubItem(workItemId, subItem.id)}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="wbs-danger-action"
            onClick={() => actions.deleteSubItem(workItemId, subItem.id)}
          >
            Delete
          </button>
        </div>
      </div>

      {expanded && (
        <div className="wbs-item-body wbs-item-body--sub" id={`sub-item-${subItem.id}`}>
          <EstimationActivityRows
            owner={owner}
            activities={subItem.estimation}
            emptyMessage="No estimation activities in this sub-item yet."
          />
          <button
            type="button"
            className="wbs-add-inline"
            onClick={() => actions.addEstimationActivity(owner)}
          >
            + Add activity
          </button>
        </div>
      )}
    </article>
  )
}

interface WorkItemCardProps {
  item: DevelopmentWorkItem
  index: number
}

function WorkItemCard({ item, index }: WorkItemCardProps) {
  const [expanded, setExpanded] = useState(true)
  const actions = useProjectStore((state) => state.actions)
  const hasSubItems = item.subItems.length > 0
  const canAddSubItem = item.directEstimation.length === 0
  const directOwner = { workItemId: item.id }

  return (
    <article className="wbs-main-item">
      <div className="wbs-item-header">
        <button
          type="button"
          className="wbs-expand-button"
          aria-expanded={expanded}
          aria-controls={`work-item-${item.id}`}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} main item ${index + 1}`}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? '−' : '+'}
        </button>
        <span className="wbs-item-number">{index + 1}</span>
        <input
          className="wbs-title-input"
          aria-label={`Main item ${index + 1} name`}
          value={item.name}
          onChange={(event) =>
            actions.updateDevelopmentItem(item.id, event.target.value)
          }
        />
        <strong className="wbs-item-hours">
          {formatHours(calculateDevelopmentItemHours(item))}
        </strong>
        <div className="wbs-item-actions">
          <button
            type="button"
            onClick={() => actions.duplicateDevelopmentItem(item.id)}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="wbs-danger-action"
            onClick={() => actions.deleteDevelopmentItem(item.id)}
          >
            Delete
          </button>
        </div>
      </div>

      {expanded && (
        <div className="wbs-item-body" id={`work-item-${item.id}`}>
          {hasSubItems ? (
            <div className="wbs-sub-item-list">
              {item.subItems.map((subItem, subItemIndex) => (
                <SubItemCard
                  key={subItem.id}
                  workItemId={item.id}
                  subItem={subItem}
                  index={subItemIndex}
                />
              ))}
            </div>
          ) : (
            <EstimationActivityRows
              owner={directOwner}
              activities={item.directEstimation}
              emptyMessage="Choose an activity or sub-item to start this estimate."
            />
          )}

          <div className="wbs-add-actions">
            {!hasSubItems && (
              <button
                type="button"
                className="wbs-add-inline"
                onClick={() => actions.addEstimationActivity(directOwner)}
              >
                + Add activity
              </button>
            )}
            <button
              type="button"
              className="wbs-add-inline"
              disabled={!canAddSubItem}
              title={
                canAddSubItem
                  ? 'Add a sub-item'
                  : 'Remove direct activities before adding sub-items'
              }
              onClick={() => actions.addSubItem(item.id)}
            >
              + Add sub-item
            </button>
          </div>
          {!canAddSubItem && (
            <p className="wbs-mode-hint">
              Direct activities and sub-items cannot be mixed. Remove direct
              activities before switching this item to sub-items.
            </p>
          )}
        </div>
      )}
    </article>
  )
}

export function DevelopmentWorkBreakdownPanel() {
  const items = useProjectStore((state) => state.project.developmentItems)
  const addDevelopmentItem = useProjectStore(
    (state) => state.actions.addDevelopmentItem,
  )

  return (
    <section className="preview-card wbs-panel" aria-labelledby="wbs-title">
      <div className="preview-card__heading wbs-panel__heading">
        <div>
          <p className="preview-eyebrow">Scope and effort</p>
          <h2 id="wbs-title">Development work breakdown</h2>
          <p className="wbs-heading-description">
            Estimate main items directly or divide them into detailed sub-items.
          </p>
        </div>
        <span className="preview-step">02</span>
      </div>

      {items.length === 0 ? (
        <div className="wbs-empty-state">
          <span>0 items</span>
          <h3>Build the estimate from clear work items.</h3>
          <p>
            Add the first development item, then enter activities and hours or
            break it into sub-items.
          </p>
          <button type="button" onClick={() => addDevelopmentItem()}>
            Add first main item
          </button>
        </div>
      ) : (
        <div className="wbs-main-item-list">
          {items.map((item, index) => (
            <WorkItemCard key={item.id} item={item} index={index} />
          ))}
        </div>
      )}

      {items.length > 0 && (
        <button
          type="button"
          className="wbs-add-main"
          onClick={() => addDevelopmentItem()}
        >
          + Add main item
        </button>
      )}
    </section>
  )
}
