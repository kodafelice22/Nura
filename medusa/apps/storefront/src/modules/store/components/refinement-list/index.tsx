"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo, useState } from "react"

import {
  IN_STOCK_QUERY_KEY,
  PRICE_MAX_QUERY_KEY,
  PRICE_MIN_QUERY_KEY,
  countActiveProductFilters,
  parseProductFilters,
} from "@lib/util/product-filters"
import {
  OPTION_VALUE_QUERY_KEY,
  parseOptionValueIds,
} from "@lib/util/product-option-filters"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import OptionsPicker from "./options-picker"
import PriceStockFilters from "./price-stock-filters"
import { SortOptions, sortOptions } from "./sort-products"

type RefinementListProps = {
  sortBy: SortOptions
  options?: HttpTypes.StoreProductOption[]
  search?: boolean
  hideOptionsPicker?: boolean
  currencyCode?: string
  count?: number
  "data-testid"?: string
}

const RefinementList = ({
  sortBy,
  options = [],
  hideOptionsPicker = false,
  currencyCode,
  count,
  "data-testid": dataTestId,
}: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const updateQueryParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      updater(params)

      params.delete("page")

      const queryString = params.toString()
      const currentQuery = searchParams.toString()
      const nextPath = queryString ? `${pathname}?${queryString}` : pathname
      const currentPath = currentQuery
        ? `${pathname}?${currentQuery}`
        : pathname

      if (nextPath !== currentPath) {
        router.push(nextPath)
      }
    },
    [pathname, router, searchParams]
  )

  const selectedOptionValueIds = useMemo(
    () => parseOptionValueIds(searchParams),
    [searchParams]
  )

  const productFilters = useMemo(
    () => parseProductFilters(searchParams),
    [searchParams]
  )
  const activeFilterCount =
    selectedOptionValueIds.length + countActiveProductFilters(productFilters)

  const applyPriceRange = ({ min, max }: { min: string; max: string }) =>
    updateQueryParams((params) => {
      params.delete(PRICE_MIN_QUERY_KEY)
      params.delete(PRICE_MAX_QUERY_KEY)

      if (min) {
        params.set(PRICE_MIN_QUERY_KEY, min)
      }

      if (max) {
        params.set(PRICE_MAX_QUERY_KEY, max)
      }
    })

  const toggleInStock = (inStock: boolean) =>
    updateQueryParams((params) => {
      if (inStock) {
        params.set(IN_STOCK_QUERY_KEY, "1")
      } else {
        params.delete(IN_STOCK_QUERY_KEY)
      }
    })

  const setOptionValueIds = (valueIds: string[]) =>
    updateQueryParams((params) => {
      params.delete(OPTION_VALUE_QUERY_KEY)
      valueIds.forEach((valueId) =>
        params.append(OPTION_VALUE_QUERY_KEY, valueId)
      )
    })

  const clearFilters = () =>
    updateQueryParams((params) => {
      params.delete(OPTION_VALUE_QUERY_KEY)
      params.delete(PRICE_MIN_QUERY_KEY)
      params.delete(PRICE_MAX_QUERY_KEY)
      params.delete(IN_STOCK_QUERY_KEY)
    })

  return (
    <div className="sticky top-16 z-30 -mx-5 mb-10 border-y border-nude bg-bg/95 px-5 backdrop-blur small:top-[72px] small:-mx-10 small:px-10">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 small:py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className="min-h-11 whitespace-nowrap px-1 text-[11px] uppercase tracking-[0.2em] text-brown hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {filtersOpen ? "Masquer les filtres" : "Filtrer"}
          </button>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-11 whitespace-nowrap px-1 text-[11px] uppercase tracking-[0.2em] text-gold hover:text-brown focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              Tout effacer ({activeFilterCount})
            </button>
          )}
          {typeof count === "number" && (
            <span className="hidden text-[11px] uppercase tracking-[0.2em] text-ui-fg-muted xsmall:inline">
              {count} produit{count > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div
          className="flex min-w-0 items-center gap-3 overflow-x-auto no-scrollbar"
          data-testid={dataTestId}
        >
          <span className="hidden text-[11px] uppercase tracking-[0.2em] text-ui-fg-muted xsmall:inline">
            Trier
          </span>
          {sortOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateQueryParams((p) => p.set("sortBy", option.value))}
              className={clx(
                "min-h-11 whitespace-nowrap px-1 text-[11px] uppercase tracking-[0.15em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                sortBy === option.value
                  ? "text-brown underline underline-offset-4 decoration-gold"
                  : "text-ui-fg-muted hover:text-brown"
              )}
              data-testid={`sort-${option.value}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filtersOpen && (
        <div className="flex flex-col gap-y-8 border-t border-nude py-6">
          {/* remounted when the URL changes so the inputs follow "Tout effacer" */}
          <PriceStockFilters
            key={`${productFilters.minPrice ?? ""}-${productFilters.maxPrice ?? ""}`}
            filters={productFilters}
            currencyCode={currencyCode}
            onApplyPrice={applyPriceRange}
            onToggleInStock={toggleInStock}
          />
          {!hideOptionsPicker && (
            <OptionsPicker
              options={options}
              selectedValueIds={selectedOptionValueIds}
              setOptionValueIds={setOptionValueIds}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default RefinementList
