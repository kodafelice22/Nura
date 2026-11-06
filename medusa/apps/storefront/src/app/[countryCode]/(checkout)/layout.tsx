import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import { Metadata } from "next"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-full bg-bg-alt relative small:min-h-screen">
      <div className="h-16 bg-bg-alt border-b border-nude">
        <nav className="flex h-full items-center content-container justify-between">
          <LocalizedClientLink
            href="/cart"
            className="text-small-semi text-ui-fg-base flex min-h-11 items-center gap-x-2 uppercase flex-1 basis-0"
            data-testid="back-to-cart-link"
          >
            <ChevronDown className="rotate-90" size={16} />
            <span className="mt-px hidden small:block txt-compact-plus text-ui-fg-subtle hover:text-gold ">
              Retour au panier
            </span>
            <span className="mt-px block small:hidden txt-compact-plus text-ui-fg-subtle hover:text-gold">
              Retour
            </span>
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/"
            className="font-serif text-xl tracking-[0.15em] text-brown hover:text-gold uppercase"
            data-testid="store-link"
          >
            Nura
          </LocalizedClientLink>
          <div className="flex-1 basis-0" />
        </nav>
      </div>
      <main
        id="main-content"
        className="relative"
        data-testid="checkout-container"
      >
        {children}
      </main>
    </div>
  )
}
