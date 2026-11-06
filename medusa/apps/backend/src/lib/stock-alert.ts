import { escapeHtml } from "./escape-html"
import {
  getStorefrontUrl,
  renderButton,
  renderEmailLayout,
} from "./email-templates"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VARIANT_ID_RE = /^variant_[A-Za-z0-9]{1,64}$/

// The route is public and unauthenticated: cap what one address can queue.
export const MAX_ACTIVE_ALERTS_PER_EMAIL = 10

export type StockAlertInput = { email: string; variantId: string }

/** Validates and normalizes the body of POST /store/stock-alerts. */
export const parseStockAlertInput = (
  body: unknown
): { ok: true; value: StockAlertInput } | { ok: false; message: string } => {
  const raw = (body ?? {}) as { email?: unknown; variant_id?: unknown }
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : ""
  const variantId = typeof raw.variant_id === "string" ? raw.variant_id.trim() : ""

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return { ok: false, message: "Adresse email invalide." }
  }

  if (!VARIANT_ID_RE.test(variantId)) {
    return { ok: false, message: "Produit invalide." }
  }

  return { ok: true, value: { email, variantId } }
}

type InventoryLevel = {
  stocked_quantity?: number | null
  reserved_quantity?: number | null
}

export type StockAlertVariant = {
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
  inventory_items?:
    | {
        required_quantity?: number | null
        inventory?: { location_levels?: InventoryLevel[] | null } | null
      }[]
    | null
}

/**
 * Whether one unit of the variant can be bought right now: inventory is not
 * managed, backorders are allowed, or every inventory item it consumes has
 * enough unreserved stock across its locations.
 */
export const isVariantPurchasable = (variant: StockAlertVariant) => {
  if (!variant.manage_inventory || variant.allow_backorder) {
    return true
  }

  const items = variant.inventory_items ?? []

  // Managed inventory without any inventory item cannot be fulfilled.
  if (!items.length) {
    return false
  }

  return items.every((item) => {
    const required = Math.max(item.required_quantity ?? 1, 1)
    const available = (item.inventory?.location_levels ?? []).reduce(
      (sum, level) =>
        sum + (level.stocked_quantity ?? 0) - (level.reserved_quantity ?? 0),
      0
    )

    return available >= required
  })
}

export const buildStockAlertEmail = ({
  productTitle,
  variantTitle,
  handle,
}: {
  productTitle: string
  variantTitle?: string | null
  handle: string
}) => {
  const name =
    variantTitle && variantTitle.toLowerCase() !== "default variant"
      ? `${productTitle} — ${variantTitle}`
      : productTitle
  const url = `${getStorefrontUrl()}/products/${encodeURIComponent(handle)}`

  return {
    subject: `${name} est de retour en stock`,
    html: renderEmailLayout(`
      <h1 style="font-size:20px;text-align:center;margin:0 0 16px;">De retour en stock</h1>
      <p style="font-size:14px;line-height:1.6;">
        Vous avez demandé à être prévenu(e) : <strong>${escapeHtml(name)}</strong>
        est de nouveau disponible. Les quantités peuvent être limitées.
      </p>
      ${renderButton(url, "Voir le produit")}
      <p style="font-size:12px;line-height:1.6;color:#8a7a6d;">
        Ce message est unique : votre adresse n'est pas conservée après son envoi
        et vous ne recevrez pas d'autre alerte pour ce produit.
      </p>
    `),
  }
}
