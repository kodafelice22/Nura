import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"

// Label tracking fields are allowed by the backend middleware but missing from the type.
type TrackedFulfillment = HttpTypes.StoreOrderFulfillment & {
  labels?: { tracking_number?: string | null; tracking_url?: string | null }[]
}

// Index of the last step reached for each fulfillment status.
const REACHED_STEP: Record<string, number> = {
  not_fulfilled: 0,
  partially_fulfilled: 1,
  fulfilled: 1,
  partially_shipped: 2,
  shipped: 2,
  partially_delivered: 3,
  delivered: 3,
}

const formatDate = (value?: string | Date | null) =>
  value
    ? new Date(value).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      })
    : null

const earliest = (values: (string | Date | null | undefined)[]) => {
  const times = values
    .filter((value): value is string | Date => Boolean(value))
    .map((value) => new Date(value).getTime())

  return times.length ? new Date(Math.min(...times)) : null
}

const OrderTimeline = ({ order }: { order: HttpTypes.StoreOrder }) => {
  if (order.status === "canceled" || order.fulfillment_status === "canceled") {
    return (
      <div
        className="border border-nude bg-bg-alt px-4 py-3 text-sm text-brown"
        role="status"
        data-testid="order-timeline-canceled"
      >
        Cette commande a été annulée.
      </div>
    )
  }

  const fulfillments = (
    (order.fulfillments ?? []) as TrackedFulfillment[]
  ).filter((fulfillment) => !fulfillment.canceled_at)
  const reached = REACHED_STEP[order.fulfillment_status] ?? 0
  const steps = [
    { label: "Confirmée", date: formatDate(order.created_at) },
    {
      label: "Préparée",
      date: formatDate(earliest(fulfillments.map((f) => f.packed_at))),
    },
    {
      label: "Expédiée",
      date: formatDate(earliest(fulfillments.map((f) => f.shipped_at))),
    },
    {
      label: "Livrée",
      date: formatDate(earliest(fulfillments.map((f) => f.delivered_at))),
    },
  ]
  const trackingLabels =
    reached >= 2
      ? fulfillments
          .flatMap((fulfillment) => fulfillment.labels ?? [])
          .filter((label) => label.tracking_url || label.tracking_number)
      : []

  return (
    <div className="flex flex-col gap-y-4" data-testid="order-timeline">
      <ol aria-label="Suivi de la commande" className="grid grid-cols-4">
        {steps.map((step, index) => {
          const done = index <= reached
          const current = index === reached

          return (
            <li
              key={step.label}
              aria-current={current ? "step" : undefined}
              className="relative flex flex-col items-center gap-y-1 text-center"
            >
              {index > 0 && (
                <span
                  aria-hidden
                  className={clx(
                    "absolute right-1/2 top-[7px] h-px w-full",
                    done ? "bg-brown" : "bg-nude"
                  )}
                />
              )}
              <span
                aria-hidden
                className={clx(
                  "relative z-10 h-[15px] w-[15px] rounded-full border",
                  done ? "border-brown bg-brown" : "border-nude bg-bg-alt",
                  current && "ring-4 ring-gold/25"
                )}
              />
              <span
                className={clx(
                  "mt-1 text-[11px] uppercase tracking-[0.14em] small:text-xs",
                  done ? "font-semibold text-brown" : "text-ui-fg-muted"
                )}
              >
                {step.label}
                <span className="sr-only">
                  {done ? " (étape franchie)" : " (à venir)"}
                </span>
              </span>
              {done && step.date && (
                <span className="text-[11px] text-ui-fg-subtle small:text-xs">
                  {step.date}
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {order.fulfillment_status.startsWith("partially_") && (
        <p className="text-sm text-ui-fg-subtle">
          Une partie de votre commande est encore en cours de traitement.
        </p>
      )}

      {trackingLabels.length > 0 && (
        <ul className="flex flex-col gap-y-1 text-sm text-ui-fg-subtle">
          {trackingLabels.map((label, index) => (
            <li key={label.tracking_url || label.tracking_number || index}>
              {label.tracking_url ? (
                <a
                  href={label.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold underline underline-offset-4 hover:text-brown"
                  data-testid="order-tracking-link"
                >
                  Suivre mon colis
                  {label.tracking_number
                    ? ` (n° ${label.tracking_number})`
                    : ""}
                </a>
              ) : (
                <>
                  Numéro de suivi :{" "}
                  <span className="font-semibold text-brown">
                    {label.tracking_number}
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default OrderTimeline
