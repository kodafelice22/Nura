import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-node"
import { JsonTraceSerializer } from "@opentelemetry/otlp-transformer"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { SpanStatusCode } from "@opentelemetry/api"
import {
  redactResourceAttributes,
  redactSpanAttributes,
  sanitizeSql,
  withSpanRedaction,
} from "../otel-redaction"

const SECRETS = [
  "Bearer eyJ.secret.jwt",
  "connect.sid=s%3Asession-secret",
  "publishable-key-marker",
  "order-access-secret",
]

describe("redactSpanAttributes", () => {
  it("masks credential-like attributes whatever their casing", () => {
    expect(
      redactSpanAttributes({
        authorization: SECRETS[0],
        Cookie: SECRETS[1],
        "x-publishable-api-key": SECRETS[2],
        "x-order-access-token": SECRETS[3],
        "x-revalidate-secret": "shared",
        "set-cookie": "a=b",
        "http.method": "POST",
        "http.route": "/store/orders/:id",
      })
    ).toEqual({
      authorization: "[redacted]",
      Cookie: "[redacted]",
      "x-publishable-api-key": "[redacted]",
      "x-order-access-token": "[redacted]",
      "x-revalidate-secret": "[redacted]",
      "set-cookie": "[redacted]",
      "http.method": "POST",
      "http.route": "/store/orders/:id",
    })
  })

  it("keeps the path but drops the query string and fragment of URLs", () => {
    expect(
      redactSpanAttributes({
        "http.url": "/store/customers?email=a%40b.fr&token=abc#x",
        "url.query": "email=a%40b.fr",
      })
    ).toEqual({
      "http.url": "/store/customers",
      "url.query": "[redacted]",
    })
  })

  it("drops the database role name and user info of connection strings", () => {
    expect(
      redactSpanAttributes({
        "db.user": "medusa",
        "db.name": "medusa",
        "db.connection_string": "postgresql://medusa:pw@postgres:5432/medusa",
      })
    ).toEqual({
      "db.name": "medusa",
      "db.connection_string": "postgresql://postgres:5432/medusa",
    })
  })

  it("masks client addresses forwarded by the proxy", () => {
    expect(
      redactSpanAttributes({
        "x-forwarded-for": "203.0.113.7",
        "x-real-ip": "203.0.113.7",
        "x-geoip-country": "ci",
      })
    ).toEqual({
      "x-forwarded-for": "[redacted]",
      "x-real-ip": "[redacted]",
      "x-geoip-country": "ci",
    })
  })

  it("sanitizes SQL statements in db.statement", () => {
    expect(
      redactSpanAttributes({
        "db.statement": `select "p0"."id" from "product" where "p0"."title" like 'secret%' limit 10`,
      })
    ).toEqual({
      "db.statement": `select "p0"."id" from "product" where "p0"."title" like '?' limit ?`,
    })
  })

  it("does not mutate its input", () => {
    const input = { authorization: SECRETS[0] }
    redactSpanAttributes(input)

    expect(input.authorization).toBe(SECRETS[0])
  })
})

describe("sanitizeSql", () => {
  it.each([
    [`where email = 'a@b.fr' and id = 42`, `where email = '?' and id = ?`],
    [`where "t1"."id" in ('prod_01', 'prod_02', 'it''s')`, `where "t1"."id" in ('?', '?', '?')`],
    [`select * from "user_2fa" where id = $1 and n > $22`, `select * from "user_2fa" where id = $1 and n > $22`],
    [`limit 12.5 offset 0`, `limit ? offset ?`],
    [`select p0.id from product as p0 join t1 on t1.id = p0.id`, `select p0.id from product as p0 join t1 on t1.id = p0.id`],
    [`select "a""b" from x where y = 'z'`, `select "a""b" from x where y = '?'`],
  ])("masks literals only: %s", (input, expected) => {
    expect(sanitizeSql(input)).toBe(expected)
  })
})

