---
description: "Dependency-ordered implementation tasks for the authentic Nura catalogue"
---

# Tasks: Publish Authentic Nura Catalogue

**Input**: Design documents from `specs/001-import-real-catalog/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required by the constitution and acceptance scenarios. Write each listed test first and confirm it fails for the intended reason before implementation.

**Organization**: Tasks are grouped by user story and finish with three explicit production gates. Application implementation can proceed now; production publication cannot.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes different files and has no incomplete dependency.
- **[Story]**: Maps the task to US1, US2 or US3 in `spec.md`.
- Every task names its target path.

## Phase 1: Setup

**Purpose**: Establish isolated import paths and deterministic fixtures without touching production data.

- [ ] T001 Create catalogue-import barrel exports and directories in `apps/backend/src/lib/catalog-import/index.ts`, `apps/backend/src/modules/catalog-import/index.ts` and `apps/backend/src/workflows/import-real-catalog.ts`
- [ ] T002 [P] Add one contract-valid multi-product fixture with multi-currency prices, zero stock, multiple taxonomy groups and mocked approved media in `apps/backend/integration-tests/fixtures/catalog/valid-catalog.json`
- [ ] T003 [P] Add invalid fixtures for empty batch, duplicate identity, missing price, placeholder media and unresolved taxonomy in `apps/backend/integration-tests/fixtures/catalog/invalid/`

---

## Phase 2: Foundational

**Purpose**: Build validation, fingerprinting and durable release state required by every story.

**Critical**: No user-story implementation begins until this phase passes focused tests.

- [ ] T004 [P] Write failing unit tests for manifest constraints, cross-record uniqueness, canonical fingerprints, HTTPS host allowlisting and private-network/redirect rejection in `apps/backend/src/lib/__tests__/catalog-import.unit.spec.ts`
- [ ] T005 [P] Write failing module tests for release fields and transitions `received -> validating -> rejected|validated`, `validated -> publishing -> published|failed`, and `published -> rolled_back` in `apps/backend/src/modules/catalog-import/__tests__/service.unit.spec.ts`
- [ ] T006 Implement the Zod manifest schema and cross-record validation matching `contracts/catalog-manifest.schema.json` in `apps/backend/src/lib/catalog-import/schema.ts`
- [ ] T007 Implement stable key ordering, normalized arrays and SHA-256 manifest fingerprints in `apps/backend/src/lib/catalog-import/fingerprint.ts`
- [ ] T008 Implement bounded media checks with required host allowlist, HTTPS-only URLs, public-IP DNS resolution, redirect revalidation, timeout, response-size cap and image content-type checks in `apps/backend/src/lib/catalog-import/validate-media.ts`
- [ ] T009 Create the `CatalogRelease` model with immutable `id`; operation `validate|publish|rollback`; indexed SHA-256 fingerprint; required source name/version/operator; status enum; JSON manifest/snapshot/counts/errors; nullable preceding/rollback links; and terminal completion timestamp in `apps/backend/src/modules/catalog-import/models/catalog-release.ts`
- [ ] T010 Implement create, transition, lookup-by-fingerprint, active-publication lock and audit-history methods in `apps/backend/src/modules/catalog-import/service.ts` and export the module from `apps/backend/src/modules/catalog-import/index.ts`
- [ ] T011 Register the module in `apps/backend/medusa-config.ts` and generate the additive catalogue-release migration under `apps/backend/src/modules/catalog-import/migrations/`
- [ ] T012 Implement deterministic reports conforming to `contracts/import-report.schema.json` in `apps/backend/src/lib/catalog-import/report.ts`

**Checkpoint**: Validation and release-state tests pass; no product mutation exists yet.

---

## Phase 3: User Story 1 - Publish an Approved Catalogue (Priority: P1)

**Goal**: Validate the whole approved batch, apply it idempotently through Medusa workflows and expose it only after successful verification.

**Independent Test**: Publish the valid fixture into an empty test catalogue and prove exact approved counts; publish each invalid fixture and prove zero shopper-visible mutation.

### Tests for User Story 1

- [ ] T013 [P] [US1] Write a failing integration test for an authorized exact valid publish, result counts and hidden-until-verified behavior in `apps/backend/src/modules/catalog-import/__tests__/catalog-import.publish.spec.ts`
- [ ] T014 [P] [US1] Write a failing integration test proving missing identity, disabled RBAC, insufficient policy and every invalid fixture reject the whole batch while preserving the previous catalogue in `apps/backend/src/modules/catalog-import/__tests__/catalog-import.rejection.spec.ts`
- [ ] T015 [P] [US1] Write a failing integration test that injects a mid-workflow failure and proves compensation restores products, variants, prices, stock, taxonomy, media and statuses in `apps/backend/src/modules/catalog-import/__tests__/catalog-import.compensation.spec.ts`

### Implementation for User Story 1

- [ ] T016 [US1] Implement source-ID reconciliation for categories, collections, products, variants, prices, inventory, sales channels and shipping profiles in `apps/backend/src/lib/catalog-import/reconcile.ts`
- [ ] T017 [US1] Implement complete pre-change snapshot capture and restoration payload generation in `apps/backend/src/lib/catalog-import/snapshot.ts`
- [ ] T018 [US1] Compose validate, fingerprint, lock, snapshot, draft mutation, exact-count verification, publish and compensation steps using supported core flows in `apps/backend/src/workflows/import-real-catalog.ts`
- [ ] T019 [US1] Enforce prior successful validation of the identical fingerprint, reject empty batches and keep all products hidden until final publication inside `apps/backend/src/workflows/import-real-catalog.ts`
- [ ] T020 [US1] Implement `validate` and `publish` operational modes with required manifest path, active Medusa admin operator identity, fail-closed `product:update` plus `inventory:update` RBAC checks and media-host allowlist in `apps/backend/src/scripts/import-real-catalog.ts`
- [ ] T021 [US1] Emit contract-valid JSON reports to stdout, actionable errors to stderr and non-zero exits for rejected or failed operations in `apps/backend/src/scripts/import-real-catalog.ts`
- [ ] T022 [US1] Add local `catalog:validate` and `catalog:publish` commands without embedding paths or credentials in `apps/backend/package.json`
- [ ] T023 [US1] Run US1 unit and integration suites and record exact commands and results in `specs/001-import-real-catalog/validation/us1.md`

**Checkpoint**: US1 is an independently testable MVP in non-production; no real Nura data has been published.

---

## Phase 4: User Story 2 - Browse the Complete Authentic Assortment (Priority: P2)

**Goal**: Ensure shoppers and release verification can observe every approved product, including assortments larger than 100 products.

**Independent Test**: Stub 205 approved products across three backend pages and prove the storefront and verifier return exactly 205 unique products with approved detail values.

### Tests for User Story 2

- [ ] T024 [P] [US2] Write a failing Vitest regression for 205 products, three backend pages, unique aggregation, sorting and local pagination in `apps/storefront/src/lib/data/__tests__/products.test.ts`
- [ ] T025 [P] [US2] Write failing Node tests for exact counts, missing/extra products, duplicate handles, placeholder hosts and wrong product details in `scripts/__tests__/verify-catalog-release.test.mjs`

### Implementation for User Story 2

- [ ] T026 [US2] Replace the single 100-product request with an exhaustive bounded page loop that stops at the returned count and rejects non-progressing pages in `apps/storefront/src/lib/data/products.ts`
- [ ] T027 [US2] Implement manifest-to-public-catalogue reconciliation with exhaustive API pagination and structured mismatch output in `scripts/verify-catalog-release.mjs`
- [ ] T028 [US2] Add a root `catalog:verify` command that requires explicit backend URL, market and manifest path in `package.json`
- [ ] T029 [US2] Run storefront and verifier tests and record the 205-product proof in `specs/001-import-real-catalog/validation/us2.md`

**Checkpoint**: US2 proves the complete approved assortment is visible without pagination truncation.

---

## Phase 5: User Story 3 - Re-run or Reverse a Catalogue Release (Priority: P3)

**Goal**: Make retries no-op safe, serialize concurrent publications and restore the preceding release with a durable audit trail.

**Independent Test**: Publish the same fixture twice, prove zero duplicate or changed entities on retry, publish a changed fixture, roll it back and prove the preceding snapshot is exact.

### Tests for User Story 3

- [ ] T030 [P] [US3] Write a failing integration test for fingerprint idempotency, unchanged counts and zero duplicate entities in `apps/backend/src/modules/catalog-import/__tests__/catalog-import.idempotency.spec.ts`
- [ ] T031 [P] [US3] Write a failing integration test for concurrent publish rejection and exact rollback restoration in `apps/backend/src/modules/catalog-import/__tests__/catalog-import.rollback.spec.ts`

### Implementation for User Story 3

- [ ] T032 [US3] Implement fingerprint short-circuiting and one-active-publication enforcement in `apps/backend/src/workflows/import-real-catalog.ts`
- [ ] T033 [US3] Implement snapshot restoration, release linking and post-restore verification in `apps/backend/src/workflows/rollback-catalog-release.ts`
- [ ] T034 [US3] Add `rollback` mode with required release ID and operator identity in `apps/backend/src/scripts/import-real-catalog.ts`
- [ ] T035 [US3] Run idempotency and rollback suites and record timings, counts and restored fingerprint in `specs/001-import-real-catalog/validation/us3.md`

**Checkpoint**: All three stories are independently functional in non-production.

---

## Phase 6: Polish and Cross-Cutting Validation

**Purpose**: Harden security, document operations and run repository-wide gates.

- [ ] T036 [P] Document manifest preparation, media allowlisting, commands, report fields and rollback in `apps/backend/README.md`
- [ ] T037 [P] Add environment-variable descriptions with safe empty defaults and no secrets in `apps/backend/.env.template`
- [ ] T038 Run backend unit/module/integration tests and record results in `specs/001-import-real-catalog/validation/backend.md`
- [ ] T039 Run repository lint, typecheck, build and storefront tests and record results in `specs/001-import-real-catalog/validation/repository.md`
- [ ] T040 Perform an independent security and data-integrity review of the final diff, including SSRF, authorization, secrets, compensation and historical-order preservation, in `specs/001-import-real-catalog/validation/review.md`

---

## Phase 7: External Production Gates

**Purpose**: Record the work that cannot proceed until Nura supplies authoritative business inputs. These tasks do not authorize a redeployment.

- [ ] T041 BLOCKED ON NURA - Obtain the final approved manifest, currencies, stock locations and owned/licensed packshots; record only approval metadata and the SHA-256 fingerprint in `specs/001-import-real-catalog/production-approval.md`
- [ ] T042 BLOCKED ON T041 - Execute validate, non-production publish, idempotent retry, full verification and rollback from `specs/001-import-real-catalog/quickstart.md` and record signed results in `specs/001-import-real-catalog/validation/preproduction.md`
- [ ] T043 BLOCKED ON T042 AND EXPLICIT USER APPROVAL - Back up production, publish the exact approved fingerprint, run `catalog:verify`, retain the rollback release ID and record evidence in `specs/001-import-real-catalog/validation/production.md`

---

## Dependencies and Execution Order

### Phase Dependencies

- **Phase 1** has no dependencies.
- **Phase 2** depends on Phase 1 and blocks all user stories.
- **US1** depends on Phase 2 and delivers the MVP import.
- **US2** depends on Phase 2; its final verifier is exercised against US1 output.
- **US3** depends on US1 release records and snapshots.
- **Phase 6** depends on all implemented stories.
- **Phase 7** depends on code gates plus external business inputs; T041 is currently blocked.

### User Story Dependencies

```text
Setup -> Foundation -> US1 -> US3
                     \-> US2
