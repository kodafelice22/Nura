import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import QuickAdd, { QuickAddVariant } from "../quick-add"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

export default async function ProductPreview({
  product,
  isFeatured,
  region: _region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  const { cheapestPrice } = getProductPrice({
    product,
  })

  const badge =
    typeof product.metadata?.badge === "string"
      ? product.metadata.badge
      : undefined

  const productType =
    typeof product.metadata?.type_produit === "string"
      ? product.metadata.type_produit
      : undefined

  const hoverImage = product.images?.find(
    (image) => image.url && image.url !== product.thumbnail
  )?.url

  const quickAddVariants: QuickAddVariant[] = (product.variants || []).map(
    (variant) => ({
      id: variant.id!,
      title: variant.title || "Ajouter",
      available:
        !variant.manage_inventory ||
        variant.allow_backorder ||
        (variant.inventory_quantity ?? 0) > 0,
    })
  )

  return (
    <div className="group flex flex-col" data-testid="product-wrapper">
      <div className="relative">
        <LocalizedClientLink
          href={`/products/${product.handle}`}
          className="block"
          tabIndex={-1}
          aria-hidden="true"
        >
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            hoverImage={hoverImage}
            title={product.title}
            size="full"
            isFeatured={isFeatured}
          />
        </LocalizedClientLink>

        {badge && (
          <span className="pointer-events-none absolute left-3 top-3 bg-bg-alt/90 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-brown">
            {badge}
          </span>
        )}

        {/* Always reachable on touch screens, revealed on hover from 900px up. */}
        {quickAddVariants.length > 0 && (
          <div className="absolute inset-x-0 bottom-0 transition-opacity duration-300 small:opacity-0 small:focus-within:opacity-100 small:group-hover:opacity-100">
            <QuickAdd variants={quickAddVariants} />
          </div>
        )}
      </div>

      <LocalizedClientLink
        href={`/products/${product.handle}`}
        className="mt-4 flex flex-col items-center gap-y-1 text-center"
      >
        {productType && (
          <span className="text-[11px] uppercase tracking-[0.2em] text-ui-fg-muted">
            {productType}
          </span>
        )}
        <span
          className="text-xs uppercase tracking-[0.12em] text-brown"
          data-testid="product-title"
        >
          {product.title}
        </span>
        <div className="flex items-center gap-x-2 text-sm text-ui-fg-subtle">
          {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
        </div>
      </LocalizedClientLink>
    </div>
  )
}
