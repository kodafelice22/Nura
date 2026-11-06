import { createFailureLimiter, parseOrderNumber } from "../order-lookup"

describe("parseOrderNumber", () => {
  it.each([
    ["1042", 1042],
    ["#1042", 1042],
    ["n°1042", 1042],
    [" 1042 ", 1042],
    [1042, 1042],
  ])("reads %p as %p", (input, expected) => {
    expect(parseOrderNumber(input)).toBe(expected)
  })

  it.each([[""], ["abc"], ["0"], ["1234567890"], [null], [undefined], [{}]])(
    "rejects %p",
    (input) => {
      expect(parseOrderNumber(input)).toBeNull()
    }
  )
})

describe("createFailureLimiter", () => {
  const windowMs = 1000

  it("blocks a key once it reaches the maximum within the window", () => {
    const limiter = createFailureLimiter({ max: 2, windowMs })

    limiter.recordFailure("1042", 0)
    expect(limiter.isBlocked("1042", 10)).toBe(false)

    limiter.recordFailure("1042", 20)
    expect(limiter.isBlocked("1042", 30)).toBe(true)
    expect(limiter.isBlocked("1043", 30)).toBe(false)
  })

  it("forgets failures older than the window", () => {
    const limiter = createFailureLimiter({ max: 2, windowMs })

    limiter.recordFailure("a@exemple.test", 0)
    limiter.recordFailure("a@exemple.test", 10)
    expect(limiter.isBlocked("a@exemple.test", windowMs + 5)).toBe(false)
  })
})
