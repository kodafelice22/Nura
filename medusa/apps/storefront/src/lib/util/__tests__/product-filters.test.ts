import { describe, expect, it } from "vitest"
import {
  countActiveProductFilters,
  filterProducts,
  getProductMinPrice,
  isProductInStock,
  parseProductFilters,
} from "../product-filters"

type Variant = {
  manage_inventory?: boolean
  allow_backorder?: boolean
  inventory_quantity?: number
  calculated_price?: { calculated_amount?: number | null } | null
}

const product = (id: string, variants: Variant[]) => ({ id, variants })

const inStock = (amount: number): Variant => ({
  manage_inventory: true,
  inventory_quantity: 5,
  calculated_price: { calculated_amount: amount },
})
const soldOut = (amount: number): Variant => ({
  manage_inventory: true,
  inventory_quantity: 0,
  allow_backorder: false,
  calculated_price: { calculated_amount: amount },
})

describe("parseProductFilters", () => {
  it("reads price bounds and the stock flag from URLSearchParams", () => {
    expect(
      parseProductFilters(
        new URLSearchParams("prixMin=20&prixMax=80.50&enStock=1")
      )
    ).toEqual({ minPrice: 20, maxPrice: 80.5, inStock: true })
  })

  it("reads the same keys from a Next.js searchParams object", () => {
    expect(
      parseProductFilters({ prixMin: "10", enStock: "1", sortBy: "price_asc" })
    ).toEqual({ minPrice: 10, inStock: true })
    expect(parseProductFilters({ prixMax: ["30", "40"] })).toEqual({
      maxPrice: 30,
    })
  })

  it("accepts a decimal comma", () => {
    expect(parseProductFilters({ prixMin: "12,5" })).toEqual({ minPrice: 12.5 })
  })

  it("returns no filters when nothing is set", () => {
    expect(parseProductFilters(new URLSearchParams(""))).toEqual({})
    expect(parseProductFilters({})).toEqual({})
  })

  it.each([
    "-5",
    "abc",
    "1e3",
    "Infinity",
    "NaN",
    "1.234",
    "99999999999",
    "1 000",
    "",
    "0x10",
  ])("ignores the invalid price %j", (value) => {
    expect(parseProductFilters({ prixMin: value, prixMax: value })).toEqual({})
  })

  it("only treats enStock=1 as enabled", () => {
    expect(parseProductFilters({ enStock: "true" })).toEqual({})
    expect(parseProductFilters({ enStock: "0" })).toEqual({})
    expect(parseProductFilters({ enStock: "1" })).toEqual({ inStock: true })
  })

  it("swaps a reversed price range instead of returning nothing", () => {
    expect(parseProductFilters({ prixMin: "90", prixMax: "30" })).toEqual({
      minPrice: 30,
      maxPrice: 90,
    })
  })

  it("keeps a zero lower bound", () => {
    expect(parseProductFilters({ prixMin: "0" })).toEqual({ minPrice: 0 })
  })
})

describe("countActiveProductFilters", () => {
  it("counts each active criterion", () => {
    expect(countActiveProductFilters({})).toBe(0)
    expect(countActiveProductFilters({ minPrice: 0 })).toBe(1)
    expect(
      countActiveProductFilters({ minPrice: 1, maxPrice: 2, inStock: true })
    ).toBe(3)
    expect(countActiveProductFilters({ inStock: false })).toBe(0)
  })
})

describe("isProductInStock", () => {
  it("is true when any variant can be bought", () => {
    expect(isProductInStock(product("a", [soldOut(10), inStock(12)]))).toBe(
      true
    )
  })

  it("is false when every managed variant is empty without backorder", () => {
    expect(isProductInStock(product("a", [soldOut(10)]))).toBe(false)
  })

  it("treats unmanaged inventory and backorders as available", () => {
    expect(isProductInStock(product("a", [{ manage_inventory: false }]))).toBe(
      true
    )
    expect(
      isProductInStock(
        product("a", [
          {
            manage_inventory: true,
            inventory_quantity: 0,
            allow_backorder: true,
          },
        ])
      )
    ).toBe(true)
  })

  it("is false for a product without variants", () => {
    expect(isProductInStock(product("a", []))).toBe(false)
    expect(isProductInStock({})).toBe(false)
  })
})

describe("getProductMinPrice", () => {
  it("returns the cheapest priced variant", () => {
    expect(getProductMinPrice(product("a", [inStock(40), inStock(25)]))).toBe(
      25
    )
  })

  it("ignores variants without a price and returns undefined when none has one", () => {
    expect(
      getProductMinPrice(
        product("a", [{ calculated_price: null }, inStock(30)])
      )
    ).toBe(30)
    expect(getProductMinPrice(product("a", [{ calculated_price: null }]))).toBe(
      undefined
    )
  })
})

describe("filterProducts", () => {
  const catalog = [
    product("cheap", [inStock(15)]),
    product("mid", [inStock(45)]),
    product("premium", [inStock(120)]),
    product("mid-sold-out", [soldOut(50)]),
    product("unpriced", [{ manage_inventory: false }]),
  ]
  const ids = (list: { id: string }[]) => list.map((item) => item.id)

  it("returns the same list when no filter is active", () => {
    expect(filterProducts(catalog, {})).toBe(catalog)
  })

  it("filters by an inclusive price range", () => {
    expect(
      ids(filterProducts(catalog, { minPrice: 45, maxPrice: 50 }))
    ).toEqual(["mid", "mid-sold-out"])
    expect(ids(filterProducts(catalog, { maxPrice: 15 }))).toEqual(["cheap"])
    expect(ids(filterProducts(catalog, { minPrice: 100 }))).toEqual(["premium"])
  })

  it("excludes products with no price as soon as a price bound is set", () => {
    expect(ids(filterProducts(catalog, { minPrice: 0 }))).not.toContain(
      "unpriced"
    )
  })

  it("filters by availability", () => {
    expect(ids(filterProducts(catalog, { inStock: true }))).toEqual([
      "cheap",
      "mid",
      "premium",
      "unpriced",
    ])
  })

  it("combines price and availability", () => {
    expect(
      ids(
        filterProducts(catalog, { minPrice: 40, maxPrice: 60, inStock: true })
      )
    ).toEqual(["mid"])
  })

  it("does not mutate its input", () => {
    const copy = [...catalog]
    filterProducts(catalog, { inStock: true })

    expect(catalog).toEqual(copy)
  })
})
