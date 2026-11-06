import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { listProductReviews } from "@lib/data/reviews"
import StarRating from "@modules/products/components/star-rating"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
}

const ProductInfo = async ({ product }: ProductInfoProps) => {
  const metadata = (product.metadata || {}) as Record<string, string>
  const { average_rating, count } = await listProductReviews(product.id!)

  return (
    <div id="product-info">
      <div className="mx-auto flex flex-col gap-y-3 small:gap-y-4 lg:max-w-[500px]">
        <div className="flex items-center gap-x-3">
          {metadata.type_produit && (
            <span className="text-xs uppercase tracking-[0.15em] text-gold">
              {metadata.type_produit}
            </span>
          )}
          {metadata.badge && (
            <span className="text-[11px] uppercase tracking-wide bg-brown text-bg-alt px-2 py-1 rounded-sm">
              {metadata.badge}
            </span>
          )}
        </div>
        {product.collection && (
          <LocalizedClientLink
            href={`/collections/${product.collection.handle}`}
            className="text-medium text-ui-fg-muted hover:text-ui-fg-subtle"
          >
            {product.collection.title}
          </LocalizedClientLink>
        )}
        <Heading
          level="h1"
          className="text-3xl leading-tight small:text-4xl"
          data-testid="product-title"
        >
          {product.title}
        </Heading>

        {count > 0 && (
          <a
            href="#avis-produits"
            className="flex min-h-11 items-center gap-2 self-start text-sm text-ui-fg-subtle underline-offset-4 hover:underline"
          >
            <StarRating value={Math.round(average_rating)} size="small" />
            <span>
              {average_rating.toFixed(1)} / 5 · {count} avis
            </span>
          </a>
        )}

        <Text
          className="text-medium text-ui-fg-subtle whitespace-pre-line"
          data-testid="product-description"
        >
          {product.description}
        </Text>
      </div>
    </div>
  )
}

export default ProductInfo
