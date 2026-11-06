import StockAlertModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const STOCK_ALERT_MODULE = "stockAlert"

export default Module(STOCK_ALERT_MODULE, {
  service: StockAlertModuleService,
})
