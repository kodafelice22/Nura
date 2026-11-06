"use client"

import { clx } from "@modules/common/components/ui"
import { useSearchParams } from "next/navigation"

const steps = [
  { key: "address", label: "Adresse" },
  { key: "delivery", label: "Livraison" },
  { key: "payment", label: "Paiement" },
  { key: "review", label: "Validation" },
]

const CheckoutSteps = () => {
  const searchParams = useSearchParams()
  const current = searchParams.get("step") || "address"
  const currentIndex = Math.max(
    steps.findIndex((step) => step.key === current),
    0
  )

  return (
    <ol
      className="mb-10 grid grid-cols-4 border-b border-nude pb-6"
      aria-label="Étapes de la commande"
    >
      {steps.map((step, index) => (
        <li
          key={step.key}
          className="relative flex min-w-0 justify-center first:justify-start last:justify-end"
        >
          <span
            className={clx(
              "relative z-10 flex min-w-0 flex-col items-center gap-2 bg-bg-alt px-1 text-[11px] uppercase tracking-normal xsmall:flex-row xsmall:px-2 xsmall:text-[11px] xsmall:tracking-[0.16em]",
              index <= currentIndex ? "text-brown" : "text-ui-fg-muted"
            )}
            aria-current={index === currentIndex ? "step" : undefined}
          >
            <span
              className={clx(
                "flex h-6 w-6 items-center justify-center rounded-full border text-[11px]",
                index < currentIndex && "border-gold bg-gold text-bg-alt",
                index === currentIndex && "border-brown text-brown",
                index > currentIndex && "border-nude text-ui-fg-muted"
              )}
            >
              {index + 1}
            </span>
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <span className="absolute left-1/2 right-[-50%] top-3 h-px bg-nude" />
          )}
        </li>
      ))}
    </ol>
  )
}

export default CheckoutSteps
