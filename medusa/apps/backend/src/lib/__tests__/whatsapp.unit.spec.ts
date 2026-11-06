import {
  buildTemplateMessage,
  isWhatsAppConfigured,
  toWhatsAppNumber,
} from "../whatsapp"

describe("toWhatsAppNumber", () => {
  it.each([
    ["07 07 07 07 07", "ci", "2250707070707"],
    ["06 12 34 56 78", "fr", "33612345678"],
    ["06 12 34 56 78", "FR", "33612345678"],
    ["+33 6 12 34 56 78", "ci", "33612345678"],
    ["0033 6 12 34 56 78", undefined, "33612345678"],
    ["+225 07 07 07 07 07", "fr", "2250707070707"],
    ["347 123 4567", "it", "393471234567"],
  ])("converts %p (%p) to %p", (phone, country, expected) => {
    expect(toWhatsAppNumber(phone, country)).toBe(expected)
  })

  it.each([
    ["", "ci"],
    [null, "ci"],
    ["06 12 34 56 78", "us"],
    ["06 12 34 56 78", null],
    ["+33 12", "fr"],
  ])("cannot use %p (%p)", (phone, country) => {
    expect(toWhatsAppNumber(phone, country)).toBeNull()
  })
})

describe("isWhatsAppConfigured", () => {
  const original = { ...process.env }

  afterEach(() => {
    process.env = { ...original }
  })

  it("needs both the access token and the phone number id", () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123"
    expect(isWhatsAppConfigured()).toBe(false)

    process.env.WHATSAPP_ACCESS_TOKEN = "token"
    expect(isWhatsAppConfigured()).toBe(true)
  })
})

describe("buildTemplateMessage", () => {
  it("sends the body parameters in order, in French by default", () => {
    delete process.env.WHATSAPP_TEMPLATE_LANGUAGE

    expect(
      buildTemplateMessage("2250707070707", "nura_commande_expediee", [
        "1042",
        "https://nura.example/order/order_1/access/t",
      ])
    ).toEqual({
      messaging_product: "whatsapp",
      to: "2250707070707",
      type: "template",
      template: {
        name: "nura_commande_expediee",
        language: { code: "fr" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: "1042" },
              {
                type: "text",
                text: "https://nura.example/order/order_1/access/t",
              },
            ],
          },
        ],
      },
    })
  })
})
