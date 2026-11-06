import { describe, expect, it } from "vitest"
import { groupFaqItems } from "../faq-groups"

const item = (question: string, category?: string) => ({
  question,
  answer: `réponse ${question}`,
  ...(category !== undefined ? { category } : {}),
})

describe("groupFaqItems", () => {
  it("returns no group for an empty FAQ", () => {
    expect(groupFaqItems([])).toEqual([])
  })

  it("keeps a FAQ without categories as one untitled group, in order", () => {
    const items = [item("a"), item("b"), item("c")]

    expect(groupFaqItems(items)).toEqual([{ title: null, items }])
  })

  it("groups by category in order of first appearance", () => {
    const groups = groupFaqItems([
      item("q1", "Livraison"),
      item("q2", "Retours"),
      item("q3", "Livraison"),
      item("q4", "Paiement"),
    ])

    expect(groups.map((group) => group.title)).toEqual([
      "Livraison",
      "Retours",
      "Paiement",
    ])
    expect(groups[0].items.map((entry) => entry.question)).toEqual(["q1", "q3"])
  })

  it("matches categories ignoring case and surrounding spaces", () => {
    const groups = groupFaqItems([
      item("q1", "Livraison"),
      item("q2", "  livraison "),
      item("q3", "LIVRAISON"),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].title).toBe("Livraison")
    expect(groups[0].items).toHaveLength(3)
  })

  it("treats blank categories as no category", () => {
    const groups = groupFaqItems([item("q1", ""), item("q2", "   "), item("q3")])

    expect(groups).toEqual([
      { title: null, items: [item("q1", ""), item("q2", "   "), item("q3")] },
    ])
  })

  it("puts uncategorized items in their own group where they first appear", () => {
    const groups = groupFaqItems([
      item("q1"),
      item("q2", "Retours"),
      item("q3"),
    ])

    expect(groups.map((group) => group.title)).toEqual([null, "Retours"])
    expect(groups[0].items.map((entry) => entry.question)).toEqual(["q1", "q3"])
  })

  it("does not mutate its input", () => {
    const items = [item("q1", "A"), item("q2", "A")]
    const copy = JSON.parse(JSON.stringify(items))

    groupFaqItems(items)

    expect(items).toEqual(copy)
  })
})
