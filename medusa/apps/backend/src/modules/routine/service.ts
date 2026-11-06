import { MedusaService } from "@medusajs/framework/utils"
import Routine from "./models/routine"
import RoutineStep from "./models/routine-step"

class RoutineModuleService extends MedusaService({
  Routine,
  RoutineStep,
}) {}

export default RoutineModuleService
