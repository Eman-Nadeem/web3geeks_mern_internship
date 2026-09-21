# NexusMarket — Enterprise Multi-Vendor Marketplace (Day 5 Production Build)

NexusMarket is a zero-trust, multi-vendor ecommerce marketplace and financial ledger platform built with **Next.js (App Router)**, **TypeScript strict mode**, **Prisma ORM (PostgreSQL on Supabase)**, **Stateless JWT session authentication**, **atomic multi-vendor checkout and inventory reservation**, and an **immutable double-entry financial accounting ledger**.

---

## 🏗 System Architecture & Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Server Components, Server Actions, API Route Handlers |
| **Language** | TypeScript | Strict mode, zero `any` in business logic |
| **Database & ORM** | PostgreSQL & Prisma ORM 6 | Hosted on Supabase (PgBouncer connection pooling + direct migration URLs) |
| **Authentication** | Jose JWT | Stateless HTTP-only session cookies + Bearer token support, HMAC-SHA256 |
| **Password Hashing** | Bcrypt.js | Salt rounds = 10 |
| **Validation** | Zod 4 | Strict request payload validation with explicit sanitization |
| **Media Storage** | Cloudinary v2 | Server-side MIME validation, 5MB caps, responsive CDN image delivery |
| **Testing** | Vitest 5 & Playwright | 66 unit/integration tests with 100% pass rate + E2E Playwright specs |
| **Styling** | Modern Tailwind CSS & CSS Tokens | Responsive breakpoints (Mobile, Tablet, Desktop), dark mode support |

---

## 👥 Role-Based Access Control (RBAC) Matrix

| Endpoint Surface | Unauthenticated | Customer | Vendor | Admin |
|---|:---:|:---:|:---:|:---:|
| **Public Storefront & Marketplace** (`/`, `/products`, `/vendors`) | Read | Read | Read | Read |
| **Authentication & Registration** (`/api/auth/register`, `/login`) | Yes | Yes | Yes | Yes |
| **Shopping Cart & Multi-Vendor Checkout** (`/api/cart`, `/api/checkout`) | 401 | Read / Write | Read / Write | Read / Write |
| **Customer Order History & Payments** (`/api/orders`, `/api/payments`) | 401 | Own Only | Own Only | Full Access |
| **Vendor Onboarding & Profile** (`/api/vendors`) | 401 | Register Store | Manage Own | Full Access |
| **Vendor Products & Inventory** (`/api/vendor/products`, `/inventory`) | 401 | 403 | Own Store Only | Full Access |
| **Vendor Orders & Fulfillment** (`/api/vendor/orders`, `/status`) | 401 | 403 | Own Slice Only | Full Access |
| **Vendor Earnings & Settlements** (`/api/vendor/earnings`, `/settlements`) | 401 | 403 | Own Store Only | Full Access |
| **Admin Vendor Approvals** (`/api/admin/vendors`, `/status`) | 401 | 403 | 403 | Full Access |
| **Admin Financials & Commission Settings** (`/api/admin/settings/commission`) | 401 | 403 | 403 | Full Access |
| **Admin Settlement Processing** (`/api/admin/settlements`, `/status`) | 401 | 403 | 403 | Full Access |

---

## ⚡ Quick Start & Setup

### 1. Prerequisites
- Node.js `>= 18.17.0`
- PostgreSQL instance (or Supabase project)

### 2. Environment Variables Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure the following variables are configured:
```env
# PostgreSQL Database URL with connection pooling (for Prisma queries)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true&connection_limit=1"

# PostgreSQL Direct URL (for migrations & schema push)
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Stateless JWT Secret (min 32 characters)
JWT_SECRET="super-secret-marketplace-production-key-2026-secure-stateless-jwt"

# Cloudinary Media Storage (Optional for live CDN uploads)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# App Base URL & Environment
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 3. Install Dependencies & Generate Prisma Client
```bash
npm install
npx prisma generate
```

### 4. Push Database Schema & Run Demo Seed
```bash
# Push schema migrations to PostgreSQL
npm run db:push

# Run full realistic production demo seed (3 vendors, 10+ products, orders, payments, settlements)
npm run demo
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Testing Suite

