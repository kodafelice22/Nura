import { FaqItem } from "@lib/data/home-content"

export type FaqGroup = { title: string | null; items: FaqItem[] }

/**
 * Groups FAQ items by their optional category, keeping the order in which
 * categories first appear. Items without a category stay together in a group
 * with no title, so a FAQ written before categories existed renders as before.
 * Categories are compared ignoring case and surrounding spaces, so "Livraison"
 * and " livraison " land in the same group.
 */
export const groupFaqItems = (items: FaqItem[]): FaqGroup[] => {
  const groups = new Map<string, FaqGroup>()

  for (const item of items) {
    const title = item.category?.trim() || null
    const key = title ? title.toLowerCase() : ""
    const group = groups.get(key)

    if (group) {
      group.items.push(item)
    } else {
      groups.set(key, { title, items: [item] })
    }
  }

  return [...groups.values()]
}
