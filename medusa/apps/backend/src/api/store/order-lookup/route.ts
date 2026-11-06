import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createAttemptLimiter,
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
const attemptsByOrder = createAttemptLimiter({ max: 5, windowMs: WINDOW_MS })
const attemptsByEmail = createAttemptLimiter({ max: 10, windowMs: WINDOW_MS })

// Same answer for an unknown order and a wrong email, so neither leaks.
const NOT_FOUND = "Aucune commande ne correspond à ce numéro et à cet email."
const TOO_MANY = "Trop de tentatives. Réessayez dans 15 minutes."

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
  const now = Date.now()

  // Reserved before the query and kept as a failure unless the lookup
  // succeeds, so concurrent guesses are all counted.
  if (!attemptsByOrder.tryAttempt(orderKey, now)) {
    return res.status(429).json({ message: TOO_MANY })
  }
  if (!attemptsByEmail.tryAttempt(email, now)) {
    attemptsByOrder.release(orderKey, now)
    return res.status(429).json({ message: TOO_MANY })
  }
  const release = () => {
    attemptsByOrder.release(orderKey, now)
    attemptsByEmail.release(email, now)
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  let order: { id: string; email?: string | null } | undefined
  try {
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "email"],
      // Query's generated filter types declare display_id as a string.
      filters: { display_id: orderKey, is_draft_order: false },
    })
    order = data[0]
  } catch (error) {
    release()
    throw error
  }

  if (!order || order.email?.toLowerCase() !== email) {
    return res.status(404).json({ message: NOT_FOUND })
  }

  release()
  // The storefront signs its own order-access cookie from this id, as it does
  // after checkout.
  return res.status(200).json({ order_id: order.id })
}
