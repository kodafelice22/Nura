"use server"

import { sdk } from "@lib/config"

export type StockAlertFormState = {
  success: boolean
  error: string | null
  /** "available": the product came back in stock before the request was sent. */
  status?: "subscribed" | "available"
}

export async function subscribeToStockAlert(
  _currentState: StockAlertFormState,
  formData: FormData
): Promise<StockAlertFormState> {
  const email = formData.get("email")
  const variantId = formData.get("variant_id")

  if (typeof email !== "string" || typeof variantId !== "string") {
    return { success: false, error: "Adresse email invalide." }
  }

  try {
    const { status } = await sdk.client.fetch<{
      status: "subscribed" | "available"
    }>("/store/stock-alerts", {
      method: "POST",
      body: { email, variant_id: variantId },
    })

    return { success: true, error: null, status }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Une erreur est survenue, veuillez réessayer.",
    }
  }
}
