import { createAttemptLimiter, parseOrderNumber } from "../order-lookup"

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

describe("createAttemptLimiter", () => {
  const windowMs = 1000

  it("refuses a key once it reaches the maximum within the window", () => {
    const limiter = createAttemptLimiter({ max: 2, windowMs })

    expect(limiter.tryAttempt("1042", 0)).toBe(true)
    expect(limiter.tryAttempt("1042", 10)).toBe(true)
    expect(limiter.tryAttempt("1042", 20)).toBe(false)
    expect(limiter.tryAttempt("1043", 20)).toBe(true)
  })

  it("counts concurrent attempts before any of them resolves", () => {
    const limiter = createAttemptLimiter({ max: 3, windowMs })
    const allowed = Array.from({ length: 10 }, () =>
      limiter.tryAttempt("1042", 0)
    ).filter(Boolean)

    expect(allowed).toHaveLength(3)
  })

  it("forgets attempts older than the window", () => {
    const limiter = createAttemptLimiter({ max: 2, windowMs })

    limiter.tryAttempt("a@exemple.test", 0)
    limiter.tryAttempt("a@exemple.test", 10)
    expect(limiter.tryAttempt("a@exemple.test", windowMs + 5)).toBe(true)
  })

  it("gives back a released attempt", () => {
    const limiter = createAttemptLimiter({ max: 1, windowMs })

    limiter.tryAttempt("1042", 0)
    limiter.release("1042", 0)
    expect(limiter.tryAttempt("1042", 10)).toBe(true)
  })

  it("refuses new keys when full instead of evicting live ones", () => {
    const limiter = createAttemptLimiter({ max: 1, windowMs, maxKeys: 2 })

    limiter.tryAttempt("a", 0)
    limiter.tryAttempt("b", 0)
    expect(limiter.tryAttempt("c", 10)).toBe(false)
    expect(limiter.tryAttempt("a", 10)).toBe(false)
    // Once the live keys expire, a sweep frees room for new ones.
    expect(limiter.tryAttempt("c", 60_000 + windowMs)).toBe(true)
  })
})
