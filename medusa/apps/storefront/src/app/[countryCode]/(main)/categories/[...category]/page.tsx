import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCategoryByHandle } from "@lib/data/categories"
import { listRegions } from "@lib/data/regions"
import CategoryTemplate from "@modules/categories/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { parseProductFilters } from "@lib/util/product-filters"
import { getLocalizedAlternates } from "@lib/util/seo"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      sortBy?: SortOptions
      page?: string
      optionValueIds?: string | string[]
    }
  >
}

export const dynamic = "force-dynamic"

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  try {
    const productCategory = await getCategoryByHandle(params.category)

    const description =
      productCategory.description ??
      `Découvrez notre sélection ${productCategory.name} chez Nura.`

    const countries = await listRegions().then((regions) =>
      regions
        .flatMap((item) => item.countries?.map((country) => country.iso_2))
        .filter((code): code is string => Boolean(code))
    )

    return {
      title: productCategory.name,
      description,
      alternates: getLocalizedAlternates(
        countries,
        params.countryCode,
        `/categories/${params.category.join("/")}`
      ),
    }
  } catch {
    notFound()
  }
}

export default async function CategoryPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)
  const filters = parseProductFilters(searchParams)

  const productCategory = await getCategoryByHandle(params.category)

  if (!productCategory) {
    notFound()
  }

  return (
    <CategoryTemplate
      category={productCategory}
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
      optionValueIds={optionValueIds}
      filters={filters}
    />
  )
}
