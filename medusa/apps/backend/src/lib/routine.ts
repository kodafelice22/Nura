import { MedusaError } from "@medusajs/framework/utils"
import { slugify } from "./content"

export const ROUTINE_MIN_STEPS = 2
export const ROUTINE_MAX_STEPS = 8

const PRODUCT_ID_RE = /^prod_[A-Za-z0-9]{1,64}$/

export type RoutineStepInput = {
  product_id?: unknown
  instruction?: unknown
}

export type RoutineInput = {
  title?: unknown
  handle?: unknown
  intro?: unknown
  is_active?: unknown
  steps?: unknown
}

export type NormalizedRoutine = {
  title: string
  handle: string
  intro: string | null
  is_active: boolean
  steps: { product_id: string; step_order: number; instruction: string | null }[]
}

const invalid = (message: string) =>
  new MedusaError(MedusaError.Types.INVALID_DATA, message)

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "")

/**
 * Validates what the admin sends and turns it into what is stored. Step order
 * is the position in the array, so it can never have gaps or duplicates.
 */
export const normalizeRoutineInput = (input: RoutineInput): NormalizedRoutine => {
  const title = text(input.title)

  if (!title) {
    throw invalid("Le titre est requis.")
  }

  if (title.length > 120) {
    throw invalid("Le titre ne doit pas dépasser 120 caractères.")
  }

  const handle = slugify(text(input.handle) || title)

  if (!handle) {
    throw invalid("Impossible de générer une URL à partir de ce titre.")
  }

  const intro = text(input.intro)

  if (intro.length > 500) {
    throw invalid("L'introduction ne doit pas dépasser 500 caractères.")
  }

  if (!Array.isArray(input.steps)) {
    throw invalid("Les étapes sont requises.")
  }

  if (
    input.steps.length < ROUTINE_MIN_STEPS ||
    input.steps.length > ROUTINE_MAX_STEPS
  ) {
    throw invalid(
      `Une routine contient entre ${ROUTINE_MIN_STEPS} et ${ROUTINE_MAX_STEPS} étapes.`
    )
  }

  const seen = new Set<string>()
  const steps = (input.steps as RoutineStepInput[]).map((step, index) => {
    const productId = text(step?.product_id)

    if (!PRODUCT_ID_RE.test(productId)) {
      throw invalid(`Étape ${index + 1} : choisissez un produit.`)
    }

    if (seen.has(productId)) {
      throw invalid(`Étape ${index + 1} : ce produit est déjà dans la routine.`)
    }

    seen.add(productId)

    const instruction = text(step?.instruction)

    if (instruction.length > 500) {
      throw invalid(
        `Étape ${index + 1} : les conseils ne doivent pas dépasser 500 caractères.`
      )
    }

    return {
      product_id: productId,
      step_order: index + 1,
      instruction: instruction || null,
    }
  })

  return {
    title,
    handle,
    intro: intro || null,
    is_active: input.is_active === true,
    steps,
  }
}

export type StoredRoutine = {
  id: string
  handle: string
  title: string
  intro: string | null
  steps: {
    product_id: string
    step_order: number
    instruction: string | null
  }[]
}

export type RoutineProduct = {
  id: string
  title: string
  handle: string
  thumbnail?: string | null
  status?: string | null
}

export type StoreRoutine = {
  id: string
  handle: string
  title: string
  intro: string | null
  steps: {
    order: number
    instruction: string | null
    product: { id: string; title: string; handle: string; thumbnail: string | null }
  }[]
}

/**
 * The public shape of a routine. Steps whose product no longer exists or is
 * not published are dropped and the rest renumbered; a routine left with fewer
 * than two products is not shown at all.
 */
export const toStoreRoutine = (
  routine: StoredRoutine,
  products: Map<string, RoutineProduct>
): StoreRoutine | null => {
  const steps = [...routine.steps]
    .sort((a, b) => a.step_order - b.step_order)
    .flatMap((step) => {
      const product = products.get(step.product_id)

      if (!product || product.status !== "published" || !product.handle) {
        return []
      }

      return [
        {
          instruction: step.instruction,
          product: {
            id: product.id,
            title: product.title,
            handle: product.handle,
            thumbnail: product.thumbnail ?? null,
          },
        },
      ]
    })
    .map((step, index) => ({ order: index + 1, ...step }))

  if (steps.length < ROUTINE_MIN_STEPS) {
    return null
  }

  return {
    id: routine.id,
    handle: routine.handle,
    title: routine.title,
    intro: routine.intro,
    steps,
  }
}
