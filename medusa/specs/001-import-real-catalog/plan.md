# Implementation Plan: Publish Authentic Nura Catalogue

**Branch**: `001-import-real-catalog` | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-import-real-catalog/spec.md`

## Summary

Add a production-safe JSON catalogue import that validates the complete source
before mutation, fingerprints each batch, applies idempotent changes through
Medusa workflows, records releases and rollback snapshots, and publishes only
after business verification. Keep the existing demonstration seed isolated and
blocked from this path. Update storefront catalogue retrieval to consume all
pages so post-publication verification can prove complete visibility.

## Technical Context

**Language/Version**: Node.js 22, TypeScript 5.6

**Primary Dependencies**: Medusa 2.22.3 core flows and workflow SDK, Zod 4.6.7,
Next.js 16.4.5 storefront SDK

**Storage**: PostgreSQL 16 for catalogue and immutable import-release records;
approved product media remains externally hosted and referenced by HTTPS URL

**Testing**: Jest 29 unit and Medusa module/integration suites; storefront lint,
typecheck and build; production audit smoke checks

**Target Platform**: Dockerized Linux services behind Caddy

**Project Type**: Monorepo web application with Medusa backend and Next.js storefront

**Performance Goals**: Validate a batch of up to 1,000 products in under two
minutes; verify all shopper-visible products without silent pagination truncation

**Constraints**: No placeholder data or media; no direct database writes; no use
of the destructive demonstration seed; all-or-nothing shopper-visible publication;
idempotent retries; historical order references preserved; no production action
without an approved business manifest

**Scale/Scope**: Up to 1,000 products, five variants per product and ten media
assets per product in one release; one active publication operation at a time

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Gate

- **PASS - Real Data Integrity**: the input contract requires approved values and
  media provenance, rejects placeholders and validates the whole batch first.
- **PASS - Security by Default**: the import resolves an active Medusa admin
  operator and fails closed unless RBAC grants `product:update` and
  `inventory:update`; it validates untrusted input and exposes no new public
  endpoint.
- **PASS - Behavioral and Business Validation**: dry-run, idempotency, full
  catalogue reconciliation and rollback are executable acceptance checks.
- **PASS - Medusa Architecture Boundaries**: mutations use custom workflows,
  module services and supported Medusa core flows, never direct database access.
- **PASS - Controlled Releases**: publication is explicit, fingerprinted,
  auditable, reversible and separate from deployment.

### Post-Design Gate

- **PASS**: `research.md`, `data-model.md`, the JSON contracts and `quickstart.md`
  retain all five gates. No exception or constitution violation is required.

## Project Structure

### Documentation (this feature)

```text
specs/001-import-real-catalog/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
├── contracts/
│   ├── catalog-manifest.schema.json
│   └── import-report.schema.json
└── tasks.md
```

### Source Code (repository root)

```text
apps/backend/
├── src/
│   ├── lib/
│   │   ├── catalog-import/
│   │   │   ├── fingerprint.ts
│   │   │   ├── schema.ts
│   │   │   └── validate-media.ts
│   │   └── __tests__/
│   │       └── catalog-import.unit.spec.ts
│   ├── modules/
│   │   └── catalog-import/
│   │       ├── index.ts
│   │       ├── service.ts
│   │       ├── models/
│   │       │   └── catalog-release.ts
│   │       └── __tests__/
│   │           └── service.unit.spec.ts
│   ├── workflows/
│   │   ├── import-real-catalog.ts
│   │   └── rollback-catalog-release.ts
│   └── scripts/
│       └── import-real-catalog.ts
└── medusa-config.ts

apps/storefront/src/lib/data/
└── products.ts

scripts/
├── verify-catalog-release.mjs
└── __tests__/
  └── verify-catalog-release.test.mjs
```

**Structure Decision**: Extend the existing backend custom-module and workflow
patterns. Use one operational Medusa script as the entry point, one small module
for durable release state, and existing core product workflows for mutations.
Keep storefront work limited to complete pagination and verification.

## Delivery Strategy

1. Implement pure manifest validation, canonical fingerprinting and placeholder
   media rejection with unit tests.
2. Add durable release records and migrations, then test state transitions.
3. Compose validation, snapshot, idempotent create/update/unpublish and compensation
   into import and rollback workflows.
4. Add the operational script with `validate`, `publish` and `rollback` modes,
  fail-closed Medusa RBAC authorization and stable JSON reports.
5. Remove the storefront 100-product ceiling and add complete-catalogue regression
   coverage.
6. Run the quickstart against a non-production environment using an approved sample,
   then require the real business manifest and packshots before production publish.

## Complexity Tracking

No constitution violations or exceptional complexity are required.