The repository includes a comprehensive 66-test suite verifying zero regressions, IDOR protection, race-condition oversell prevention, multi-vendor order splitting, and financial accounting identities.

```bash
# Run all Vitest suites
npm test

# Run E2E Playwright tests
npm run test:e2e
```

### Test Coverage Highlights:
- `tests/day5-integration.test.ts`: End-to-end multi-vendor purchase, IDOR cross-tenant isolation, file upload security, payment idempotency, and settlement release/recovery.
- `tests/day4-financials.test.ts`: Financial ledger auditing, 10% platform commission splits, append-only settings, vendor earnings summary.
- `tests/day3-checkout.test.ts`: Multi-vendor cart grouping, atomic inventory reservation, order cancellations with stock restoration.
- `tests/regression-audit.test.ts`: Hardened regression assertions against role escalation, duplicate SKU conflicts, and concurrency race conditions.
- `tests/marketplace.test.ts`: Public catalog browsing, filtering, search, and variant management.

---

## 🔄 End-to-End Multi-Vendor Purchase & Financial Lifecycle

```
1. Customer Cart ──► Adds items from Vendor A, Vendor B, and Vendor C
       │
       ▼
2. Checkout (POST /api/checkout)
       │ • Server-side price & inventory re-verification inside $transaction
       │ • Atomic conditional decrement on Product / Variant stock
       │ • Creates Parent Order (#1001) with total: Subtotal + ($10 x 3 Shipping)
       │ • Deterministically splits into VendorOrder #1001-A, #1001-B, #1001-C
       │ • Snapshots product name, SKU, price, variant options onto OrderItem rows
       ▼
3. Payment (POST /api/payments & POST /api/payments/:id/verify)
       │ • Re-computes payable amount server-side from parent Order
       │ • Idempotent status flip: PENDING ──► PAID
       │ • Writes CREDIT FinancialTransaction for customer payment
       │ • Snapshots effective platform commission rate from CommissionSetting
       │ • Generates CommissionRecord per VendorOrder (status: PENDING)
       │ • Writes SALE (Credit) and COMMISSION (Debit) ledger entries
       ▼
4. Vendor Fulfillment (PATCH /api/vendor/orders/:id/status)
       │ • PENDING ──► CONFIRMED ──► PROCESSING ──► SHIPPED ──► DELIVERED
       │ • On DELIVERED: CommissionRecord status transitions: PENDING ──► EARNED
       │ • Updates parent Order rollup status automatically
       ▼
5. Settlement Payout (POST /api/vendor/settlements & PATCH /api/admin/settlements/:id/status)
       │ • Vendor available balance = SUM(vendorEarning) where status = 'EARNED' & SettlementItem is NULL
       │ • Vendor requests payout: creates Settlement and locks records with SettlementItem join rows
       │ • Admin reviews and approves: status ──► PAID with bank paymentReference
       │ • If Admin rejects: deletes SettlementItem join rows, restoring balance back to vendor
```

---

## 📐 Financial Accounting Identity

Every financial transaction obeys strict double-entry reconciliation:
$$\text{Customer Payment} = \sum \text{Vendor Gross Sales} + \sum \text{Shipping Fees}$$
$$\text{Vendor Gross Sales} = \text{Platform Commission} + \text{Vendor Net Earnings}$$

Commission is calculated using half-up epsilon rounding to prevent floating-point drift:
```ts
export function calculateCommission(grossAmount: number, rate: number) {
  const normalizedGross = roundCurrency(grossAmount);
  const commissionAmount = roundCurrency(normalizedGross * rate);
  const vendorEarning = roundCurrency(normalizedGross - commissionAmount);
  return { grossAmount: normalizedGross, commissionRate: rate, commissionAmount, vendorEarning };
}
```

---

## 🌐 Complete API Specification

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register customer (role hardcoded to `CUSTOMER`).
- `POST /api/auth/login` — Authenticate and issue 7-day secure HTTP-only session cookie.
- `POST /api/auth/logout` — Invalidate session and delete cookie.
- `GET /api/auth/me` — Return authenticated user profile and vendor attachment.

