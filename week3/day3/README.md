# NexusMarket - Day 3: Multi-Vendor Cart, Checkout & Order Splitting

A production-grade, multi-vendor ecommerce marketplace engine built with **Next.js 15+ / 16 (App Router)**, **TypeScript strict mode**, **Prisma ORM (PostgreSQL)**, **Stateless JWT session authentication**, and **transactional order splitting with atomic stock reservation**.

---

## 🏗 Day 3 Architecture & Specifications

### 1. Data Models & Relationships

- **`Cart`**:
  - `id`, `customerId` (`@unique` — one active cart per customer), `createdAt`, `updatedAt`.
- **`CartItem`**:
  - `id`, `cartId` (FK), `productId` (FK), `variantId` (nullable FK), `vendorId` (FK, denormalized for rapid grouping), `quantity` (`default: 1`), `createdAt`, `updatedAt`.
  - `@@unique([cartId, productId, variantId])`: Prevents duplicate rows; increases quantity instead.
  - Cart line totals and prices are always calculated live from the Product/ProductVariant tables at read time, never stored statically.
- **`Order` (Parent Order)**:
  - `id`, `orderNumber` (`@unique`, e.g. `#1001`), `customerId` (FK), `totalAmount`, `paymentMethod`, `paymentStatus` (`PENDING | PAID | FAILED | REFUNDED`), `shippingName`, `shippingEmail`, `shippingPhone`, `shippingAddress`, `shippingCity`, `shippingPostalCode`, `status` (`PENDING | CONFIRMED | PROCESSING | SHIPPED | DELIVERED | CANCELLED`), `createdAt`, `updatedAt`.
  - Parent status is a derived rollup summarizing child `VendorOrder` fulfillments.
- **`VendorOrder` (Child Slice Order)**:
  - `id`, `vendorOrderNumber` (`@unique`, e.g. `#1001-A`, `#1001-B`), `orderId` (FK → parent Order), `vendorId` (FK), `subtotal`, `shippingAmount` (`$10.00` flat per vendor slice), `total`, `status` (`PENDING | CONFIRMED | PROCESSING | SHIPPED | DELIVERED | CANCELLED`), `createdAt`, `updatedAt`.
- **`OrderItem` (Immutable Snapshots)**:
  - `id`, `vendorOrderId` (FK), `productId` (nullable FK on delete), `variantId` (nullable FK), `productNameSnapshot`, `skuSnapshot`, `unitPriceSnapshot`, `quantity`, `variantOptionsSnapshot` (JSON), `lineTotal`, `createdAt`.
  - Snapshots are permanently immutable at order creation time — historical records remain 100% accurate even if the vendor modifies or deletes the product later.

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
