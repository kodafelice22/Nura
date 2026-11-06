# Quickstart: Validate and Publish the Authentic Nura Catalogue

## Safety Rules

- Run the first validation and publication in a non-production environment.
- Never run `seed-nura.ts` for this workflow.
- Never set the placeholder-image override for a real catalogue release.
- Do not publish until the Nura business owner has approved the manifest and every packshot.
- A successful command is insufficient: counts and shopper-visible content must reconcile.

## Prerequisites

1. Backend dependencies and database are available.
2. The manifest validates against `contracts/catalog-manifest.schema.json`.
3. All referenced sales channels, shipping profiles, stock locations and currencies exist.
4. Media URLs are public HTTPS images owned or licensed by Nura.
5. The operator identity is recorded in `NURA_CATALOG_OPERATOR`.

Production is currently blocked because the authoritative manifest and real packshots have not been supplied.

## 1. Run Automated Checks

From the repository root:

```sh
npm run typecheck
npm run lint
npm run test
```

Expected result: all existing checks and the new catalogue-import tests pass.

## 2. Validate Without Mutation

From `apps/backend`:

```sh
NURA_CATALOG_MODE=validate \
NURA_CATALOG_MANIFEST=/absolute/path/to/catalog.json \
NURA_CATALOG_OPERATOR=operator@example.com \
NURA_CATALOG_MEDIA_HOSTS="${NURA_CATALOG_MEDIA_HOSTS:?set approved media hosts}" \
MEDUSA_FF_RBAC=true \
npx medusa exec ./src/scripts/import-real-catalog.ts
```

Expected result:

- Exit code `0` only when every record is accepted.
- The operator resolves to an active Medusa admin user whose effective RBAC policies grant both `product:update` and `inventory:update`; missing identity, disabled RBAC or insufficient policy fails before manifest processing.
- A JSON report conforming to `contracts/import-report.schema.json`.
- `mode` is `validate`, `status` is `validated`, rejected count is zero and catalogue data is unchanged.
- Any placeholder host, duplicate identity, missing value or inaccessible media returns a non-zero exit and actionable errors.

## 3. Publish in Non-Production

Use the exact manifest that passed validation:

```sh
NURA_CATALOG_MODE=publish \
NURA_CATALOG_MANIFEST=/absolute/path/to/catalog.json \
NURA_CATALOG_OPERATOR=operator@example.com \
NURA_CATALOG_MEDIA_HOSTS="${NURA_CATALOG_MEDIA_HOSTS:?set approved media hosts}" \
MEDUSA_FF_RBAC=true \
npx medusa exec ./src/scripts/import-real-catalog.ts
```

Expected result:

- The report fingerprint matches the validation fingerprint.
- Submitted equals accepted; rejected is zero.
- Created, updated, unpublished and unchanged totals reconcile with the approved batch.
- No product is shopper-visible before the release reaches `published`.

## 4. Verify Business Outcomes

1. Compare the report's active product and variant counts with the approved manifest.
2. Browse every storefront catalogue page and confirm the last approved product is reachable.
3. Open at least one product per category and verify title, description, variants, prices, availability and images.
4. Confirm a zero-stock fixture displays unavailable without invented quantity.
5. Confirm no demo handle, placeholder copy or Unsplash URL is returned.
6. Re-run the same publish command and confirm all source records are unchanged with no duplicate entities.

Expected result: all checks satisfy SC-001 through SC-007 in `spec.md`.

## 5. Exercise Rollback in Non-Production

Use the published release ID from the report:

```sh
NURA_CATALOG_MODE=rollback \
NURA_CATALOG_RELEASE_ID=catrel_example \
NURA_CATALOG_OPERATOR=operator@example.com \
MEDUSA_FF_RBAC=true \
npx medusa exec ./src/scripts/import-real-catalog.ts
```

Expected result:

- The preceding release becomes shopper-visible.
- Counts and sampled business values match the preceding release.
- The rollback and reversed release remain in the audit history.
- Recovery and verification complete within 15 minutes.

## 6. Production Gate

Production publication is permitted only when all conditions are true:

- The final manifest and packshots are supplied and approved by Nura.
- Validation returns zero rejected records.
- Non-production publish, idempotent retry and rollback pass.
- Full storefront reconciliation passes beyond the first 100 products.
- The current production backup and application rollback path are verified.
- The exact manifest fingerprint and operator approval are recorded.

Publication is a separate, explicit operation. A code deployment must not automatically import catalogue data.
