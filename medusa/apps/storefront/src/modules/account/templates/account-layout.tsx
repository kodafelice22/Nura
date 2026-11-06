import React from "react"

import { getHomeContent } from "@lib/data/home-content"
import { getSiteSettings } from "@lib/data/site-settings"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import AccountNav from "../components/account-nav"
import { HttpTypes } from "@medusajs/types"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout = async ({ customer, children }: AccountLayoutProps) => {
  const [siteSettings, { blocks }] = await Promise.all([
    getSiteSettings(),
    getHomeContent(),
  ])
  const messages = blocks.account_messages

  return (
    <div
      className="content-container py-10 small:py-16"
      data-testid="account-page"
    >
      {customer && (
        <div className="mb-10 flex flex-col gap-3 small:mb-14">
          <span className="eyebrow">Mon compte</span>
          <h1
            className="font-serif text-4xl text-brown small:text-5xl"
            data-testid="welcome-message"
            data-value={customer.first_name}
          >
            Bonjour {customer.first_name}
          </h1>
          <p
            className="text-sm text-ui-fg-subtle"
            data-testid="customer-email"
            data-value={customer.email}
          >
            {customer.email}
          </p>
        </div>
      )}

      <div
        className={
          customer
            ? "grid grid-cols-1 gap-10 small:grid-cols-[220px_1fr] small:gap-16"
            : "mx-auto max-w-5xl"
        }
      >
        {customer && <AccountNav customer={customer} />}
        <div className="min-w-0 flex-1">{children}</div>
      </div>

      <div className="mt-16 flex flex-col gap-6 border-t border-nude pt-10 small:flex-row small:items-end small:justify-between">
        <div className="flex flex-col gap-2">
          <h3 className="font-serif text-2xl text-brown">Une question ?</h3>
          <p className="text-sm text-ui-fg-subtle">
            {messages?.sla_text || "Notre équipe vous répond sous 24 à 48 h."}
          </p>
          <div className="flex flex-wrap gap-x-4 text-sm">
            {siteSettings.phones.map((contact) => (
              <a
                key={contact.tel}
                href={`tel:${contact.tel}`}
                className="inline-block py-1 text-gold hover:text-brown"
              >
                {contact.label} — {contact.display}
              </a>
            ))}
          </div>
        </div>
        <LocalizedClientLink
          href="/contact"
          className="link-underline self-start text-[11px] uppercase tracking-[0.2em] text-brown/70 hover:text-brown"
        >
          Nous contacter
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default AccountLayout
