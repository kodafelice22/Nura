<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Added principles: Real Data Integrity; Security by Default; Behavioral and
	Business Validation; Medusa Architecture Boundaries; Controlled Releases
- Added sections: Project Constraints; Development Workflow and Quality Gates
- Removed sections: none
- Deferred items: none
-->
# Nura Commerce Constitution

## Core Principles

### I. Real Data Integrity (NON-NEGOTIABLE)
Production MUST contain only approved Nura products, prices, inventory and media.
Demo products, placeholder copy and stock-image packshots MUST NOT be published.
Imports MUST be repeatable, preserve stable product identity and report rejected
records without leaving a partially published catalogue.

### II. Security by Default
Authentication, authorization and input validation MUST be enforced server-side.
Secrets MUST remain outside source control and logs. Public endpoints MUST apply
least privilege, abuse controls and safe error responses. Security-sensitive
changes MUST include negative-path tests covering unauthorized and malformed use.

### III. Behavioral and Business Validation
Every change MUST be verified at the narrowest executable level that can falsify
its intended behavior. Release checks MUST validate business outcomes, not only
HTTP success or process health. Catalogue validation therefore MUST prove that
approved products, prices, stock state and media are actually visible.

### IV. Medusa Architecture Boundaries
Backend business logic MUST live in Medusa modules, workflows or workflow steps,
not route handlers. Data changes MUST use module services and additive migrations;
application code MUST NOT bypass these boundaries with direct database access.
Storefront code MUST consume supported Store API contracts and preserve full
catalogue pagination.

### V. Controlled Releases
Changes MUST be focused, independently reviewed and validated before deployment.
Each production release MUST identify the exact revision, run the applicable
tests and smoke checks, preserve a tested rollback path and avoid unrelated
redeployments. A release is complete only when logs and customer-facing behavior
are healthy.

## Project Constraints

- The repository remains a Node.js monorepo with a Medusa backend and Next.js
	storefront; new dependencies require a demonstrated need.
- Existing package-manager, formatting, lint and file-layout conventions in
	`AGENTS.md` are mandatory.
- Production catalogue work depends on approved source data and owned or licensed
	product media. Missing business assets are blockers, never invitations to invent
	data.
- Personally identifiable data, credentials and payment details MUST NOT appear in
	fixtures, screenshots, logs or committed documentation.

## Development Workflow and Quality Gates

1. Define testable requirements and acceptance scenarios before implementation.
2. Make the smallest change that satisfies the active specification.
3. Run focused tests immediately, then broader lint, type, build and integration
	 checks in proportion to the change's blast radius.
4. Review the final diff for security, data integrity and unintended generated
	 files.
5. Before production, validate the public consumer path and its expected business
	 data, then record the deployed revision and rollback command.

Exceptions require an explicit owner, rationale, risk statement and expiry date in
the relevant specification or release record.

## Governance

This constitution supersedes conflicting local workflow guidance. Amendments MUST
be proposed in the constitution, explain their impact and use semantic versioning:
MAJOR for incompatible governance changes, MINOR for new principles or material
expansion, and PATCH for clarification. Every specification, plan, task list and
code review MUST include a constitution compliance check. `AGENTS.md` remains the
operational source for repository commands and coding conventions.

**Version**: 1.0.0 | **Ratified**: 2026-11-06 | **Last Amended**: 2026-11-06
