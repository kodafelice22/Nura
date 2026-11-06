import { beforeEach, describe, expect, it, vi } from "vitest"

const fetchProducts = vi.fn()

vi.mock("@lib/config", () => ({
  sdk: { client: { fetch: fetchProducts } },
}))
vi.mock("../cookies", () => ({
  getAuthHeaders: vi.fn().mockResolvedValue({}),
  getCacheOptions: vi.fn().mockResolvedValue({}),
}))
vi.mock("../regions", () => ({
  getRegion: vi.fn().mockResolvedValue({ id: "reg_ci" }),
  retrieveRegion: vi.fn(),
}))
vi.mock("@lib/util/product-filters", () => ({
  filterProducts: (products: unknown[]) => products,
}))
vi.mock("@lib/util/sort-products", () => ({
  sortProducts: (products: unknown[]) => products,
}))

const { listProductsWithSort } = await import("../products")

describe("listProductsWithSort", () => {
  beforeEach(() => {
    fetchProducts.mockReset()
  })

  it("loads every backend page before applying storefront pagination", async () => {
    const catalogue = Array.from({ length: 250 }, (_, index) => ({
      id: `prod_${index}`,
    }))

    fetchProducts.mockImplementation(
      async (_path: string, options: { query: { limit: number; offset: number } }) => {
        const { limit, offset } = options.query
        return {
          products: catalogue.slice(offset, offset + limit),
          count: catalogue.length,
        }
      }
    )

    const result = await listProductsWithSort({
      countryCode: "ci",
      page: 21,
      queryParams: { limit: 12 },
    })

    expect(fetchProducts).toHaveBeenCalledTimes(3)
    expect(
      fetchProducts.mock.calls.map(([, options]) => options.query.offset)
    ).toEqual([0, 100, 200])
    expect(result.response.count).toBe(250)
    expect(result.response.products.map((product) => product.id)).toEqual(
      Array.from({ length: 10 }, (_, index) => `prod_${240 + index}`)
    )
    expect(result.nextPage).toBeNull()
  })

  it("loads multiple four-request waves and returns a storefront next page", async () => {
    const catalogue = Array.from({ length: 550 }, (_, index) => ({
      id: `prod_${index}`,
    }))

    fetchProducts.mockImplementation(
      async (_path: string, options: { query: { limit: number; offset: number } }) => {
        const { limit, offset } = options.query
        return {
          products: catalogue.slice(offset, offset + limit),
          count: catalogue.length,
        }
      }
    )

    const result = await listProductsWithSort({
      countryCode: "ci",
      page: 1,
      queryParams: { limit: 12 },
    })

    expect(fetchProducts).toHaveBeenCalledTimes(6)
    expect(
      fetchProducts.mock.calls.map(([, options]) => options.query.offset)
    ).toEqual([0, 100, 200, 300, 400, 500])
    expect(result.response.products).toHaveLength(12)
    expect(result.nextPage).toBe(2)
  })
})