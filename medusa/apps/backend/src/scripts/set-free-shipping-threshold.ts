import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { updateShippingOptionsWorkflow } from "@medusajs/medusa/core-flows"
import type { FulfillmentWorkflow } from "@medusajs/framework/types"
import {
  ExistingShippingPrice,
  parseThresholds,
  planShippingPrices,
  PriceRuleInput,
} from "../lib/free-shipping"

// What query.graph returns for the fields requested below; the generated
// ShippingOption type does not expose the linked prices.
type QueriedPrice = {
  id: string
  currency_code?: string | null
  amount: number | string
  price_rules?: ({ attribute: string; operator?: string | null; value: string } | null)[] | null
} | null

type QueriedOption = {
  id: string
  name: string
  price_type: string
  prices?: QueriedPrice[] | null
}

// Sets (or removes) the free-shipping threshold on shipping options.
//
//   FREE_SHIPPING_THRESHOLDS="eur:60,xof:40000" \
//   FREE_SHIPPING_OPTIONS="Standard Shipping" \
//   npx medusa exec ./src/scripts/set-free-shipping-threshold.ts
//
// - FREE_SHIPPING_THRESHOLDS is required. Pass "none" to remove the threshold.
// - FREE_SHIPPING_OPTIONS lists option names, comma separated
//   (default: "Standard Shipping"). Express options stay paid by default.
// - DRY_RUN=1 prints the planned prices and changes nothing.
//
// Amounts are in the currency's main unit, like every Medusa price
// (60 means 60 EUR, 40000 means 40 000 XOF). Safe to run again: the free tier
// is rebuilt each time instead of being duplicated.
export default async function setFreeShippingThreshold({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const raw = process.env.FREE_SHIPPING_THRESHOLDS?.trim()

  if (!raw) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'FREE_SHIPPING_THRESHOLDS is required, e.g. "eur:60,xof:40000" (or "none" to remove it).'
    )
  }

  const thresholds = raw.toLowerCase() === "none" ? {} : parseThresholds(raw)
  const names = (process.env.FREE_SHIPPING_OPTIONS ?? "Standard Shipping")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
  const dryRun = process.env.DRY_RUN === "1"

  const { data } = await query.graph({
    entity: "shipping_option",
    fields: [
      "id",
      "name",
      "price_type",
      "prices.id",
      "prices.currency_code",
      "prices.amount",
      "prices.price_rules.attribute",
      "prices.price_rules.operator",
      "prices.price_rules.value",
    ],
    filters: { name: names },
  })

  const options = data as unknown as QueriedOption[]
  const missing = names.filter((name) => !options.some((option) => option.name === name))

  if (missing.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Shipping option(s) not found: ${missing.join(", ")}`
    )
  }

  const updates: FulfillmentWorkflow.UpdateShippingOptionsWorkflowInput[] = []

  for (const option of options) {
    if (option.price_type !== "flat") {
      logger.warn(`Skipping "${option.name}": only flat-rate options are supported.`)
      continue
    }

    const existing: ExistingShippingPrice[] = (option.prices ?? [])
      .filter((price): price is NonNullable<QueriedPrice> => !!price)
      .map((price) => ({
        id: price.id,
        currency_code: price.currency_code,
        amount: Number(price.amount),
        rules: (price.price_rules ?? [])
          .filter((rule): rule is NonNullable<typeof rule> => !!rule)
          .map(
            (rule): PriceRuleInput => ({
              attribute: rule.attribute,
              operator: (rule.operator ?? undefined) as PriceRuleInput["operator"],
              value: rule.value,
            })
          ),
      }))
    const { prices, applied, skipped } = planShippingPrices(existing, thresholds)

    logger.info(
      `"${option.name}": ${
        applied.length
          ? `free from ${applied.map((c) => `${thresholds[c]} ${c.toUpperCase()}`).join(", ")}`
          : "no free tier"
      }${skipped.length ? ` (no price in ${skipped.join(", ").toUpperCase()}: skipped)` : ""}`
    )

    // The workflow replaces every price, so what is sent back is logged.
    logger.info(`  prices sent: ${JSON.stringify(prices)}`)
    // Medusa types a rule's value as a number, while stored rules (region ids)
    // are strings: the runtime accepts both, so only the type is bridged here.
    updates.push({
      id: option.id,
      price_type: "flat",
      prices: prices as FulfillmentWorkflow.UpdateShippingOptionPriceRecord[],
    })
  }

  if (dryRun) {
    logger.info("DRY_RUN=1: nothing was changed.")
    return
  }

  if (!updates.length) {
    logger.warn("Nothing to update.")
    return
  }

  await updateShippingOptionsWorkflow(container).run({ input: updates })
  logger.info("Free-shipping threshold updated.")
}
