import { getSiteSettings } from "@lib/data/site-settings"
import { ProductExtrasBlock } from "@lib/data/home-content"

const ProductReassurance = async ({
  content,
}: {
  content?: ProductExtrasBlock
}) => {
  const siteSettings = await getSiteSettings()

  return (
    <ul className="flex flex-col gap-y-2 border-t border-nude pt-6 text-xs text-ui-fg-subtle">
      <li>
        {content?.reassurance_shipping ||
          "Expédition sous 24 à 48 h, puis livraison selon la destination"}
      </li>
      <li>
        {content?.reassurance_returns ||
          "Retour sous 14 jours pour tout produit non ouvert"}
      </li>
      <li className="flex flex-wrap gap-x-3">
        <span>{content?.reassurance_question || "Une question ?"}</span>
        {siteSettings.phones.map((contact) => (
          <a
            key={contact.tel}
            href={`tel:${contact.tel}`}
            className="inline-block py-1 text-gold hover:text-brown"
          >
            {contact.display}
          </a>
        ))}
      </li>
    </ul>
  )
}

export default ProductReassurance
