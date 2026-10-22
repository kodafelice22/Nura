import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  RoutineProduct,
  StoredRoutine,
  toStoreRoutine,
} from "../../../../../lib/routine"
import { ROUTINE_MODULE } from "../../../../../modules/routine"
import type RoutineModuleService from "../../../../../modules/routine/service"

// GET /store/products/:id/routines
// Active routines that contain this product, with their products. Public and
// read-only; drafts, unpublished products and routines left with fewer than
// two products are never returned.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: RoutineModuleService = req.scope.resolve(ROUTINE_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const containing = await service.listRoutineSteps({
    product_id: req.params.id,
  })
  const routineIds = [...new Set(containing.map((step) => step.routine_id))]

  if (!routineIds.length) {
    return res.status(200).json({ routines: [] })
  }

  const routines = (await service.listRoutines(
    { id: routineIds, is_active: true },
    { relations: ["steps"], order: { created_at: "ASC" } }
  )) as unknown as StoredRoutine[]
  const productIds = [
    ...new Set(routines.flatMap((routine) => routine.steps.map((s) => s.product_id))),
  ]

  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "thumbnail", "status"],
    filters: { id: productIds },
  })
  const products = new Map(
    (data as RoutineProduct[]).map((product) => [product.id, product])
  )

  return res.status(200).json({
    routines: routines
      .map((routine) => toStoreRoutine(routine, products))
      .filter((routine) => routine !== null),
  })
}