### Public Marketplace (`/api/products`, `/api/vendors`)
- `GET /api/products` — Browse products with search, category, price range, stock availability filters.
- `GET /api/products/:id` — Public product detail with variants and primary image.
- `GET /api/vendors` — Directory of active verified vendors.
- `GET /api/vendors/:id` — Public vendor storefront.
- `POST /api/vendors` — Authenticated vendor registration (status defaults to `PENDING`).
- `PATCH /api/vendors/:id` — Update vendor profile (owner only).

### Cart & Checkout (`/api/cart`, `/api/checkout`)
- `GET /api/cart` — Get customer cart grouped by vendor with subtotal and flat shipping.
- `POST /api/cart/items` — Add product/variant to cart with real-time stock check.
- `PATCH /api/cart/items/:id` — Update cart item quantity.
- `DELETE /api/cart/items/:id` — Remove item from cart.
- `DELETE /api/cart` — Clear entire shopping cart.
- `POST /api/checkout` — Atomic multi-vendor checkout, order splitting, and stock reservation.

### Customer Orders & Payments (`/api/orders`, `/api/payments`)
- `GET /api/orders` — List customer orders with vendor breakdowns.
- `GET /api/orders/:id` — Customer order detail with tracking status.
- `PATCH /api/orders/:id/cancel` — Cancel pending order and restore physical inventory.
- `POST /api/payments` — Initiate payment record for parent order.
- `POST /api/payments/:id/verify` — Confirm payment and execute financial ledger splits.

### Vendor Portal (`/api/vendor`)
- `GET /api/vendor/products` — Vendor catalog with stock and status filters.
- `POST /api/vendor/products` — Create new catalog product (forces `DRAFT` if vendor is `PENDING`).
- `GET /api/vendor/products/:id` — Vendor product details.
- `PATCH /api/vendor/products/:id` — Update product details and variants.
- `DELETE /api/vendor/products/:id` — Soft-archive or hard-delete product.
- `GET /api/vendor/orders` — Vendor order slice list.
- `GET /api/vendor/orders/:id` — Vendor order slice details.
- `PATCH /api/vendor/orders/:id/status` — State machine transition (`PENDING` ──► `DELIVERED`).
- `GET /api/vendor/earnings` — 5-figure earnings summary (Total Sales, Commission, Available Balance).
- `GET /api/vendor/transactions` — Paginated financial transaction ledger.
- `GET /api/vendor/settlements` — Vendor settlement request history.
- `POST /api/vendor/settlements` — Request payout for available earned balance.

### Admin Portal (`/api/admin`)
- `GET /api/admin/vendors` — List all vendors across all statuses.
- `PATCH /api/admin/vendors/:id/status` — Approve (`ACTIVE`), Suspend (`SUSPENDED`), or Reject vendors.
- `GET /api/admin/financials` — Platform-wide financial aggregates and revenue metrics.
- `GET /api/admin/commissions` — Paginated platform commission record audit log.
- `GET /api/admin/settings/commission` — View commission rate history.
- `PATCH /api/admin/settings/commission` — Set new effective marketplace commission rate.
- `GET /api/admin/settlements` — List all vendor settlement requests.
- `PATCH /api/admin/settlements/:id/status` — Process settlement (`PROCESSING` ──► `PAID` with payment reference).

---

## 🔒 Security & Defense-in-Depth Summary

1. **Role Escalation Defense**: Hardcoded server-side registration role prevents malicious privilege escalation (`BUG-01`).
2. **Server-Side File Validation**: Cloudinary image upload rejects non-image MIME types and enforces 5MB payload caps (`BUG-02`).
3. **IDOR Tenant Isolation**: Strict assertion guards prevent cross-vendor and cross-customer data leakage (`BUG-03`).
4. **Concurrency Race Protection**: Atomic conditional decrements prevent inventory overselling (`BUG-04`).
5. **Idempotent Payment Ledger**: Atomic status guards prevent duplicate commissions on retried payment callbacks (`BUG-05`).
6. **Structured Audit Logging**: Sensitive fields (`password`, `token`, `secret`, full PII) are sanitized before logging (`lib/logger.ts`).
7. **Production Error Masking**: Unhandled exceptions never leak raw SQL, file paths, or stack traces in production (`lib/guards.ts`).
