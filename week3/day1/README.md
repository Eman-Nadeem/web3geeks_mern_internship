# NexusMarket - Multi-Vendor Marketplace

A production-grade, multi-vendor ecommerce marketplace engine built from scratch with **Next.js 15+ (App Router)**, **TypeScript strict mode**, **Prisma ORM (PostgreSQL)**, **Stateless JWT session authentication**, and **role-/ownership-based authorization**.

Designed specifically for zero-trust multi-store isolation and seamless deployment on **Vercel Serverless**.

---

## 🏗 Architectural Decisions

### 1. Ownership Model (Phase 1 Decision)
- **1 User : 1 Vendor**: Each user owns at most one vendor store (`User 1:1 Vendor`).
- **Zero-Trust Ownership**: Any mutating operation (adding/editing products, updating vendor profile) re-derives `vendorId` **strictly from the authenticated session**, never from client-supplied request bodies. Client-supplied `vendorId` overrides are ignored and rejected.
- **Foreign Key Integrity**: Every `Product` has a mandatory foreign key `vendorId` (`onDelete: Cascade`). No orphan products can exist. Slugs are scoped per-vendor (`@@unique([vendorId, slug])`).

### 2. Public Storefront Privacy & Cloaking (Phase 4 Decision)
- Public route: `/vendors/[slug]`.
- Displays active vendor details and that vendor's active products only.
- If a vendor is `PENDING`, `SUSPENDED`, or `REJECTED`, the route strictly calls `notFound()` and returns **HTTP 404** (cloaking vendor existence from public crawlers and scrapers).

### 3. Admin Governance & Instant Invalidation (Phase 7 Decision)
- New vendors are created with status `PENDING`.
- Administrators review applicants at `/admin/vendors` and can `Approve`, `Suspend`, `Reactivate`, or `Reject`.
- Status changes trigger instantaneous cache revalidation (`revalidatePath('/vendors')`, `revalidatePath('/vendors/[slug]')`, `revalidatePath('/admin/vendors')`), eliminating caching lag on Vercel.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20+ or v22+
- **PostgreSQL**: Cloud instance (Neon, Supabase, Prisma Postgres) or local PostgreSQL

### 2. Installation
```bash
# Clone repository and enter directory
cd day1

# Install dependencies
npm install --legacy-peer-deps
```

### 3. Setting Up Your Permanent Database

#### Option A: Claim the Instant Cloud Database (Free & Immediate)
An instant Prisma Postgres database is already configured in `.env`. To make it permanent under your own account:
1. Open the claim URL in your browser:
   ```
   https://create-db.prisma.io/claim?projectID=proj_wfi258jfsrjvc2saq2uyxewv
   ```
2. Log in with GitHub or Google to permanently link the database.

