"use client"

import { SitePhone } from "@lib/data/site-settings"
import { useEffect, useState } from "react"

type Contact = {
  number: string
  label: string
}

const DEFAULT_MESSAGE = "Bonjour, j'ai une question à propos d'un produit Nura."

type WhatsappButtonProps = {
  phones: SitePhone[]
  message?: string
}

const WhatsAppGlyph = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.44.79 3.06 1.2 4.76 1.2h.01c5.46 0 9.91-4.45 9.91-9.91C21.93 6.45 17.5 2 12.04 2zm5.82 14.09c-.24.68-1.4 1.32-1.93 1.4-.52.08-1.09.11-3.14-.65-2.64-1-4.35-3.7-4.48-3.87-.13-.17-1.07-1.42-1.07-2.71 0-1.29.68-1.93.92-2.19.24-.26.52-.32.7-.32.17 0 .35 0 .5.01.16.01.38-.06.6.45.24.55.79 1.9.86 2.04.07.14.11.3.02.48-.09.18-.14.29-.27.45-.14.16-.29.36-.41.48-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.93 1.23 2.21 1.37.28.14.44.12.6-.07.16-.19.68-.79.86-1.06.18-.27.36-.22.6-.13.24.09 1.54.73 1.8.86.26.13.44.19.5.3.06.11.06.62-.18 1.3z" />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6" aria-hidden="true">
    <path d="M6.225 4.811a1 1 0 0 0-1.414 1.414L10.586 12l-5.775 5.775a1 1 0 1 0 1.414 1.414L12 13.414l5.775 5.775a1 1 0 1 0 1.414-1.414L13.414 12l5.775-5.775a1 1 0 0 0-1.414-1.414L12 10.586 6.225 4.811z" />
  </svg>
)

const buildHref = (number: string, message: string) =>
  `https://wa.me/${number.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
    message
  )}`

const WhatsappButton = ({ phones, message }: WhatsappButtonProps) => {
  const CONTACTS: Contact[] = phones
    .filter((phone) => Boolean(phone.tel))
    .map((phone) => ({
      number: phone.tel,
      label: `Service client ${phone.label}`,
    }))
  const text = message || DEFAULT_MESSAGE
  const [open, setOpen] = useState(false)
  const [covering, setCovering] = useState(false)

  useEffect(() => {
    const updateCovering = () => {
      const footer = document.querySelector("footer")?.getBoundingClientRect()
      const overFooter =
        !!footer && footer.top < window.innerHeight && footer.bottom > 0
      // On mobile a block marked data-floating-clear (the home hero) ends with
      // its calls to action, right where the button sits.
      const overActions =
        window.innerWidth < 900 &&
        Array.from(document.querySelectorAll("[data-floating-clear]")).some(
          (element) => {
            const bounds = element.getBoundingClientRect()
            return (
              bounds.bottom > window.innerHeight - 96 &&
              bounds.top < window.innerHeight
            )
          }
        )
      setCovering(overFooter || overActions)
    }

    updateCovering()
    window.addEventListener("scroll", updateCovering, { passive: true })
    window.addEventListener("resize", updateCovering)

    return () => {
      window.removeEventListener("scroll", updateCovering)
      window.removeEventListener("resize", updateCovering)
    }
  }, [])

  if (CONTACTS.length === 0) {
    return null
  }

  if (covering) {
    return null
  }

  if (CONTACTS.length === 1) {
    const contact = CONTACTS[0]
    return (
      <a
        href={buildHref(contact.number, text)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Discuter avec nous sur WhatsApp — ${contact.label}`}
        className="fixed bottom-6 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition-[bottom,transform] hover:scale-105 xsmall:right-6 [.has-cart-bar_&]:bottom-28 [.has-product-bar_&]:bottom-32 small:[.has-cart-bar_&]:bottom-6 small:[.has-product-bar_&]:bottom-6"
      >
        <WhatsAppGlyph className="w-7 h-7 text-white" />
      </a>
    )
  }

  return (
    <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end gap-3 transition-[bottom] xsmall:right-6 [.has-cart-bar_&]:bottom-28 [.has-product-bar_&]:bottom-32 small:[.has-cart-bar_&]:bottom-6 small:[.has-product-bar_&]:bottom-6">
      {open && (
        <ul className="flex flex-col gap-2">
          {CONTACTS.map((contact) => (
            <li key={contact.number}>
              <a
                href={buildHref(contact.number, text)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-bg-alt border border-nude rounded-full pl-5 pr-3 py-2 shadow-lg text-sm text-brown hover:border-gold transition-colors"
              >
                <WhatsAppGlyph className="w-5 h-5 text-[#25D366]" />
                {contact.label}
              </a>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Discuter avec nous sur WhatsApp"
        aria-expanded={open}
        className="flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] shadow-lg hover:scale-105 transition-transform"
      >
        {open ? (
          <CloseIcon />
        ) : (
          <WhatsAppGlyph className="w-7 h-7 text-white" />
        )}
      </button>
    </div>
  )
}

export default WhatsappButton
