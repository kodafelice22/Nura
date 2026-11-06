"use client"

import { FormEvent, startTransition, useActionState } from "react"
import { AccountMessagesBlock } from "@lib/data/home-content"
import Input from "@modules/common/components/input"
import ErrorMessage from "@modules/checkout/components/error-message"
import EmailNotice from "@modules/common/components/email-notice"
import InlineText from "@modules/common/components/inline-text"
import { Button } from "@modules/common/components/ui"
import { signup } from "@lib/data/customer"

const DEFAULT_CONSENT_TEXT =
  "En créant un compte, vous acceptez la [politique de confidentialité](/confidentialite) et les [conditions générales de vente](/cgv) de Nura."

const Register = ({ messages }: { messages?: AccountMessagesBlock }) => {
  const [message, dispatch, isPending] = useActionState(signup, null)

  // Dispatching from onSubmit rather than <form action> keeps what was typed
  // when sign-up fails: React 19 resets forms that use an action prop.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => dispatch(formData))
  }

  return (
    <div className="flex w-full flex-col" data-testid="register-page">
      <h1 className="mb-3 font-serif text-3xl text-brown small:text-4xl">
        {messages?.register_title || "Rejoindre Nura"}
      </h1>
      <p className="mb-8 text-sm text-ui-fg-subtle">
        {messages?.register_text ||
          "Créez votre compte Nura et profitez d'une expérience d'achat enrichie."}
      </p>
      {message?.state === "verification_required" && (
        <div
          className="mb-6 w-full border border-nude bg-bg p-4 text-sm text-brown"
          data-testid="register-verification-message"
        >
          <EmailNotice
            text={
              messages?.register_verify_text ||
              "Un lien de vérification a été envoyé à {email}. Vérifiez votre boîte de réception puis connectez-vous."
            }
            email={message.email}
          />
        </div>
      )}
      <form className="flex w-full flex-col" onSubmit={onSubmit}>
        <div className="flex w-full flex-col gap-y-2">
          <div className="grid grid-cols-1 gap-2 xsmall:grid-cols-2">
            <Input
              label="Prénom"
              name="first_name"
              required
              autoComplete="given-name"
              data-testid="first-name-input"
            />
            <Input
              label="Nom"
              name="last_name"
              required
              autoComplete="family-name"
              data-testid="last-name-input"
            />
          </div>
          <Input
            label="Email"
            name="email"
            required
            type="email"
            autoComplete="email"
            data-testid="email-input"
          />
          <Input
            label="Téléphone"
            name="phone"
            type="tel"
            autoComplete="tel"
            data-testid="phone-input"
          />
          <Input
            label="Mot de passe"
            name="password"
            required
            type="password"
            autoComplete="new-password"
            data-testid="password-input"
          />
        </div>
        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="register-error"
        />
        <span className="mt-6 text-small-regular text-ui-fg-subtle">
          <InlineText
            text={messages?.register_consent_text || DEFAULT_CONSENT_TEXT}
            className="underline"
          />
        </span>
        <Button
          type="submit"
          isLoading={isPending}
          className="mt-6 w-full"
          data-testid="register-button"
        >
          Créer mon compte
        </Button>
      </form>
    </div>
  )
}

export default Register
