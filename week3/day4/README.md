# NexusMarket — Day 4: Payments, Commission & Settlement System

A zero-trust, multi-vendor ecommerce financial engine built with **Next.js (App Router)**, **TypeScript strict mode**, **Prisma ORM (PostgreSQL)**, **Stateless JWT session authentication**, **atomic transactional splitting**, and an **immutable double-entry-style financial ledger**.

---

## 🏗 Day 4 Architecture & Financial Engine

### 1. Data Model Additions

- **`Payment`**:
  - `id`, `orderId` (FK → parent Order), `customerId` (FK), `amount`, `currency` (PKR), `method` (`COD | MOCK_GATEWAY`), `referenceId` (`@unique`, cryptographically generated server-side), `status` (`PENDING | PAID | FAILED | REFUNDED | PARTIALLY_REFUNDED`), `provider`, `paidAt`, `createdAt`, `updatedAt`.
  - Amount is always recalculated server-side from parent `Order.totalAmount` at initiation time — never trusted from client payloads.
- **`CommissionSetting` (Append-Only Governance)**:
  - `id`, `rate` (e.g. 0.10 for 10%), `effectiveFrom`, `createdByUserId` (Admin FK), `createdAt`.
  - Stored as an append-only audit log; existing rows are never modified. The current effective rate is always `ORDER BY effectiveFrom DESC, createdAt DESC LIMIT 1`.
- **`CommissionRecord` (Immutable Rate Snapshotting)**:
  - `id`, `vendorId` (FK), `orderId` (FK), `vendorOrderId` (FK, `@unique`), `grossAmount` (= `VendorOrder.subtotal`), `commissionRate` (snapshotted copy from CommissionSetting at creation time), `commissionAmount`, `vendorEarning` (= `grossAmount - commissionAmount`), `currency`, `status` (`PENDING | EARNED | REFUNDED | CANCELLED`), `createdAt`, `updatedAt`.
- **`Settlement`**:
  - `id`, `settlementNumber` (`@unique`, e.g. `SET-1001-XXXX`), `vendorId` (FK), `amount`, `currency`, `periodStart`, `periodEnd`, `status` (`PENDING | PROCESSING | PAID | REJECTED`), `paymentReference` (bank/transaction reference filled on payout), `requestedAt`, `processedAt`, `createdAt`, `updatedAt`.
- **`SettlementItem` (Join Table with Database-Level Double-Payout Lock)**:
  - `id`, `settlementId` (FK), `commissionRecordId` (FK, `@unique`).
  - The `@unique` constraint guarantees that a `CommissionRecord` can be attached to at most one settlement in the entire history of the marketplace, eliminating double-payout race conditions.
- **`FinancialTransaction` (Append-Only Audit Ledger)**:
  - `id`, `vendorId` (nullable FK), `orderId` (nullable FK), `vendorOrderId` (nullable FK), `type` (`PAYMENT | SALE | COMMISSION | REFUND | SETTLEMENT | ADJUSTMENT`), `amount`, `direction` (`CREDIT | DEBIT`), `referenceId` (nullable), `description`, `createdAt`.
  - Strictly append-only: every financial balance mutation writes corresponding ledger rows in the same `$transaction`.

---

## 🔄 End-to-End Financial Lifecycle

```
Customer Checkout ──► POST /api/payments (status: PENDING)
                              │
                              ▼
                      POST /api/payments/:id/verify
                              │ (Atomic conditional check WHERE status = 'PENDING')
                              ▼
                      ┌───────────────────────────────────────────────┐
                      │ $transaction:                                 │
                      │  ├── Order.paymentStatus = 'PAID'             │
                      │  ├── FinancialTransaction: PAYMENT (CREDIT)   │
                      │  ├── Snapshot CommissionSetting Rate          │
                      │  ├── For each VendorOrder:                    │
                      │  │    ├── Create CommissionRecord (PENDING)   │
                      │  │    ├── Ledger: SALE (CREDIT to Vendor)     │
                      │  │    └── Ledger: COMMISSION (DEBIT Platform) │
                      └───────────────────────────────────────────────┘
                                      │
                                      ▼
                        Vendor Delivers Order (DELIVERED)
                                      │
                                      ▼
                     CommissionRecord.status ──► EARNED
                                      │
                                      ▼
                        Vendor Requests Settlement
                                      │
                        Available Balance = SUM(vendorEarning)
                        WHERE status = 'EARNED' AND SettlementItem IS NULL
                                      │
                                      ▼
                  Create Settlement (PENDING) + SettlementItems (LOCKED)
                  Ledger: SETTLEMENT (DEBIT)
                                      │
                                      ▼
                  Admin Reviews: PENDING ──► PROCESSING ──► PAID
                  (Records bank paymentReference & payout timestamp)
```

