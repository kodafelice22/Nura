import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCollectionByHandle } from "@lib/data/collections"
import { getHomeContent } from "@lib/data/home-content"
import { listRegions } from "@lib/data/regions"
import CollectionTemplate from "@modules/collections/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { parseProductFilters } from "@lib/util/product-filters"
import { getLocalizedAlternates } from "@lib/util/seo"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      page?: string
      sortBy?: SortOptions
      optionValueIds?: string | string[]
    }
  >
}

export const PRODUCT_LIMIT = 12
export const dynamic = "force-dynamic"

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const collection = await getCollectionByHandle(params.handle)

  if (!collection) {
    notFound()
  }

  const countries = await listRegions().then((regions) =>
    regions
      .flatMap((item) => item.countries?.map((country) => country.iso_2))
      .filter((code): code is string => Boolean(code))
  )
  const metadata = {
    title: collection.title,
    description: `Découvrez la collection ${collection.title} de la maison Nura.`,
    alternates: getLocalizedAlternates(
      countries,
      params.countryCode,
      `/collections/${params.handle}`
    ),
  } as Metadata

  return metadata
}

export default async function CollectionPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)
  const filters = parseProductFilters(searchParams)

  const collection = await getCollectionByHandle(params.handle).then(
    (collection) => collection
  )

  if (!collection) {
    notFound()
  }

  const { blocks } = await getHomeContent()

  return (
    <CollectionTemplate
      collection={collection}
      page={page}
      sortBy={sortBy}
      countryCode={params.countryCode}
      optionValueIds={optionValueIds}
      filters={filters}
      blurbTemplate={blocks.collections_page?.collection_blurb_template}
    />
  )
}
