# Feature Specification: Publish Authentic Nura Catalogue

**Feature Branch**: `001-import-real-catalog`

**Created**: 2026-11-06

**Status**: Ready for Implementation

**Input**: User description: "Import and publish the authentic Nura catalogue with approved product data, prices, inventory, categories, collections and real packshots, without demo content."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publish an Approved Catalogue (Priority: P1)

An authorized catalogue manager validates a complete Nura catalogue batch before publishing it. The live catalogue changes only when every required field and asset passes validation, so shoppers never see a partially imported or invented assortment.

**Why this priority**: Nura cannot sell until a complete, trustworthy catalogue is published, and an unsafe partial import would create pricing and brand risk.

**Independent Test**: Submit one complete approved batch to validation and publication, then verify that the published catalogue contains exactly the approved products and no other content.

**Acceptance Scenarios**:

1. **Given** a non-empty approved batch with valid products, variants, prices, stock, taxonomy and media, **When** an authorized manager validates and publishes it, **Then** the exact approved assortment becomes the current published catalogue.
2. **Given** a batch containing any missing required value, duplicate identity, invalid price, invalid stock or unapproved media, **When** validation runs, **Then** publication is blocked, every rejected item has an actionable reason, and the current live catalogue remains unchanged.
3. **Given** a valid batch and an unexpected publication failure, **When** publication stops, **Then** shoppers continue to see the previously published catalogue and no partial batch is visible.

---

### User Story 2 - Browse the Complete Authentic Assortment (Priority: P2)

A shopper can browse every published Nura product and see its authentic identity, price, availability, classification and packshots consistently across catalogue and product-detail views.

**Why this priority**: The import has business value only when customers can discover and trust the complete assortment.

**Independent Test**: Compare the approved source manifest with all shopper-visible catalogue and product-detail results and verify a one-to-one match.

**Acceptance Scenarios**:

1. **Given** an approved catalogue is published, **When** a shopper browses all catalogue pages, **Then** every approved product appears exactly once and no unapproved or demo product appears.
2. **Given** a published product, **When** a shopper opens its detail view, **Then** the approved title, description, variant choices, price, availability, categories, collections and packshots are displayed.
3. **Given** a published variant with an explicit zero stock quantity, **When** a shopper views it, **Then** it is shown as unavailable rather than omitted, oversold or assigned invented stock.

---

### User Story 3 - Re-run or Reverse a Catalogue Release (Priority: P3)

An operator can safely re-run the same approved import without duplicates and can restore the previous published catalogue if post-publication verification fails.

**Why this priority**: Repeatability and recovery reduce operational risk after the first successful publication.

**Independent Test**: Publish a batch, import it again unchanged, then restore the preceding release and compare product counts and values at each step.

**Acceptance Scenarios**:

1. **Given** a batch was already imported, **When** the identical batch is run again, **Then** no duplicate product, variant, price, stock record, category, collection or media assignment is created.
2. **Given** a new catalogue release fails business verification, **When** an authorized operator requests rollback, **Then** the immediately preceding published catalogue is restored and the failed release remains auditable.

### Edge Cases

- The source batch is empty.
- Two records share a source identifier, SKU or public URL slug.
- A product is complete but one variant lacks price, currency, stock state or identity.
- A zero-stock item is intentionally included.
- A media file is inaccessible, duplicated, unsupported or points to a placeholder or stock-image source.
- A product belongs to multiple categories or collections, including a new taxonomy value.
- A source record removes a product that is referenced by historical orders.
- Publication is interrupted after validation but before all shopper-visible views are refreshed.
- The approved assortment exceeds a single catalogue page.
- The same batch is retried after a timeout with an unknown previous result.

## Scope Boundaries

### In Scope

- Validate and import approved products, variants, options, prices, currencies, inventory, categories, collections and product media.
- Publish the approved assortment as one traceable catalogue release.
- Verify the full shopper-visible catalogue and support rollback to the preceding release.

### Out of Scope

