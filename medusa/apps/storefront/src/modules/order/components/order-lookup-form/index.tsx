"use client"

import { useActionState } from "react"

import { lookupOrder } from "@lib/data/orders"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"

const OrderLookupForm = ({ countryCode }: { countryCode: string }) => {
  const [state, formAction] = useActionState(lookupOrder, { error: null })

  return (
    <form action={formAction} className="flex flex-col gap-y-4">
      <input type="hidden" name="country_code" value={countryCode} />
      <Input
        label="N° de commande"
        name="order_number"
        required
        inputMode="numeric"
        autoComplete="off"
        data-testid="order-lookup-number-input"
      />
      <Input
        label="Email utilisé pour la commande"
        name="email"
        type="email"
        required
        autoComplete="email"
        data-testid="order-lookup-email-input"
      />
      <ErrorMessage error={state.error} data-testid="order-lookup-error" />
      <SubmitButton className="w-full" data-testid="order-lookup-submit">
        Voir ma commande
      </SubmitButton>
    </form>
  )
}

export default OrderLookupForm
