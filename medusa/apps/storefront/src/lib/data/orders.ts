"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import {
  getAuthHeaders,
  getCacheOptions,
  getOrderAccessToken,
  setOrderAccessToken,
} from "./cookies"
import { HttpTypes } from "@medusajs/types"
import { redirect } from "next/navigation"

export type OrderLookupState = {
  error: string | null
}

export async function lookupOrder(
  _currentState: OrderLookupState,
  formData: FormData
): Promise<OrderLookupState> {
  let orderId: string

  try {
    const result = await sdk.client.fetch<{ order_id: string }>(
      "/store/order-lookup",
      {
        method: "POST",
        body: {
          order_number: formData.get("order_number"),
          email: formData.get("email"),
        },
      }
    )
    orderId = result.order_id
  } catch (error) {
    // 4xx answers carry a message written for the customer; anything else
    // (network, 5xx) gets a generic one.
    const status = (error as { status?: number }).status
    return {
      error:
        status && status < 500 && error instanceof Error
          ? error.message
          : "La recherche n’a pas abouti. Réessayez dans quelques instants.",
    }
  }

  await setOrderAccessToken(orderId)

  // The country code comes from the form: only a market code may prefix the
  // path, so it can never turn into an off-site redirect.
  const countryCode = String(formData.get("country_code") ?? "").toLowerCase()
  redirect(
    /^[a-z]{2}$/.test(countryCode)
      ? `/${countryCode}/order/${orderId}/confirmed`
      : `/order/${orderId}/confirmed`
  )
}

export const retrieveOrder = async (id: string) => {
  const orderAccessToken = await getOrderAccessToken(id)
  const headers = {
    ...(await getAuthHeaders()),
    ...(orderAccessToken ? { "x-order-access-token": orderAccessToken } : {}),
  }

  return sdk.client
    .fetch<HttpTypes.StoreOrderResponse>(`/store/orders/${id}`, {
      method: "GET",
      query: {
        fields:
          "*payment_collections.payments,*items,*items.metadata,*items.variant,*items.product,*fulfillments,+fulfillments.labels.tracking_number,+fulfillments.labels.tracking_url",
      },
      headers,
      cache: "no-store",
    })
    .then(({ order }) => order)
    .catch((err) => medusaError(err))
}

export const listOrders = async (
  limit: number = 10,
  offset: number = 0,
  filters?: Record<string, unknown>
) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("orders")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreOrderListResponse>(`/store/orders`, {
      method: "GET",
      query: {
        limit,
        offset,
        order: "-created_at",
        fields: "*items,+items.metadata,*items.variant,*items.product",
        ...filters,
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ orders }) => orders)
    .catch((err) => medusaError(err))
}

export const createTransferRequest = async (
  state: {
    success: boolean
    error: string | null
    order: HttpTypes.StoreOrder | null
  },
  formData: FormData
): Promise<{
  success: boolean
  error: string | null
  order: HttpTypes.StoreOrder | null
}> => {
  const id = formData.get("order_id") as string

  if (!id) {
    return { success: false, error: "Order ID is required", order: null }
  }

  const headers = await getAuthHeaders()

  return await sdk.store.order
    .requestTransfer(
      id,
      {},
      {
        fields: "id, email",
      },
      headers
    )
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export const acceptTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .acceptTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export const declineTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .declineTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}
