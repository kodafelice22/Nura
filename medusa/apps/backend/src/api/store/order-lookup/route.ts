import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createFailureLimiter,
  parseOrderNumber,
} from "../../../lib/order-lookup"

type OrderLookupRequestBody = {
  order_number?: string
  email?: string
}

const WINDOW_MS = 15 * 60 * 1000

// The request comes from the storefront server, so the client's IP is not
// visible here: failures are limited per order number (guessing an email for
// a known order) and per email (walking order numbers with someone's email).
const failuresByOrder = createFailureLimiter({ max: 5, windowMs: WINDOW_MS })
const failuresByEmail = createFailureLimiter({ max: 10, windowMs: WINDOW_MS })

// Same answer for an unknown order and a wrong email, so neither leaks.
const NOT_FOUND = "Aucune commande ne correspond à ce numéro et à cet email."

export async function POST(
  req: MedusaRequest<OrderLookupRequestBody>,
  res: MedusaResponse
) {
  const displayId = parseOrderNumber(req.body?.order_number)
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : ""

  if (!displayId || !email || email.length > 254) {
    return res.status(400).json({
      message: "Indiquez votre numéro de commande et votre adresse email.",
    })
  }

  const orderKey = String(displayId)

  if (failuresByOrder.isBlocked(orderKey) || failuresByEmail.isBlocked(email)) {
    return res.status(429).json({
      message: "Trop de tentatives. Réessayez dans 15 minutes.",
    })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: ["id", "email"],
    // Query's generated filter types declare display_id as a string.
    filters: { display_id: orderKey, is_draft_order: false },
  })

  if (!order || order.email?.toLowerCase() !== email) {
    failuresByOrder.recordFailure(orderKey)
    failuresByEmail.recordFailure(email)
    return res.status(404).json({ message: NOT_FOUND })
  }

  // The storefront signs its own order-access cookie from this id, as it does
  // after checkout.
  return res.status(200).json({ order_id: order.id })
}
