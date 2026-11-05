import { spawnSync } from "node:child_process"

const audit = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
})

if (audit.error || audit.signal || ![0, 1].includes(audit.status)) {
  console.error(audit.error?.message || audit.stderr || "npm audit failed")
  process.exit(1)
}

if (!audit.stdout) {
  console.error(audit.stderr || "npm audit returned no report")
  process.exit(1)
}

let report
try {
  report = JSON.parse(audit.stdout)
} catch {
  console.error("npm audit returned invalid JSON")
  process.exit(1)
}

if (report.error) {
  console.error(report.error.summary || report.error.message || "npm audit failed")
  process.exit(1)
}

const blocked = Object.entries(report.vulnerabilities ?? {}).filter(
  ([, vulnerability]) => ["high", "critical"].includes(vulnerability.severity)
)

if (blocked.length > 0) {
  console.error("High or critical production vulnerabilities found:")
  for (const [packageName, vulnerability] of blocked) {
    console.error(`- ${packageName} (${vulnerability.severity})`)
  }
  process.exit(1)
}

console.log("Production dependency audit passed; no high or critical advisories.")