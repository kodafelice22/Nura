import { listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { ProductFilters } from "@lib/util/product-filters"
import { OptionValueIds } from "@lib/util/product-option-filters"
import ProductPreview from "@modules/products/components/product-preview"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const PRODUCT_LIMIT = 12

type PaginatedProductsParams = {
  limit: number
  collection_id?: string[]
  category_id?: string[]
  id?: string[]
  order?: string
}

export default async function PaginatedProducts({
  sortBy,
  page,
  collectionId,
  categoryId,
  productsIds,
  countryCode,
  optionValueIds,
  filters,
  emptyText,
}: {
  sortBy?: SortOptions
  page: number
  collectionId?: string
  categoryId?: string
  productsIds?: string[]
  countryCode: string
  optionValueIds?: OptionValueIds
  filters?: ProductFilters
  emptyText?: string
}) {
  const queryParams: PaginatedProductsParams = {
    limit: 12,
  }

  if (collectionId) {
    queryParams["collection_id"] = [collectionId]
  }

  if (categoryId) {
    queryParams["category_id"] = [categoryId]
  }

  if (productsIds) {
    queryParams["id"] = productsIds
  }

  if (sortBy === "created_at") {
    queryParams["order"] = "created_at"
  }

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const {
    response: { products, count },
  } = await listProductsWithSort({
    page,
    queryParams,
    sortBy,
    countryCode,
    optionValueIds,
    filters,
  })

  const totalPages = Math.ceil(count / PRODUCT_LIMIT)

  if (products.length === 0) {
    return (
      <div className="flex w-full flex-col items-center gap-5 py-12 text-center">
        <p className="txt-medium text-ui-fg-subtle">
          {emptyText || "Aucun produit ne correspond à ces critères."}
        </p>
        <LocalizedClientLink
          href="/store"
          className="inline-flex min-h-11 items-center border border-brown px-5 text-[11px] uppercase tracking-[0.15em] text-brown"
        >
          Voir tous les produits
        </LocalizedClientLink>
      </div>
    )
  }

  return (
    <>
      <p className="mb-6 text-xs uppercase tracking-[0.15em] text-ui-fg-muted" role="status">
        {count} produit{count > 1 ? "s" : ""}
      </p>
      <ul
        className="grid w-full grid-cols-2 gap-x-4 gap-y-10 small:grid-cols-3 small:gap-x-6 medium:grid-cols-4"
        data-testid="products-list"
      >
        {products.map((p) => {
          return (
            <li key={p.id}>
              <ProductPreview product={p} region={region} />
            </li>
          )
        })}
      </ul>
      {totalPages > 1 && (
        <Pagination
          data-testid="product-pagination"
          page={page}
          totalPages={totalPages}
        />
      )}
    </>
  )
}
