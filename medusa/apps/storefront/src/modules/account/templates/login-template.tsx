import { AccountMessagesBlock } from "@lib/data/home-content"
import Image from "next/image"

import AuthTabs from "@modules/account/components/auth-tabs"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const LoginTemplate = ({ messages }: { messages?: AccountMessagesBlock }) => {
  return (
    <div
      className="grid overflow-hidden border border-nude bg-bg-alt small:grid-cols-2"
      data-testid="login-template"
    >
      <div className="relative h-40 xsmall:h-56 small:h-auto small:min-h-[640px]">
        <Image
          src="/images/editorial.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 900px) 100vw, 50vw"
          className="object-cover"
        />
      </div>

      <div className="flex flex-col justify-center px-6 py-10 small:px-12 small:py-14">
        <AuthTabs messages={messages} />
        <p className="mx-auto mt-10 w-full max-w-md border-t border-nude pt-6 text-center text-sm text-ui-fg-subtle">
          Vous avez commandé sans compte ?{" "}
          <LocalizedClientLink
            href="/suivre-ma-commande"
            className="text-gold underline underline-offset-4 hover:text-brown"
            data-testid="guest-order-tracking-link"
          >
            Suivre ma commande
          </LocalizedClientLink>
        </p>
      </div>
    </div>
  )
}

export default LoginTemplate
