import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createRegionsWorkflow } from "@medusajs/medusa/core-flows"

const COUNTRY_CODE = "ci"
const CURRENCY_CODE = "xof"
const PAYMENT_PROVIDER_ID = "pp_jeko_jeko"

export default async function seedRegion({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: regions } = await query.graph({
    entity: "region",
    fields: [
      "id",
      "name",
      "currency_code",
      "countries.iso_2",
      "payment_providers.id",
    ],
  })

  const existing = regions.find((region) =>
    region.countries?.some((country) => country?.iso_2 === COUNTRY_CODE)
  )

  if (existing) {
    if (
      existing.currency_code !== CURRENCY_CODE ||
      !existing.payment_providers?.some(
        (provider) => provider?.id === PAYMENT_PROVIDER_ID
      )
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Region ${existing.id} already owns ${COUNTRY_CODE} but is not configured for ${CURRENCY_CODE}/${PAYMENT_PROVIDER_ID}.`
      )
    }

    logger.info(
      `Region "${existing.name}" already serves ${COUNTRY_CODE}; left as is.`
    )
    return
  }

  const { result } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Côte d'Ivoire",
          currency_code: CURRENCY_CODE,
          countries: [COUNTRY_CODE],
          automatic_taxes: false,
          is_tax_inclusive: true,
          payment_providers: [PAYMENT_PROVIDER_ID],
        },
      ],
    },
  })

  logger.info(`Created region "${result[0].name}" (${COUNTRY_CODE}/${CURRENCY_CODE}).`)
}