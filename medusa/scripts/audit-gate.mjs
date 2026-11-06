#!/usr/bin/env node
// CI gate for `npm audit --omit=dev --audit-level=high`.
//
// It runs that exact audit and fails on every high/critical advisory, except the
// ones explicitly accepted in audit-exceptions.json. An exception only applies
// while it is complete, unexpired and still matches the advisory id, the package
// and the affected version range reported by npm: anything else (a new advisory,
// a widened range, an expired date) fails the build. The threshold is never
// lowered and nothing is silenced globally.
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const BLOCKING = new Set(["high", "critical"])
const REQUIRED = ["id", "package", "range", "reason", "exposure", "reviewer", "expires", "removeWhen"]

export const collectAdvisories = (audit) => {
  const found = new Map()

  for (const vulnerability of Object.values(audit.vulnerabilities ?? {})) {
    for (const via of vulnerability.via ?? []) {
      // string entries only point at another vulnerable package (propagation)
      if (typeof via !== "object" || !BLOCKING.has(via.severity)) {
        continue
      }

      const id = String(via.url ?? "").split("/").pop()

      found.set(`${id}|${via.name}`, {
        id,
        package: via.name,
        range: via.range,
        severity: via.severity,
        title: via.title,
      })
    }
  }

  return [...found.values()]
}

export const validateExceptions = (exceptions, today) => {
  const problems = []
  const valid = []

  for (const exception of exceptions) {
    const missing = REQUIRED.filter((field) => !String(exception[field] ?? "").trim())

    if (missing.length) {
      problems.push(`${exception.id ?? "(no id)"}: missing ${missing.join(", ")}`)
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(exception.expires)) {
      problems.push(`${exception.id}: "expires" must be YYYY-MM-DD`)
    } else if (exception.expires < today) {
      problems.push(`${exception.id}: expired on ${exception.expires}`)
    } else {
      valid.push(exception)
    }
  }

  return { valid, problems }
}

export const evaluate = (audit, exceptions, today) => {
  const { valid, problems } = validateExceptions(exceptions, today)
  const advisories = collectAdvisories(audit)
  const accepted = []
  const blocking = []

  for (const advisory of advisories) {
    const exception = valid.find(
      (candidate) =>
        candidate.id === advisory.id &&
        candidate.package === advisory.package &&
        candidate.range === advisory.range
    )

    if (exception) {
      accepted.push({ advisory, exception })
    } else {
      blocking.push(advisory)
    }
  }

  const unused = valid.filter(
    (exception) =>
      !advisories.some((advisory) => advisory.id === exception.id && advisory.package === exception.package)
  )

  return { accepted, blocking, problems, unused, ok: blocking.length === 0 && problems.length === 0 }
}

const main = () => {
  const run = spawnSync(
    "npm",
    ["audit", "--omit=dev", "--audit-level=high", "--json"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  )
  let audit

  try {
    audit = JSON.parse(run.stdout)
  } catch {
    console.error("audit-gate: npm audit did not return JSON — failing closed.")
    console.error(run.stderr)
    return 2
  }

  if (audit.error) {
    console.error(`audit-gate: npm audit failed (${audit.error.code ?? "error"}) — failing closed.`)
    return 2
  }

  const file = new URL("../audit-exceptions.json", import.meta.url)
  const { exceptions = [] } = JSON.parse(readFileSync(file, "utf8"))
  const today = new Date().toISOString().slice(0, 10)
  const result = evaluate(audit, exceptions, today)

  for (const { advisory, exception } of result.accepted) {
    console.log(`ACCEPTED ${advisory.id} (${advisory.package} ${advisory.range}) until ${exception.expires} — reviewer: ${exception.reviewer}`)
  }
  for (const exception of result.unused) {
    console.warn(`WARNING exception ${exception.id} no longer matches any advisory — remove it from audit-exceptions.json`)
  }
  for (const problem of result.problems) {
    console.error(`INVALID EXCEPTION ${problem}`)
  }
  for (const advisory of result.blocking) {
    console.error(`BLOCKING ${advisory.severity} ${advisory.id} (${advisory.package} ${advisory.range}): ${advisory.title}`)
  }

  console.log(result.ok ? "audit-gate: OK" : "audit-gate: FAILED")
  return result.ok ? 0 : 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main())
}
