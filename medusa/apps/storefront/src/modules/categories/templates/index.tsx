import { notFound } from "next/navigation"
import Image from "next/image"
import { Suspense } from "react"

import { getCategoryBanner } from "@lib/constants"
import Breadcrumbs from "@modules/common/components/breadcrumbs"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { getRegion } from "@lib/data/regions"
import { ProductFilters } from "@lib/util/product-filters"
import { OptionValueIds } from "@lib/util/product-option-filters"

export default async function CategoryTemplate({
  category,
  sortBy,
  page,
  countryCode,
  optionValueIds,
  filters,
}: {
  category: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  filters?: ProductFilters
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"
  const region = await getRegion(countryCode)

  if (!category || !countryCode) notFound()

  const parents = [] as HttpTypes.StoreProductCategory[]

  const getParents = (category: HttpTypes.StoreProductCategory) => {
    if (category.parent_category) {
      parents.push(category.parent_category)
      getParents(category.parent_category)
    }
  }

  getParents(category)

  return (
    <div data-testid="category-container">
      <div className="relative h-[280px] w-full overflow-hidden small:h-[360px]">
        <Image
          src={getCategoryBanner(category.handle)}
          alt={category.name}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-ink/40" />
        <div className="content-container relative z-10 flex h-full flex-col items-center justify-center gap-3 text-center">
          <span className="text-[11px] uppercase tracking-[0.35em] text-bg-alt/80">
            {parents.length ? parents[0].name : "Nos univers"}
          </span>
          <h1
            className="font-serif text-4xl text-bg-alt small:text-6xl"
            data-testid="category-page-title"
          >
            {category.name}
          </h1>
          {category.description && (
            <p className="max-w-lg text-sm leading-relaxed text-bg-alt/85">
              {category.description}
            </p>
          )}
        </div>
      </div>

      <div className="content-container py-8 small:py-12">
        <div className="mb-6">
          <Breadcrumbs
            countryCode={countryCode}
            crumbs={[
              { label: "Boutique", href: "/store" },
              ...[...parents].reverse().map((parent) => ({
                label: parent.name,
                href: `/categories/${parent.handle}`,
              })),
              { label: category.name },
            ]}
          />
        </div>

        {!!category.category_children?.length && (
          <ul className="mb-8 flex flex-wrap gap-2">
            {category.category_children.map((child) => (
              <li key={child.id}>
                <LocalizedClientLink
                  href={`/categories/${category.handle}/${child.handle}`}
                  className="inline-flex h-9 items-center border border-nude px-4 text-[11px] uppercase tracking-[0.15em] text-brown transition-colors hover:border-gold hover:text-gold"
                >
                  {child.name}
                </LocalizedClientLink>
              </li>
            ))}
          </ul>
        )}

        <RefinementList
          sortBy={sort}
          data-testid="sort-by-container"
          hideOptionsPicker
          currencyCode={region?.currency_code}
        />

        <Suspense
          fallback={
            <SkeletonProductGrid
              numberOfProducts={category.products?.length ?? 8}
            />
          }
        >
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            categoryId={category.id}
            countryCode={countryCode}
            optionValueIds={optionValueIds}
            filters={filters}
          />
        </Suspense>
      </div>
    </div>
  )
}
