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

type AttemptLimiterOptions = {
  max: number
  windowMs: number
  maxKeys?: number
  sweepIntervalMs?: number
}

// shortcut: attempts are counted in this process's memory, so the limit is
// per backend instance and resets on restart; move it to Redis if the
// backend ever runs on more than one instance.
export function createAttemptLimiter({
  max,
  windowMs,
  maxKeys = 10_000,
  sweepIntervalMs = 60_000,
}: AttemptLimiterOptions) {
  const attempts = new Map<string, number[]>()
  let lastSweep = -Infinity

  const recent = (key: string, now: number) =>
    (attempts.get(key) ?? []).filter((at) => now - at < windowMs)

  // Bounded cost: a full sweep runs at most once per interval, however many
  // distinct keys arrive.
  const sweep = (now: number) => {
    if (now - lastSweep < sweepIntervalMs) {
      return
    }

    lastSweep = now
    for (const key of attempts.keys()) {
      if (!recent(key, now).length) {
        attempts.delete(key)
      }
    }
  }

  return {
    /**
     * Checks and reserves an attempt in one synchronous step, so concurrent
     * requests cannot all pass the check before any of them is counted.
     * When the table is full of live keys, new keys are refused rather than
     * evicting the history of keys under attack.
     */
    tryAttempt(key: string, now = Date.now()) {
      const current = recent(key, now)

      if (current.length >= max) {
        return false
      }

      if (!attempts.has(key) && attempts.size >= maxKeys) {
        sweep(now)
        if (attempts.size >= maxKeys) {
          return false
        }
      }

      attempts.set(key, [...current, now])
      return true
    },
    /** Releases an attempt reserved at `at` that turned out not to be a failure. */
    release(key: string, at: number) {
      const stored = attempts.get(key)
      const index = stored?.lastIndexOf(at) ?? -1

      if (!stored || index === -1) {
        return
      }

      stored.splice(index, 1)
      if (!stored.length) {
        attempts.delete(key)
      }
    },
  }
}
