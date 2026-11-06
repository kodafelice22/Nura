import { MedusaError } from "@medusajs/framework/utils"

// Calling code per shipping country, and whether the national leading 0 is
// dropped when dialling from abroad (it is kept in Côte d'Ivoire and Italy).
const CALLING_CODES: Record<string, { code: string; dropLeadingZero: boolean }> = {
  ci: { code: "225", dropLeadingZero: false },
  sn: { code: "221", dropLeadingZero: false },
  it: { code: "39", dropLeadingZero: false },
  fr: { code: "33", dropLeadingZero: true },
  be: { code: "32", dropLeadingZero: true },
  ch: { code: "41", dropLeadingZero: true },
  de: { code: "49", dropLeadingZero: true },
  gb: { code: "44", dropLeadingZero: true },
  se: { code: "46", dropLeadingZero: true },
  dk: { code: "45", dropLeadingZero: true },
  es: { code: "34", dropLeadingZero: true },
}

const toE164Digits = (digits: string) =>
  digits.length >= 8 && digits.length <= 15 ? digits : null

// The number in the digits-only international form the WhatsApp API expects,
// or null when it cannot be derived safely (unknown country, local format).
export function toWhatsAppNumber(
  phone?: string | null,
  countryCode?: string | null
): string | null {
  const trimmed = phone?.trim()

  if (!trimmed) {
    return null
  }

  const digits = trimmed.replace(/\D/g, "")

  if (trimmed.startsWith("+")) {
    return toE164Digits(digits)
  }

  if (digits.startsWith("00")) {
    return toE164Digits(digits.slice(2))
  }

  const country = CALLING_CODES[countryCode?.toLowerCase() ?? ""]

  if (!country) {
    return null
  }

  const national = country.dropLeadingZero ? digits.replace(/^0/, "") : digits
  return toE164Digits(country.code + national)
}

export function isWhatsAppConfigured() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
  )
}

export function buildTemplateMessage(
  to: string,
  template: string,
  bodyParams: string[]
) {
  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: template,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr" },
      components: [
        {
          type: "body",
          parameters: bodyParams.map((text) => ({ type: "text", text })),
        },
      ],
    },
  }
}

export async function sendWhatsAppTemplate(
  to: string,
  template: string,
  bodyParams: string[]
) {
  const version = process.env.WHATSAPP_API_VERSION || "v23.0"
  const response = await fetch(
    `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildTemplateMessage(to, template, bodyParams)),
      signal: AbortSignal.timeout(10_000),
    }
  )

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300)
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `WhatsApp API answered ${response.status}: ${detail}`
    )
  }
}
