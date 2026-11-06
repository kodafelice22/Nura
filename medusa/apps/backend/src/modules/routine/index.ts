import RoutineModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const ROUTINE_MODULE = "routine"

export default Module(ROUTINE_MODULE, {
  service: RoutineModuleService,
})