- Inventing product copy, prices, inventory or images.
- Product photography, image licensing or business approval of source data.
- Redesigning the storefront or admin interface.
- Changing checkout, payment, fulfilment or customer-account behavior.
- Publishing demonstration products or placeholder media as a temporary substitute.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept a non-empty catalogue batch containing a stable source identifier, SKU, public name, public URL slug, description, publication approval, variants and options, price with currency, explicit stock state, category or collection assignments and approved media for each product.
- **FR-002**: The system MUST provide a validation-only run that makes no catalogue changes and reports accepted and rejected records with actionable reasons.
- **FR-003**: The system MUST validate the complete batch before changing the live catalogue.
- **FR-004**: The system MUST block the entire publication when any required record or asset fails validation and MUST leave the current published catalogue unchanged.
- **FR-005**: The system MUST reject demo products, synthetic fallback values, placeholder copy and placeholder or stock-image media, including media hosted by known placeholder services.
- **FR-006**: Every publishable product MUST have at least one approved, accessible product packshot and an explicitly selected primary image.
- **FR-007**: Every publishable variant MUST have a stable identity, valid non-negative price with currency and an explicit non-negative stock quantity, including zero when out of stock.
- **FR-008**: Re-running an unchanged batch MUST be idempotent and MUST NOT create duplicates or alter unchanged business values.
- **FR-009**: Updating a previously imported product MUST preserve its stable identity and historical order references.
- **FR-010**: Products removed from a later approved batch MUST be unpublished rather than destructively removed when historical records depend on them.
- **FR-011**: Category and collection assignments MUST match the approved source, including products assigned to more than one taxonomy group.
- **FR-012**: Products MUST remain hidden from shoppers until all publication requirements pass and explicit publication approval is present.
- **FR-013**: A successful publication MUST expose every approved product exactly once across the complete shopper-visible catalogue, regardless of catalogue size or pagination.
- **FR-014**: Product-detail views MUST display the approved product identity, copy, variants, prices, availability, taxonomy and media without invented fallbacks.
- **FR-015**: Each validation and publication attempt MUST record its source fingerprint, initiator, timestamp, accepted count, rejected count, result and rejection reasons.
- **FR-016**: A publication result MUST report created, updated, unpublished, unchanged and rejected counts.
- **FR-017**: An authorized operator MUST be able to restore the immediately preceding published catalogue while preserving the failed release's audit record.
- **FR-018**: An empty batch MUST be rejected and MUST NOT replace or clear the current published catalogue.
- **FR-019**: Only active Medusa admin users whose RBAC policies grant both `product:update` and `inventory:update` (including wildcard grants) MUST be allowed to validate, publish or roll back catalogue batches; missing identity, disabled RBAC or insufficient policy MUST fail closed before manifest processing.
- **FR-020**: Publication verification MUST fail when the shopper-visible active product count differs from the approved batch, when any approved product is missing, or when any unapproved product is visible.

### Key Entities

- **Catalogue Batch**: One immutable source submission, identified by a fingerprint and containing all proposed catalogue records and approval metadata.
- **Product**: A sellable Nura item with stable identity, public copy, publication state, taxonomy and media.
- **Variant**: A purchasable product configuration with stable SKU, option values, price and explicit stock quantity.
- **Price**: An approved non-negative amount and currency associated with a variant and target market.
- **Inventory State**: The explicit available quantity for a variant, including zero.
- **Taxonomy Group**: A category or collection used to organize products, with many-to-many product assignments where approved.
- **Media Asset**: An approved and accessible product image with provenance, ordering and primary-image designation.
- **Catalogue Release**: A traceable published snapshot with result counts, verification state and a link to its preceding release for rollback.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Validation accounts for 100% of source records; the accepted and rejected totals equal the submitted total with no silent skips.
- **SC-002**: After publication, the shopper-visible active product and variant counts exactly match the approved batch and contain zero duplicates.
- **SC-003**: 100% of published variants have an approved price, currency and explicit stock quantity, and 100% of published products have an approved primary packshot.
- **SC-004**: Zero demo products, invented fallback values, placeholder copy or placeholder and stock-image assets are visible after publication.
- **SC-005**: Re-running the same batch produces zero new catalogue entities and zero changes to unchanged business values.
- **SC-006**: Full-catalogue verification checks every approved product, including assortments larger than one page, and detects any missing or extra item.
- **SC-007**: A failed validation or publication produces zero shopper-visible partial changes.
- **SC-008**: An authorized operator can restore the preceding published catalogue and verify its exact product count within 15 minutes.
- **SC-009**: A catalogue manager can identify every rejected record and its corrective action from one validation report without inspecting application logs.

## Assumptions

- Nura will provide and approve the authoritative product manifest, prices, currencies, stock quantities, taxonomy assignments and real packshots before production publication.
- Nura owns or has permission to publish every supplied product image and description.
- Target markets, currencies and stock locations already exist or will be explicitly included in the approved business inputs.
- Existing catalogue permissions and operator identities will be reused.
- Historical orders and customer data must remain intact throughout import, publication and rollback.
- The current absence of published products is treated as an operational state, not permission to generate demonstration content.
