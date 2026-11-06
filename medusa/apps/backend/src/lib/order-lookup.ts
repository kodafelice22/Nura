// Accepts what customers actually type: "1042", "#1042", "n°1042".
export function parseOrderNumber(input: unknown): number | null {
  if (typeof input !== "string" && typeof input !== "number") {
    return null
  }

  const digits = String(input).replace(/\D/g, "")

  if (!digits || digits.length > 9) {
    return null
  }

  const value = Number(digits)
  return value > 0 ? value : null
}

type FailureLimiterOptions = {
  max: number
  windowMs: number
}

// shortcut: failures are counted in this process's memory, so the limit is
// per backend instance and resets on restart; move it to Redis if the
// backend ever runs on more than one instance.
export function createFailureLimiter({ max, windowMs }: FailureLimiterOptions) {
  const failures = new Map<string, number[]>()

  const recent = (key: string, now: number) =>
    (failures.get(key) ?? []).filter((at) => now - at < windowMs)

  return {
    isBlocked(key: string, now = Date.now()) {
      return recent(key, now).length >= max
    },
    recordFailure(key: string, now = Date.now()) {
      failures.set(key, [...recent(key, now), now])

      if (failures.size > 10_000) {
        for (const stored of failures.keys()) {
          if (!recent(stored, now).length) {
            failures.delete(stored)
          }
        }
      }
    },
  }
}
