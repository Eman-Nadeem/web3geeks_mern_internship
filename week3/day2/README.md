# NexusMarket - Day 2: Vendor Product & Inventory Management

A production-grade, multi-vendor ecommerce marketplace engine built from scratch with **Next.js 15+ / 16 (App Router)**, **TypeScript strict mode**, **Prisma ORM (PostgreSQL)**, **Stateless JWT session authentication**, **Cloudinary image uploads**, and **role-/ownership-based authorization**.

---

## 🏗 Day 2 Architecture & Specifications

### 1. Data Models & Relationships

- **`Product`**:
  - `id`, `name`, `slug` (`@unique` globally), `sku` (`@@unique([vendorId, sku])`), `description`, `price`, `compareAtPrice` (nullable), `stockQuantity` (`default: 0`), `lowStockThreshold` (`default: 5`), `category`, `status` (`DRAFT | ACTIVE | OUT_OF_STOCK | ARCHIVED`), `vendorId` (FK), `createdAt`, `updatedAt`.
- **`ProductImage`**:
  - `id`, `productId` (FK), `url`, `isPrimary` (Boolean), `order` (Int), `createdAt`, `updatedAt`.
  - Atomic primary image enforcement ensures exactly one primary image across public cards, product pages, and vendor tables.
- **`ProductVariant`**:
  - `id`, `productId` (FK), `sku` (`@@unique([productId, sku])`), `options` (JSON, e.g. `{"Switch": "Red", "Color": "Black"}`), `price` (nullable, falls back to parent product price), `stockQuantity`, `imageUrl`, `status`.
  - Inventory tracking moves to the variant level when variants exist; the parent product's `stockQuantity` maintains the computed sum for rapid aggregates.
- **`InventoryAdjustment`** (Append-Only Audit Trail):
  - `id`, `productId`, `variantId` (nullable), `vendorId`, `previousQuantity`, `newQuantity`, `quantityChanged`, `adjustmentType` (`RESTOCK | SALE | MANUAL_ADJUSTMENT | RETURN | DAMAGE`), `reason`, `changedByUserId`, `createdAt`.
  - Every stock modification executes in the same Prisma transaction (`$transaction`) as the inventory adjustment log write.

---

### 2. API Surface

#### Vendor Products & Catalog
| Method | Endpoint | Description | Auth Scoped |
|---|---|---|---|
| `GET` | `/api/vendor/products` | Search, filter (category, status, availability), sort vendor products | Current Vendor |
| `POST` | `/api/vendor/products` | Create product with SKU, images, and variants | Active Vendor |
| `GET` | `/api/vendor/products/:id` | Get vendor product details | Product Owner |
| `PATCH` | `/api/vendor/products/:id` | Update product, variants, and reorder images | Product Owner |
| `DELETE` | `/api/vendor/products/:id` | Soft-delete / archive product (`status: ARCHIVED`) | Product Owner |

#### Vendor Inventory & Stock Adjustments
| Method | Endpoint | Description | Auth Scoped |
|---|---|---|---|
| `GET` | `/api/vendor/inventory` | Inventory dashboard overview & aggregate stats | Current Vendor |
| `GET` | `/api/vendor/inventory/low-stock` | Products where `0 < stock <= lowStockThreshold` | Current Vendor |
| `GET` | `/api/vendor/inventory/out-of-stock` | Products where `stock == 0` or status `OUT_OF_STOCK` | Current Vendor |
| `PATCH` | `/api/vendor/products/:id/stock` | Atomic stock delta / exact set + auto status flip + audit row | Product Owner |
| `GET` | `/api/vendor/products/:id/inventory-history` | Append-only stock adjustment logs | Product Owner |

#### Image Uploads & Cloudinary
| Method | Endpoint | Description | Auth Scoped |
|---|---|---|---|
| `POST` | `/api/upload/cloudinary` | Multipart / Base64 image upload to Cloudinary CDN | Active Vendor |

#### Public Marketplace
| Method | Endpoint | Description | Privacy |
|---|---|---|---|
| `GET` | `/api/products` | Public catalog with vendor, category, min/max price, availability filters | Safe (Active only) |
| `GET` | `/api/products/:slug` | Public product details with variants, images, sanitized vendor card | Never leaks email/phone |

---

### 3. Vendor Isolation & Security Guarantees

1. **Zero-Trust Session Derivation**: Client-supplied `vendorId` values in request bodies or query parameters are ignored; the authenticated vendor profile is re-derived from the secure JWT session cookie.
2. **Ownership Assertion (`assertProductOwnership` & `assertVariantOwnership`)**: Any mutation or read on product ID / variant ID verifies that `product.vendorId === currentVendor.id` before executing or returning 403 Forbidden.
3. **Public Data Sanitization**: Public product and storefront queries strictly omit private vendor fields (vendor email, vendor phone, internal notes).

---

### 4. Running the Test Suite

Run the complete 15-scenario automated Vitest test suite:

```bash
npm run test
```

Test coverage includes:
1. Vendor product creation auto-attached to session vendor.
2. Vendor updating own product successfully.
3. Cross-vendor update prevention (403).
4. Cross-vendor stock adjustment prevention (403).
5. Negative stock rejection (400 validation error).
6. Negative price rejection (400 validation error).
7. Duplicate SKU rejection within vendor scope (409 conflict).
8. Atomic `InventoryAdjustment` audit record creation on stock change.
9. Automatic status transition to `OUT_OF_STOCK` on zero stock.
10. Low-stock query filtering (`0 < stock <= lowStockThreshold`).
11. Marketplace exclusion of products from non-active vendors.
12. Public product detail vendor privacy (no email/phone leakage).
13. Vendor dashboard stats matching direct DB aggregation.
14. Variant stock adjustments maintaining sibling isolation and parent sums.
15. Unauthenticated / unauthorized role restrictions (401 / 403).

---

### 5. Running the Application Locally

```bash
# Push database schema & seed
npm run db:push
npm run db:seed

# Run development server
npm run dev
```

Visit:
- Marketplace Catalog: `http://localhost:3000/products`
- Vendor Dashboard: `http://localhost:3000/vendor/dashboard`
- Vendor Inventory Manager: `http://localhost:3000/vendor/inventory`
- Vendor Products: `http://localhost:3000/vendor/products`
