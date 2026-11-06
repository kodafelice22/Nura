import { model } from "@medusajs/framework/utils"
import RoutineStep from "./routine-step"

// An editorial "routine": an ordered list of products with how to use each one
// ("Parfumez. Hydratez. Sublimez."), shown on the product pages of the
// products it contains. Draft by default, so nothing is public until an
// administrator publishes it.
const Routine = model
  .define("routine", {
    id: model.id().primaryKey(),
    handle: model.text(),
    title: model.text(),
    intro: model.text().nullable(),
    is_active: model.boolean().default(false),
    steps: model.hasMany(() => RoutineStep, { mappedBy: "routine" }),
  })
  .cascades({ delete: ["steps"] })
  .indexes([
    {
      name: "IDX_routine_handle",
      on: ["handle"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default Routine
