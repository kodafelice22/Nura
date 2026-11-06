import {
  ExistingShippingPrice,
  parseThresholds,
  planShippingPrices,
} from "../free-shipping"

describe("parseThresholds", () => {
  it("parses one threshold per currency, case-insensitively", () => {
    expect(parseThresholds("EUR:60, xof:40000")).toEqual({
      eur: 60,
      xof: 40000,
    })
    expect(parseThresholds("eur:59.90")).toEqual({ eur: 59.9 })
  })

  it("returns nothing for an empty value", () => {
    expect(parseThresholds(undefined)).toEqual({})
    expect(parseThresholds("")).toEqual({})
    expect(parseThresholds(" , ")).toEqual({})
  })

  it.each([
    "eur",
    "eur:",
    "eur:abc",
    "eur:0",
    "eur:-5",
    "eur:60.123",
    "euro:60",
    "60:eur",
    "eur:60;xof:100",
  ])("rejects the ambiguous value %j", (value) => {
    expect(() => parseThresholds(value)).toThrow(/Invalid threshold/)
  })

  it("rejects a currency given twice", () => {
    expect(() => parseThresholds("eur:60,EUR:70")).toThrow(/Duplicate/)
  })
})

const region: ExistingShippingPrice = {
  id: "price_region",
  currency_code: "eur",
  amount: 10,
  rules: [{ attribute: "region_id", operator: "eq", value: "reg_1" }],
}
const eur: ExistingShippingPrice = { id: "price_eur", currency_code: "eur", amount: 10, rules: [] }
const usd: ExistingShippingPrice = { id: "price_usd", currency_code: "usd", amount: 10, rules: [] }
const free = (value: string): ExistingShippingPrice => ({
  id: "price_free",
  currency_code: "eur",
  amount: 0,
  rules: [{ attribute: "item_total", operator: "gte", value }],
})

describe("planShippingPrices", () => {
  it("keeps every existing price with its id and adds the free tier", () => {
    const { prices, applied, skipped } = planShippingPrices(
      [region, eur, usd],
      { eur: 60 }
    )

    expect(prices).toEqual([
      { id: "price_region", region_id: "reg_1", amount: 10 },
      { id: "price_eur", currency_code: "eur", amount: 10 },
      { id: "price_usd", currency_code: "usd", amount: 10 },
      {
        currency_code: "eur",
        amount: 0,
        rules: [{ attribute: "item_total", operator: "gte", value: 60 }],
      },
    ])
    expect(applied).toEqual(["eur"])
    expect(skipped).toEqual([])
  })

  it("never drops a price it was given (the workflow deletes omitted ones)", () => {
    const { prices } = planShippingPrices([region, eur, usd], { eur: 60 })
    const ids = prices.map((price) => ("id" in price ? price.id : undefined))

    expect(ids).toEqual(expect.arrayContaining(["price_region", "price_eur", "price_usd"]))
  })

  it("is idempotent: an existing free tier is replaced, not duplicated", () => {
    const { prices } = planShippingPrices([eur, free("60")], { eur: 75 })
    const zero = prices.filter((price) => price.amount === 0)

    expect(zero).toEqual([
      {
        currency_code: "eur",
        amount: 0,
        rules: [{ attribute: "item_total", operator: "gte", value: 75 }],
      },
    ])
  })

  it("skips currencies the option is not priced in instead of inventing a price", () => {
    const { prices, applied, skipped } = planShippingPrices([eur], {
      eur: 60,
      xof: 40000,
    })
    const currencies = prices.map((price) =>
      "currency_code" in price ? price.currency_code : undefined
    )

    expect(applied).toEqual(["eur"])
    expect(skipped).toEqual(["xof"])
    expect(currencies).not.toContain("xof")
  })

  it("leaves currencies without a threshold untouched", () => {
    const { prices } = planShippingPrices([eur, usd], { eur: 60 })

    expect(prices).toContainEqual({
      id: "price_usd",
      currency_code: "usd",
      amount: 10,
    })
  })

  it("removes the free tier when no threshold is requested", () => {
    const { prices } = planShippingPrices([eur, free("60")], {})

    expect(prices).toEqual([{ id: "price_eur", currency_code: "eur", amount: 10 }])
  })

  it("does not mistake a genuinely free option for a threshold tier", () => {
    const { prices } = planShippingPrices(
      [{ id: "price_zero", currency_code: "eur", amount: 0, rules: [] }],
      { eur: 60 }
    )

    expect(prices[0]).toEqual({
      id: "price_zero",
      currency_code: "eur",
      amount: 0,
    })
  })
})
