// Free-shipping thresholds, expressed the way Medusa expects them: an extra
// price of 0 on a shipping option, valid only once the cart's item_total
// reaches the threshold. Pure functions so the rules can be unit tested; the
// script src/scripts/set-free-shipping-threshold.ts applies them.

import { MedusaError } from "@medusajs/framework/utils"

type RuleOperator = "in" | "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "nin"

export type PriceRuleInput = {
  attribute: string
  operator?: RuleOperator
  value: string | number
}

export type ExistingShippingPrice = {
  id: string
  currency_code?: string | null
  amount: number
  rules?: PriceRuleInput[] | null
}

export type ShippingPriceUpdate =
  | { id: string; region_id: string; amount: number }
  | { id?: string; currency_code: string; amount: number; rules?: PriceRuleInput[] }

const THRESHOLD_ATTRIBUTE = "item_total"

/**
 * Parses "eur:60,xof:40000" into { eur: 60, xof: 40000 }. Throws on anything
 * ambiguous: a wrong threshold silently gives shipping away or never applies.
 */
export const parseThresholds = (raw: string | undefined) => {
  const thresholds: Record<string, number> = {}

  for (const part of (raw ?? "").split(",").map((item) => item.trim())) {
    if (!part) {
      continue
    }

    const match = /^([a-z]{3}):(\d+(?:\.\d{1,2})?)$/i.exec(part)

    if (!match || Number(match[2]) <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid threshold "${part}": expected <currency>:<positive amount>, e.g. eur:60`
      )
    }

    const currency = match[1].toLowerCase()

    if (currency in thresholds) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Duplicate threshold for currency "${currency}"`
      )
    }

    thresholds[currency] = Number(match[2])
  }

  return thresholds
}

const isFreeShippingPrice = (price: ExistingShippingPrice) =>
  price.amount === 0 &&
  (price.rules ?? []).some((rule) => rule.attribute === THRESHOLD_ATTRIBUTE)

/** The region a price is scoped to, when it is a region price. */
const regionOf = (price: ExistingShippingPrice) => {
  const rule = (price.rules ?? []).find((item) => item.attribute === "region_id")

  return rule ? String(rule.value) : undefined
}

/**
 * Builds the full `prices` array for updateShippingOptionsWorkflow, which
 * REPLACES the option's prices: every existing price that is kept must be sent
 * back with its id, or it is deleted.
 *
 * - existing free-shipping prices are dropped and rebuilt (idempotent);
 * - a threshold is only added for currencies the option is already priced in;
 * - currencies without a threshold keep their normal price, no free tier.
 */
export const planShippingPrices = (
  existing: ExistingShippingPrice[],
  thresholds: Record<string, number>
): { prices: ShippingPriceUpdate[]; applied: string[]; skipped: string[] } => {
  const kept = existing.filter((price) => !isFreeShippingPrice(price))
  const prices: ShippingPriceUpdate[] = kept.map((price) => {
    const regionId = regionOf(price)

    if (regionId) {
      return { id: price.id, region_id: regionId, amount: price.amount }
    }

    return {
      id: price.id,
      currency_code: (price.currency_code ?? "").toLowerCase(),
      amount: price.amount,
      ...(price.rules?.length ? { rules: price.rules } : {}),
    }
  })

  const pricedCurrencies = new Set(
    kept.map((price) => (price.currency_code ?? "").toLowerCase()).filter(Boolean)
  )
  const applied: string[] = []
  const skipped: string[] = []

  for (const [currency, threshold] of Object.entries(thresholds)) {
    if (!pricedCurrencies.has(currency)) {
      skipped.push(currency)
      continue
    }

    prices.push({
      currency_code: currency,
      amount: 0,
      rules: [
        {
          attribute: THRESHOLD_ATTRIBUTE,
          operator: "gte",
          value: threshold,
        },
      ],
    })
    applied.push(currency)
  }

  return { prices, applied, skipped }
}
