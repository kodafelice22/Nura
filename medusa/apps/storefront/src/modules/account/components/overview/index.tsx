import { HttpTypes } from "@medusajs/types"

import { convertToLocale } from "@lib/util/money"
import ReferralLink from "@modules/account/components/referral-link"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import OrderTimeline from "@modules/order/components/order-timeline"

type OverviewProps = {
  customer: HttpTypes.StoreCustomer
  latestOrder: HttpTypes.StoreOrder | null
  ordersCount: number
  wishlistCount: number
  referralLink: string | null
  referralText?: string
}

const DEFAULT_REFERRAL_TEXT =
  "Partagez votre lien : dès que la personne que vous invitez passe sa première commande, vous recevez chacun un code de réduction."

const Overview = ({
  customer,
  latestOrder,
  ordersCount,
  wishlistCount,
  referralLink,
  referralText,
}: OverviewProps) => {
  const missingItems = getMissingProfileItems(customer)
  const shortcuts = [
    {
      label: "Commandes",
      href: "/account/orders",
      value: ordersCount,
      hint: "Historique et suivi",
    },
    {
      label: "Adresses",
      href: "/account/addresses",
      value: customer.addresses?.length ?? 0,
      hint: "Enregistrées",
    },
    {
      label: "Favoris",
      href: "/account/wishlist",
      value: wishlistCount,
      hint: "Produits sauvegardés",
    },
    {
      label: "Parrainage",
      href: "/account/parrainage",
      hint: "Invitez vos proches",
    },
  ]

  return (
    <div className="flex flex-col gap-10" data-testid="overview-page-wrapper">
      {latestOrder ? (
        <section
          aria-labelledby="latest-order-title"
          className="border border-nude bg-bg-alt p-6 small:p-8"
          data-testid="latest-order"
        >
          <div className="mb-8 flex flex-col gap-4 xsmall:flex-row xsmall:items-start xsmall:justify-between">
            <div className="flex flex-col gap-2">
              <span className="eyebrow">Dernière commande</span>
              <h2
                id="latest-order-title"
                className="font-serif text-2xl text-brown"
              >
                Commande n°{latestOrder.display_id}
              </h2>
              <p className="text-sm text-ui-fg-subtle">
                {new Date(latestOrder.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                ·{" "}
                {convertToLocale({
                  amount: latestOrder.total,
                  currency_code: latestOrder.currency_code,
                })}
              </p>
            </div>
            <LocalizedClientLink
              href={`/account/orders/details/${latestOrder.id}`}
              className="link-underline self-start text-[11px] uppercase tracking-[0.2em] text-brown/70 hover:text-brown"
              data-testid="latest-order-link"
            >
              Voir le détail
            </LocalizedClientLink>
          </div>
          <OrderTimeline order={latestOrder} />
        </section>
      ) : (
        <section
          className="flex flex-col items-start gap-3 border border-nude bg-bg-alt p-6 small:p-8"
          data-testid="no-orders-message"
        >
          <span className="eyebrow">Bienvenue</span>
          <h2 className="font-serif text-2xl text-brown">
            Votre première commande vous attend
          </h2>
          <p className="text-sm text-ui-fg-subtle">
            Parfums, soins du corps et coffrets : vous suivrez ici chaque
            commande, de la confirmation à la livraison.
          </p>
          <LocalizedClientLink
            href="/store"
            className="contrast-btn mt-3 text-[11px] uppercase tracking-[0.2em]"
          >
            Découvrir la boutique
          </LocalizedClientLink>
        </section>
      )}

      <nav aria-label="Raccourcis du compte">
        <ul className="grid grid-cols-2 gap-4 small:grid-cols-4">
          {shortcuts.map((shortcut) => (
            <li key={shortcut.href}>
              <LocalizedClientLink
                href={shortcut.href}
                className="flex h-full flex-col gap-3 border border-nude p-5 transition-colors hover:border-brown"
                data-testid={`shortcut-${shortcut.href.split("/").pop()}`}
              >
                <span className="text-[11px] uppercase tracking-[0.2em] text-brown/70">
                  {shortcut.label}
                </span>
                {shortcut.value !== undefined && (
                  <span className="font-serif text-3xl leading-none text-brown">
                    {shortcut.value}
                  </span>
                )}
                <span className="mt-auto text-xs text-ui-fg-subtle">
                  {shortcut.hint}
                </span>
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      </nav>

      {(missingItems.length > 0 || referralLink) && (
        <div className="flex flex-col gap-10">
          {missingItems.length > 0 && (
            <section
              aria-labelledby="profile-todo-title"
              data-testid="profile-todo"
            >
              <h2 id="profile-todo-title" className="eyebrow">
                Complétez votre profil
              </h2>
              <ul className="mt-4 divide-y divide-nude border-y border-nude">
                {missingItems.map((item) => (
                  <li key={item.label}>
                    <LocalizedClientLink
                      href={item.href}
                      className="flex items-center justify-between gap-4 py-4 text-sm text-brown transition-colors hover:text-gold"
                    >
                      {item.label}
                      <ChevronDown
                        className="shrink-0 -rotate-90"
                        aria-hidden
                      />
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {referralLink && (
            <section
              aria-labelledby="referral-title"
              className="flex flex-col gap-3"
              data-testid="referral-card"
            >
              <h2 id="referral-title" className="eyebrow">
                Parrainage
              </h2>
              <p className="font-serif text-2xl text-brown">
                Offrez Nura à vos proches
              </p>
              <p className="mb-2 text-sm text-ui-fg-subtle">
                {referralText || DEFAULT_REFERRAL_TEXT}
              </p>
              <ReferralLink link={referralLink} />
            </section>
          )}
        </div>
      )}
    </div>
  )
}

const getMissingProfileItems = (customer: HttpTypes.StoreCustomer) =>
  [
    !(customer.first_name && customer.last_name) && {
      label: "Indiquez vos nom et prénom",
      href: "/account/profile",
    },
    !customer.phone && {
      label: "Ajoutez votre numéro de téléphone",
      href: "/account/profile",
    },
    !customer.addresses?.length && {
      label: "Ajoutez une adresse de livraison",
      href: "/account/addresses",
    },
  ].filter((item): item is { label: string; href: string } => Boolean(item))

export default Overview
