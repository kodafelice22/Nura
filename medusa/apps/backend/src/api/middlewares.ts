import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  AuthenticatedMedusaRequest,
  authenticate,
  defineMiddlewares,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { verifyOrderAccessToken } from "../lib/order-access-token"

const authorizeOrderRead = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const orderId = req.params.id
  const customerId = (req as AuthenticatedMedusaRequest).auth_context?.actor_id

  if (customerId) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: ["customer_id"],
      filters: { id: orderId },
    })

    if (order?.customer_id === customerId) {
      return next()
    }
  } else if (
    verifyOrderAccessToken(
      orderId,
      req.headers["x-order-access-token"] as string | undefined
    )
  ) {
    return next()
  }

  return res.status(404).json({ message: "Order not found" })
}

// The core store order route only allows "fulfillments"; the order timeline
// also needs the tracking number and link of each shipment.
const allowTrackingFields = (
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  req.allowed = [
    ...(req.allowed ?? []),
    "fulfillments.labels.tracking_number",
    "fulfillments.labels.tracking_url",
  ]
  next()
}

/**
 * RBAC enforcement for the admin dashboard.
 *
 * Medusa's core admin routes don't enforce RBAC policies out of the box —
 * only the /admin/rbac/* management routes do. This file fills that gap for
 * the routes where the Super Admin / Admin / Manager split (see
 * src/scripts/seed-rbac-roles.ts) actually needs to matter:
 *
 * - User, invite, store and API key management: Manager is blocked
 *   entirely; only Admin and Super Admin can reach these.
 * - Deleting core commerce records: Manager can create and edit products,
 *   orders, customers, etc., but can't delete them.
 *
 * Read/write on the day-to-day commerce resources (products, orders,
 * customers, inventory, promotions, pricing) is intentionally left
 * unrestricted here — Manager is meant to operate those freely; Admin and
 * Super Admin already can via their wildcard-ish role policies.
 *
 * When MEDUSA_FF_RBAC isn't enabled, these `policies` entries are no-ops
 * (the underlying check fails open), so this file is always safe to load.
 */
export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/customers/me/password",
      methods: ["POST"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/customers/me/reviews*",
      methods: ["GET", "POST"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/customers/me/wishlist*",
      methods: ["GET", "POST", "DELETE"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/customers/me/referral-code",
      methods: ["GET"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/orders/:id",
      methods: ["GET"],
      middlewares: [
        authenticate("customer", ["session", "bearer"], {
          allowUnauthenticated: true,
        }),
        authorizeOrderRead,
      ],
    },
    {
      // A wildcard sorts before the core "/store/orders/:id" query
      // validation; the same ":id" matcher would run after it, too late.
      matcher: "/store/orders/*",
      methods: ["GET"],
      middlewares: [allowTrackingFields],
    },
    {
      matcher: "/admin/users*",
      policies: { resource: "user", operation: "*" },
    },
    {
      matcher: "/admin/invites*",
      policies: { resource: "user", operation: "*" },
    },
    {
      matcher: "/admin/stores*",
      policies: { resource: "store", operation: "*" },
    },
    {
      matcher: "/admin/api-keys*",
      policies: { resource: "api_key", operation: "*" },
    },
    {
      matcher: "/admin/home-content*",
      policies: { resource: "content", operation: "*" },
    },
    {
      matcher: "/admin/journal*",
      policies: { resource: "content", operation: "*" },
    },
    {
      matcher: "/admin/reviews*",
      policies: { resource: "review", operation: "*" },
    },
    {
      matcher: "/admin/products/:id",
      methods: ["DELETE"],
      policies: { resource: "product", operation: "delete" },
    },
    {
      matcher: "/admin/product-categories/:id",
      methods: ["DELETE"],
      policies: { resource: "product", operation: "delete" },
    },
    {
      matcher: "/admin/collections/:id",
      methods: ["DELETE"],
      policies: { resource: "product", operation: "delete" },
    },
    {
      matcher: "/admin/orders/:id",
      methods: ["DELETE"],
      policies: { resource: "order", operation: "delete" },
    },
    {
      matcher: "/admin/draft-orders/:id",
      methods: ["DELETE"],
      policies: { resource: "order", operation: "delete" },
    },
    {
      matcher: "/admin/customers/:id",
      methods: ["DELETE"],
      policies: { resource: "customer", operation: "delete" },
    },
    {
      matcher: "/admin/customer-groups/:id",
      methods: ["DELETE"],
      policies: { resource: "customer", operation: "delete" },
    },
    {
      matcher: "/admin/promotions/:id",
      methods: ["DELETE"],
      policies: { resource: "promotion", operation: "delete" },
    },
    {
      matcher: "/admin/price-lists/:id",
      methods: ["DELETE"],
      policies: { resource: "pricing", operation: "delete" },
    },
  ],
})
