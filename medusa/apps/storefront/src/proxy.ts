import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"
import { MARKET_PREF_COOKIE, REFERRAL_CODE_COOKIE } from "@lib/constants"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "ci"

const regionMapCache = {
  regionMap: new Map<string, HttpTypes.StoreRegion>(),
  regionMapUpdated: Date.now(),
}

async function getRegionMap(cacheId: string) {
  const { regionMap, regionMapUpdated } = regionMapCache

  if (!BACKEND_URL) {
    throw new Error(
      "Proxy: Error fetching regions. Did you set up regions in your Medusa Admin and define a NEXT_PUBLIC_MEDUSA_BACKEND_URL environment variable."
    )
  }

  if (
    !regionMap.keys().next().value ||
    regionMapUpdated < Date.now() - 3600 * 1000
  ) {
    // Fetch regions from Medusa. We can't use the JS client here because the proxy runs on Edge and the client needs a Node environment.
    const response = await fetch(`${BACKEND_URL}/store/regions`, {
      method: "GET",
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY!,
      },
      next: {
        revalidate: 3600,
        tags: [`regions-${cacheId}`],
      },
      cache: "force-cache",
    })

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const json = await response.json()

    const { regions } = json

    if (!regions?.length) {
      return new Map<string, HttpTypes.StoreRegion>()
    }

    // Create a map of country codes to regions.
    regions.forEach((region: HttpTypes.StoreRegion) => {
      region.countries?.forEach((c) => {
        regionMapCache.regionMap.set(c.iso_2 ?? "", region)
      })
    })

    regionMapCache.regionMapUpdated = Date.now()
  }

  return regionMapCache.regionMap
}

/**
 * Resolves which country/market to serve a request for, in priority order:
 *
 *  1. The URL itself already has a (valid) country segment — once a visitor
 *     is on a given country's pages, stay there for the rest of that visit.
 *  2. `_nura_market_pref` — a country the customer explicitly picked before
 *     (CountrySelect → updateRegion), so it isn't silently overridden by
 *     GeoIP/locale detection on a later visit with no URL segment yet.
 *  3. GeoIP, from whichever signal this deployment actually has:
 *     - Caddy's `X-Geoip-Country` header (self-hosted — see Caddyfile /
 *       DEPLOYMENT.md), or
 *     - `request.cf.country` (Cloudflare), or
 *     - `x-vercel-ip-country` (Vercel).
 *     Only one of these is ever populated for a given deployment; trying
 *     all three keeps this portable across hosting setups without config.
 *  4. `NEXT_PUBLIC_DEFAULT_REGION`.
 *  5. Whatever region Medusa returns first.
 */
function resolveCountry(
  request: NextRequest,
  regionMap: Map<string, HttpTypes.StoreRegion | number>
) {
  const urlCountryCode = request.nextUrl.pathname.split("/")[1]?.toLowerCase()
  if (urlCountryCode && regionMap.has(urlCountryCode)) {
    return urlCountryCode
  }

  const marketPrefCountryCode = request.cookies
    .get(MARKET_PREF_COOKIE)
    ?.value?.toLowerCase()
  if (marketPrefCountryCode && regionMap.has(marketPrefCountryCode)) {
    return marketPrefCountryCode
  }

  const caddyCountryCode = request.headers
    .get("x-geoip-country")
    ?.toLowerCase()
  // Cloudflare Workers provides country via request.cf.country
  const cloudflareCountryCode = (request as { cf?: { country?: string } }).cf?.country?.toLowerCase()
  // Vercel provides x-vercel-ip-country header
  const vercelCountryCode = request.headers
    .get("x-vercel-ip-country")
    ?.toLowerCase()
  const geoipCountryCode =
    caddyCountryCode ?? cloudflareCountryCode ?? vercelCountryCode
  if (geoipCountryCode && regionMap.has(geoipCountryCode)) {
    return geoipCountryCode
  }

  if (regionMap.has(DEFAULT_REGION)) {
    return DEFAULT_REGION
  }

  return regionMap.keys().next().value
}

// Captures `?ref=CODE` (a customer's referral link) into a cookie so it's
// still available at signup time, even if the visitor lands on a product
// page and only creates an account several pages/clicks later.
function withReferralCookie(response: NextResponse, request: NextRequest) {
  const refCode = request.nextUrl.searchParams.get("ref")
  if (refCode) {
    response.cookies.set(REFERRAL_CODE_COOKIE, refCode, {
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    })
  }
  return response
}

/**
 * Proxy to handle region selection and onboarding status.
 */
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.includes(".")) {
    return NextResponse.next()
  }

  const cacheIdCookie = request.cookies.get("_medusa_cache_id")
  const cacheId = cacheIdCookie?.value || crypto.randomUUID()

  const regionMap = await getRegionMap(cacheId)
  const countryCode = resolveCountry(request, regionMap)

  // if the country code is available, use it, otherwise use the default region
  const country = countryCode || DEFAULT_REGION
  const firstPathSegment = request.nextUrl.pathname.split("/")[1]?.toLowerCase()
  const urlHasCountry = firstPathSegment === country.toLowerCase()

  if (urlHasCountry) {
    if (!cacheIdCookie) {
      const response = NextResponse.next()
      response.cookies.set("_medusa_cache_id", cacheId, {
        maxAge: 60 * 60 * 24,
      })
      return withReferralCookie(response, request)
    }
    return withReferralCookie(NextResponse.next(), request)
  }

  // if the url doesn't have the country, redirect to it
  const redirectPath =
    request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname
  const queryString = request.nextUrl.search || ""
  const redirectUrl = `${request.nextUrl.origin}/${country}${redirectPath}${queryString}`

  return withReferralCookie(NextResponse.redirect(redirectUrl, 307), request)
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
