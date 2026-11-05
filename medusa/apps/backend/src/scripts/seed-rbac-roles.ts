import { MedusaContainer } from "@medusajs/framework"
import type {
  CreateRbacPolicyDTO,
  PolicyOperationValue,
  PolicyResourceValue,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createRbacPoliciesWorkflow,
  createRbacRolesWorkflow,
  updateRbacRolesWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Seeds "Admin" and "Manager" roles alongside the core-seeded "Super Admin".
 * Enforcement for the resources referenced here lives in
 * src/api/middlewares.ts — see the comment there for exactly which routes
 * each policy actually gates.
 *
 * Idempotent: safe to re-run (checks for existing roles by name first).
 */
export default async function seedRbacRoles({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existingRoles } = await query.graph({
    entity: "rbac_role",
    fields: ["id", "name"],
    filters: { name: ["Admin", "Manager"] },
  })

  logger.info("Reconciling Admin and Manager RBAC policies...")

  const adminResources: PolicyResourceValue[] = [
    "user",
    "store",
    "api_key",
    "product",
    "order",
    "customer",
    "promotion",
    "pricing",
    "inventory",
    "content",
    "review",
  ]

  // Medusa's core routes check CRUD-verb operations ("create"/"read"/"update"/
  // "delete"), not "write" — and creating/editing a product also touches the
  // inventory_item and price resources under the hood, so Manager needs
  // those too (without delete) to actually be able to save a product.
  const managerResources: PolicyResourceValue[] = [
    "product",
    "order",
    "customer",
    "inventory",
    "inventory_item",
    "price",
  ]
  const managerOperations: PolicyOperationValue[] = [
    "read",
    "create",
    "update",
  ]

  const policyDefinitions: CreateRbacPolicyDTO[] = [
    ...adminResources.map((resource) => ({
      key: `${resource}:*:admin`,
      resource,
      operation: "*" as const,
      name: `Admin — ${resource}`,
    })),
    ...managerResources.flatMap((resource) =>
      managerOperations.map((operation) => ({
        key: `${resource}:${operation}:manager`,
        resource,
        operation,
        name: `Manager — ${resource} (${operation})`,
      }))
    ),
  ]

  const { data: existingPolicies } = await query.graph({
    entity: "rbac_policy",
    fields: ["id", "key"],
    filters: { key: policyDefinitions.map((policy) => policy.key) },
  })
  const existingPolicyKeys = new Set(existingPolicies.map((policy) => policy.key))
  const missingPolicies = policyDefinitions.filter(
    (policy) => !existingPolicyKeys.has(policy.key)
  )

  if (missingPolicies.length) {
    await createRbacPoliciesWorkflow(container).run({
      input: { policies: missingPolicies },
    })
  }

  const { data: policies } = await query.graph({
    entity: "rbac_policy",
    fields: ["id", "key"],
    filters: { key: policyDefinitions.map((policy) => policy.key) },
  })
  const policiesByKey = new Map(policies.map((policy) => [policy.key, policy.id]))
  const adminPolicyIds = adminResources.map(
    (resource) => policiesByKey.get(`${resource}:*:admin`)!
  )
  const managerPolicyIds = managerResources.flatMap((resource) =>
    managerOperations.map(
      (operation) => policiesByKey.get(`${resource}:${operation}:manager`)!
    )
  )

  logger.info("Seeding Admin and Manager RBAC roles...")

  const roles = [
    {
      name: "Admin",
      description:
        "Full operational access (products, orders, customers, promotions, pricing, inventory, users, store settings and content). Cannot manage roles/permissions — reserved for Super Admin.",
      policy_ids: adminPolicyIds,
    },
    {
      name: "Manager",
      description:
        "Day-to-day operations: read/write on products, orders, customers and inventory. No access to users, store settings, API keys, content, reviews, RBAC, or deleting records.",
      policy_ids: managerPolicyIds,
    },
  ]

  for (const role of roles) {
    const existingRole = existingRoles.find((item) => item.name === role.name)

    if (existingRole) {
      await updateRbacRolesWorkflow(container).run({
        input: {
          selector: { id: existingRole.id },
          update: {
            description: role.description,
            policy_ids: role.policy_ids,
          },
        },
      })
    } else {
      await createRbacRolesWorkflow(container).run({
        input: { roles: [role] },
      })
    }
  }

  logger.info("Finished seeding Admin and Manager roles.")
}
