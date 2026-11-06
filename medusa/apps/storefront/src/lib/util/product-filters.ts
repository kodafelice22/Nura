export const PRICE_MIN_QUERY_KEY = "prixMin"
export const PRICE_MAX_QUERY_KEY = "prixMax"
export const IN_STOCK_QUERY_KEY = "enStock"

export type ProductFilters = {
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
}

type SearchParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>

// Prices come from the URL: keep them to a sane, finite range.
const MAX_PRICE = 10_000_000

const readParam = (searchParams: SearchParamsInput, key: string) => {
  if (typeof (searchParams as URLSearchParams).get === "function") {
    return (searchParams as URLSearchParams).get(key) ?? undefined
  }

  const value = (searchParams as Record<string, string | string[] | undefined>)[
    key
  ]

  return Array.isArray(value) ? value[0] : value
}

const parsePrice = (value: string | undefined) => {
  if (!value || !/^\d+([.,]\d{1,2})?$/.test(value.trim())) {
    return undefined
  }

  const amount = Number(value.trim().replace(",", "."))

  return Number.isFinite(amount) && amount <= MAX_PRICE ? amount : undefined
}

export const parseProductFilters = (
  searchParams: SearchParamsInput
): ProductFilters => {
  let minPrice = parsePrice(readParam(searchParams, PRICE_MIN_QUERY_KEY))
  let maxPrice = parsePrice(readParam(searchParams, PRICE_MAX_QUERY_KEY))

  // A reversed range is a typo, not a request for zero results.
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    ;[minPrice, maxPrice] = [maxPrice, minPrice]
  }

  const filters: ProductFilters = {}

  if (minPrice !== undefined) {
    filters.minPrice = minPrice
  }

  if (maxPrice !== undefined) {
    filters.maxPrice = maxPrice
  }

  if (readParam(searchParams, IN_STOCK_QUERY_KEY) === "1") {
    filters.inStock = true
  }

  return filters
}

export const countActiveProductFilters = (filters: ProductFilters) =>
  (filters.minPrice !== undefined ? 1 : 0) +
  (filters.maxPrice !== undefined ? 1 : 0) +
  (filters.inStock ? 1 : 0)

// Structural on purpose: accepts Medusa store products as well as plain fixtures.
type FilterableVariant = {
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
  inventory_quantity?: number | null
  calculated_price?: { calculated_amount?: number | null } | null
}

type FilterableProduct = { variants?: FilterableVariant[] | null }

export const isVariantInStock = (variant: FilterableVariant) =>
  !variant.manage_inventory ||
  !!variant.allow_backorder ||
  (variant.inventory_quantity ?? 0) > 0

export const isProductInStock = (product: FilterableProduct) =>
  (product.variants ?? []).some(isVariantInStock)

/** The "from" price shown on a product card: its cheapest priced variant. */
export const getProductMinPrice = (product: FilterableProduct) => {
  const prices = (product.variants ?? [])
    .map((variant) => variant.calculated_price?.calculated_amount)
    .filter((amount): amount is number => typeof amount === "number")

  return prices.length ? Math.min(...prices) : undefined
}

export const filterProducts = <T extends FilterableProduct>(
  products: T[],
  filters: ProductFilters
): T[] => {
  if (!countActiveProductFilters(filters)) {
    return products
  }

  return products.filter((product) => {
    if (filters.inStock && !isProductInStock(product)) {
      return false
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const price = getProductMinPrice(product)

      // A product without a price in this region cannot match a price range.
      if (price === undefined) {
        return false
      }

      if (filters.minPrice !== undefined && price < filters.minPrice) {
        return false
      }

      if (filters.maxPrice !== undefined && price > filters.maxPrice) {
        return false
      }
    }

    return true
  })
}
