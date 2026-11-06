import { Metadata } from "next"

import Overview from "@modules/account/components/overview"
import { notFound } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import { getHomeContent } from "@lib/data/home-content"
import { getOrdersSummary, retrieveOrder } from "@lib/data/orders"
import { getMyReferralCode } from "@lib/data/referral"
import { listWishlist } from "@lib/data/wishlist"
import { getBaseURL } from "@lib/util/env"

export const metadata: Metadata = {
  title: "Mon compte",
  description: "Aperçu de votre activité sur votre compte Nura.",
}

export default async function OverviewTemplate(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const [customer, summary, wishlist, referralCode, { blocks }] =
    await Promise.all([
      retrieveCustomer().catch(() => null),
      getOrdersSummary().catch(() => null),
      listWishlist(),
      getMyReferralCode(),
      getHomeContent(),
    ])

  if (!customer) {
    notFound()
  }

  // The list endpoint can't return the fulfillment fields the timeline needs.
  const latestOrder = summary?.latestOrderId
    ? await retrieveOrder(summary.latestOrderId).catch(() => null)
    : null

  return (
    <Overview
      customer={customer}
      latestOrder={latestOrder}
      ordersCount={summary?.count ?? 0}
      wishlistCount={wishlist.length}
      referralLink={
        referralCode
          ? `${getBaseURL()}/${countryCode}?ref=${referralCode}`
          : null
      }
      referralText={blocks.account_messages?.referral_text}
    />
  )
}
