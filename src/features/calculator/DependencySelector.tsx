import { useProjectStore } from '../../app/useProjectStore'
import type { EntityId } from '../../domain/estimation'

interface DependencySelectorProps {
  ownerId: EntityId
  excludedIds: ReadonlyArray<EntityId>
  selectedIds: ReadonlyArray<EntityId>
  label: string
  onChange: (ids: ReadonlyArray<EntityId>) => void
}

export function DependencySelector({
  ownerId,
  excludedIds,
  selectedIds,
  label,
  onChange,
}: DependencySelectorProps) {
  const items = useProjectStore((state) => state.project.developmentItems)
  const excluded = new Set([ownerId, ...excludedIds])
  const options = items.flatMap((item, itemIndex) => [
    { id: item.id, label: `${itemIndex + 1}. ${item.name}` },
    ...item.subItems.map((subItem, subItemIndex) => ({
      id: subItem.id,
      label: `${itemIndex + 1}.${subItemIndex + 1} ${subItem.name}`,
    })),
  ]).filter((option) => !excluded.has(option.id))

  const toggle = (id: EntityId, checked: boolean) =>
    onChange(
      checked
        ? [...selectedIds, id]
        : selectedIds.filter((selectedId) => selectedId !== id),
    )

  return (
    <fieldset className="dependency-selector">
      <legend>{label}</legend>
      {options.length === 0 ? (
        <p>Add another work item to create a dependency.</p>
      ) : (
        <div className="dependency-options">
          {options.map((option) => (
            <label key={option.id}>
              <input
                type="checkbox"
                checked={selectedIds.includes(option.id)}
                onChange={(event) => toggle(option.id, event.target.checked)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  )
}
