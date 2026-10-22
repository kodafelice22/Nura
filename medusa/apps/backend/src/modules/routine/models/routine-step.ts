import { model } from "@medusajs/framework/utils"
import Routine from "./routine"

const RoutineStep = model
  .define("routine_step", {
    id: model.id().primaryKey(),
    // A Medusa product id. Modules cannot hold foreign keys to each other, so
    // a deleted product is cleaned up by the product.deleted subscriber and
    // filtered out on read.
    product_id: model.text(),
    step_order: model.number(),
    instruction: model.text().nullable(),
    routine: model.belongsTo(() => Routine, { mappedBy: "steps" }),
  })
  .indexes([
    {
      name: "IDX_routine_step_product",
      on: ["product_id"],
      where: "deleted_at IS NULL",
    },
  ])

export default RoutineStep
