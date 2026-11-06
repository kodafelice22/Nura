import { Metadata } from "next"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import OrderLookupForm from "@modules/order/components/order-lookup-form"

export const metadata: Metadata = {
  title: "Suivre ma commande",
  description:
    "Retrouvez votre commande Nura et suivez sa livraison avec votre numéro de commande et votre email.",
}

export default async function TrackOrderPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params

  return (
    <div className="content-container section-y">
      <div className="mx-auto mb-10 flex max-w-lg flex-col items-center gap-4 text-center small:mb-12">
        <span className="eyebrow">Commande</span>
        <h1 className="font-serif text-4xl text-brown small:text-5xl">
          Suivre ma commande
        </h1>
        <p className="text-ui-fg-subtle">
          Le numéro figure dans l’email de confirmation. Saisissez-le avec
          l’adresse email utilisée pour commander.
        </p>
      </div>

      <div className="mx-auto max-w-md border border-nude bg-bg-alt p-6 small:p-10">
        <OrderLookupForm countryCode={countryCode} />
      </div>

      <p className="mx-auto mt-6 max-w-md text-center text-sm text-ui-fg-muted">
        Vous avez un compte ?{" "}
        <LocalizedClientLink
          href="/account/orders"
          className="text-gold underline underline-offset-4 hover:text-brown"
        >
          Retrouvez toutes vos commandes
        </LocalizedClientLink>
        .
      </p>
    </div>
  )
}
