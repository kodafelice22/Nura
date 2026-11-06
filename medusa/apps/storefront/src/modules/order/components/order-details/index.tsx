import { OrderMessagesBlock } from "@lib/data/home-content"
import { HttpTypes } from "@medusajs/types"
import { Text } from "@modules/common/components/ui"
import OrderTimeline from "@modules/order/components/order-timeline"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
  messages?: OrderMessagesBlock
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  not_paid: "Non payée",
  awaiting: "En attente",
  captured: "Payée",
  partially_refunded: "Partiellement remboursée",
  refunded: "Remboursée",
  canceled: "Annulée",
  requires_action: "Action requise",
}

const DEFAULT_CONFIRMATION_TEXT =
  "Les détails de confirmation de votre commande ont été envoyés à {email}."

const OrderDetails = ({ order, showStatus, messages }: OrderDetailsProps) => {
  const formatStatus = (str: string, labels: Record<string, string>) => {
    if (labels[str]) {
      return labels[str]
    }

    const formatted = str.split("_").join(" ")

    return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
  }

  const [before, after] = (
    messages?.confirmation_email_text || DEFAULT_CONFIRMATION_TEXT
  ).split("{email}")

  return (
    <div>
      <Text>
        {before}
        <span
          className="text-ui-fg-medium-plus font-semibold"
          data-testid="order-email"
        >
          {order.email}
        </span>
        {after ?? ""}
      </Text>
      <Text className="mt-2">
        Date de commande :{" "}
        <span data-testid="order-date">
          {new Date(order.created_at).toLocaleDateString("fr-FR")}
        </span>
      </Text>
      <Text className="mt-2 text-ui-fg-interactive">
        N° de commande : <span data-testid="order-id">{order.display_id}</span>
      </Text>

      {showStatus && (
        <>
          <div className="mt-6">
            <OrderTimeline order={order} />
          </div>
          <Text className="mt-4 text-compact-small">
            Statut du paiement :{" "}
            <span
              className="text-ui-fg-subtle "
              data-testid="order-payment-status"
            >
              {formatStatus(order.payment_status, PAYMENT_STATUS_LABELS)}
            </span>
          </Text>
        </>
      )}
    </div>
  )
}

export default OrderDetails
