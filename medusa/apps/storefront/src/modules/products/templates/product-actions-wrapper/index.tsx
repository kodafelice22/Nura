import { listProducts } from "@lib/data/products"
import { retrieveCustomer } from "@lib/data/customer"
import { listWishlist } from "@lib/data/wishlist"
import { ProductExtrasBlock } from "@lib/data/home-content"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Fetches real time pricing for a product and renders the product actions component.
 */
export default async function ProductActionsWrapper({
  id,
  region,
  stockAlertContent,
}: {
  id: string
  region: HttpTypes.StoreRegion
  stockAlertContent?: ProductExtrasBlock | null
}) {
  const product = await listProducts({
    queryParams: { id: [id] },
    regionId: region.id,
  }).then(({ response }) => response.products[0])

  if (!product) {
    return null
  }

  const customer = await retrieveCustomer()
  const wishlist = customer ? await listWishlist() : []
  const isInWishlist = wishlist.some((item) => item.product_id === id)

  return (
    <ProductActions
      product={product}
      region={region}
      isLoggedIn={!!customer}
      isInWishlist={isInWishlist}
      stockAlertContent={stockAlertContent}
    />
  )
}
