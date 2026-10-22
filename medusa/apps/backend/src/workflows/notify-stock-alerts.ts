import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  buildStockAlertEmail,
  isVariantPurchasable,
  StockAlertVariant,
} from "../lib/stock-alert"
import { STOCK_ALERT_MODULE } from "../modules/stock-alert"
import type StockAlertModuleService from "../modules/stock-alert/service"
import { sendEmailNotificationWorkflow } from "./send-email-notification"

export type NotifyStockAlertsInput = { inventory_item_id: string }

type VariantWithProduct = StockAlertVariant & {
  id: string
  title?: string | null
  product?: { title?: string | null; handle?: string | null } | null
}

// Sends the one-off "back in stock" email to everyone waiting on a variant
// that consumes this inventory item, then deletes their request. A request is
// only deleted once its email was handed to the notification provider, so a
// failed send is retried on the next restock event; the idempotency key keeps
// a retry from producing a duplicate email.
const notifyStockAlertsStep = createStep(
  "notify-stock-alerts",
  async (input: NotifyStockAlertsInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const service: StockAlertModuleService = container.resolve(STOCK_ALERT_MODULE)

    const {
      data: [inventoryItem],
    } = await query.graph({
      entity: "inventory_item",
      fields: ["id", "variants.id"],
      filters: { id: input.inventory_item_id },
    })
    const variantIds = (inventoryItem?.variants ?? [])
      .map((variant) => variant?.id)
      .filter((id): id is string => !!id)

    if (!variantIds.length) {
      return new StepResponse({ notified: 0 })
    }

    const subscriptions = await service.listStockAlertSubscriptions({
      variant_id: variantIds,
    })

    if (!subscriptions.length) {
      return new StepResponse({ notified: 0 })
    }

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      logger.warn(
        "[stock-alert] Email provider not configured: waiting requests are kept."
      )
      return new StepResponse({ notified: 0 })
    }

    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: [
        "id",
        "title",
        "product.title",
        "product.handle",
        "manage_inventory",
        "allow_backorder",
        "inventory_items.required_quantity",
        "inventory_items.inventory.location_levels.stocked_quantity",
        "inventory_items.inventory.location_levels.reserved_quantity",
      ],
      filters: { id: [...new Set(subscriptions.map((alert) => alert.variant_id))] },
    })
    const byId = new Map(
      (variants as VariantWithProduct[]).map((variant) => [variant.id, variant])
    )

    let notified = 0

    for (const subscription of subscriptions) {
      const variant = byId.get(subscription.variant_id)

      if (!variant?.product?.handle || !isVariantPurchasable(variant)) {
        continue
      }

      const email = buildStockAlertEmail({
        productTitle: variant.product.title ?? "Votre produit Nura",
        variantTitle: variant.title,
        handle: variant.product.handle,
      })

      try {
        await sendEmailNotificationWorkflow(container).run({
          input: {
            to: subscription.email,
            trigger_type: "stock_alert",
            resource_id: subscription.variant_id,
            resource_type: "product_variant",
            idempotency_key: `stock-alert:${subscription.id}`,
            subject: email.subject,
            html: email.html,
          },
        })
        await service.deleteStockAlertSubscriptions(subscription.id)
        notified += 1
      } catch (error) {
        logger.error(
          `[stock-alert] Could not notify a subscriber: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }

    return new StepResponse({ notified })
  }
)

export const notifyStockAlertsWorkflow = createWorkflow(
  "notify-stock-alerts",
  (input: NotifyStockAlertsInput) => {
    const result = notifyStockAlertsStep(input)

    return new WorkflowResponse(result)
  }
)