---

## 📐 Formulas, Rounding & Policies

### 1. Commission Calculation & Rounding Rule
- Standard **Half-Up Rounding** to 2 decimal places (`roundCurrency`):
  $$\text{grossAmount} = \text{VendorOrder.subtotal}$$
  $$\text{commissionAmount} = \text{round}(\text{grossAmount} \times \text{commissionRate})$$
  $$\text{vendorEarning} = \text{round}(\text{grossAmount} - \text{commissionAmount})$$
- **Shipping Commissionability Policy**: Shipping fees (`$10.00` per vendor order slice) are **100% non-commissionable** and go directly to logistics/vendor fulfillment. Commission is strictly assessed against product item value (`VendorOrder.subtotal`).

### 2. Available Balance Definition
$$\text{Available Balance} = \sum \text{CommissionRecord.vendorEarning} \quad \text{where } \text{status} = \text{'EARNED'} \land \text{SettlementItem is NULL}$$
- `PENDING` records (orders in transit/processing) are blocked from withdrawal.
- `CANCELLED` and `REFUNDED` records are blocked from withdrawal.
- Records already linked to a `SettlementItem` are locked from duplicate withdrawal.

---

## 🛡️ Idempotency & Race Protection

1. **Payment Verification Idempotency**: Guarded by conditional `updateMany({ where: { id, status: 'PENDING' } })`. Concurrent duplicate verification webhooks/calls return the existing state safely without duplicate commission creation or double ledger entries.
2. **Settlement Request Concurrency Guard**: Guarded by database-level `@unique` constraint on `SettlementItem.commissionRecordId`. Concurrent requests attempting to claim the same earnings are rejected.
3. **Refund / Cancellation Idempotency**: Cancellation checks existing `CommissionRecord.status`; if already cancelled/refunded, subsequent attempts execute as safe no-ops.
4. **Post-Settlement Cancellation Handling**: If an order cancelled after its settlement was already paid out to the vendor, a negative-balance `ADJUSTMENT` debit entry is appended to the ledger to be automatically recovered against future earnings.

---

## 🌐 API Surface

### Payments
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/payments` | Initiate payment with server-recomputed amount | Customer / Admin |
| `GET` | `/api/payments/:id` | Fetch payment detail and status | Customer / Admin |
| `POST` | `/api/payments/:id/verify` | Idempotent payment verification and commission creation | Customer / Admin |

### Vendor Financials & Settlements
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/vendor/earnings` | 5-figure earnings summary (Sales, Commission, Net, Pending, Available) | Vendor (Session-derived) |
| `GET` | `/api/vendor/transactions` | Filterable, paginated financial transaction ledger | Vendor (Session-derived) |
| `POST` | `/api/vendor/settlements` | Request payout for available balance (locks records) | Vendor (Session-derived) |
| `GET` | `/api/vendor/settlements` | List vendor payout requests and statuses | Vendor (Session-derived) |
| `GET` | `/api/vendor/settlements/:id` | View payout detail and attached order slices | Vendor (Session-derived) |

### Admin Financial Governance
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/admin/financials` | Platform-wide aggregates (Sales, Commission, Vendor Earnings, Payouts, Refunds) | Admin Only |
| `GET` | `/api/admin/commissions` | List & filter all marketplace commission records | Admin Only |
| `GET` | `/api/admin/settlements` | Marketplace-wide settlement queue | Admin Only |
| `PATCH` | `/api/admin/settlements/:id/status` | Transition settlement (`PROCESSING`, `PAID` with ref, `REJECTED`) | Admin Only |
| `GET` | `/api/admin/settings/commission` | View current rate and append-only audit history | Admin Only |
| `PATCH` | `/api/admin/settings/commission` | Append new commission rate | Admin Only |

---

## 🧪 Automated Test Coverage (57/57 Passed)

- `tests/day4-financials.test.ts`: **22 Scenarios** covering payment lifecycle, idempotency guards, commission snapshot integrity, settlement locking, cancellation reversals, IDOR isolation, and database-level financial reconciliation.
- `tests/day3-checkout.test.ts`: **15 Scenarios** covering multi-vendor checkout and order splitting.
- `tests/marketplace.test.ts`: **15 Scenarios** covering catalog and cart operations.
- `tests/regression-audit.test.ts`: **5 Scenarios** covering instructor review audit regressions.


---

### 2. Multi-Vendor Order Splitting Flow

```
Customer Multi-Vendor Cart
 ├── Product A (Vendor 1)
 ├── Product B (Vendor 1)
 └── Product C (Vendor 2)
       │
       ▼
