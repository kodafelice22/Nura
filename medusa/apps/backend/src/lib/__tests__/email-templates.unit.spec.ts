import {
  getStorefrontUrl,
  getOrderAccessUrl,
  renderButton,
  renderEmailLayout,
} from "../email-templates"

describe("email-templates", () => {
  describe("renderEmailLayout", () => {
    it("wraps the body HTML in the branded Nura layout", () => {
      const html = renderEmailLayout("<p>Bonjour</p>")

      expect(html).toContain("Nura")
      expect(html).toContain("<p>Bonjour</p>")
      expect(html).toContain("Votre aura commence ici.")
    })
  })

  describe("renderButton", () => {
    it("renders a link with the given href and label", () => {
      const html = renderButton(
        "https://nura-paris.com/reset",
        "Réinitialiser"
      )

      expect(html).toContain('href="https://nura-paris.com/reset"')
      expect(html).toContain("Réinitialiser")
    })

    it("rejects unsafe URLs and escapes the label", () => {
      expect(() => renderButton("javascript:alert(1)", "Suivre")).toThrow(
        "absolute HTTP(S) URL"
      )

      expect(renderButton("https://nura-paris.com", "<Suivre>")).toContain(
        "&lt;Suivre&gt;"
      )
    })
  })

  describe("getStorefrontUrl", () => {
    it("falls back to localhost:8000 when STOREFRONT_URL is unset", () => {
      expect(getStorefrontUrl()).toBe("http://localhost:8000")
    })
  })

  describe("getOrderAccessUrl", () => {
    it("creates a signed cross-device order link", () => {
      process.env.ORDER_ACCESS_SECRET = "unit-test-secret"

      expect(getOrderAccessUrl("order_1")).toMatch(
        /^http:\/\/localhost:8000\/order\/order_1\/access\/\d+\.[a-f0-9]{64}$/
      )
    })
  })
})
