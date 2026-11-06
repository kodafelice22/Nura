/**
 * Cache tags for editorial content. Unlike the starter's per-session tags,
 * these are the same for every visitor, so the backend can invalidate them
 * for everyone at once when an editor saves.
 */
export const CONTENT_CACHE_TAGS = ["home-content", "journal", "routines"] as const

export type ContentCacheTag = (typeof CONTENT_CACHE_TAGS)[number]
