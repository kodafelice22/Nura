import { getBaseURL } from "@lib/util/env"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export type Crumb = {
  label: string
  href?: string
}

const Breadcrumbs = ({
  crumbs,
  countryCode,
}: {
  crumbs: Crumb[]
  countryCode: string
}) => {
  const items = [{ label: "Accueil", href: "/" }, ...crumbs]

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href
        ? { item: `${getBaseURL()}/${countryCode}${item.href}` }
        : {}),
    })),
  }

  return (
    <nav aria-label="Fil d'Ariane" className="txt-small text-ui-fg-subtle">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ol className="flex flex-wrap items-center gap-x-1">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-x-1">
            {index > 0 && <span aria-hidden="true">/</span>}
            {item.href && index < items.length - 1 ? (
              <LocalizedClientLink
                href={item.href}
                className="inline-block py-1 hover:text-ink"
              >
                {item.label}
              </LocalizedClientLink>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
