import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { ROUTINE_MODULE } from "../../../../modules/routine"
import type RoutineModuleService from "../../../../modules/routine/service"
import {
  deleteRoutineWorkflow,
  SaveRoutineInput,
  updateRoutineWorkflow,
} from "../../../../workflows/manage-routine"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: RoutineModuleService = req.scope.resolve(ROUTINE_MODULE)
  const [routine] = await service.listRoutines(
    { id: req.params.id },
    { relations: ["steps"] }
  )

  if (!routine) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Routine introuvable.")
  }

  return res.status(200).json({ routine })
}

export async function POST(
  req: MedusaRequest<SaveRoutineInput>,
  res: MedusaResponse
) {
  const { result } = await updateRoutineWorkflow(req.scope).run({
    input: { ...(req.body ?? {}), id: req.params.id },
  })

  return res.status(200).json({ routine: result })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  await deleteRoutineWorkflow(req.scope).run({ input: { id: req.params.id } })

  return res
    .status(200)
    .json({ id: req.params.id, object: "routine", deleted: true })
}
