import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { emitEventStep } from "@medusajs/medusa/core-flows"
import { normalizeRoutineInput, RoutineInput } from "../lib/routine"
import { ROUTINE_MODULE } from "../modules/routine"
import type RoutineModuleService from "../modules/routine/service"

/** Fired whenever a routine changes, so the storefront can drop its cache. */
export const ROUTINES_CHANGED_EVENT = "content.routines.changed"

export type SaveRoutineInput = RoutineInput & { id?: string }

const assertHandleFree = async (
  service: RoutineModuleService,
  handle: string,
  currentId?: string
) => {
  const clash = await service.listRoutines({ handle })

  if (clash.some((routine) => routine.id !== currentId)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `L'URL « ${handle} » est déjà utilisée par une autre routine.`
    )
  }
}

const loadRoutine = (service: RoutineModuleService, id: string) =>
  service.retrieveRoutine(id, { relations: ["steps"] })

const createRoutineStep = createStep(
  "create-routine",
  async (input: SaveRoutineInput, { container }) => {
    const service: RoutineModuleService = container.resolve(ROUTINE_MODULE)
    const data = normalizeRoutineInput(input)

    await assertHandleFree(service, data.handle)

    const { steps, ...fields } = data
    const routine = await service.createRoutineWithSteps(fields, steps)

    return new StepResponse(await loadRoutine(service, routine.id), routine.id)
  },
  async (routineId, { container }) => {
    if (!routineId) {
      return
    }

    const service: RoutineModuleService = container.resolve(ROUTINE_MODULE)
    await service.deleteRoutines([routineId])
  }
)

const updateRoutineStep = createStep(
  "update-routine",
  async (input: SaveRoutineInput, { container }) => {
    const service: RoutineModuleService = container.resolve(ROUTINE_MODULE)

    if (!input.id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Routine introuvable.")
    }

    const previous = await loadRoutine(service, input.id).catch(() => null)

    if (!previous) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Routine introuvable.")
    }

    const data = normalizeRoutineInput(input)

    await assertHandleFree(service, data.handle, input.id)

    const { steps, ...fields } = data
    await service.updateRoutineWithSteps(input.id, fields, steps)

    return new StepResponse(await loadRoutine(service, input.id), {
      id: previous.id,
      handle: previous.handle,
      title: previous.title,
      intro: previous.intro,
      is_active: previous.is_active,
      steps: previous.steps.map((step) => ({
        product_id: step.product_id,
        step_order: step.step_order,
        instruction: step.instruction,
      })),
    })
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }

    const service: RoutineModuleService = container.resolve(ROUTINE_MODULE)
    const { steps, ...fields } = previous

    await service.updateRoutineWithSteps(previous.id, fields, steps)
  }
)

const deleteRoutineStep = createStep(
  "delete-routine",
  async (input: { id: string }, { container }) => {
    const service: RoutineModuleService = container.resolve(ROUTINE_MODULE)
    const existing = await service.listRoutines({ id: input.id })

    if (!existing.length) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Routine introuvable.")
    }

    // Soft delete: the steps go with it (cascade) and can be restored.
    await service.softDeleteRoutines([input.id])

    return new StepResponse({ id: input.id }, input.id)
  },
  async (routineId, { container }) => {
    if (!routineId) {
      return
    }

    const service: RoutineModuleService = container.resolve(ROUTINE_MODULE)
    await service.restoreRoutines([routineId])
  }
)

export const createRoutineWorkflow = createWorkflow(
  "create-routine",
  (input: SaveRoutineInput) => {
    const routine = createRoutineStep(input)
    emitEventStep({ eventName: ROUTINES_CHANGED_EVENT, data: {} })

    return new WorkflowResponse(routine)
  }
)

export const updateRoutineWorkflow = createWorkflow(
  "update-routine",
  (input: SaveRoutineInput) => {
    const routine = updateRoutineStep(input)
    emitEventStep({ eventName: ROUTINES_CHANGED_EVENT, data: {} })

    return new WorkflowResponse(routine)
  }
)

export const deleteRoutineWorkflow = createWorkflow(
  "delete-routine",
  (input: { id: string }) => {
    const deleted = deleteRoutineStep(input)
    emitEventStep({ eventName: ROUTINES_CHANGED_EVENT, data: {} })

    return new WorkflowResponse(deleted)
  }
)
