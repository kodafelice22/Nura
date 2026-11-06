# Data Model: Publish Authentic Nura Catalogue

## Persistent Entity: Catalog Release

A durable audit record owned by the new catalogue-import module.

| Field | Type | Rules |
|---|---|---|
| `id` | Identifier | Generated, immutable |
| `operation` | Enum | `validate`, `publish` or `rollback` |
| `fingerprint` | String | SHA-256 of canonical manifest; indexed |
| `source_name` | String | Required, 1-120 characters |
| `source_version` | String | Required, stable business export version |
| `initiated_by` | String | Required operator identity |
| `status` | Enum | See state transitions |
| `manifest` | JSON | Validated immutable source payload |
| `pre_change_snapshot` | JSON or null | Required for publish and rollback operations |
| `counts` | JSON | Submitted, accepted, rejected, created, updated, unpublished and unchanged |
| `errors` | JSON array | Structured path, code, message and optional source identity |
| `preceding_release_id` | Identifier or null | Previous successfully published release |
| `rollback_of_release_id` | Identifier or null | Release being reversed by a rollback operation |
| `started_at` | Timestamp | Required |
| `completed_at` | Timestamp or null | Set on terminal states |
| `created_at` | Timestamp | Managed by persistence layer |
| `updated_at` | Timestamp | Managed by persistence layer |

### State Transitions

```text
received -> validating -> rejected
                       -> validated
validated -> publishing -> published
                        -> failed
published -> rolled_back
```

Rules:

- `validate` operations stop at `validated` or `rejected` and cannot mutate catalogue entities.
- `publish` operations require a prior successful validation of the same fingerprint.
- Only one operation may be in `publishing` state at a time.
- `failed` operations retain their snapshot and errors.
- A rollback creates its own audit record and marks the reversed release `rolled_back` only after successful restoration.

## Contract Entity: Catalogue Manifest

An immutable business export. It is not stored as editable product-authoring data.

| Field | Rules |
|---|---|
| Source metadata | Name, version, export timestamp, approving operator and approval timestamp are required |
| Categories | Stable source ID, name, public handle and optional parent source ID |
| Collections | Stable source ID, name and public handle |
| Products | At least one; stable source ID, handle, title, description, approval, taxonomy, shipping profile, sales channels, media and variants |

## Existing Medusa Entities

### Product

Mapped by stable source ID stored in metadata and by unique public handle. A product remains hidden until publication succeeds.

Validation rules:

- Stable source ID, title, description and handle are required.
- Handle and source ID are unique inside the manifest.
- At least one variant and one approved primary media asset are required.
- Category, collection, shipping-profile and sales-channel references must resolve.
- Removal from a later manifest unpublishes the product; it does not delete historical identity.

### Variant

Mapped by stable source ID and SKU.

Validation rules:

- Stable source ID and SKU are unique.
- At least one price and one inventory entry are required.
- Option values must reference product option names.
- Price amount and stock quantity are non-negative integers.

### Price

A currency-specific amount attached to a variant.

Validation rules:

- Currency code is a three-letter lowercase code.
- A variant cannot contain the same currency twice.
- Amount is an integer in the currency's smallest supported unit.

### Inventory Entry

An explicit quantity for one variant at one stock-location code.

Validation rules:

- Quantity is a non-negative integer; zero is valid and means unavailable.
- Location code must resolve before publication.
- A variant cannot repeat the same location code.

### Taxonomy Group

A category or collection identified by a stable source ID. Products may belong to multiple groups. Parent categories must resolve without cycles.

### Media Asset

An approved HTTPS image reference with alt text, provenance and primary designation.

Validation rules:

- URL must be HTTPS, accessible within the validation timeout and return an image content type.
- Known placeholder and stock-image hosts are rejected.
- Exactly one product image is primary.
- Duplicate URLs within one product are rejected.

## Relationships

```text
Catalog Release 1 -> 1 Catalogue Manifest
Catalog Release 0..1 -> 1 preceding Catalog Release
Catalog Release 0..1 -> 1 rollback target Catalog Release
Catalogue Manifest 1 -> many Products
Product many -> many Taxonomy Groups
Product 1 -> many Media Assets
Product 1 -> many Variants
Variant 1 -> many Prices
Variant 1 -> many Inventory Entries
```

## Idempotency and Reconciliation

- Canonical JSON key ordering plus normalized arrays produces the batch fingerprint.
- A completed publication with the same fingerprint returns an unchanged report.
- Stable source IDs select existing entities for update; they never create a second identity.
- The reconciliation set is the complete approved manifest. Existing imported products absent from that set are unpublished, not deleted.
- Before mutation, the workflow snapshots every affected product, variant, price, inventory, taxonomy assignment, media assignment and publication status needed for compensation or rollback.
