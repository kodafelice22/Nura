import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { parseStockAlertInput } from "../../../lib/stock-alert"
import { subscribeStockAlertWorkflow } from "../../../workflows/subscribe-stock-alert"

// POST /store/stock-alerts  { email, variant_id }
// Registers a one-off "tell me when it is back in stock" request. Public, so
// it answers the same way whether or not the address already asked.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (process.env.STOCK_ALERTS_ENABLED !== "true") {
    return res.status(404).json({ message: "Fonctionnalité indisponible." })
  }

  const parsed = parseStockAlertInput(req.body)

  if (!parsed.ok) {
    return res.status(400).json({ message: parsed.message })
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const { result } = await subscribeStockAlertWorkflow(req.scope).run({
      input: parsed.value,
    })

    if (result.status === "unknown_variant") {
      return res.status(400).json({ message: "Produit invalide." })
    }

    if (result.status === "limit_reached") {
      return res.status(429).json({
        message: "Trop de demandes en cours pour cette adresse email.",
      })
    }

    // "available": the product can be bought now, nothing was stored.
    return res.status(200).json({ status: result.status })
  } catch (error) {
    logger.error(
      `[stock-alert] Failed to store request: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
    return res.status(500).json({ message: "Une erreur est survenue." })
  }
}
