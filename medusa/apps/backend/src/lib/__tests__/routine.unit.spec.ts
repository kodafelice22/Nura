import {
  normalizeRoutineInput,
  RoutineProduct,
  StoredRoutine,
  toStoreRoutine,
} from "../routine"

const step = (product_id: string, instruction?: string) => ({
  product_id,
  ...(instruction !== undefined ? { instruction } : {}),
})
const valid = {
  title: "  Le rituel du soir  ",
  steps: [step("prod_A", "Appliquez sur peau sèche."), step("prod_B")],
}

describe("normalizeRoutineInput", () => {
  it("trims, slugifies the title, numbers the steps by position", () => {
    expect(normalizeRoutineInput(valid)).toEqual({
      title: "Le rituel du soir",
      handle: "le-rituel-du-soir",
      intro: null,
      is_active: false,
      steps: [
        { product_id: "prod_A", step_order: 1, instruction: "Appliquez sur peau sèche." },
        { product_id: "prod_B", step_order: 2, instruction: null },
      ],
    })
  })

  it("only activates on an explicit true", () => {
    expect(normalizeRoutineInput({ ...valid, is_active: true }).is_active).toBe(true)
    expect(normalizeRoutineInput({ ...valid, is_active: "true" }).is_active).toBe(false)
    expect(normalizeRoutineInput({ ...valid, is_active: 1 }).is_active).toBe(false)
  })

  it("uses a custom handle, normalized", () => {
    expect(
      normalizeRoutineInput({ ...valid, handle: " Mon Rituel / Été " }).handle
    ).toBe("mon-rituel-ete")
  })

  it.each([
    [{ ...valid, title: "" }, /titre est requis/],
    [{ ...valid, title: "   " }, /titre est requis/],
    [{ ...valid, title: 42 }, /titre est requis/],
    [{ ...valid, title: "a".repeat(121) }, /120 caractères/],
    [{ ...valid, title: "!!!", handle: "" }, /générer une URL/],
    [{ ...valid, intro: "a".repeat(501) }, /500 caractères/],
    [{ ...valid, steps: undefined }, /étapes sont requises/],
    [{ ...valid, steps: "prod_A" }, /étapes sont requises/],
    [{ ...valid, steps: [step("prod_A")] }, /entre 2 et 8/],
    [{ ...valid, steps: Array.from({ length: 9 }, (_, i) => step(`prod_${i}`)) }, /entre 2 et 8/],
    [{ ...valid, steps: [step("prod_A"), step("")] }, /Étape 2 : choisissez un produit/],
    [{ ...valid, steps: [step("prod_A"), step("variant_X")] }, /Étape 2 : choisissez/],
    [{ ...valid, steps: [step("prod_A"), step("prod_B'; --")] }, /Étape 2 : choisissez/],
    [{ ...valid, steps: [step("prod_A"), null] }, /Étape 2 : choisissez/],
    [{ ...valid, steps: [step("prod_A"), step("prod_A")] }, /Étape 2 : ce produit est déjà/],
    [{ ...valid, steps: [step("prod_A"), step("prod_B", "x".repeat(501))] }, /Étape 2 : les conseils/],
  ])("rejects invalid input %#", (input, message) => {
    expect(() => normalizeRoutineInput(input as never)).toThrow(message)
  })

  it("accepts the maximum number of steps", () => {
    const steps = Array.from({ length: 8 }, (_, i) => step(`prod_${i}`))

    expect(normalizeRoutineInput({ ...valid, steps }).steps).toHaveLength(8)
  })
})

const stored: StoredRoutine = {
  id: "routine_1",
  handle: "rituel",
  title: "Rituel",
  intro: "Intro",
  steps: [
    { product_id: "prod_C", step_order: 3, instruction: "trois" },
    { product_id: "prod_A", step_order: 1, instruction: "un" },
    { product_id: "prod_B", step_order: 2, instruction: null },
  ],
}
const product = (id: string, extra: Partial<RoutineProduct> = {}): RoutineProduct => ({
  id,
  title: `Produit ${id}`,
  handle: `produit-${id}`,
  thumbnail: null,
  status: "published",
  ...extra,
})
const catalog = (...items: RoutineProduct[]) =>
  new Map(items.map((item) => [item.id, item]))

describe("toStoreRoutine", () => {
  it("orders steps by position and exposes only public product fields", () => {
    const result = toStoreRoutine(
      stored,
      catalog(product("prod_A", { thumbnail: "a.png" }), product("prod_B"), product("prod_C"))
    )

    expect(result?.steps.map((entry) => [entry.order, entry.product.id])).toEqual([
      [1, "prod_A"],
      [2, "prod_B"],
      [3, "prod_C"],
    ])
    expect(result?.steps[0].product).toEqual({
      id: "prod_A",
      title: "Produit prod_A",
      handle: "produit-prod_A",
      thumbnail: "a.png",
    })
  })

  it("drops missing and unpublished products and renumbers", () => {
    const result = toStoreRoutine(
      stored,
      catalog(product("prod_A"), product("prod_B", { status: "draft" }), product("prod_C"))
    )

    expect(result?.steps.map((entry) => [entry.order, entry.product.id])).toEqual([
      [1, "prod_A"],
      [2, "prod_C"],
    ])
  })

  it("hides a routine left with fewer than two products", () => {
    expect(toStoreRoutine(stored, catalog(product("prod_A")))).toBeNull()
    expect(toStoreRoutine(stored, catalog())).toBeNull()
    expect(
      toStoreRoutine(stored, catalog(product("prod_A"), product("prod_B", { status: "draft" })))
    ).toBeNull()
  })

  it("does not mutate the stored routine", () => {
    const copy = JSON.parse(JSON.stringify(stored))

    toStoreRoutine(stored, catalog(product("prod_A"), product("prod_B"), product("prod_C")))

    expect(stored).toEqual(copy)
  })
})
