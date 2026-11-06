import { createOrderAccessToken } from "./order-access-token"
import { MedusaError } from "@medusajs/framework/utils"
import { escapeHtml } from "./escape-html"

// Shared HTML wrapper for all transactional emails sent via the
// resend-notification provider, so order confirmations, password resets and
// email verification messages all look like the same brand. Styles are
// inlined since most email clients strip <style> blocks.
export function renderEmailLayout(bodyHtml: string) {
  return `
    <div style="background-color:#FBF8F3;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#3A2A20;">
      <div style="max-width:480px;margin:0 auto;background-color:#ffffff;border:1px solid #E7D3C0;padding:32px;">
        <p style="text-align:center;letter-spacing:0.3em;text-transform:uppercase;font-size:11px;color:#B79B6E;margin:0 0 16px;">
          Nura
        </p>
        ${bodyHtml}
        <p style="text-align:center;font-size:11px;color:#8a7a6d;margin:32px 0 0;">
          Nura — Votre aura commence ici.
        </p>
      </div>
    </div>
  `
}

export function toSafeWebUrl(value: string | null | undefined) {
  if (!value) {
    return null
  }

  try {
    const url = new URL(value)

    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return null
    }

    return url.href
  } catch {
    return null
  }
}

export function renderButton(href: string, label: string) {
  const safeHref = toSafeWebUrl(href)

  if (!safeHref) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Email button URL must be an absolute HTTP(S) URL."
    )
  }

  return `
    <p style="text-align:center;margin:24px 0;">
      <a href="${escapeHtml(safeHref)}" style="display:inline-block;background-color:#3A2A20;color:#FBF8F3;text-decoration:none;padding:12px 24px;text-transform:uppercase;letter-spacing:0.12em;font-size:12px;">
        ${escapeHtml(label)}
      </a>
    </p>
  `
}

export function getStorefrontUrl() {
  if (process.env.STOREFRONT_URL) {
    return process.env.STOREFRONT_URL.replace(/\/$/, "")
  }

  if (process.env.NODE_ENV === "production") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "STOREFRONT_URL is required in production"
    )
  }

  return "http://localhost:8000"
}

export function getOrderAccessUrl(orderId: string) {
  const token = createOrderAccessToken(orderId)
  return `${getStorefrontUrl()}/order/${encodeURIComponent(orderId)}/access/${encodeURIComponent(token)}`
}
