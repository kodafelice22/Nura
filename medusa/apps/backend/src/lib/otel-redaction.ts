import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-node"

type Attributes = Record<string, unknown>
type SpanEvent = ReadableSpan["events"][number]
type SpanLink = ReadableSpan["links"][number]

const REDACTED = "[redacted]"

// Medusa's HTTP instrumentation copies every request header into the span
// (authorization, cookie, x-publishable-api-key, x-order-access-token...), so
// anything that looks like a credential is masked before leaving the process.
const SENSITIVE_KEY =
  /authorization|cookie|token|secret|password|api[-_.]?key|signature|credential/i

// Client addresses are personal data, and Caddy forwards them in these headers.
const CLIENT_ADDRESS_KEY =
  /^(x-forwarded-for|x-real-ip|forwarded|cf-connecting-ip|true-client-ip|http\.client_ip|client\.address|net\.peer\.ip|net\.sock\.peer\.addr|network\.peer\.address)$/i

// Bound query parameters (pg's enhanced reporting, newer DB semantic conventions).
const SQL_PARAMETER_KEY = /^(pg\.values|db\.statement\.parameters|db\.query\.parameter\..+)$/i

// Error messages routinely embed the offending value (an email, an id, a SQL
// literal), and stack traces start with that message.
const EXCEPTION_MESSAGE_KEY = /^(exception|error)\.(message|reason)$/i
const EXCEPTION_STACK_KEY = /^(exception|error)\.(stacktrace|stack)$/i

// The default resource detectors add the OS user and the command line (which
// can carry credentials passed as arguments) to every export.
const DROPPED_RESOURCE_KEYS = new Set([
  "process.owner",
  "process.command",
  "process.command_args",
  "process.executable.path",
])

// The Postgres instrumentation reports the database role name (GHSA-qqmp-wf37-98f9).
const DROPPED_KEYS = new Set(["db.user"])

const URL_KEYS = new Set(["http.url", "http.target", "url.full", "url.path"])

const stripQuery = (value: string) => value.split(/[?#]/)[0]
const stripUserInfo = (value: string) => value.replace(/\/\/[^/@\s]*@/, "//")

const SQL_KEYS = new Set(["db.statement", "db.query.text"])

// Medusa's queries carry literal values (search terms, API key tokens, emails,
// ids). Keep identifiers ("quoted") and $n placeholders, mask everything else.
const SQL_TOKEN = /("(?:[^"]|"")*")|('(?:[^']|'')*')|(\$\d+)|(\b\d+(?:\.\d+)?\b)/g
export const sanitizeSql = (sql: string) =>
  sql.replace(SQL_TOKEN, (match, identifier, text, placeholder) =>
    identifier ?? placeholder ?? (text ? "'?'" : "?")
  )

// Keeps only the "at fn (file:line:col)" frames: the header line is the message.
const stripStackMessage = (stack: string) =>
  stack
    .split("\n")
    .filter((line) => /^\s+at\s/.test(line))
    .join("\n")

export const redactSpanAttributes = (attributes: Attributes): Attributes => {
  const clean: Attributes = {}

  for (const [key, value] of Object.entries(attributes)) {
    if (DROPPED_KEYS.has(key)) {
      continue
    }

    if (
      SENSITIVE_KEY.test(key) ||
      CLIENT_ADDRESS_KEY.test(key) ||
      SQL_PARAMETER_KEY.test(key) ||
      EXCEPTION_MESSAGE_KEY.test(key) ||
      key === "url.query"
    ) {
      clean[key] = REDACTED
    } else if (EXCEPTION_STACK_KEY.test(key) && typeof value === "string") {
      clean[key] = stripStackMessage(value)
    } else if (SQL_KEYS.has(key) && typeof value === "string") {
      clean[key] = sanitizeSql(value)
    } else if (URL_KEYS.has(key) && typeof value === "string") {
      clean[key] = stripQuery(value)
    } else if (key === "db.connection_string" && typeof value === "string") {
      clean[key] = stripUserInfo(value)
    } else {
      clean[key] = value
    }
  }

  return clean
}

export const redactResourceAttributes = (attributes: Attributes): Attributes =>
  redactSpanAttributes(
    Object.fromEntries(
      Object.entries(attributes).filter(([key]) => !DROPPED_RESOURCE_KEYS.has(key))
    )
  )

// Redaction only swaps values for strings or drops keys, so the result is
// still a valid OpenTelemetry attribute set.
const redactOtelAttributes = <T extends Attributes | undefined>(attributes: T) =>
  (attributes && redactSpanAttributes(attributes)) as T

const redactEvent = (event: SpanEvent): SpanEvent => ({
  ...event,
  attributes: redactOtelAttributes(event.attributes),
})

const redactLink = (link: SpanLink): SpanLink => ({
  ...link,
  attributes: redactOtelAttributes(link.attributes),
})

// The OTLP serializer groups spans by resource *identity*, so each resource is
// wrapped once. `attributes` stays a getter: resource detectors can resolve
// asynchronously, after the first export.
const redactedResources = new WeakMap<object, ReadableSpan["resource"]>()
const redactResource = (resource: ReadableSpan["resource"]) => {
  let redacted = redactedResources.get(resource)

  if (!redacted) {
    redacted = Object.create(resource, {
      attributes: {
        get: () => redactResourceAttributes(resource.attributes),
        enumerable: true,
      },
    }) as ReadableSpan["resource"]
    redactedResources.set(resource, redacted)
  }

  return redacted
}

// Delegating through the prototype keeps every method and getter of the real
// span (spanContext(), ended, duration...) intact — only the data fields that
// can carry user data are replaced.
const redactSpan = (span: ReadableSpan): ReadableSpan =>
  Object.create(span, {
    attributes: {
      value: redactSpanAttributes(span.attributes),
      enumerable: true,
    },
    events: { value: span.events.map(redactEvent), enumerable: true },
    links: { value: span.links.map(redactLink), enumerable: true },
    status: {
      value: span.status.message
        ? { ...span.status, message: REDACTED }
        : span.status,
      enumerable: true,
    },
    resource: { value: redactResource(span.resource), enumerable: true },
  })

/**
 * Wraps a span exporter so no credential-like attribute, client address,
 * query string, SQL literal, exception message, database role name or
 * host-process detail (OS user, command line) reaches the telemetry backend —
 * on spans, their events and links, their status and their resource.
 */
export const withSpanRedaction = (exporter: SpanExporter): SpanExporter => ({
  export: (spans, resultCallback) =>
    exporter.export(spans.map(redactSpan), resultCallback),
  shutdown: () => exporter.shutdown(),
  forceFlush: () => exporter.forceFlush?.() ?? Promise.resolve(),
})
