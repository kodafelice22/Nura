import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  getOrderAccessUrl,
  renderButton,
  renderEmailLayout,
  toSafeWebUrl,
} from "../lib/email-templates"
import { escapeHtml } from "../lib/escape-html"
import { sendEmailNotificationWorkflow } from "../workflows/send-email-notification"

type ShipmentCreatedEvent = {
  id: string
  no_notification?: boolean
}

export default async function shipmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<ShipmentCreatedEvent>) {
  if (
    data.no_notification ||
    !process.env.RESEND_API_KEY ||
    !process.env.RESEND_FROM_EMAIL
  ) {
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [fulfillment],
  } = await query.graph({
    entity: "fulfillment",
    fields: [
      "id",
      "labels.tracking_number",
      "labels.tracking_url",
      "order.id",
      "order.display_id",
      "order.email",
    ],
    filters: { id: data.id },
  })
  const order = fulfillment?.order

  if (!order?.email) {
    return
  }

  const trackingLabel = fulfillment.labels?.find(
    (label) => label?.tracking_number || label?.tracking_url
  )
  const orderUrl = getOrderAccessUrl(order.id)
  const trackingUrl = toSafeWebUrl(trackingLabel?.tracking_url)
  const trackingHtml = trackingUrl
    ? renderButton(trackingUrl, "Suivre mon colis")
    : trackingLabel?.tracking_number
      ? `<p style="font-size:14px;line-height:1.6;">Numéro de suivi : <strong>${escapeHtml(trackingLabel.tracking_number)}</strong></p>`
      : ""

  await sendEmailNotificationWorkflow(container).run({
    input: {
      to: order.email,
      trigger_type: "shipment_created",
      resource_id: order.id,
      resource_type: "order",
      idempotency_key: `shipment-created:${fulfillment.id}`,
      subject: `Votre commande Nura n°${order.display_id} est expédiée`,
      html: renderEmailLayout(`
        <h1 style="font-size:20px;text-align:center;margin:0 0 16px;">Votre commande est en route</h1>
        <p style="font-size:14px;line-height:1.6;">
          La commande <strong>n°${order.display_id}</strong> a été confiée au transporteur.
        </p>
        ${trackingHtml}
        ${renderButton(orderUrl, "Voir ma commande")}
      `),
    },
  })
}

export const config: SubscriberConfig = {
  event: "shipment.created",
}