US1 + US2 + US3 -> Cross-cutting validation -> External production gates
```

- **US1**: independently testable after Phase 2.
- **US2**: pagination tests are independent; end-to-end reconciliation uses a US1 release.
- **US3**: requires a previously published US1 release to retry and reverse.

### Within Each User Story

- Write and run listed tests first; confirm expected failure.
- Implement pure helpers before workflows.
- Implement workflows before operational scripts.
- Run the independent checkpoint before starting the next dependent story.

## Parallel Opportunities

- T002 and T003 can run together.
- T004 and T005 can run together.
- T013, T014 and T015 can run together after Phase 2.
- T024 and T025 can run together; T024 can begin while US1 implementation proceeds.
- T030 and T031 can run together after US1.
- T036 and T037 can run together after interfaces stabilize.

## Parallel Examples

### User Story 1

```text
T013: Valid publish integration test
T014: Whole-batch rejection integration test
T015: Compensation integration test
```

### User Story 2

```text
T024: Storefront pagination regression
T025: Public catalogue verifier tests
```

### User Story 3

```text
T030: Idempotency integration test
T031: Concurrency and rollback integration test
```

## Implementation Strategy

### MVP First

1. Complete T001-T012.
2. Complete T013-T023 for US1.
3. Stop and validate the import with test fixtures only.
4. Do not publish production data until T041 and T042 pass.

### Incremental Delivery

1. US1 establishes safe validation and publication.
2. US2 proves complete shopper visibility beyond 100 products.
3. US3 adds retry and recovery guarantees.
4. Phase 6 closes technical quality gates.
5. Phase 7 remains blocked until authentic Nura inputs and explicit approval exist.

## Notes

- `[P]` tasks modify different files and have no incomplete dependency.
- Source manifests and product media are business inputs, not generated test data.
- No task permits `seed-nura.ts` or Unsplash assets in production.
- A code deployment never triggers catalogue publication automatically.
- Commit only after the relevant checkpoint passes; do not commit secrets or real private source files.