#### Option B: Use Neon.tech (Recommended for Vercel)
1. Sign up for free at [neon.tech](https://neon.tech).
2. Create a new project and copy your connection string (`postgresql://...`).
3. Set `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

#### Option C: Use Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Settings > Database** and copy the **URI Connection String** (Transaction pooler port `6543`).
3. Set `DATABASE_URL` in `.env`.

### 4. Push Schema & Seed Initial Data
```bash
# Push Prisma schema to your database
npm run db:push

# Seed admin, vendors, products, and customer
npm run db:seed
```

### 5. Run the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Pre-seeded Demo Accounts

| Role | Email | Password | Pre-configured State |
|---|---|---|---|
| **Admin** | `admin@marketplace.com` | `Password123!` | Full governance access over vendors & catalog |
| **Active Vendor** | `alex@techstore.com` | `Password123!` | Store: *NovaTech Supplies* (4 active products) |
| **Pending Vendor** | `elena@artisangoods.com` | `Password123!` | Store: *Artisan Haven Studio* (awaiting approval) |
| **Customer** | `customer@example.com` | `Password123!` | Public marketplace shopper |

> **Pro-Tip**: The [Login Page](http://localhost:3000/login) includes **1-click autofill buttons** to instantly sign in as Admin, Vendor, or Customer.

---

## 🧪 Automated Testing

### Vitest Unit & Integration Suite
Run the 10 core integration scenarios:
```bash
npm run test
```

#### Test Scenarios Covered:
1. **Scenario 1**: User registers as a vendor -> vendor created with `PENDING` status.
2. **Scenario 2**: Admin approves the vendor -> status becomes `ACTIVE`.
3. **Scenario 3**: Approved vendor can perform active actions; pending/suspended is restricted.
4. **Scenario 4**: Vendor creates a product -> product is automatically attached to that vendor's ID (ignoring client-supplied IDs).
5. **Scenario 5**: Vendor A cannot edit or delete Vendor B's product (strictly returns `403 Forbidden`).
6. **Scenario 6**: Public storefront for an active vendor shows only that vendor's active products.
7. **Scenario 7**: Public storefront for a suspended vendor is unreachable (strictly returns `404 Not Found`).
8. **Scenario 8**: Customer can browse vendors and products without a vendor account.
9. **Scenario 9**: Admin can approve, suspend, and reactivate vendors.
10. **Scenario 10**: Unauthenticated requests return `401`, unauthorized return `403`.

### Playwright E2E Tests
```bash
npm run test:e2e
```

---

## 🌐 Deploying to Vercel

1. **Push your code to GitHub / GitLab**.
2. **Import project into Vercel**:
   - Framework Preset: **Next.js**
   - Build Command: `prisma generate && next build` (configured automatically in `package.json`)
3. **Configure Environment Variables** in Vercel Dashboard:
   - `DATABASE_URL`: Your PostgreSQL connection string (Neon / Supabase / Prisma Postgres).
   - `JWT_SECRET`: A secure 32+ character random string.
   - `NEXT_PUBLIC_APP_URL`: Your Vercel production domain (e.g. `https://your-marketplace.vercel.app`).
4. **Deploy**: Click **Deploy**. Vercel will build the Next.js App Router application with Prisma Client generation.

---

## 📁 Project Structure

```
├── app/
│   ├── (marketplace)/           # Public storefront surface
│   │   ├── layout.tsx           # Navbar & Footer wrapper
│   │   ├── page.tsx             # Marketplace home (hero, active vendors, products)
│   │   ├── products/            # Product catalog & search
│   │   │   ├── page.tsx         # Catalog with category & search filters
│   │   │   └── [slug]/page.tsx  # Product detail with vendor attribution card
│   │   ├── vendors/             # Active vendors directory
│   │   │   ├── page.tsx         # Verified vendor listings
│   │   │   └── [slug]/page.tsx  # Public vendor storefront (404 for non-active)
│   │   ├── login/page.tsx       # Auth login with demo switcher
│   │   └── register/page.tsx    # Customer / Vendor registration
│   ├── (vendor)/                # Protected vendor portal surface
│   │   ├── layout.tsx           # Vendor layout with lifecycle banners
│   │   └── vendor/
│   │       ├── onboarding/      # Vendor store registration
│   │       ├── dashboard/       # Metric cards & inventory overview
│   │       ├── profile/         # Store details & read-only status
│   │       └── products/        # Inventory CRUD & edit pages
│   ├── (admin)/                 # Protected admin portal surface
│   │   ├── layout.tsx           # Admin layout with role-gate
│   │   └── admin/
│   │       ├── dashboard/       # System metrics overview
│   │       ├── vendors/         # Vendor review queue (Approve/Suspend/Reject)
│   │       └── products/        # Platform-wide product oversight
│   └── api/                     # REST API route handlers
│       ├── auth/                # register, login, logout, me
│       ├── vendors/             # list, register, get, update, products
│       ├── products/            # list, create, update, delete
│       └── admin/               # list vendors, update status
├── components/                  # Navbar, Footer, StatusBadge
├── lib/
│   ├── prisma.ts                # Prisma client singleton
│   ├── auth.ts                  # Stateless JWT cookies & bcrypt hashing
│   ├── validations.ts           # Zod schemas for all mutations
│   └── guards.ts                # requireAuth, requireVendor, requireAdmin
├── prisma/
│   ├── schema.prisma            # PostgreSQL schema with native enums
│   └── seed.ts                  # Database seed script
├── tests/
│   ├── setup.ts                 # Vitest test setup
│   ├── marketplace.test.ts      # 10 integration test scenarios
│   └── e2e/                     # Playwright test specs
├── vitest.config.ts             # Vitest configuration
└── playwright.config.ts         # Playwright E2E configuration
```

---

## 📡 API Surface Reference

| Method | Endpoint | Description | Authorization |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register customer or vendor | Public |
| `POST` | `/api/auth/login` | Sign in with credentials | Public |
| `POST` | `/api/auth/logout` | Clear session cookie | Authenticated |
| `GET` | `/api/auth/me` | Current user & vendor profile | Authenticated |
| `GET` | `/api/vendors` | List active vendors | Public |
| `POST` | `/api/vendors` | Onboard new vendor store | Authenticated User |
| `GET` | `/api/vendors/:id` | Vendor details | Public (Active) / Owner / Admin |
| `PATCH` | `/api/vendors/:id` | Update vendor store profile | Vendor Owner only |
| `GET` | `/api/vendors/:id/products` | Vendor's catalog items | Public (Active) / Owner / Admin |
| `GET` | `/api/products` | Marketplace catalog (`?vendorId=`, `?category=`, `?search=`) | Public |
| `POST` | `/api/products` | Create product (auto-binds session vendor) | Active Vendor only |
| `PATCH` | `/api/products/:id` | Update product | Owning Vendor only |
| `DELETE` | `/api/products/:id` | Delete product | Owning Vendor only |
| `GET` | `/api/admin/vendors` | List all vendors by status | Admin only |
| `PATCH` | `/api/admin/vendors/:id/status` | Transition vendor status (`ACTIVE`, `SUSPENDED`, `REJECTED`) | Admin only |
