import { Suspense } from "react"

import { getHomeContent } from "@lib/data/home-content"
import { listProductOptions } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { ProductFilters } from "@lib/util/product-filters"
import { OptionValueIds } from "@lib/util/product-option-filters"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = async ({
  sortBy,
  page,
  countryCode,
  optionValueIds,
  filters,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  filters?: ProductFilters
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"
  const [options, { blocks }, region] = await Promise.all([
    listProductOptions(),
    getHomeContent(),
    getRegion(countryCode),
  ])
  const storePage = blocks.store_page

  return (
    <div className="content-container py-10 small:py-16" data-testid="category-container">
      <div className="mb-10 flex flex-col items-center gap-4 text-center small:mb-14">
        <span className="eyebrow">{storePage?.eyebrow || "La boutique"}</span>
        <h1
          className="font-serif text-4xl text-brown small:text-6xl"
          data-testid="store-page-title"
        >
          {storePage?.title || "Tous nos produits"}
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-ui-fg-subtle">
          {storePage?.text ||
            "Parfums, soins et coffrets : toute la maison Nura en un seul endroit."}
        </p>
      </div>

      <RefinementList
        sortBy={sort}
        options={options}
        currencyCode={region?.currency_code}
      />

      <Suspense fallback={<SkeletonProductGrid />}>
        <PaginatedProducts
          sortBy={sort}
          page={pageNumber}
          countryCode={countryCode}
          optionValueIds={optionValueIds}
          filters={filters}
          emptyText={storePage?.empty_state}
        />
      </Suspense>
    </div>
  )
}

export default StoreTemplate