describe("withSpanRedaction", () => {
  it("exports real spans without credentials while keeping them valid", async () => {
    const memory = new InMemorySpanExporter()
    const exported: unknown[] = []
    const wrapped = withSpanRedaction({
      export: (spans, done) => {
        exported.push(JsonTraceSerializer.serializeRequest(spans))
        memory.export(spans, done)
      },
      shutdown: () => memory.shutdown(),
    })

    const provider = new BasicTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(wrapped)],
    })
    const span = provider.getTracer("test").startSpan("POST /store/orders/:id")

    span.setAttributes({
      "http.url": "/store/orders/order_1?token=query-secret",
      "http.method": "GET",
      authorization: SECRETS[0],
      cookie: SECRETS[1],
      "x-publishable-api-key": SECRETS[2],
      "x-order-access-token": SECRETS[3],
      "db.user": "medusa-role",
      "x-forwarded-for": "203.0.113.7",
      "db.statement": `select 1 from "api_key" where "token" = 'sql-literal-secret'`,
    })
    span.end()
    await provider.forceFlush()

    const payload = Buffer.from(exported[0] as Uint8Array).toString("utf8")

    for (const secret of [
      ...SECRETS,
      "query-secret",
      "medusa-role",
      "203.0.113.7",
      "sql-literal-secret",
    ]) {
      expect(payload).not.toContain(secret)
    }
    expect(payload).toContain("POST /store/orders/:id")
    expect(payload).toContain("/store/orders/order_1")
    expect(payload).toContain("GET")
    expect(payload).toContain(
      JSON.stringify(`select ? from "api_key" where "token" = '?'`).slice(1, -1)
    )
    expect(memory.getFinishedSpans()).toHaveLength(1)
    expect(memory.getFinishedSpans()[0].spanContext().traceId).toMatch(
      /^[0-9a-f]{32}$/
    )
  })

  it("forwards flush and shutdown to the wrapped exporter", async () => {
    const calls: string[] = []
    const wrapped = withSpanRedaction({
      export: () => undefined,
      shutdown: async () => {
        calls.push("shutdown")
      },
      forceFlush: async () => {
        calls.push("flush")
      },
    })

    await wrapped.forceFlush?.()
    await wrapped.shutdown()

    expect(calls).toEqual(["flush", "shutdown"])
  })
})

describe("redactSpanAttributes — exceptions and bound parameters", () => {
  it("drops exception messages and the message line of stack traces", () => {
    const stack = [
      "Error: duplicate key for jane@example.com",
      "    at register (/app/src/api/store/register.js:10:5)",
      "    at async handler (/app/src/api/handler.js:3:1)",
    ].join("\n")

    expect(
      redactSpanAttributes({
        "exception.type": "Error",
        "exception.message": "duplicate key for jane@example.com",
        "exception.stacktrace": stack,
        "error.message": "boom jane@example.com",
      })
    ).toEqual({
      "exception.type": "Error",
      "exception.message": "[redacted]",
      "exception.stacktrace": [
        "    at register (/app/src/api/store/register.js:10:5)",
        "    at async handler (/app/src/api/handler.js:3:1)",
      ].join("\n"),
      "error.message": "[redacted]",
    })
  })

  it("masks bound SQL parameters and additional client address keys", () => {
    expect(
      redactSpanAttributes({
        "pg.values": ["jane@example.com", "tok_123"],
        "db.query.parameter.0": "jane@example.com",
        "http.client_ip": "203.0.113.7",
        "client.address": "203.0.113.7",
        "net.peer.ip": "203.0.113.7",
        "db.system": "postgresql",
      })
    ).toEqual({
      "pg.values": "[redacted]",
      "db.query.parameter.0": "[redacted]",
      "http.client_ip": "[redacted]",
      "client.address": "[redacted]",
      "net.peer.ip": "[redacted]",
      "db.system": "postgresql",
    })
  })
})

describe("redactResourceAttributes", () => {
  it("drops the OS user and the process command line, keeps service identity", () => {
    expect(
      redactResourceAttributes({
        "service.name": "nura-backend",
        "process.owner": "local-os-user",
        "process.command": "/app/server.js",
        "process.command_args": ["node", "--password=hunter2"],
        "process.executable.path": "/usr/local/bin/node",
        "process.runtime.version": "22.1.0",
        "host.arch": "arm64",
      })
    ).toEqual({
      "service.name": "nura-backend",
      "process.runtime.version": "22.1.0",
      "host.arch": "arm64",
    })
  })
})

const serialize = (
  spans: Parameters<typeof JsonTraceSerializer.serializeRequest>[0]
) => Buffer.from(JsonTraceSerializer.serializeRequest(spans) ?? []).toString("utf8")

