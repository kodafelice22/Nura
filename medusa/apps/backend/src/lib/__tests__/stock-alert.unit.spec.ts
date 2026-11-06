import {
  buildStockAlertEmail,
  isVariantPurchasable,
  parseStockAlertInput,
} from "../stock-alert"

describe("parseStockAlertInput", () => {
  it("normalizes the email and accepts a Medusa variant id", () => {
    expect(
      parseStockAlertInput({
        email: "  Client@Example.COM ",
        variant_id: "variant_01ABCdef",
      })
    ).toEqual({
      ok: true,
      value: { email: "client@example.com", variantId: "variant_01ABCdef" },
    })
  })

  it.each([
    [{ variant_id: "variant_01A" }],
    [{ email: "", variant_id: "variant_01A" }],
    [{ email: "not-an-email", variant_id: "variant_01A" }],
    [{ email: "a@b", variant_id: "variant_01A" }],
    [{ email: "a b@c.fr", variant_id: "variant_01A" }],
    [{ email: `${"a".repeat(250)}@b.fr`, variant_id: "variant_01A" }],
    [{ email: 42, variant_id: "variant_01A" }],
    [null],
    [undefined],
    ["email=a@b.fr"],
  ])("rejects an invalid email: %j", (body) => {
    expect(parseStockAlertInput(body)).toEqual({
      ok: false,
      message: "Adresse email invalide.",
    })
  })

  it.each([
    "",
    "prod_01ABC",
    "variant_",
    "variant_01A B",
    "variant_01A'; drop table x;--",
    "variant_../../etc",
    `variant_${"a".repeat(65)}`,
  ])("rejects an invalid variant id %j", (variantId) => {
    expect(
      parseStockAlertInput({ email: "a@b.fr", variant_id: variantId })
    ).toEqual({ ok: false, message: "Produit invalide." })
  })

  it("rejects a non-string variant id", () => {
    expect(parseStockAlertInput({ email: "a@b.fr", variant_id: 12 })).toEqual({
      ok: false,
      message: "Produit invalide.",
    })
  })
})

const stocked = (stocked_quantity: number, reserved_quantity = 0) => ({
  stocked_quantity,
  reserved_quantity,
})
const item = (levels: ReturnType<typeof stocked>[], required_quantity = 1) => ({
  required_quantity,
  inventory: { location_levels: levels },
})

describe("isVariantPurchasable", () => {
  it("is true when inventory is not managed or backorders are allowed", () => {
    expect(isVariantPurchasable({ manage_inventory: false })).toBe(true)
    expect(
      isVariantPurchasable({
        manage_inventory: true,
        allow_backorder: true,
        inventory_items: [item([stocked(0)])],
      })
    ).toBe(true)
  })

  it("is true when unreserved stock covers the required quantity", () => {
    expect(
      isVariantPurchasable({
        manage_inventory: true,
        inventory_items: [item([stocked(5, 2)])],
      })
    ).toBe(true)
  })

  it("is false when everything in stock is reserved", () => {
    expect(
      isVariantPurchasable({
        manage_inventory: true,
        inventory_items: [item([stocked(3, 3)])],
      })
    ).toBe(false)
  })

  it("sums availability across locations", () => {
    expect(
      isVariantPurchasable({
        manage_inventory: true,
        inventory_items: [item([stocked(1), stocked(2, 1)])],
      })
    ).toBe(true)
  })

  it("requires every inventory item of a bundle to be available", () => {
    expect(
      isVariantPurchasable({
        manage_inventory: true,
        inventory_items: [item([stocked(4)]), item([stocked(0)])],
      })
    ).toBe(false)
    expect(
      isVariantPurchasable({
        manage_inventory: true,
        inventory_items: [item([stocked(4)], 2), item([stocked(1)], 2)],
      })
    ).toBe(false)
    expect(
      isVariantPurchasable({
        manage_inventory: true,
        inventory_items: [item([stocked(4)], 2), item([stocked(2)], 2)],
      })
    ).toBe(true)
  })

  it("is false for managed inventory with no inventory item or no level", () => {
    expect(isVariantPurchasable({ manage_inventory: true })).toBe(false)
    expect(
      isVariantPurchasable({ manage_inventory: true, inventory_items: [] })
    ).toBe(false)
    expect(
      isVariantPurchasable({
        manage_inventory: true,
        inventory_items: [item([])],
      })
    ).toBe(false)
  })
})

describe("buildStockAlertEmail", () => {
  const original = process.env.STOREFRONT_URL

  beforeEach(() => {
    process.env.STOREFRONT_URL = "https://shop.example.test/"
  })

  afterEach(() => {
    if (original === undefined) {
      delete process.env.STOREFRONT_URL
    } else {
      process.env.STOREFRONT_URL = original
    }
  })

  it("links to the product page and names the variant", () => {
    const email = buildStockAlertEmail({
      productTitle: "Eau de parfum — Aura Dorée",
      variantTitle: "50 ml",
      handle: "eau-de-parfum-aura-doree",
    })

    expect(email.subject).toBe(
      "Eau de parfum — Aura Dorée — 50 ml est de retour en stock"
    )
    expect(email.html).toContain(
      'href="https://shop.example.test/products/eau-de-parfum-aura-doree"'
    )
  })

  it("omits the placeholder title of single-variant products", () => {
    expect(
      buildStockAlertEmail({
        productTitle: "Baume",
        variantTitle: "Default variant",
        handle: "baume",
      }).subject
    ).toBe("Baume est de retour en stock")
  })

  it("escapes product names and encodes the handle", () => {
    const email = buildStockAlertEmail({
      productTitle: `<img src=x onerror=alert(1)> & "Co"`,
      handle: "a b/../c",
    })

    expect(email.html).not.toContain("<img")
    expect(email.html).toContain("&lt;img src=x onerror=alert(1)&gt; &amp; &quot;Co&quot;")
    expect(email.html).toContain("/products/a%20b%2F..%2Fc")
  })

  it("tells the customer the request is one-off and not retained", () => {
    const { html } = buildStockAlertEmail({ productTitle: "Baume", handle: "b" })

    expect(html).toContain("unique")
    expect(html).toContain("pas conservée")
  })
})
