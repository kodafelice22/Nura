import { Radio as RadioGroupOption } from "@headlessui/react"
import { Text, clx } from "@modules/common/components/ui"
import React, { useContext, type JSX } from "react"

import Radio from "@modules/common/components/radio"

import { isManual, jekoWallets } from "@lib/constants"
import SkeletonCardDetails from "@modules/skeletons/components/skeleton-card-details"
import { PaymentElement } from "@stripe/react-stripe-js"
import PaymentTest from "../payment-test"
import { StripeContext } from "../payment-wrapper/stripe-wrapper"

type PaymentContainerProps = {
  paymentProviderId: string
  selectedPaymentOptionId: string | null
  disabled?: boolean
  paymentInfoMap: Record<string, { title: string; icon: JSX.Element }>
  children?: React.ReactNode
}

const PaymentContainer: React.FC<PaymentContainerProps> = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  children,
}) => {
  const isDevelopment = process.env.NODE_ENV === "development"

  return (
    <RadioGroupOption
      key={paymentProviderId}
      value={paymentProviderId}
      disabled={disabled}
      className={clx(
        "flex flex-col gap-y-2 text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
        {
          "border-ui-border-interactive":
            selectedPaymentOptionId === paymentProviderId,
        }
      )}
    >
      <div className="flex items-center justify-between ">
        <div className="flex items-center gap-x-4">
          <Radio checked={selectedPaymentOptionId === paymentProviderId} />
          <Text className="text-base-regular">
            {paymentInfoMap[paymentProviderId]?.title || paymentProviderId}
          </Text>
          {isManual(paymentProviderId) && isDevelopment && (
            <PaymentTest className="hidden small:block" />
          )}
        </div>
        <span className="justify-self-end text-ui-fg-base">
          {paymentInfoMap[paymentProviderId]?.icon}
        </span>
      </div>
      {isManual(paymentProviderId) && isDevelopment && (
        <PaymentTest className="small:hidden text-[11px]" />
      )}
      {children}
    </RadioGroupOption>
  )
}

export default PaymentContainer

export const StripePaymentContainer = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  setError,
  setPaymentComplete,
}: Omit<PaymentContainerProps, "children"> & {
  setError: (error: string | null) => void
  setPaymentComplete: (complete: boolean) => void
}) => {
  const stripeReady = useContext(StripeContext)

  return (
    <PaymentContainer
      paymentProviderId={paymentProviderId}
      selectedPaymentOptionId={selectedPaymentOptionId}
      paymentInfoMap={paymentInfoMap}
      disabled={disabled}
    >
      {selectedPaymentOptionId === paymentProviderId &&
        (stripeReady ? (
          <div className="my-4 transition-all duration-150 ease-in-out">
            <Text className="txt-medium-plus text-ui-fg-base mb-1">
              Saisissez vos informations de paiement :
            </Text>
            <PaymentElement
              options={{ layout: "accordion" }}
              onChange={(e) => {
                setError(null)
                setPaymentComplete(e.complete)
              }}
              // Without a handler Stripe.js reports a failed mount as an
              // unhandled "payment Element loaderror" and the option renders
              // blank with no explanation. Surface it in the checkout's own
              // error slot instead.
              onLoadError={(e) => {
                setPaymentComplete(false)
                setError(
                  e.error?.message ??
                    "Impossible de charger les moyens de paiement."
                )
              }}
            />
          </div>
        ) : (
          <SkeletonCardDetails />
        ))}
    </PaymentContainer>
  )
}

// Jèko requires a wallet before payment creation. The choice remains local
// until the customer confirms the order from the review step.
export const JekoPaymentContainer = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  selectedWallet,
  setSelectedWallet,
  walletPromptText,
}: Omit<PaymentContainerProps, "children"> & {
  selectedWallet: string
  setSelectedWallet: (wallet: string) => void
  walletPromptText?: string
}) => {
  return (
    <PaymentContainer
      paymentProviderId={paymentProviderId}
      selectedPaymentOptionId={selectedPaymentOptionId}
      paymentInfoMap={paymentInfoMap}
      disabled={disabled}
    >
      {selectedPaymentOptionId === paymentProviderId && (
        <div className="my-4 flex flex-col gap-y-3">
          <Text className="txt-medium-plus text-ui-fg-base">
            {walletPromptText || "Choisissez votre moyen de paiement mobile :"}
          </Text>
          <div className="grid grid-cols-2 gap-2">
            {jekoWallets.map((wallet) => (
              <button
                key={wallet.value}
                type="button"
                onClick={() => setSelectedWallet(wallet.value)}
                className={clx(
                  "border border-ui-border-base rounded-rounded py-2 px-3 text-small-regular hover:border-ui-border-interactive",
                  {
                    "border-ui-border-interactive":
                      selectedWallet === wallet.value,
                  }
                )}
                aria-pressed={selectedWallet === wallet.value}
              >
                {wallet.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </PaymentContainer>
  )
}
