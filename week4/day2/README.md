# Team Collaboration SaaS - Multi-Tenant Platform (Day 2)

A production-grade, secure, multi-tenant "Team Collaboration SaaS" platform built as a single Next.js project. Day 2 extends the core authentication and multi-tenancy foundation with a complete **Team Management System**:
- **Members Management**: Search, filter by role (`OWNER`, `ADMIN`, `MEMBER`), and safe member removal enforcing strict RBAC rules.
- **Secure Email Invitations**: SHA-256 token hashing, 72-hour expiration, resend/cancel lifecycle, Resend email integration with local dev console fallback.
- **Public Invitation Acceptance**: `/invitations/[token]` supporting unauthenticated new user signups, matching authenticated user acceptance, and mismatched account prompts.
- **Organization Settings**: Update organization name, description (max 500 chars), logo upload (`@vercel/blob` with local preview dev fallback), and `OWNER`-only slug modification.
- **Granular RBAC Permission Matrix**: Pure-function authorization policies protecting all mutations and member removals.

---

## Table of Contents
- [Tech Stack](#tech-stack)
- [Architecture & Layering](#architecture--layering)
- [Multi-Tenant Authorization & Higher-Order Wrappers](#multi-tenant-authorization--higher-order-wrappers)
- [Role & Permission Matrix](#role--permission-matrix)
- [Invitation Lifecycle & Security Architecture](#invitation-lifecycle--security-architecture)
- [Prerequisites & Getting Started](#prerequisites--getting-started)
- [Environment Variables](#environment-variables)
- [Seeded Test Accounts](#seeded-test-accounts)
- [Available Scripts](#available-scripts)
- [API Reference](#api-reference)
- [Manual Testing Guide](#manual-testing-guide)
- [Automated Testing](#automated-testing)
- [Vercel & Neon Deployment Guide](#vercel--neon-deployment-guide)
- [Security Notes & Trade-offs](#security-notes--trade-offs)

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 15+ (App Router) | React Server & Client components, Route Handlers, Edge Middleware |
| **Language** | TypeScript (Strict Mode) | End-to-end type safety, zero `any` types |
| **Styling** | Tailwind CSS + Lucide Icons | Clean modern dark-mode design system, responsive UI |
| **Database** | PostgreSQL + Prisma ORM | Relational models with UUID primary keys and transactional integrity |
| **Authentication** | `bcryptjs` (Cost 12) + `jose` (JWT) | Pure JS password hashing and edge-compatible HS256 JWT tokens |
| **Email Service** | `resend` (with local console fallback) | Transactional emails for invitation delivery |
| **File Storage** | `@vercel/blob` (with dev fallback) | Secure CDN organization logo storage |
| **Validation** | Zod | Synchronized schema validation across client forms and server APIs |
| **State & Forms** | React Hook Form + TanStack Query | Client form management and query caching keyed by `organizationId` |
| **Rate Limiting** | `@upstash/ratelimit` + `@upstash/redis` | Distributed sliding-window limiter with in-memory fallback in dev/test |
| **Logging** | Pino | Structured JSON logging with automated redaction of sensitive credentials |
| **Testing** | Vitest | Integration test suite executing directly against route handlers (68 tests) |

---

## Architecture & Layering

The codebase follows a strict **Layered Single-Project Architecture**:

```
team-collab/
├── prisma/
│   ├── schema.prisma                        # DB schema: User, Organization, Membership, Invitation
│   └── seed.ts                              # Idempotent seed script (Alice, Bob, Carol + test invitation)
├── src/
│   ├── app/                                 # Next.js App Router
│   │   ├── (auth)/login/page.tsx            # Login with Zod validation
│   │   ├── (auth)/register/page.tsx         # Registration with password complexity & invite returnUrl support
│   │   ├── (app)/layout.tsx                 # Authenticated application shell & navigation
│   │   ├── (app)/dashboard/page.tsx         # Smart redirect or empty state CTA
│   │   ├── (app)/dashboard/[orgSlug]/page.tsx# Org workspace overview & metrics
│   │   ├── (app)/dashboard/[orgSlug]/members/page.tsx # Members search, filter, invite & remove
│   │   ├── (app)/dashboard/[orgSlug]/settings/page.tsx# Org details, logo upload, slug change
│   │   ├── (app)/organizations/new/page.tsx # Org creation with auto-slug generation
│   │   ├── (app)/profile/page.tsx           # User profile & account details
│   │   ├── invitations/[token]/page.tsx     # Public invitation acceptance flow
│   │   ├── api/                             # Route Handlers (`runtime = "nodejs"`)
│   │   │   ├── health/route.ts              # DB ping & health status
│   │   │   ├── auth/register/route.ts
│   │   │   ├── auth/login/route.ts
│   │   │   ├── auth/logout/route.ts
│   │   │   ├── auth/me/route.ts
│   │   │   ├── organizations/route.ts
│   │   │   ├── organizations/[organizationId]/route.ts
│   │   │   ├── organizations/[organizationId]/members/route.ts
│   │   │   ├── organizations/[organizationId]/members/[membershipId]/route.ts
│   │   │   ├── organizations/[organizationId]/invitations/route.ts
│   │   │   ├── organizations/[organizationId]/invitations/[invitationId]/route.ts
│   │   │   ├── organizations/[organizationId]/invitations/[invitationId]/resend/route.ts
│   │   │   ├── organizations/[organizationId]/logo/route.ts
│   │   │   ├── invitations/[token]/route.ts
│   │   │   ├── invitations/[token]/accept/route.ts
│   │   │   └── [...slug]/route.ts           # JSON 404 catch-all
│   │   ├── layout.tsx, not-found.tsx, error.tsx, globals.css
│   ├── server/                              # BACKEND LAYER (Server-Only)
│   │   ├── config/env.ts                    # Lazy Zod-validated environment config
│   │   ├── db/prisma.ts                     # PrismaClient singleton with global dev cache
│   │   ├── lib/                             # jwt, password, email, slug, cookies, logger, rate-limit, origin
│   │   ├── http/                            # AppError, response, with-handler, with-auth, with-org-role, validate
│   │   └── modules/                         # Business logic & services
│   │       ├── auth/                        # User registration, login, session
│   │       ├── organizations/               # Org CRUD, logo upload, slug uniqueness
│   │       ├── memberships/                 # Members listing, search, safe removal & permissions.ts
│   │       └── invitations/                 # Invitation lifecycle, SHA-256 token hashing, accept
│   ├── components/                          # UI & layout components (ui/, layout/, organizations/)
│   ├── lib/                                 # api-client.ts, validations.ts, utils.ts, constants.ts
│   ├── providers/                           # auth-provider.tsx, query-provider.tsx
│   ├── types/                               # Shared DTO contracts
│   └── middleware.ts                        # Edge route protection
├── tests/                                   # Vitest integration test suites (68 tests)
├── docker-compose.yml                       # Local PostgreSQL 16 container
├── next.config.ts                           # Security headers configuration
├── vercel.json                              # Vercel deployment region
└── package.json
```

---

## Multi-Tenant Authorization & Higher-Order Wrappers

Mutations and tenant data access are protected using composable higher-order wrappers:

```ts
export const DELETE = withHandler(
  withAuth(
    withOrgRole(["OWNER", "ADMIN"], async (req, ctx) => {
      // ctx.user, ctx.organization, and ctx.membership are fully typed and verified
      return successResponse({ ... });
    })
  )
);
```

### The Wrapper Execution Chain:
1. **`withHandler`**:
   - Central `try/catch` error boundary mapping all errors (`AppError`, `ZodError`, Prisma errors) into `{ success, message, errors }`.
   - Enforces CSRF `Origin` verification on mutating HTTP methods (`POST`, `PATCH`, `DELETE`).
   - Redacted structured logging with Pino.
2. **`withAuth`**:
   - Verifies JWT from httpOnly cookie `team_collab_token`.
   - Injects sanitized `ctx.user`.
3. **`withOrgRole(allowedRoles, handler)`**:
   - Validates that `organizationId` parameter is a valid UUID (`400 Bad Request`).
   - Verifies organization existence (`404 Not Found`).
   - Confirms user has a `Membership` record for this organization (`403 Forbidden`).
   - Validates that user's membership role matches `allowedRoles` (`403 Forbidden`).
   - Injects `ctx.organization` and `ctx.membership`.

---

## Role & Permission Matrix

Permissions are implemented as pure, deterministic functions in `src/server/modules/memberships/permissions.ts`:

| Action | Owner | Admin | Member | Non-Member / Unauthenticated |
|---|:---:|:---:|:---:|:---:|
| **View Member List** | ✅ | ✅ | ✅ | ❌ `403 Forbidden` |
| **Invite `MEMBER`** | ✅ | ✅ | ❌ `403 Forbidden` | ❌ `403 Forbidden` |
| **Invite `ADMIN`** | ✅ | ❌ `403 Forbidden` | ❌ `403 Forbidden` | ❌ `403 Forbidden` |
| **Invite `OWNER`** | ❌ (Day 3 Transfer) | ❌ | ❌ | ❌ |
| **Remove `MEMBER`** | ✅ | ✅ | ❌ `403 Forbidden` | ❌ `403 Forbidden` |
| **Remove `ADMIN`** | ✅ | ❌ `403 Forbidden` | ❌ `403 Forbidden` | ❌ `403 Forbidden` |
| **Remove `OWNER`** | ❌ `409 Conflict` (Last Owner) | ❌ `403 Forbidden` | ❌ `403 Forbidden` | ❌ `403 Forbidden` |
| **Resend / Cancel Invites** | ✅ | ✅ | ❌ `403 Forbidden` | ❌ `403 Forbidden` |
| **Edit Org Name / Description** | ✅ | ✅ | ❌ `403 Forbidden` | ❌ `403 Forbidden` |
| **Upload Org Logo** | ✅ | ✅ | ❌ `403 Forbidden` | ❌ `403 Forbidden` |
| **Edit Org Slug** | ✅ | ❌ `403 Forbidden` | ❌ `403 Forbidden` | ❌ `403 Forbidden` |
| **Delete Organization** | ✅ | ❌ `403 Forbidden` | ❌ `403 Forbidden` | ❌ `403 Forbidden` |

---

## Invitation Lifecycle & Security Architecture

1. **Token Generation & Storage**:
   - Cryptographically random 32-byte hex token generated using `crypto.randomBytes(32)`.
   - **Only the SHA-256 hash** (`crypto.createHash("sha256").update(rawToken).digest("hex")`) is saved to the database.
   - Raw tokens are never logged, returned in list endpoints, or stored unhashed in PostgreSQL.
2. **Email Delivery & Local Fallback**:
   - Sent via Resend using `src/server/lib/email.ts`.
   - If `RESEND_API_KEY` is not set (development default), the full invitation URL is printed directly to the terminal console with a clean banner.
3. **Public Token Lookup (`GET /api/invitations/:token`)**:
   - Hashes lookup token to find pending invite.
   - Rate limited to 30 requests / 15 mins / IP.
   - Checks expiration; marks as `EXPIRED` if past `expiresAt`.
   - If authenticated, returns `currentUserEmail` and `isEmailMatch` flag so the frontend can guide the user.
4. **Acceptance Flow (`POST /api/invitations/:token/accept`)**:
   - Executes inside an interactive Prisma database transaction.
   - Re-checks status with row lock semantics to prevent double-accept race conditions.
   - Creates `Membership` and sets invitation status to `ACCEPTED`.
   - Idempotent: If user is already a member, successfully returns current membership without error.

---

## Prerequisites & Getting Started

### Prerequisites
- **Node.js**: v20.x or v22.x
- **Docker & Docker Compose** (for local PostgreSQL 16) or hosted PostgreSQL (e.g. Neon)

### Quick Start (Local Development)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```

3. **Start local PostgreSQL (Docker)**:
   ```bash
   npm run db:up
   ```

4. **Run database migrations and seed default users**:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

| Variable | Required | Description | Example / Default |
|---|:---:|---|---|
| `NODE_ENV` | Yes | Environment mode | `development` / `production` / `test` |
| `DATABASE_URL` | Yes | Pooled connection string | `postgresql://postgres:postgrespassword@localhost:5432/team_collab_dev?schema=public` |
| `DIRECT_URL` | Yes | Direct connection string for migrations | `postgresql://postgres:postgrespassword@localhost:5432/team_collab_dev?schema=public` |
| `TEST_DATABASE_URL` | Dev/Test | Database URL for automated test runs | `postgresql://postgres:postgrespassword@localhost:5432/team_collab_test?schema=public` |
| `JWT_SECRET` | Yes | Secret for signing HS256 tokens (min 32 chars) | `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | No | JWT token expiry duration | `7d` |
| `NEXT_PUBLIC_APP_URL` | Yes | Frontend application root URL | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Yes | API base URL | `http://localhost:3000/api` |
| `RESEND_API_KEY` | Optional | Resend API key (logs to console if omitted) | `re_123456789...` |
| `EMAIL_FROM` | No | From email address | `onboarding@resend.dev` |
| `BLOB_READ_WRITE_TOKEN` | Optional | Vercel Blob token (local fallback if omitted)| `vercel_blob_rw_...` |
| `INVITATION_EXPIRES_IN_HOURS`| No | Invitation validity period in hours | `72` |
| `UPSTASH_REDIS_REST_URL` | Prod | Upstash Redis REST URL for rate limiting | `https://your-upstash-redis.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Prod | Upstash Redis REST Token | `your_upstash_token` |

---

## Seeded Test Accounts

The seed script creates 3 test users (password: `Password123!` for all), 2 organizations, and a pre-seeded test invitation:

| User | Email | Acme Corp Role | Startup Labs Role |
|---|---|:---:|:---:|
| **Alice Johnson** | `alice@example.com` | **OWNER** | **MEMBER** |
| **Bob Smith** | `bob@example.com` | **ADMIN** | **OWNER** |
| **Carol Williams** | `carol@example.com` | **MEMBER** | *(None)* |

**Pre-seeded Pending Invitation**:
- URL: `http://localhost:3000/invitations/seed-test-invitation-token-12345`
- Organization: `Acme Corp`
- Invited Email: `david@example.com`
- Role: `MEMBER`

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `next dev` | Starts local Next.js dev server on port 3000 |
| `npm run build` | `prisma generate && next build` | Compiles schema and builds production bundle |
| `npm run start` | `next start` | Runs production server |
| `npm run lint` | `next lint` | Lints project files |
| `npm run typecheck` | `tsc --noEmit` | Strict TypeScript verification |
| `npm test` | `vitest run --fileParallelism=false` | Executes all 68 automated integration tests |
| `npm run db:up` | `docker compose up -d` | Starts local Postgres container |
| `npm run db:migrate` | `prisma migrate dev` | Creates and applies new Prisma migrations |
| `npm run db:deploy` | `prisma migrate deploy` | Applies pending migrations (production/CI) |
| `npm run db:seed` | `tsx prisma/seed.ts` | Seeds test users, organizations, and invitations |
| `npm run db:reset` | `prisma migrate reset --force && tsx prisma/seed.ts` | Resets database and re-seeds |

---

## API Reference

All responses follow the standard envelope:
```json
// Success
{ "success": true, "message": "...", "data": { ... } }

// Error
{ "success": false, "message": "...", "errors": [{ "field": "email", "message": "..." }] }
```

### Day 2 API Endpoints

#### Members & Invitations
- `GET /api/organizations/:id/members?search=&role=&page=1&limit=20` - Search & filter members.
- `DELETE /api/organizations/:id/members/:membershipId` - Safe member removal enforcing RBAC.
- `POST /api/organizations/:id/invitations` - Send invitation (`{ email, role }`). Rate limited (20/hr/org).
- `GET /api/organizations/:id/invitations` - List pending/active invitations for the org.
- `POST /api/organizations/:id/invitations/:id/resend` - Regenerate token and extend expiry by 72h.
- `DELETE /api/organizations/:id/invitations/:id` - Cancel invitation (`CANCELLED`).
- `GET /api/invitations/:token` - Public lookup of invitation details.
- `POST /api/invitations/:token/accept` - Transactional acceptance of invitation.

#### Organization Settings & Logo
- `PATCH /api/organizations/:id` - Update name, description (max 500 chars), or slug (`OWNER`-only).
- `POST /api/organizations/:id/logo` - Upload logo (`multipart/form-data`, max 2MB, JPEG/PNG/WebP/SVG).

---

## Manual Testing Guide

Follow this step-by-step walkthrough to test all Day 2 features locally:

### 1. Test Member Search & Role Filter
1. Login as `alice@example.com` (`Password123!`).
2. Navigate to **Acme Corp** -> **Members** (`/dashboard/acme-corp/members`).
3. Type `"Bob"` in the search bar. Verify only Bob is displayed.
4. Filter by role `ADMIN`. Verify Bob is shown. Filter by role `OWNER`. Verify Alice is shown.

### 2. Test Member Removal & RBAC Enforcement
1. As **Alice** (`OWNER`), click **Remove** on Bob. The confirmation modal will show Bob's name and role.
2. Click **Remove Member**. Bob is removed from Acme Corp.
3. Log out and log in as **Carol** (`carol@example.com`, `MEMBER`).
4. Navigate to `/dashboard/acme-corp/members`. Verify the "Invite Member" button and "Remove" actions are hidden.
5. Attempting to call `DELETE /api/organizations/:id/members/:id` directly as Carol will return `403 Forbidden`.

### 3. Test Invitation Flow with Console Email Log
1. Log in as **Alice** (`alice@example.com`).
2. Navigate to `/dashboard/acme-corp/members` and click **Invite Member**.
3. Enter `newuser@example.com` and select `MEMBER`. Click **Send Invitation**.
4. Look at your terminal running `npm run dev`. You will see the formatted log:
   ```
   ============================================================
   [DEV EMAIL] INVITATION SENT VIA CONSOLE FALLBACK
   To: newuser@example.com
   Organization: Acme Corp
   Invited By: Alice Johnson
   Role: MEMBER
   Expires: ... (72 hours)
   Accept Link: http://localhost:3000/invitations/<token>
   ============================================================
   ```
5. Copy the `Accept Link` and open it in an **Incognito** window.
6. Since you are not logged in, click **Create Account to Accept**.
7. Complete registration. You will be automatically redirected back to accept and join Acme Corp!

### 4. Test Organization Settings, Logo & Slug Editing
1. Log in as **Alice** (`alice@example.com`).
2. Navigate to **Acme Corp** -> **Settings** (`/dashboard/acme-corp/settings`).
3. Update the description (e.g. `"The leading Acme corporation for widget manufacturing."`).
4. Select a logo file (< 2MB PNG/JPEG).
5. Change the slug to `acme-global`.
6. Click **Save Changes**. The page will notify you and redirect automatically to `/dashboard/acme-global/settings`.
7. Log out and log in as **Bob** (`bob@example.com`).
8. Navigate to `/dashboard/acme-global/settings`. Notice that the **Slug** field is disabled because only `OWNER` can modify organization slugs.

---

## Automated Testing

Run the Vitest integration test suite:
```bash
npm test
```

All 68 integration tests across 8 suites will execute:
- `tests/permissions.test.ts` (14 tests) - Complete matrix of `canViewMembers`, `canInviteRole`, `canRemoveMember`, `canEditSlug`, etc.
- `tests/invitations.test.ts` (14 tests) - Token generation, SHA-256 hashing, expiration, acceptance, duplicate rejection.
- `tests/memberships.test.ts` (10 tests) - Member search, role filters, safe removal, last-owner conflict.
- `tests/settings.test.ts` (8 tests) - Description updates, logo upload validation, OWNER-only slug changing.
- `tests/security.test.ts` (6 tests) - Multi-tenant isolation, cross-org data leakage prevention, CSRF Origin protection.
- `tests/auth.test.ts` (7 tests) - Registration, login, password complexity, cookie injection, session validation.
- `tests/organizations.test.ts` (6 tests) - Org creation, slug uniqueness, creator ownership assignment.
- `tests/rate-limit.test.ts` (3 tests) - Upstash rate limiting and local memory fallback.

---

## Vercel & Neon Deployment Guide

### 1. Database Setup (Neon PostgreSQL)
1. Create a Neon PostgreSQL project at [neon.tech](https://neon.tech).
2. Obtain both the **Pooled connection string** (for runtime `DATABASE_URL`) and the **Direct connection string** (for migrations `DIRECT_URL`).

### 2. Configure Vercel Project
1. Set Environment Variables in Vercel Dashboard:
   - `DATABASE_URL`: Neon pooled connection string
   - `DIRECT_URL`: Neon direct connection string
   - `JWT_SECRET`: `openssl rand -base64 48`
   - `NEXT_PUBLIC_APP_URL`: `https://your-production-domain.vercel.app`
   - `NEXT_PUBLIC_API_URL`: `https://your-production-domain.vercel.app/api`
   - `RESEND_API_KEY`: Your Resend API key
   - `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob read/write token

### 3. Deploy & Apply Migrations
```bash
npx prisma migrate deploy
```

---

## Security Notes & Trade-offs

- **Token Security**: Raw tokens exist only in transient memory during generation and in the emailed link. Database stores only the SHA-256 hex digest.
- **Race Condition Protection**: Invitation acceptance runs in an interactive database transaction checking status before mutating records.
- **Last Owner Safeguard**: An organization must always have at least one `OWNER`. Removing the last owner returns `409 Conflict`.
- **Known Limitation (Day 3 Feature)**: Direct role promotion/demotion to `OWNER` or transferring organization ownership is planned for Day 3. For Day 2, `OWNER` role cannot be invited directly.
- **Dev Fallbacks**: Missing `RESEND_API_KEY` or `BLOB_READ_WRITE_TOKEN` gracefully falls back to console logging and local data previews without breaking the development workflow.
