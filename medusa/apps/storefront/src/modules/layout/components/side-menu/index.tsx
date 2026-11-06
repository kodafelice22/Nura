"use client"

import { Dialog, DialogPanel, DialogTitle, Transition } from "@headlessui/react"
import { SiteSettings } from "@lib/data/site-settings"
import useToggleState from "@lib/hooks/use-toggle-state"
import { ArrowRightMini, XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { MenuCategory } from "@modules/layout/components/desktop-menu"
import { Text, clx } from "@modules/common/components/ui"
import { Fragment, KeyboardEvent, useEffect, useRef, useState } from "react"
import CountrySelect from "../country-select"
import LanguageSelect from "../language-select"
import { Locale } from "@lib/data/locales"

const SECONDARY_LINKS = {
  "À propos": "/a-propos",
  Journal: "/journal",
  FAQ: "/faq",
  Contact: "/contact",
  "Suivre ma commande": "/suivre-ma-commande",
  Compte: "/account",
}

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  locales: Locale[] | null
  currentLocale: string | null
  categories: MenuCategory[]
  siteSettings: SiteSettings
}

const SideMenu = ({
  regions,
  locales,
  currentLocale,
  categories,
  siteSettings,
}: SideMenuProps) => {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const countryToggleState = useToggleState()
  const languageToggleState = useToggleState()
  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) {
      return
    }

    const portalRoot = document.getElementById("headlessui-portal-root")
    const backgroundRoots = Array.from(document.body.children).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element !== portalRoot
    )
    const previousInert = backgroundRoots.map((element) => element.inert)

    backgroundRoots.forEach((element) => {
      element.inert = true
    })

    return () => {
      backgroundRoots.forEach((element, index) => {
        element.inert = previousInert[index]
      })
    }
  }, [open])

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      close()
      return
    }

    if (event.key !== "Tab" || !panelRef.current) {
      return
    }

    const focusable = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => element.getClientRects().length > 0)

    const first = focusable[0]
    const last = focusable.at(-1)
    const activeElement = document.activeElement

    if (event.shiftKey && activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  return (
    <div className="h-full">
      <div className="flex items-center h-full">
        <button
          type="button"
          data-testid="nav-menu-button"
          aria-label="Ouvrir le menu"
          onClick={() => setOpen(true)}
          className="relative flex h-full min-w-11 items-center justify-center gap-x-2 text-brown focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
        >
          <span className="flex flex-col gap-[5px]" aria-hidden="true">
            <span className="block h-px w-5 bg-current" />
            <span className="block h-px w-5 bg-current" />
            <span className="block h-px w-5 bg-current" />
          </span>
        </button>

        <Transition show={open} as={Fragment}>
          <Dialog open={open} onClose={close} className="relative z-[60]">
            <div
              className="fixed inset-0 bg-ink/30"
              aria-hidden="true"
              data-testid="side-menu-backdrop"
            />
            <DialogPanel
              ref={panelRef}
              onKeyDown={handleDialogKeyDown}
              className="fixed left-0 top-0 z-[61] flex h-dvh w-full flex-col border-r border-nude bg-bg-alt transition duration-200 data-closed:-translate-x-4 data-closed:opacity-0 xsmall:w-[380px]"
            >
              <DialogTitle className="sr-only">Menu principal</DialogTitle>
              <div
                data-testid="nav-menu-popup"
                className="flex h-full flex-col justify-between overflow-x-hidden overflow-y-auto p-6 pb-10"
              >
                <div className="flex flex-col gap-y-8">
                  <div className="flex justify-end" id="xmark">
                    <button
                      autoFocus
                      data-testid="close-menu-button"
                      onClick={close}
                      aria-label="Fermer le menu"
                      className="flex h-11 w-11 items-center justify-center text-brown hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      <XMark />
                    </button>
                  </div>

                  <ul className="flex flex-col gap-y-4">
                    {categories.map((category) => (
                      <li key={category.id}>
                        <LocalizedClientLink
                          href={`/categories/${category.handle}`}
                          className="font-serif text-3xl text-brown hover:text-gold transition-colors"
                          onClick={close}
                        >
                          {category.name}
                        </LocalizedClientLink>
                        {category.children.length > 0 && (
                          <ul className="mt-2 ml-1 flex flex-col gap-y-2 border-l border-nude pl-4">
                            {category.children.map((child) => (
                              <li key={child.id}>
                                <LocalizedClientLink
                                  href={`/categories/${category.handle}/${child.handle}`}
                                  className="txt-small text-ui-fg-subtle hover:text-gold"
                                  onClick={close}
                                >
                                  {child.name}
                                </LocalizedClientLink>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                    <li>
                      <LocalizedClientLink
                        href="/collections"
                        className="font-serif text-3xl text-brown hover:text-gold transition-colors"
                        onClick={close}
                        data-testid="collections-link"
                      >
                        Collections
                      </LocalizedClientLink>
                    </li>
                    <li>
                      <LocalizedClientLink
                        href="/store"
                        className="font-serif text-3xl text-brown hover:text-gold transition-colors"
                        onClick={close}
                        data-testid="boutique-link"
                      >
                        Tout voir
                      </LocalizedClientLink>
                    </li>
                  </ul>

                  <ul className="flex flex-col gap-y-3 border-t border-nude pt-6">
                    {Object.entries(SECONDARY_LINKS).map(([name, href]) => (
                      <li key={name}>
                        <LocalizedClientLink
                          href={href}
                          className="text-xs uppercase tracking-[0.2em] text-brown/70 hover:text-brown"
                          onClick={close}
                          data-testid={`${name.toLowerCase()}-link`}
                        >
                          {name}
                        </LocalizedClientLink>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-y-5 border-t border-nude pt-6 mt-10">
                  <div className="flex flex-col gap-y-2">
                    <span className="eyebrow">Service client</span>
                    {siteSettings.phones.map((contact) => (
                      <a
                        key={contact.tel}
                        href={`tel:${contact.tel}`}
                        className="txt-small text-ui-fg-subtle hover:text-gold"
                      >
                        {contact.label} : {contact.display}
                      </a>
                    ))}
                    {siteSettings.email && (
                      <a
                        href={`mailto:${siteSettings.email}`}
                        className="txt-small text-ui-fg-subtle hover:text-gold"
                      >
                        {siteSettings.email}
                      </a>
                    )}
                  </div>

                  {!!locales?.length && (
                    <div
                      className="flex justify-between text-brown"
                      onMouseEnter={languageToggleState.open}
                      onMouseLeave={languageToggleState.close}
                    >
                      <LanguageSelect
                        toggleState={languageToggleState}
                        locales={locales}
                        currentLocale={currentLocale}
                      />
                      <ArrowRightMini
                        className={clx(
                          "transition-transform duration-150",
                          languageToggleState.state ? "-rotate-90" : ""
                        )}
                      />
                    </div>
                  )}
                  <div
                    className="flex justify-between text-brown"
                    onMouseEnter={countryToggleState.open}
                    onMouseLeave={countryToggleState.close}
                  >
                    {regions && (
                      <CountrySelect
                        toggleState={countryToggleState}
                        regions={regions}
                      />
                    )}
                    <ArrowRightMini
                      className={clx(
                        "transition-transform duration-150",
                        countryToggleState.state ? "-rotate-90" : ""
                      )}
                    />
                  </div>
                  <Text className="txt-compact-small text-ui-fg-muted">
                    © {new Date().getFullYear()} Nura
                  </Text>
                </div>
              </div>
            </DialogPanel>
          </Dialog>
        </Transition>
      </div>
    </div>
  )
}

export default SideMenu
