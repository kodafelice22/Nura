import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getHomeContent = vi.fn()

vi.mock("server-only", () => ({}))
vi.mock("../data/home-content", () => ({ getHomeContent }))

const { getLegalInformation, resolveLegalInformation } = await import("../legal")

describe("legal information", () => {
  beforeEach(() => {
    getHomeContent.mockReset()
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://nurabeautyco.com")
    vi.stubEnv("LEGAL_BUSINESS_NAME", "")
    vi.stubEnv("LEGAL_MEDIATOR_URL", "")
  })

  afterEach(() => vi.unstubAllEnvs())

  it("gives Admin content precedence over environment fallbacks", () => {
    vi.stubEnv("LEGAL_BUSINESS_NAME", "Entreprise environnement")

    const legal = resolveLegalInformation({
      business_name: "Entreprise Admin",
      mediator_url: "https://mediateur.example",
    })

    expect(legal.businessName).toBe("Entreprise Admin")
    expect(legal.mediatorUrl).toBe("https://mediateur.example")
    expect(legal.siteHost).toBe("nurabeautyco.com")
  })

  it("uses environment values when the Admin field is empty", () => {
    vi.stubEnv("LEGAL_BUSINESS_NAME", "Entreprise environnement")

    expect(resolveLegalInformation({ business_name: "  " }).businessName).toBe(
      "Entreprise environnement"
    )
  })

  it("returns a visible placeholder without inventing a mediator URL", () => {
    const legal = resolveLegalInformation()

    expect(legal.businessName).toBe("À compléter dans l’Admin")
    expect(legal.mediatorUrl).toBe("")
  })

  it("loads the legal block from home content", async () => {
    getHomeContent.mockResolvedValue({
      blocks: { legal_information: { business_name: "Entreprise Admin" } },
      hidden: [],
    })

    expect((await getLegalInformation()).businessName).toBe("Entreprise Admin")
  })
})