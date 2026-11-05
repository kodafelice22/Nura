import type { MetadataRoute } from "next"
import { listRegions } from "@lib/data/regions"
import { listProducts } from "@lib/data/products"
import { listCollections } from "@lib/data/collections"
import { listCategories } from "@lib/data/categories"
import { getBaseURL } from "@lib/util/env"
import { listPosts } from "@lib/data/journal"

const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "ci"

const STATIC_PATHS = [
  "",
  "/store",
  "/contact",
  "/a-propos",
  "/faq",
  "/livraison-retours",
  "/journal",
  "/mentions-legales",
  "/cgv",
  "/confidentialite",
  "/politique-cookies",
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseURL()

  const regions = await listRegions().catch(() => [])
  const countryCodes = (regions || [])
    .flatMap((region) => region.countries?.map((c) => c.iso_2))
    .filter((code): code is string => Boolean(code))

  if (countryCodes.length === 0) {
    return STATIC_PATHS.map((path) => ({
      url: `${baseUrl}/${DEFAULT_REGION}${path}`,
    }))
  }

  const entries: MetadataRoute.Sitemap = []

  const [collections, categories, journal] = await Promise.all([
    listCollections({ fields: "handle" }).then((r) => r.collections),
    listCategories({ fields: "handle" }),
    listPosts(100),
  ])

  for (const countryCode of countryCodes) {
    for (const path of STATIC_PATHS) {
      entries.push({ url: `${baseUrl}/${countryCode}${path}` })
    }

    for (const collection of collections || []) {
      entries.push({
        url: `${baseUrl}/${countryCode}/collections/${collection.handle}`,
      })
    }

    for (const category of categories || []) {
      entries.push({
        url: `${baseUrl}/${countryCode}/categories/${category.handle}`,
      })
    }

    for (const post of journal.posts) {
      entries.push({
        url: `${baseUrl}/${countryCode}/journal/${post.handle}`,
        lastModified: post.published_at
          ? new Date(post.published_at)
          : undefined,
      })
    }

    let page = 1
    let nextPage: number | null = page

    while (nextPage) {
      const result = await listProducts({
        pageParam: page,
        countryCode,
        queryParams: { limit: 100, fields: "handle,updated_at" },
      }).catch(() => null)

      if (!result) {
        break
      }

      for (const product of result.response.products) {
        entries.push({
          url: `${baseUrl}/${countryCode}/products/${product.handle}`,
          lastModified: product.updated_at
            ? new Date(product.updated_at)
            : undefined,
        })
      }

      nextPage = result.nextPage
      page = nextPage ?? page
    }
  }

  return entries
}
