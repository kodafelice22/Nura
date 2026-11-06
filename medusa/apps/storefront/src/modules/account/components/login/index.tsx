import { AccountMessagesBlock } from "@lib/data/home-content"
import { login } from "@lib/data/customer"
import ErrorMessage from "@modules/checkout/components/error-message"
import EmailNotice from "@modules/common/components/email-notice"
import Input from "@modules/common/components/input"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Button } from "@modules/common/components/ui"
import { FormEvent, startTransition, useActionState } from "react"

const Login = ({ messages }: { messages?: AccountMessagesBlock }) => {
  const [message, dispatch, isPending] = useActionState(login, null)

  // Dispatching from onSubmit rather than <form action> keeps the typed email
  // after a wrong password: React 19 resets forms that use an action prop.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => dispatch(formData))
  }

  return (
    <div className="flex w-full flex-col" data-testid="login-page">
      <h1 className="mb-3 font-serif text-3xl text-brown small:text-4xl">
        {messages?.login_title || "Bon retour"}
      </h1>
      <p className="mb-8 text-sm text-ui-fg-subtle">
        {messages?.login_text ||
          "Connectez-vous pour suivre vos commandes et retrouver vos favoris."}
      </p>
      {message?.state === "verification_required" && (
        <div
          className="mb-6 w-full border border-nude bg-bg p-4 text-sm text-brown"
          data-testid="login-verification-message"
        >
          <EmailNotice
            text={
              messages?.verify_sent_text ||
              "Un lien de vérification a été envoyé à {email}. Vérifiez votre email puis connectez-vous."
            }
            email={message.email}
          />
        </div>
      )}
      <form className="w-full" onSubmit={onSubmit}>
        <div className="flex w-full flex-col gap-y-2">
          <Input
            label="Email"
            name="email"
            type="email"
            title="Saisissez une adresse email valide."
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label="Mot de passe"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password-input"
          />
        </div>
        <div className="mt-2 text-right">
          <LocalizedClientLink
            href="/mot-de-passe-oublie"
            className="txt-small text-ui-fg-subtle underline hover:text-ui-fg-base"
          >
            Mot de passe oublié ?
          </LocalizedClientLink>
        </div>
        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="login-error-message"
        />
        <Button
          type="submit"
          isLoading={isPending}
          className="mt-6 w-full"
          data-testid="sign-in-button"
        >
          Se connecter
        </Button>
      </form>
    </div>
  )
}

export default Login
