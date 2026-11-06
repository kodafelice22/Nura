# Research: Publish Authentic Nura Catalogue

## Decision 1: Use a versioned JSON manifest

**Decision**: Accept one UTF-8 JSON manifest conforming to `contracts/catalog-manifest.schema.json`.

**Rationale**: Products contain nested variants, prices, multi-location inventory, taxonomy and media. JSON preserves these relationships without adding a parser dependency. It also supports deterministic canonicalization and fingerprinting.

**Alternatives considered**:

- CSV: rejected because nested variants and media require multiple joined files and create partial-file ambiguity.
- Direct spreadsheet integration: rejected because it adds external credentials and availability risk before the import contract is stable.
- Hard-coded TypeScript seed: rejected because it mixes business data with deployable code and enabled placeholder content.

## Decision 2: Validate before any mutation

**Decision**: Parse the contract with the existing Zod dependency, perform cross-record checks, verify media accessibility with bounded HTTPS requests, and produce the report before invoking mutation workflows.

**Rationale**: Schema validation alone cannot detect duplicate identities, missing taxonomy references, multiple primary images, placeholder hosts or inaccessible media. A pure validation stage is independently testable and protects the live catalogue.

**Alternatives considered**:

- Validate each product during creation: rejected because later failures could expose a partial batch.
- Trust business approval without runtime validation: rejected because malformed exports and inaccessible assets still occur.

## Decision 3: Keep the production import separate from the demo seed

**Decision**: Add `src/scripts/import-real-catalog.ts`; do not adapt or call `seed-nura.ts` or `product-images.ts`.

**Rationale**: The existing seed contains invented products, fixed inventory and Unsplash assets, and it deletes demonstration records. Reusing it would violate the real-data constitution and make idempotency unsafe.

**Alternatives considered**:

- Replace constants inside the seed: rejected because destructive seed behavior and code-coupled data would remain.
- Temporarily permit placeholder images: rejected because placeholders are explicitly forbidden in production.

## Decision 4: Use an auditable two-phase Medusa workflow

**Decision**: Fingerprint the validated manifest, persist a release record and pre-change snapshot, stage catalogue mutations through supported Medusa core flows, verify the staged result, then publish. Workflow compensation restores the snapshot if an execution step fails.

**Rationale**: Existing repository workflows already use `createStep`, `StepResponse` compensation and `createWorkflow`. Medusa core flows preserve module boundaries while a durable snapshot supports operator-initiated rollback after publication.

**Alternatives considered**:

- Direct database transaction: rejected by Medusa architecture boundaries and because it bypasses product-domain side effects.
- Product-by-product immediate publication: rejected because shoppers could see a partial release.
- Deployment rollback only: rejected because application rollback does not revert catalogue data.

## Decision 5: Store release audit state in a small custom module

**Decision**: Add one `catalog-import` module with a `CatalogRelease` model containing operation, fingerprint, status, counts, errors, manifest, pre-change snapshot and release links.

**Rationale**: Audit and rollback data must survive process restarts and must not depend on logs. The repository already uses custom Medusa modules and module services.

**Alternatives considered**:

- Log-only audit: rejected because logs are not a durable rollback source.
- Filesystem snapshots: rejected because containers are replaceable and multiple replicas may not share local storage.
- New external audit service: rejected as unnecessary complexity for this scope.

## Decision 6: Use an operational script, not a new public interface

**Decision**: Expose `validate`, `publish` and `rollback` modes through a Medusa execution script configured by explicit environment variables. The script resolves `NURA_CATALOG_OPERATOR` to an active Medusa admin user and fails closed before manifest processing unless RBAC is enabled and the user's effective policies grant both `product:update` and `inventory:update`, with wildcard policies satisfying either grant.

**Rationale**: No admin upload UI is required by the feature. Reusing the repository's existing Medusa RBAC roles avoids a second authorization system, while a mandatory operator identity preserves attribution. Avoiding a network endpoint reduces authentication, upload and rate-limit surface area while preserving repeatable automation.

**Alternatives considered**:

- Public or store endpoint: rejected because catalogue mutation must never be shopper-accessible.
- New admin UI: deferred because it adds interface scope without improving correctness of the first real import.

## Decision 7: Drain all storefront catalogue pages

**Decision**: Change sorted catalogue retrieval to request batches until the returned total is exhausted, then sort and paginate locally as today.

**Rationale**: The current implementation requests one batch of 100 and silently truncates larger catalogues. Full reconciliation and SC-006 require exhaustive retrieval.

**Alternatives considered**:

- Raise the limit above 100: rejected because server limits can still truncate and the assumption fails as the catalogue grows.
- Move sorting immediately to a new search service: rejected as unrelated scope; exhaustive retrieval is the smallest correction.

## Decision 8: Production remains blocked on business inputs

**Decision**: Implementation and non-production tests may proceed with a contract-valid fixture, but production publication requires an approved manifest, target currencies and locations, and owned or licensed packshots.

**Rationale**: Those inputs do not exist in the repository and cannot be inferred safely.

**Alternatives considered**:

- Generate missing values: rejected by the constitution.
- Publish an empty or partial catalogue: rejected by FR-004 and FR-018.