Transactional Checkout ($transaction)
 ├── Re-verify active status & stock availability
 ├── Create Parent Order (#1001)
 ├── Split into Vendor Orders:
 │    ├── Vendor Order #1001-A (Vendor 1) ──► OrderItems [A, B]
 │    └── Vendor Order #1001-B (Vendor 2) ──► OrderItems [C]
 ├── Decrement product & variant stock quantities
 ├── Record InventoryAdjustment (SALE, negative delta) per item
 └── Clear customer cart
```

---

### 3. Shipping Calculation Strategy (Option B - Per-Vendor Flat Rate)

NexusMarket adopts **Option B (Per-Vendor Flat Rate)**:
- Each distinct merchant in the customer's cart receives an independent fulfillment shipping allowance of **$10.00**.
- The parent order total is computed as:
  $$\text{Grand Total} = \sum (\text{Vendor Subtotals}) + (\text{Distinct Vendors} \times \$10.00)$$
- Each `VendorOrder.subtotal`, `shippingAmount`, and `total` are cleanly separated in the database, allowing seamless vendor payouts and commission settlements.

---

### 4. Order Status State Machine & Rollup Rules

#### Allowed Vendor Transitions
```
PENDING ──► CONFIRMED ──► PROCESSING ──► SHIPPED ──► DELIVERED
   │           │              │
   └──► CANCELLED ◄───────────┘
```
- Invalid status transitions (e.g. attempting to jump from `CONFIRMED` straight to `DELIVERED`) are rejected with `400 Bad Request`.
- Status transitions can only be triggered by the vendor who owns that order slice (`assertVendorOrderOwnership`).

#### Parent Order Rollup Rules
1. **`DELIVERED`**: All child vendor orders are `DELIVERED`.
2. **`CANCELLED`**: All child vendor orders are `CANCELLED`.
3. **`SHIPPED`**: At least one vendor order is `SHIPPED` (and none pending/processing).
4. **`PROCESSING`**: Any vendor order is `PROCESSING` or `CONFIRMED`.
5. **`PENDING`**: All vendor orders are `PENDING`.

---

### 5. API Surface

#### Cart
| Method | Endpoint | Description | Scoped To |
|---|---|---|---|
| `GET` | `/api/cart` | Live-calculated vendor-grouped cart with live prices | Authenticated Customer |
| `POST` | `/api/cart/items` | Add product/variant to cart with live stock check | Authenticated Customer |
| `PATCH` | `/api/cart/items/:id` | Update item quantity with stock boundary validation | Cart Owner |
| `DELETE` | `/api/cart/items/:id` | Remove item from cart | Cart Owner |
| `DELETE` | `/api/cart` | Clear entire cart | Cart Owner |

#### Checkout
| Method | Endpoint | Description | Scoped To |
|---|---|---|---|
| `POST` | `/api/checkout/validate` | Pre-checkout live DB validation (stock, price, status) | Authenticated Customer |
| `POST` | `/api/checkout` | Atomic multi-vendor checkout & order splitting | Authenticated Customer |

#### Customer Orders
| Method | Endpoint | Description | Scoped To |
|---|---|---|---|
| `GET` | `/api/orders` | Customer order history with multi-vendor summaries | Authenticated Customer |
| `GET` | `/api/orders/:id` | Full multi-vendor order details with vendor packages | Order Owner (403 on IDOR) |
| `PATCH` | `/api/orders/:id/cancel` | Cancel entire order if not yet shipped (restores stock) | Order Owner |

#### Vendor Orders
| Method | Endpoint | Description | Scoped To |
|---|---|---|---|
| `GET` | `/api/vendor/orders` | List current vendor's order slices + fulfillment metrics | Current Vendor |
| `GET` | `/api/vendor/orders/:id` | Get vendor slice details + customer shipping info | Slice Owner (403 on IDOR) |
| `PATCH` | `/api/vendor/orders/:id/status` | Advance fulfillment status via state machine + parent rollup | Slice Owner |

---

### 6. Zero-Trust Security Guarantees

1. **Session-Derived Ownership**: Every operation re-verifies ownership via server-side session cookies. Client-supplied IDs are never trusted.
2. **Strict Vendor Isolation**: Vendors can only read, manage, or change statuses for `VendorOrder` records where `vendorOrder.vendorId === currentVendor.id`. Attempts to access another vendor's order ID fail with `403 Forbidden`.
3. **Customer Privacy**: Customer order endpoints filter strictly at the database query level by `customerId`.

---

### 7. Automated Vitest Test Suite

Run the full 30-scenario automated test suite:

```bash
npx vitest run
```

**Day 3 Scenarios Covered (`tests/day3-checkout.test.ts`):**
1. Customer adds in-stock active product to cart.
2. Products from multiple vendors are grouped by vendor.
3. Cart calculates live per-vendor subtotals and overall totals.
4. Out-of-stock product cannot be added to cart.
5. Suspended vendor product cannot be added or purchased.
6. `/checkout/validate` detects price changes and insufficient stock.
7. Successful checkout creates exactly 1 parent Order.
8. Correct number of `VendorOrder`s created (one per distinct vendor).
9. Vendor A cannot access Vendor B's order (403 Forbidden).
10. Customer can view their complete multi-vendor order in one place.
11. Stock is decremented accurately per item.
12. `InventoryAdjustment` (SALE) audit log written for every item.
13. Negative stock is strictly prevented during checkout.
14. `OrderItem` snapshots preserve historical names, SKUs, and prices.
15. Valid state machine status transitions succeed; invalid jumps rejected (400).
16. Vendor cannot modify another vendor's order status (403).
17. Customer cannot access another customer's order (403).
18. Mid-transaction failure throws and leaves no partial records.

---

### 8. Running the Application Locally

```bash
# Push database schema updates to Supabase
npx prisma db push

# Run development server
npm run dev
```

Visit:
- **Marketplace Shopping Cart**: `http://localhost:3000/cart`
- **Multi-Vendor Checkout**: `http://localhost:3000/checkout`
- **Customer Order History**: `http://localhost:3000/orders`
- **Vendor Order Management**: `http://localhost:3000/vendor/orders`

---

## 🛠 Known Issues & Audit Resolutions (Days 1–3)

| Priority | Issue / Finding | Root Cause | Resolution & Status |
|---|---|---|---|
| **P0** | **Client-Controlled Role on Registration** | `POST /api/auth/register` read `role` from request body without server-side override. | **FIXED**: Removed `role` from `registerSchema` entirely; registration hardcodes `role: 'CUSTOMER'`. Dedicated admin role changes only via protected admin endpoints. |
| **P1** | **Checkout Stock Deduction Race Condition** | Read-then-write stock decrement allowed concurrent checkouts to oversell stock. | **FIXED**: Implemented conditional atomic updates (`updateMany` with `stockQuantity: { gte: quantity }` and `{ decrement: quantity }`) on products and variants. Aborts and rolls back transaction cleanly if stock is exhausted. |
| **P1** | **Duplicate Variant SKU Returns 500** | Creating variants with duplicate SKU triggered raw Prisma `P2002` error surfacing as 500. | **FIXED**: Added pre-insert variant SKU uniqueness check and Prisma `P2002` error mapping returning `409 Conflict` with field-level error messages. |
| **P2** | **Vendor PENDING-Status Messaging Mismatch** | Pending dashboard copy mentioned product drafting, but API required ACTIVE status. | **FIXED**: Relaxed `POST /api/vendor/products` and `PATCH /api/vendor/products/:id` to allow pending vendors to draft products, strictly forcing `status: 'DRAFT'` until approved. |
| **P2** | **Product Slug Uniqueness Scope** | Day 1 had composite `[vendorId, slug]`, Day 2 used global `slug` `@unique`. | **DOCUMENTED**: Confirmed and documented that global `@unique` on `Product.slug` is intentional to support clean `/products/:slug` URL routing without vendor prefixes. |
| **P2** | **Hardcoded JWT Fallback Secret & Missing .env.example** | Hardcoded secret fallback used in all environments; incomplete env docs. | **FIXED**: In `production`, missing `JWT_SECRET` throws a fatal startup error. Documented `.env.example` created with all required vars; `.env` gitignored. |
| **P2** | **Dead Supabase SDK Boilerplate** | Unused `@supabase/ssr` and `@supabase/supabase-js` boilerplate remained in codebase. | **FIXED**: Deleted `utils/supabase/` directory and removed Supabase packages from `package.json`. |
| **P2** | **`any`-Typed Query Clauses Regression** | `where` / `orderBy` clauses in product/inventory API routes were typed `any`. | **FIXED**: Typed explicitly with `Prisma.ProductWhereInput` and `Prisma.ProductOrderByWithRelationInput`. |
| **P2** | **Order-Cancellation Restock on Hard-Deleted Products** | Restocking on order cancellation threw FK error if a product line was permanently deleted. | **FIXED**: Verified product existence before restoring inventory / writing adjustments; skipped deleted items gracefully and recorded them in `orphanedItems`. |
| **Perf** | **Cart Latency & Slow Badge Update** | Serial network requests (`POST /items` followed by `GET /cart`) delayed UI feedback. | **FIXED**: Implemented **Optimistic UI Updates** across `addToCart`, `updateQuantity`, `removeFromCart`, and `clearCart`, delivering 0ms immediate UI & badge updates. |

