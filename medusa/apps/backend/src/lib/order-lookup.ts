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
  overflowBuckets?: number
  sweepIntervalMs?: number
}

type OverflowAttempt = {
  key: string
  at: number
}

// shortcut: attempts are counted in this process's memory, so the limit is
// per backend instance and resets on restart; move it to Redis if the
// backend ever runs on more than one instance.
export function createAttemptLimiter({
  max,
  windowMs,
  maxKeys = 10_000,
  overflowBuckets = 1_024,
  sweepIntervalMs = 60_000,
}: AttemptLimiterOptions) {
  const attempts = new Map<string, number[]>()
  const overflow = new Map<number, OverflowAttempt[]>()
  const overflowBucketCount = Math.max(
    1,
    Math.min(Math.floor(overflowBuckets), maxKeys)
  )
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

  const overflowBucket = (key: string) => {
    let hash = 2_166_136_261
    for (let index = 0; index < key.length; index += 1) {
      hash ^= key.charCodeAt(index)
      hash = Math.imul(hash, 16_777_619)
    }
    return (hash >>> 0) % overflowBucketCount
  }

  const recentOverflow = (bucket: number, now: number) => {
    const current = (overflow.get(bucket) ?? []).filter(
      ({ at }) => now - at < windowMs
    )

    if (current.length) {
      overflow.set(bucket, current)
    } else {
      overflow.delete(bucket)
    }

    return current
  }

  const reserveOverflow = (key: string, now: number) => {
    const bucket = overflowBucket(key)
    const current = recentOverflow(bucket, now)

    if (current.length >= max) {
      return false
    }

    overflow.set(bucket, [...current, { key, at: now }])
    return true
  }

  return {
    /**
     * Checks and reserves an attempt in one synchronous step, so concurrent
     * requests cannot all pass the check before any of them is counted.
     * The exact-key table stays bounded. New keys overflow into fixed hash
     * buckets, preserving active limits without globally locking new clients.
     */
    tryAttempt(key: string, now = Date.now()) {
      const bucket = overflowBucket(key)
      const overflowHistory = recentOverflow(bucket, now)

      if (overflowHistory.some((attempt) => attempt.key === key)) {
        return reserveOverflow(key, now)
      }

      const current = recent(key, now)

      if (current.length >= max) {
        return false
      }

      if (!attempts.has(key) && attempts.size >= maxKeys) {
        sweep(now)
        if (attempts.size >= maxKeys) {
          return reserveOverflow(key, now)
        }
      }

      attempts.set(key, [...current, now])
      return true
    },
    /** Releases an attempt reserved at `at` that turned out not to be a failure. */
    release(key: string, at: number) {
      const stored = attempts.get(key)
      const index = stored?.lastIndexOf(at) ?? -1

      if (stored && index !== -1) {
        stored.splice(index, 1)
        if (!stored.length) {
          attempts.delete(key)
        }
        return
      }

      const bucket = overflowBucket(key)
      const bucketAttempts = overflow.get(bucket)
      let overflowIndex = -1
      for (let index = (bucketAttempts?.length ?? 0) - 1; index >= 0; index -= 1) {
        const attempt = bucketAttempts![index]
        if (attempt.key === key && attempt.at === at) {
          overflowIndex = index
          break
        }
      }

      if (!bucketAttempts || overflowIndex === -1) {
        return
      }

      bucketAttempts.splice(overflowIndex, 1)
      if (!bucketAttempts.length) {
        overflow.delete(bucket)
      }
    },
  }
}
