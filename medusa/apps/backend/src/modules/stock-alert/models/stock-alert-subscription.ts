import { model } from "@medusajs/framework/utils"

// One row per (email, variant): a customer asked to be told once when this
// variant is back in stock. The row is deleted as soon as the email is sent,
// so nothing is retained beyond that single notification.
const StockAlertSubscription = model
  .define("stock_alert_subscription", {
    id: model.id().primaryKey(),
    email: model.text(),
    variant_id: model.text().index("IDX_stock_alert_variant_id"),
    product_id: model.text(),
  })
  .indexes([
    {
      on: ["email", "variant_id"],
      unique: true,
    },
  ])

export default StockAlertSubscription
