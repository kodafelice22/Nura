"use client"

import { useActionState } from "react"

import { subscribeToStockAlert } from "@lib/data/stock-alerts"
import { ProductExtrasBlock } from "@lib/data/home-content"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import InlineText from "@modules/common/components/inline-text"

const DEFAULTS = {
  title: "Me prévenir du retour en stock",
  text: "Laissez votre email : nous vous écrirons une seule fois, dès que ce produit sera de nouveau disponible.",
  cta: "Me prévenir",
  success:
    "C'est noté. Nous vous écrirons dès que ce produit sera de retour en stock.",
  available:
    "Bonne nouvelle : ce produit est de nouveau disponible. Actualisez la page pour l'ajouter à votre panier.",
  consent:
    "Votre email sert uniquement à cette alerte et n'est pas conservé après l'envoi. Consultez notre [politique de confidentialité](/confidentialite).",
}

type StockAlertFormProps = {
  variantId: string
  content?: ProductExtrasBlock | null
}

const StockAlertForm = ({ variantId, content }: StockAlertFormProps) => {
  const [state, formAction] = useActionState(subscribeToStockAlert, {
    success: false,
    error: null,
  })

  if (state.success) {
    return (
      <p
        className="border border-nude bg-bg-alt p-4 text-sm text-brown"
        role="status"
        data-testid="stock-alert-success"
      >
        {state.status === "available"
          ? DEFAULTS.available
          : content?.stock_alert_success || DEFAULTS.success}
      </p>
    )
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-y-3 border border-nude bg-bg-alt p-4"
      data-testid="stock-alert-form"
    >
      <input type="hidden" name="variant_id" value={variantId} />
      <div className="flex flex-col gap-1">
        <p className="text-[11px] uppercase tracking-[0.2em] text-brown">
          {content?.stock_alert_title || DEFAULTS.title}
        </p>
        <p className="text-sm leading-relaxed text-ui-fg-subtle">
          {content?.stock_alert_text || DEFAULTS.text}
        </p>
      </div>
      <div className="flex flex-col gap-2 small:flex-row">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Votre email"
          aria-label="Adresse email"
          className="h-11 w-full border border-nude bg-bg px-3 text-sm text-brown placeholder:text-ui-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          data-testid="stock-alert-email"
        />
        <SubmitButton
          variant="secondary"
          className="h-11 shrink-0"
          data-testid="stock-alert-submit"
        >
          {content?.stock_alert_cta || DEFAULTS.cta}
        </SubmitButton>
      </div>
      <p className="text-[11px] leading-relaxed text-ui-fg-muted">
        <InlineText
          text={content?.stock_alert_consent || DEFAULTS.consent}
          className="underline underline-offset-2"
        />
      </p>
      <ErrorMessage error={state.error} data-testid="stock-alert-error" />
    </form>
  )
}

export default StockAlertForm
