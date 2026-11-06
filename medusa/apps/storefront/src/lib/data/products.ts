"use server"

import { sdk } from "@lib/config"
import { ProductFilters, filterProducts } from "@lib/util/product-filters"
import { OptionValueIds } from "@lib/util/product-option-filters"
import { sortProducts } from "@lib/util/sort-products"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"

type ProductListQueryParams = (HttpTypes.FindParams &
  HttpTypes.StoreProductListParams) & {
  options?: string[]
  option_value_id?: string | string[]
}

export const listProductOptions = async () => {
  const headers = {
    ...(await getAuthHeaders()),
  }
  const next = {
    ...(await getCacheOptions("products")),
  }

  return sdk.client
    .fetch<{ product_options?: HttpTypes.StoreProductOption[] }>(
      "/store/product-options",
      {
        method: "GET",
        query: {
          is_exclusive: false,
          fields: "*values",
        },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_options }) => product_options || [])
    .catch(() => [])
}

export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
}: {
  pageParam?: number
  queryParams?: ProductListQueryParams
  countryCode?: string
  regionId?: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductListQueryParams
}> => {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

  let region: HttpTypes.StoreRegion | undefined | null

  if (countryCode) {
    region = await getRegion(countryCode)
  } else {
    region = await retrieveRegion(regionId!)
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
  }

  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region?.id,
          fields:
            "*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.options,+metadata,+tags,",
          ...queryParams,
        },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ products, count }) => {
      const nextPage = count > offset + limit ? pageParam + 1 : null

      return {
        response: {
          products,
          count,
        },
        nextPage: nextPage,
        queryParams,
      }
    })
}

/**
 * Fetches every cached backend page before applying calculated-field filters,
 * sorting and storefront pagination.
 */
export const listProductsWithSort = async ({
  page = 0,
  queryParams,
  sortBy = "created_at",
  countryCode,
  optionValueIds,
  filters = {},
}: {
  page?: number
  queryParams?: ProductListQueryParams
  sortBy?: SortOptions
  countryCode: string
  optionValueIds?: OptionValueIds
  filters?: ProductFilters
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductListQueryParams
}> => {
  const limit = queryParams?.limit || 12
  const currentPage = Math.max(page, 1)
  const optionFilters = Array.from(
    new Set((optionValueIds || []).filter(Boolean))
  )
  const batchSize = 100
  const batchQuery = {
    ...queryParams,
    ...(optionFilters.length ? { option_value_id: optionFilters } : {}),
    limit: batchSize,
  }

  const firstBatch = await listProducts({
    pageParam: 1,
    queryParams: batchQuery,
    countryCode,
  })
  const products = [...firstBatch.response.products]
  const pageCount = Math.ceil(firstBatch.response.count / batchSize)

  // These filters rely on calculated variant fields that the standard product
  // endpoint cannot filter. Load every page so count and pagination stay exact.
  for (let firstPage = 2; firstPage <= pageCount; firstPage += 4) {
    const pages = Array.from(
      { length: Math.min(4, pageCount - firstPage + 1) },
      (_, index) => firstPage + index
    )
    const batches = await Promise.all(
      pages.map((pageParam) =>
        listProducts({ pageParam, queryParams: batchQuery, countryCode })
      )
    )

    products.push(...batches.flatMap((batch) => batch.response.products))
  }

  const filteredProducts = filterProducts(products, filters)
  const sortedProducts = sortProducts(filteredProducts, sortBy)

  const pageOffset = (currentPage - 1) * limit

  const filteredCount = filteredProducts.length

  const nextPage =
    filteredCount > pageOffset + limit ? currentPage + 1 : null

  const paginatedProducts = sortedProducts.slice(pageOffset, pageOffset + limit)

  return {
    response: {
      products: paginatedProducts,
      count: filteredCount,
    },
    nextPage,
    queryParams,
  }
}
