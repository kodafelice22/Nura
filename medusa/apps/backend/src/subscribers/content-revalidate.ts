import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { getStorefrontUrl } from "../lib/email-templates"
import { HOME_CONTENT_CHANGED_EVENT } from "../workflows/save-home-block"
import { JOURNAL_CHANGED_EVENT } from "../workflows/manage-post"
import { ROUTINES_CHANGED_EVENT } from "../workflows/manage-routine"

const TAGS: Record<string, string> = {
  [HOME_CONTENT_CHANGED_EVENT]: "home-content",
  [JOURNAL_CHANGED_EVENT]: "journal",
  [ROUTINES_CHANGED_EVENT]: "routines",
}

/**
 * Tells the storefront to drop its cached copy of the content that just
 * changed, so an edit made in the admin is live immediately rather than at
 * the end of the cache window. Without REVALIDATE_SECRET configured the
 * storefront simply falls back to that window, so this stays optional.
 */
export default async function contentRevalidateHandler({
  event,
  container,
}: SubscriberArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const secret = process.env.REVALIDATE_SECRET

  if (!secret) {
    return
  }

  const tag = TAGS[event.name]

  if (!tag) {
    return
  }

  const url = `${getStorefrontUrl().replace(/\/$/, "")}/api/revalidate`

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ tags: [tag] }),
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      logger.warn(
        `Storefront revalidation for "${tag}" returned ${res.status}. The page will refresh at the end of its cache window instead.`
      )
    }
  } catch (error) {
    logger.warn(
      `Could not reach the storefront to revalidate "${tag}": ${
        error instanceof Error ? error.message : "unknown error"
      }`
    )
  }
}

export const config: SubscriberConfig = {
  event: [
    HOME_CONTENT_CHANGED_EVENT,
    JOURNAL_CHANGED_EVENT,
    ROUTINES_CHANGED_EVENT,
  ],
}
