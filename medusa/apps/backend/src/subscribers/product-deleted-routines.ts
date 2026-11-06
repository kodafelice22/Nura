import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ROUTINE_MODULE } from "../modules/routine"
import type RoutineModuleService from "../modules/routine/service"

// Modules cannot hold foreign keys to each other, so a routine step would keep
// pointing at a product once it is deleted. The public route already ignores
// such steps; this removes them for good. Safe to run twice: the second run
// finds nothing left to delete.
export default async function productDeletedRoutinesHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const service: RoutineModuleService = container.resolve(ROUTINE_MODULE)
  const steps = await service.listRoutineSteps({ product_id: data.id })

  if (steps.length) {
    await service.deleteRoutineSteps(steps.map((step) => step.id))
  }
}

export const config: SubscriberConfig = {
  event: "product.deleted",
}
