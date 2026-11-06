"use server"

import { sdk } from "@lib/config"

export type Routine = {
  id: string
  handle: string
  title: string
  intro: string | null
  steps: {
    order: number
    instruction: string | null
    product: {
      id: string
      title: string
      handle: string
      thumbnail: string | null
    }
  }[]
}

// Invalidated by the backend when a routine is saved or deleted; the long
// window is the fallback if that call cannot get through.
const ROUTINES_CACHE = { tags: ["routines"], revalidate: 3600 }

/** Published routines that include this product (empty on any failure). */
export const listProductRoutines = async (productId: string) => {
  return sdk.client
    .fetch<{ routines: Routine[] }>(
      `/store/products/${encodeURIComponent(productId)}/routines`,
      { method: "GET", next: ROUTINES_CACHE, cache: "force-cache" }
    )
    .then(({ routines }) => routines)
    .catch(() => [] as Routine[])
}
