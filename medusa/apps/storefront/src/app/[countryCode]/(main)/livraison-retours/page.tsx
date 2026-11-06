import { Metadata } from "next"

import { getHomeContent } from "@lib/data/home-content"
import { getSiteSettings } from "@lib/data/site-settings"
import PostBody from "@modules/journal/components/post-body"

export const metadata: Metadata = {
  title: "Livraison & retours",
  description:
    "Zones et délais de livraison Nura, suivi de commande, droit de rétractation et conditions de retour.",
}

const DEFAULT_CONTENT = `Tout ce qu'il faut savoir avant et après votre commande.

## Zones et délais

Nous livrons en France métropolitaine et en Côte d'Ivoire. Le délai indicatif est de 3 à 7 jours ouvrés à compter de la validation de votre commande.

## Frais de livraison

Les frais de livraison dépendent de votre destination. Ils sont calculés et affichés avant la validation du paiement, à l'étape Livraison du tunnel de commande.

## Suivi de commande

Un email de confirmation vous est envoyé dès la validation de votre commande. Vous pouvez ensuite en suivre le statut depuis votre compte, rubrique [Commandes](/account/orders).

## Droit de rétractation

Vous disposez de 14 jours après réception pour exercer votre droit de rétractation. Les produits doivent être retournés neufs, non ouverts et dans leur emballage d'origine.

Pour des raisons d'hygiène, les produits descellés — parfums et cosmétiques ouverts — ne peuvent pas être repris. Le remboursement intervient dans les 14 jours suivant la réception du retour, sur le moyen de paiement utilisé lors de la commande.

## Demander un retour

- Écrivez à notre service client en indiquant votre numéro de commande, le produit concerné et le motif du retour.
- Attendez notre confirmation et les instructions d'envoi avant d'expédier le colis.
- Placez le produit non ouvert dans son emballage d'origine et conservez la preuve de dépôt. Les frais de retour restent à votre charge, sauf produit défectueux ou erreur de préparation.

Les conditions complètes figurent dans nos [conditions générales de vente](/cgv).`

export default async function LivraisonRetoursPage() {
  const [{ blocks }, settings] = await Promise.all([
    getHomeContent(),
    getSiteSettings(),
  ])
  const page = blocks.page_livraison_retours

  return (
    <div className="content-container section-y">
      <div className="mx-auto mb-12 flex max-w-xl flex-col items-center gap-4 text-center small:mb-16">
        <span className="eyebrow">Informations pratiques</span>
        <h1 className="font-serif text-4xl text-brown small:text-5xl">
          {page?.title || "Livraison & retours"}
        </h1>
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-y-8">
        <PostBody content={page?.content || DEFAULT_CONTENT} />

        <section className="flex flex-col gap-3 border-t border-nude pt-10">
          <h2 className="font-serif text-2xl text-brown">
            Un colis abîmé, une question ?
          </h2>
          <p className="leading-relaxed text-ui-fg-subtle">
            Écrivez-nous à{" "}
            <a
              href={`mailto:${settings.email}`}
              className="text-gold hover:underline"
            >
              {settings.email}
            </a>{" "}
            ou appelez le service client :
          </p>
          <ul className="flex flex-col gap-1">
            {settings.phones.map((contact) => (
              <li key={contact.tel}>
                <a
                  href={`tel:${contact.tel}`}
                  className="inline-block py-1 text-gold hover:underline"
                >
                  {contact.label} — {contact.display}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
