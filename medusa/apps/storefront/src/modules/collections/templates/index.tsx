import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import Breadcrumbs from "@modules/common/components/breadcrumbs"
import { HttpTypes } from "@medusajs/types"
import { getRegion } from "@lib/data/regions"
import { ProductFilters } from "@lib/util/product-filters"
import { OptionValueIds } from "@lib/util/product-option-filters"

const DEFAULT_BLURB_TEMPLATE =
  "Découvrez les créations réunies dans la collection {title}."

export default async function CollectionTemplate({
  sortBy,
  collection,
  page,
  countryCode,
  optionValueIds,
  filters,
  blurbTemplate,
}: {
  sortBy?: SortOptions
  collection: HttpTypes.StoreCollection
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  filters?: ProductFilters
  blurbTemplate?: string
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"
  const region = await getRegion(countryCode)
  const blurb = (blurbTemplate || DEFAULT_BLURB_TEMPLATE).replaceAll(
    "{title}",
    collection.title
  )

  return (
    <div className="content-container py-10 small:py-16">
      <div className="mb-6">
        <Breadcrumbs
          countryCode={countryCode}
          crumbs={[
            { label: "Boutique", href: "/store" },
            { label: collection.title },
          ]}
        />
      </div>

      <div className="mb-10 flex flex-col items-center gap-3 text-center small:mb-14">
        <span className="eyebrow">Collection</span>
        <h1 className="font-serif text-4xl text-brown small:text-5xl">
          {collection.title}
        </h1>
        <p className="max-w-lg text-sm leading-relaxed text-ui-fg-subtle">
          {blurb}
        </p>
      </div>

      <RefinementList
        sortBy={sort}
        hideOptionsPicker
        currencyCode={region?.currency_code}
      />

      <Suspense
        fallback={
          <SkeletonProductGrid numberOfProducts={collection.products?.length} />
        }
      >
        <PaginatedProducts
          sortBy={sort}
          page={pageNumber}
          collectionId={collection.id}
          countryCode={countryCode}
          optionValueIds={optionValueIds}
          filters={filters}
        />
      </Suspense>
    </div>
  )
}
