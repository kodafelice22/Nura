import { MedusaService } from "@medusajs/framework/utils"
import StockAlertSubscription from "./models/stock-alert-subscription"

class StockAlertModuleService extends MedusaService({
  StockAlertSubscription,
}) {}

export default StockAlertModuleService
