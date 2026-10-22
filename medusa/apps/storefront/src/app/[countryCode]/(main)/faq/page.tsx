import { Metadata } from "next"
import { getHomeContent } from "@lib/data/home-content"
import { groupFaqItems } from "@lib/util/faq-groups"

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Questions fréquentes — livraison, retours, paiement et suivi de commande Nura.",
}

const DEFAULT_ITEMS = [
  {
    question: "Quels sont les délais et zones de livraison ?",
    category: "Livraison",
    answer:
      "Nous livrons en France métropolitaine et en Côte d'Ivoire. Le délai indicatif est de 3 à 7 jours ouvrés. Les frais de livraison sont précisés avant la validation de votre commande.",
  },
  {
    question: "Comment suivre ma commande ?",
    category: "Livraison",
    answer:
      "Un email de confirmation vous est envoyé dès la validation de votre commande. Vous pouvez ensuite suivre son statut depuis votre compte, rubrique « Commandes ».",
  },
  {
    question: "Quels moyens de paiement acceptez-vous ?",
    category: "Paiement",
    answer:
      "En Europe, vous pouvez payer par carte bancaire (Stripe). En Côte d'Ivoire, le paiement mobile money (Wave, Orange Money, MTN, Moov, Djamo) est disponible via notre partenaire Jèko.",
  },
  {
    question: "Puis-je retourner un produit ?",
    category: "Retours",
    answer:
      "Vous disposez d'un délai de 14 jours après réception pour exercer votre droit de rétractation. Les produits doivent être retournés neufs, non ouverts et dans leur emballage d'origine. Pour des raisons d'hygiène, les produits descellés (parfums, cosmétiques) ne peuvent pas être retournés.",
  },
  {
    question: "Les produits sont-ils testés sur les animaux ?",
    category: "Produits",
    answer:
      "Non. Conformément à la réglementation européenne, aucun produit cosmétique Nura n'est testé sur les animaux, et nous ne le demandons pas à nos fournisseurs.",
  },
  {
    question: "Comment vous contacter ?",
    category: "Contact",
    answer:
      "Vous pouvez nous écrire ou retrouver toutes nos coordonnées sur la page Contact.",
  },
]

export default async function FaqPage() {
  const { blocks } = await getHomeContent()
  const items = blocks.faq?.items?.length ? blocks.faq.items : DEFAULT_ITEMS
  const groups = groupFaqItems(items)
  const hasCategories = groups.some((group) => group.title)

  return (
    <div className="content-container py-16 small:py-24">
      <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-y-4 mb-14">
        <span className="text-xs uppercase tracking-[0.3em] text-gold">
          Aide
        </span>
        <h1 className="font-serif text-4xl small:text-6xl text-brown">
          Questions fréquentes
        </h1>
      </div>

      {hasCategories && (
        <nav
          aria-label="Catégories de la FAQ"
          className="max-w-2xl mx-auto mb-12 flex flex-wrap justify-center gap-2"
        >
          {groups.map((group, index) => (
            <a
              key={group.title ?? `group-${index}`}
              href={`#faq-${index}`}
              className="inline-flex min-h-11 items-center border border-nude px-4 text-[11px] uppercase tracking-[0.15em] text-brown transition-colors hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              {group.title ?? "Autres questions"}
            </a>
          ))}
        </nav>
      )}

      <div className="max-w-2xl mx-auto flex flex-col gap-y-14">
        {groups.map((group, index) => (
          <div
            key={group.title ?? `group-${index}`}
            id={`faq-${index}`}
            className="flex flex-col gap-y-8 scroll-mt-24"
          >
            {hasCategories && (
              <h2 className="text-xs uppercase tracking-[0.3em] text-gold">
                {group.title ?? "Autres questions"}
              </h2>
            )}
            {group.items.map((item) => (
              <section key={item.question}>
                {hasCategories ? (
                  <h3 className="font-serif text-xl small:text-2xl text-brown mb-3">
                    {item.question}
                  </h3>
                ) : (
                  <h2 className="font-serif text-xl small:text-2xl text-brown mb-3">
                    {item.question}
                  </h2>
                )}
                <p className="text-ui-fg-subtle leading-relaxed">{item.answer}</p>
              </section>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
