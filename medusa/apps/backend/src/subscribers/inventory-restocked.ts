import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  InventoryLevelWorkflowEvents,
} from "@medusajs/framework/utils"
import { notifyStockAlertsWorkflow } from "../workflows/notify-stock-alerts"

type InventoryLevelEvent = {
  id: string
}

// Whenever stock is added or changed for a location, tell the customers who
// asked to be warned about the variants that consume this inventory item.
export default async function inventoryRestockedHandler({
  event: { data },
  container,
}: SubscriberArgs<InventoryLevelEvent>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [level],
  } = await query.graph({
    entity: "inventory_level",
    fields: ["id", "inventory_item_id"],
    filters: { id: data.id },
  })

  if (!level?.inventory_item_id) {
    return
  }

  await notifyStockAlertsWorkflow(container).run({
    input: { inventory_item_id: level.inventory_item_id },
  })
}

export const config: SubscriberConfig = {
  event: [
    InventoryLevelWorkflowEvents.UPDATED,
    InventoryLevelWorkflowEvents.CREATED,
  ],
}
