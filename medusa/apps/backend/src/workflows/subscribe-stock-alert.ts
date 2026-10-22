import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  isVariantPurchasable,
  MAX_ACTIVE_ALERTS_PER_EMAIL,
  StockAlertInput,
  StockAlertVariant,
} from "../lib/stock-alert"
import { STOCK_ALERT_MODULE } from "../modules/stock-alert"
import type StockAlertModuleService from "../modules/stock-alert/service"

export type SubscribeStockAlertResult =
  | { status: "subscribed" }
  | { status: "available" }
  | { status: "unknown_variant" }
  | { status: "limit_reached" }

// A single-step workflow with no compensation: the only write is one insert,
// and a duplicate is treated as success.
const subscribeStockAlertStep = createStep(
  "subscribe-stock-alert",
  async (input: StockAlertInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const service: StockAlertModuleService = container.resolve(STOCK_ALERT_MODULE)

    const {
      data: [variant],
    } = await query.graph({
      entity: "product_variant",
      fields: [
        "id",
        "product_id",
        "manage_inventory",
        "allow_backorder",
        "inventory_items.required_quantity",
        "inventory_items.inventory.location_levels.stocked_quantity",
        "inventory_items.inventory.location_levels.reserved_quantity",
      ],
      filters: { id: input.variantId },
    })

    if (!variant?.product_id) {
      return new StepResponse<SubscribeStockAlertResult>({
        status: "unknown_variant",
      })
    }

    // Nothing to wait for: the customer can simply buy it.
    if (isVariantPurchasable(variant as StockAlertVariant)) {
      return new StepResponse<SubscribeStockAlertResult>({ status: "available" })
    }

    const existing = await service.listStockAlertSubscriptions({
      email: input.email,
    })

    // Re-subscribing to the same variant is a no-op, not an error, so the
    // endpoint cannot be used to learn what an address already requested.
    if (existing.some((alert) => alert.variant_id === input.variantId)) {
      return new StepResponse<SubscribeStockAlertResult>({ status: "subscribed" })
    }

    if (existing.length >= MAX_ACTIVE_ALERTS_PER_EMAIL) {
      return new StepResponse<SubscribeStockAlertResult>({
        status: "limit_reached",
      })
    }

    try {
      await service.createStockAlertSubscriptions({
        email: input.email,
        variant_id: input.variantId,
        product_id: variant.product_id,
      })
    } catch (error) {
      // Lost a race with a concurrent identical request: already subscribed.
      const message = error instanceof Error ? error.message : String(error)

      if (!message.toLowerCase().includes("already exists")) {
        throw error
      }
    }

    return new StepResponse<SubscribeStockAlertResult>({ status: "subscribed" })
  }
)

export const subscribeStockAlertWorkflow = createWorkflow(
  "subscribe-stock-alert",
  (input: StockAlertInput) => {
    const result = subscribeStockAlertStep(input)

    return new WorkflowResponse(result)
  }
)
