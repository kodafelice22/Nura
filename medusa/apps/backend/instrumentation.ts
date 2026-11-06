import { registerOtel } from "@medusajs/medusa"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { withSpanRedaction } from "./src/lib/otel-redaction"

export function register() {
	if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
		return
	}

	registerOtel({
		serviceName: process.env.OTEL_SERVICE_NAME || "nura-backend",
		// Medusa copies every request header into the HTTP spans: mask credentials
		// before they leave the process.
		exporter: withSpanRedaction(new OTLPTraceExporter()),
		instrument: {
			http: true,
			workflows: true,
			query: true,
			db: true,
			cache: true,
		},
	})
}