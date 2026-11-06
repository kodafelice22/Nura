import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getOrderAccessUrl } from "../lib/email-templates"
import {
  isWhatsAppConfigured,
  sendWhatsAppTemplate,
  toWhatsAppNumber,
} from "../lib/whatsapp"

// Templates approved in Meta's WhatsApp Manager; each takes {{1}} = order
// number and {{2}} = link to the order.
const TEMPLATES: Record<string, string> = {
  "order.placed": "nura_commande_confirmee",
  "shipment.created": "nura_commande_expediee",
  "delivery.created": "nura_commande_livree",
}

const ORDER_FIELDS = [
  "id",
  "display_id",
  "metadata",
  "shipping_address.phone",
  "shipping_address.country_code",
]

type OrderUpdateEvent = {
  id: string
  no_notification?: boolean
}

// Runs beside the email subscribers on the same events; a WhatsApp failure is
// logged and never affects the order or its email.
export default async function whatsappOrderUpdatesHandler({
  event,
  container,
}: SubscriberArgs<OrderUpdateEvent>) {
  const template = TEMPLATES[event.name]

  if (!template || !isWhatsAppConfigured() || event.data.no_notification) {
    return
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // order.placed carries the order id; shipment.created and delivery.created
  // carry the fulfillment id.
  const order =
    event.name === "order.placed"
      ? (
          await query.graph({
            entity: "order",
            fields: ORDER_FIELDS,
            filters: { id: event.data.id },
          })
        ).data[0]
      : (
          await query.graph({
            entity: "fulfillment",
            fields: ORDER_FIELDS.map((field) => `order.${field}`),
            filters: { id: event.data.id },
          })
        ).data[0]?.order

  if (!order || order.metadata?.whatsapp_opt_in !== true) {
    return
  }

  const to = toWhatsAppNumber(
    order.shipping_address?.phone,
    order.shipping_address?.country_code
  )

  if (!to) {
    logger.warn(
      `[whatsapp] Order ${order.display_id}: phone number not usable, ${template} not sent`
    )
    return
  }

  try {
    await sendWhatsAppTemplate(to, template, [
      String(order.display_id),
      getOrderAccessUrl(order.id),
    ])
  } catch (error) {
    logger.error(
      `[whatsapp] Order ${order.display_id}: ${template} failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

export const config: SubscriberConfig = {
  event: Object.keys(TEMPLATES),
}
