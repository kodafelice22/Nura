import "server-only"
import { getHomeContent, LegalInformationBlock } from "./data/home-content"
import { getBaseURL } from "./util/env"

const FALLBACK = "À compléter dans l’Admin"

const legalValue = (
  block: LegalInformationBlock | undefined,
  field: keyof LegalInformationBlock,
  envKey: string
) => block?.[field]?.trim() || process.env[envKey]?.trim() || FALLBACK

export const resolveLegalInformation = (legal?: LegalInformationBlock) => ({
    siteHost: new URL(getBaseURL()).host,
    lastUpdated: legalValue(legal, "last_updated", "LEGAL_LAST_UPDATED"),
    businessName: legalValue(legal, "business_name", "LEGAL_BUSINESS_NAME"),
    legalForm: legalValue(legal, "legal_form", "LEGAL_FORM"),
    capital: legalValue(legal, "capital", "LEGAL_CAPITAL"),
    registryCity: legalValue(legal, "registry_city", "LEGAL_REGISTRY_CITY"),
    registrationNumber: legalValue(
      legal,
      "registration_number",
      "LEGAL_REGISTRATION_NUMBER"
    ),
    vatNumber: legalValue(legal, "vat_number", "LEGAL_VAT_NUMBER"),
    address: legalValue(legal, "address", "LEGAL_ADDRESS"),
    publicationDirector: legalValue(
      legal,
      "publication_director",
      "LEGAL_PUBLICATION_DIRECTOR"
    ),
    hostName: legalValue(legal, "host_name", "LEGAL_HOST_NAME"),
    hostAddress: legalValue(legal, "host_address", "LEGAL_HOST_ADDRESS"),
    hostPhone: legalValue(legal, "host_phone", "LEGAL_HOST_PHONE"),
    mediatorName: legalValue(legal, "mediator_name", "LEGAL_MEDIATOR_NAME"),
    mediatorUrl:
      legal?.mediator_url?.trim() || process.env.LEGAL_MEDIATOR_URL?.trim() || "",
})

export const getLegalInformation = async () => {
  const { blocks } = await getHomeContent()

  return resolveLegalInformation(blocks.legal_information)
}