describe("withSpanRedaction — events, links, status and resource", () => {
  const setup = () => {
    const exported: string[] = []
    // `memory` is fed directly by the provider: it keeps the spans as the SDK
    // produced them, before any redaction.
    const memory = new InMemorySpanExporter()
    const wrapped = withSpanRedaction({
      export: (spans, done) => {
        exported.push(serialize(spans))
        done({ code: 0 })
      },
      shutdown: async () => undefined,
    })
    const provider = new BasicTracerProvider({
      resource: resourceFromAttributes({
        "service.name": "nura-backend",
        "process.owner": "local-os-user",
        "process.command_args": ["node", "--password=hunter2"],
        "process.executable.path": "/opt/private/bin/node",
      }),
      spanProcessors: [
        new SimpleSpanProcessor(memory),
        new SimpleSpanProcessor(wrapped),
      ],
    })

    return { provider, exported, memory }
  }

  it("redacts a recorded exception (message, stack header) end to end", async () => {
    const { provider, exported } = setup()
    const span = provider.getTracer("test").startSpan("POST /store/customers")
    const error = new Error("duplicate key for jane@example.com")

    span.recordException(error)
    span.end()
    await provider.forceFlush()

    const payload = exported[0]

    expect(payload).not.toContain("jane@example.com")
    expect(payload).toContain("exception.type")
    expect(payload).toContain("otel-redaction.unit.spec")
    expect(payload).toContain("[redacted]")
  })

  it("redacts event attributes, including SQL literals and credentials", async () => {
    const { provider, exported } = setup()
    const span = provider.getTracer("test").startSpan("work")

    span.addEvent("query", {
      "db.statement": `select 1 from "t" where "email" = 'event-literal@example.com'`,
      authorization: "Bearer event-secret",
      "http.status_code": 200,
    })
    span.end()
    await provider.forceFlush()

    expect(exported[0]).not.toContain("event-literal@example.com")
    expect(exported[0]).not.toContain("event-secret")
    expect(exported[0]).toContain("http.status_code")
  })

  it("redacts the status message but keeps the status code", async () => {
    const { provider, exported, memory } = setup()
    const span = provider.getTracer("test").startSpan("work")

    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: "failed for jane@example.com",
    })
    span.end()
    await provider.forceFlush()

    expect(exported[0]).not.toContain("jane@example.com")
    expect(exported[0]).toContain('"code":2')
    expect(memory.getFinishedSpans()[0].status.message).toBe(
      "failed for jane@example.com"
    )
  })

  it("redacts link attributes", async () => {
    const { provider, exported } = setup()
    const linked = provider.getTracer("test").startSpan("other")
    const span = provider.getTracer("test").startSpan("work", {
      links: [
        {
          context: linked.spanContext(),
          attributes: { "x-order-access-token": "link-secret", "link.kind": "batch" },
        },
      ],
    })

    span.end()
    linked.end()
    await provider.forceFlush()

    expect(exported[0]).not.toContain("link-secret")
    expect(exported[0]).toContain("link.kind")
  })

  it("drops OS user and command line from the resource and keeps one resource group", async () => {
    const { provider, exported } = setup()
    const tracer = provider.getTracer("test")

    tracer.startSpan("a").end()
    tracer.startSpan("b").end()
    await provider.forceFlush()

    const payloads = exported.map((raw) => JSON.parse(raw))
    const all = exported.join("")

    expect(all).not.toContain("local-os-user")
    expect(all).not.toContain("hunter2")
    expect(all).not.toContain("/opt/private/bin/node")
    expect(all).toContain("nura-backend")
    // one export per span with SimpleSpanProcessor; each has a single resource block
    for (const payload of payloads) {
      expect(payload.resourceSpans).toHaveLength(1)
    }
  })

  it("keeps spans of one batch under a single resource block", () => {
    const memory = new InMemorySpanExporter()
    const provider = new BasicTracerProvider({
      resource: resourceFromAttributes({ "process.owner": "local-os-user" }),
      spanProcessors: [new SimpleSpanProcessor(memory)],
    })
    const tracer = provider.getTracer("test")

    tracer.startSpan("x").end()
    tracer.startSpan("y").end()

    let batch: Parameters<typeof JsonTraceSerializer.serializeRequest>[0] = []
    withSpanRedaction({
      export: (spans) => {
        batch = spans
      },
      shutdown: async () => undefined,
    }).export(memory.getFinishedSpans(), () => undefined)

    const raw = serialize(batch)

    expect(batch).toHaveLength(2)
    expect(JSON.parse(raw).resourceSpans).toHaveLength(1)
    expect(raw).not.toContain("local-os-user")
  })

  it("does not mutate the original span, its events or its resource", async () => {
    const { provider, memory } = setup()
    const span = provider.getTracer("test").startSpan("work")

    span.addEvent("e", { authorization: "Bearer keep-original" })
    span.end()
    await provider.forceFlush()

    const original = memory.getFinishedSpans()[0]

    expect(original.events[0].attributes?.authorization).toBe(
      "Bearer keep-original"
    )
    expect(original.resource.attributes["process.owner"]).toBe("local-os-user")
  })
})
