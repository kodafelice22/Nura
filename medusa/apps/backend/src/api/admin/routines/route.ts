import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ROUTINE_MODULE } from "../../../modules/routine"
import type RoutineModuleService from "../../../modules/routine/service"
import {
  createRoutineWorkflow,
  SaveRoutineInput,
} from "../../../workflows/manage-routine"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: RoutineModuleService = req.scope.resolve(ROUTINE_MODULE)
  const routines = await service.listRoutines(
    {},
    { relations: ["steps"], order: { created_at: "DESC" } }
  )

  return res.status(200).json({ routines, count: routines.length })
}

export async function POST(
  req: MedusaRequest<SaveRoutineInput>,
  res: MedusaResponse
) {
  const { result } = await createRoutineWorkflow(req.scope).run({
    input: req.body ?? {},
  })

  return res.status(200).json({ routine: result })
}
