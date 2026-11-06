import { POST } from "../../api/store/stock-alerts/route"

describe("stock alert route", () => {
  const originalFlag = process.env.STOCK_ALERTS_ENABLED

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.STOCK_ALERTS_ENABLED
    } else {
      process.env.STOCK_ALERTS_ENABLED = originalFlag
    }
  })

  it("returns 404 before processing input when the feature is disabled", async () => {
    process.env.STOCK_ALERTS_ENABLED = "false"
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }

    await POST({ body: {} } as never, response as never)

    expect(response.status).toHaveBeenCalledWith(404)
    expect(response.json).toHaveBeenCalledWith({
      message: "Fonctionnalité indisponible.",
    })
  })
})