import { Button, IconButton, Label, Text } from "@medusajs/ui"
import { ArrowDownMini, ArrowUpMini, Plus, Trash } from "@medusajs/icons"

type RepeatableFieldProps<T> = {
  label: string
  items: T[]
  empty: T
  onChange: (items: T[]) => void
  renderItem: (
    item: T,
    update: (patch: Partial<T>) => void,
    index: number
  ) => React.ReactNode
  addLabel?: string
  hint?: string
  /** Adds move up / move down buttons, for lists where the order matters. */
  reorderable?: boolean
}

/** A repeatable list of small objects — pillars, steps, phone numbers, FAQ
 * entries — edited inline with add/remove, backed by a single jsonb field. */
function RepeatableField<T>({
  label,
  items,
  empty,
  onChange,
  renderItem,
  addLabel = "Ajouter",
  hint,
  reorderable = false,
}: RepeatableFieldProps<T>) {
  const update = (index: number, patch: Partial<T>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  const remove = (index: number) =>
    onChange(items.filter((_, i) => i !== index))

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction

    if (target < 0 || target >= items.length) {
      return
    }

    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const add = () => onChange([...items, empty])

  return (
    <div className="flex flex-col gap-y-3">
      <Label size="small" weight="plus">
        {label}
      </Label>
      {hint && (
        <Text size="xsmall" className="text-ui-fg-muted -mt-2">
          {hint}
        </Text>
      )}
      <div className="flex flex-col gap-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-x-3 rounded-md border border-ui-border-base p-3"
          >
            <div className="flex-1">
              {renderItem(item, (patch) => update(index, patch), index)}
            </div>
            {reorderable && (
              <>
                <IconButton
                  type="button"
                  size="small"
                  variant="transparent"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label="Monter"
                >
                  <ArrowUpMini />
                </IconButton>
                <IconButton
                  type="button"
                  size="small"
                  variant="transparent"
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="Descendre"
                >
                  <ArrowDownMini />
                </IconButton>
              </>
            )}
            <IconButton
              type="button"
              size="small"
              variant="transparent"
              onClick={() => remove(index)}
              aria-label="Retirer"
            >
              <Trash />
            </IconButton>
          </div>
        ))}
      </div>
      <Button
        type="button"
        size="small"
        variant="secondary"
        className="self-start"
        onClick={add}
      >
        <Plus />
        {addLabel}
      </Button>
    </div>
  )
}

export default RepeatableField
