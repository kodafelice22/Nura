"use client"

import { AccountMessagesBlock } from "@lib/data/home-content"
import { requestPasswordReset } from "@lib/data/customer"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useActionState } from "react"

const ForgotPassword = ({ messages }: { messages?: AccountMessagesBlock }) => {
  const [message, formAction] = useActionState(requestPasswordReset, null)

  if (message?.state === "success") {
    return (
      <div
        className="max-w-sm w-full flex flex-col items-center text-center gap-y-4"
        data-testid="forgot-password-success"
      >
        <h1 className="text-large-semi uppercase">
          {messages?.forgot_sent_title || "Vérifiez votre boîte mail"}
        </h1>
        <p className="text-base-regular text-ui-fg-base">
          {messages?.forgot_sent_text ||
            "Si un compte existe avec cette adresse email, un lien de réinitialisation vient de vous être envoyé."}
        </p>
        <LocalizedClientLink
          href="/account"
          className="inline-block py-2 underline"
        >
          Retour à la connexion
        </LocalizedClientLink>
      </div>
    )
  }

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center"
      data-testid="forgot-password-page"
    >
      <h1 className="text-large-semi uppercase mb-6">
        {messages?.forgot_title || "Mot de passe oublié"}
      </h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-8">
        {messages?.forgot_text ||
          "Indiquez votre adresse email, nous vous enverrons un lien pour réinitialiser votre mot de passe."}
      </p>
      <form className="w-full" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            data-testid="email-input"
          />
        </div>
        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="forgot-password-error-message"
        />
        <SubmitButton
          data-testid="request-reset-button"
          className="w-full mt-6"
        >
          Envoyer le lien
        </SubmitButton>
      </form>
      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        <LocalizedClientLink
          href="/account"
          className="inline-block py-2 underline"
        >
          Retour à la connexion
        </LocalizedClientLink>
      </span>
    </div>
  )
}

export default ForgotPassword
