import { HttpTypes } from "@medusajs/types"

/** The first checkout step still missing information for this cart. */
export const getCheckoutStep = (cart: HttpTypes.StoreCart) => {
  if (
    !cart?.shipping_address?.address_1 ||
    !cart.shipping_address.phone?.trim() ||
    !cart.email
  ) {
    return "address"
  }

  if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  }

  return "payment"
}
