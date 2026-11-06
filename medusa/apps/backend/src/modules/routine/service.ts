import type { Context } from "@medusajs/framework/types"
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils"
import Routine from "./models/routine"
import RoutineStep from "./models/routine-step"

type RoutineFields = {
  handle: string
  title: string
  intro: string | null
  is_active: boolean
}

type RoutineStepFields = {
  product_id: string
  step_order: number
  instruction: string | null
}

class RoutineModuleService extends MedusaService({
  Routine,
  RoutineStep,
}) {
  @InjectManager()
  @InjectTransactionManager()
  async createRoutineWithSteps(
    fields: RoutineFields,
    steps: RoutineStepFields[],
    @MedusaContext() sharedContext: Context = {}
  ) {
    const routine = await this.createRoutines(fields, sharedContext)
    await this.createRoutineSteps(
      steps.map((step) => ({ ...step, routine_id: routine.id })),
      sharedContext
    )

    return routine
  }

  @InjectManager()
  @InjectTransactionManager()
  async updateRoutineWithSteps(
    id: string,
    fields: RoutineFields,
    steps: RoutineStepFields[],
    @MedusaContext() sharedContext: Context = {}
  ) {
    const current = await this.listRoutineSteps(
      { routine_id: id },
      {},
      sharedContext
    )

    await this.updateRoutines({ id, ...fields }, sharedContext)

    if (current.length) {
      await this.deleteRoutineSteps(
        current.map((step) => step.id),
        sharedContext
      )
    }

    await this.createRoutineSteps(
      steps.map((step) => ({ ...step, routine_id: id })),
      sharedContext
    )
  }
}

export default RoutineModuleService
