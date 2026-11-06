import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { collectAdvisories, evaluate, validateExceptions } from "./audit-gate.mjs"

const advisory = (overrides = {}) => ({
  source: 1,
  name: "braces",
  severity: "high",
  title: "stack exhaustion",
  url: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",
  range: "<=3.0.3",
  ...overrides,
})
const audit = (...via) => ({
  vulnerabilities: {
    braces: { via },
    micromatch: { via: ["braces"] },
    other: { via: [advisory({ severity: "moderate", name: "uuid", url: "https://github.com/advisories/GHSA-w5hq-g745-h8pq" })] },
  },
})
const exception = (overrides = {}) => ({
  id: "GHSA-vfj7-8cjw-p6xm",
  package: "braces",
  range: "<=3.0.3",
  reason: "r",
  exposure: "e",
  reviewer: "someone",
  expires: "2027-01-09",
  removeWhen: "w",
  ...overrides,
})

test("collects only high/critical root-cause advisories, once", () => {
  const found = collectAdvisories(audit(advisory(), advisory()))

  assert.deepEqual(found.map((item) => item.id), ["GHSA-vfj7-8cjw-p6xm"])
})

test("fails when an advisory has no exception", () => {
  const result = evaluate(audit(advisory()), [], "2026-10-09")

  assert.equal(result.ok, false)
  assert.equal(result.blocking.length, 1)
})

test("accepts an advisory covered by a valid exception", () => {
  const result = evaluate(audit(advisory()), [exception()], "2026-10-09")

  assert.equal(result.ok, true)
  assert.equal(result.accepted.length, 1)
})

test("fails once the exception has expired", () => {
  const result = evaluate(audit(advisory()), [exception({ expires: "2026-10-08" })], "2026-10-09")

  assert.equal(result.ok, false)
  assert.match(result.problems[0], /expired/)
  assert.equal(result.blocking.length, 1)
})

test("fails when the affected range changes (exception no longer matches)", () => {
  const result = evaluate(audit(advisory({ range: "<=3.1.0" })), [exception()], "2026-10-09")

  assert.equal(result.ok, false)
  assert.equal(result.blocking.length, 1)
})

test("a different advisory on the same package is not covered", () => {
  const result = evaluate(
    audit(advisory(), advisory({ url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc" })),
    [exception()],
    "2026-10-09"
  )

  assert.equal(result.ok, false)
  assert.deepEqual(result.blocking.map((item) => item.id), ["GHSA-aaaa-bbbb-cccc"])
})

test("rejects incomplete exceptions", () => {
  const { valid, problems } = validateExceptions([exception({ reviewer: " ", removeWhen: "" })], "2026-10-09")

  assert.equal(valid.length, 0)
  assert.match(problems[0], /reviewer, removeWhen/)
})

test("rejects malformed expiry dates", () => {
  const { problems } = validateExceptions([exception({ expires: "9 janvier 2027" })], "2026-10-09")

  assert.match(problems[0], /YYYY-MM-DD/)
})

test("reports exceptions that no longer match anything", () => {
  const result = evaluate({ vulnerabilities: {} }, [exception()], "2026-10-09")

  assert.equal(result.ok, true)
  assert.equal(result.unused.length, 1)
})

test("the committed exception file is complete and well formed", () => {
  const { exceptions } = JSON.parse(readFileSync(new URL("../audit-exceptions.json", import.meta.url), "utf8"))
  const { valid, problems } = validateExceptions(exceptions, "2026-10-09")

  assert.deepEqual(problems, [])
  assert.equal(valid.length, exceptions.length)
})
