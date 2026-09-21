# Team Collaboration SaaS - Multi-Tenant Platform (Day 1)

A production-grade, secure, multi-tenant "Team Collaboration SaaS" foundation built as a single Next.js project. It features user registration and login with httpOnly JWT cookies, organization (workspace) creation with transactional ownership assignment, role-based access control (`OWNER`, `ADMIN`, `MEMBER`), multi-tenant data isolation, rate limiting, and seamless deployment to Vercel with Neon PostgreSQL.

---

## Table of Contents
- [Tech Stack](#tech-stack)
- [Architecture & Layering](#architecture--layering)
- [Multi-Tenant Authorization & Higher-Order Wrappers](#multi-tenant-authorization--higher-order-wrappers)
- [Role & Permission Matrix](#role--permission-matrix)
- [Prerequisites & Getting Started](#prerequisites--getting-started)
- [Environment Variables](#environment-variables)
- [Seeded Test Accounts](#seeded-test-accounts)
- [Available Scripts](#available-scripts)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Vercel & Neon Deployment Guide](#vercel--neon-deployment-guide)
- [Security Notes](#security-notes)

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 15+ (App Router) | React Server & Client components, Route Handlers, Edge Middleware |
| **Language** | TypeScript (Strict Mode) | End-to-end type safety, zero `any` types |
| **Styling** | Tailwind CSS + Lucide Icons | Clean modern dark-mode design system, responsive UI |
| **Database** | PostgreSQL + Prisma ORM | Relational models with UUID primary keys and transactional integrity |
| **Authentication** | `bcryptjs` (Cost 12) + `jose` (JWT) | Pure JS password hashing and edge-compatible HS256 JWT tokens |
| **Validation** | Zod | Synchronized schema validation across client forms and server APIs |
| **State & Forms** | React Hook Form + TanStack Query | Client form management and query caching keyed by `organizationId` |
| **Rate Limiting** | `@upstash/ratelimit` + `@upstash/redis` | Distributed sliding-window limiter with in-memory fallback in dev/test |
| **Logging** | Pino | Structured JSON logging with automated redaction of sensitive credentials |
| **Testing** | Vitest | Integration test suite executing directly against route handlers |

---

## Architecture & Layering

The codebase follows a strict **Layered Single-Project Architecture**:

```
team-collab/
├── prisma/
│   ├── schema.prisma                        # Database schema with UUID keys & cascades
│   └── seed.ts                              # Idempotent seed script (Alice, Bob, Carol)
├── src/
│   ├── app/                                 # Next.js App Router
│   │   ├── (auth)/login/page.tsx            # Login with Zod validation
│   │   ├── (auth)/register/page.tsx         # Registration with password complexity
│   │   ├── (app)/layout.tsx                 # Authenticated application shell & navigation
│   │   ├── (app)/dashboard/page.tsx         # Smart redirect or empty state CTA
│   │   ├── (app)/dashboard/[orgSlug]/page.tsx# Org workspace, metrics & member lists
│   │   ├── (app)/organizations/new/page.tsx # Org creation with auto-slug generation
│   │   ├── (app)/profile/page.tsx           # User profile & account details
│   │   ├── api/                             # Route Handlers (`runtime = "nodejs"`)
│   │   │   ├── health/route.ts              # DB ping & health status
│   │   │   ├── auth/register/route.ts
│   │   │   ├── auth/login/route.ts
│   │   │   ├── auth/logout/route.ts
│   │   │   ├── auth/me/route.ts
│   │   │   ├── organizations/route.ts
│   │   │   ├── organizations/[organizationId]/route.ts
│   │   │   ├── organizations/[organizationId]/members/route.ts
│   │   │   └── [...slug]/route.ts           # JSON 404 catch-all
│   │   ├── layout.tsx, not-found.tsx, error.tsx, globals.css
│   ├── server/                              # BACKEND LAYER (Server-Only)
│   │   ├── config/env.ts                    # Lazy Zod-validated environment config
│   │   ├── db/prisma.ts                     # PrismaClient singleton with global dev cache
│   │   ├── lib/                             # jwt.ts, password.ts, slug.ts, cookies.ts, logger.ts, rate-limit.ts, origin.ts
│   │   ├── http/                            # AppError.ts, response.ts, with-handler.ts, with-auth.ts, with-org-role.ts, validate.ts
│   │   └── modules/                         # Business logic & services (auth, organizations, memberships)
│   ├── components/                          # UI & layout components (ui/, layout/, organizations/)
│   ├── lib/                                 # api-client.ts, validations.ts, utils.ts, constants.ts
│   ├── providers/                           # auth-provider.tsx, query-provider.tsx
│   ├── types/                               # Shared DTO contracts
│   └── middleware.ts                        # Edge route protection
├── tests/                                   # Vitest integration test suite
├── docker-compose.yml                       # Local PostgreSQL 16 container
├── next.config.ts                           # Security headers configuration
├── vercel.json                              # Vercel deployment region
└── package.json
```

### Why Route Handlers + `src/server` Layer?
- **Separation of Concerns**: Route handlers are thin controllers that parse input and format HTTP responses.
- **Client/Server Isolation**: Code in `src/server` never imports React or browser APIs, preventing server leaks.
- **Testability**: Services and handlers are easily unit- and integration-tested with standard `NextRequest` objects without requiring a running web server.

---

## Multi-Tenant Authorization & Higher-Order Wrappers

Express-style middleware is replaced by composable higher-order wrappers in Next.js:

```ts
export const GET = withHandler(
  withAuth(
    withOrgRole(["OWNER", "ADMIN", "MEMBER"], async (req, ctx) => {
      // ctx.user, ctx.organization, and ctx.membership are fully typed and verified
      return successResponse({ ... });
    })
  )
);
```

### The Wrapper Execution Chain:
1. **`withHandler`**:
   - Central `try/catch` error boundary.
   - Enforces CSRF `Origin` verification on mutating HTTP methods (`POST`, `PATCH`, `DELETE`).
   - Maps errors (`AppError`, `ZodError`, Prisma `P2002`/`P2025`, malformed JSON) to standard JSON envelopes.
   - Structured JSON logging with credential redaction.
2. **`withAuth`**:
   - Reads JWT from `req.cookies` (httpOnly `team_collab_token`).
   - Verifies JWT HS256 signature using `jose`.
   - Fetches active user from database without returning password hash.
   - Rejects unauthenticated requests with `401 Unauthorized`.
   - Injects `ctx.user`.
3. **`withOrgRole(allowedRoles, handler)`**:
   - Validates that `organizationId` parameter is a valid UUID (`400 Bad Request`).
   - Verifies organization existence (`404 Not Found`).
   - Confirms user has a `Membership` record for this organization (`403 Forbidden`).
   - Validates that user's membership role matches `allowedRoles` (`403 Forbidden`).
   - Injects `ctx.organization` and `ctx.membership`.

---

## Role & Permission Matrix

| Action | Route | Owner | Admin | Member | Non-Member |
|---|---|:---:|:---:|:---:|:---:|
| **List User Organizations** | `GET /api/organizations` | Yes | Yes | Yes | No (Only own orgs returned) |
| **View Organization Details** | `GET /api/organizations/:id` | Yes | Yes | Yes | `403 Forbidden` |
| **List Organization Members** | `GET /api/organizations/:id/members` | Yes | Yes | Yes | `403 Forbidden` |
| **Rename Organization** | `PATCH /api/organizations/:id` | Yes | Yes | `403 Forbidden` | `403 Forbidden` |
| **Delete Organization** | `DELETE /api/organizations/:id` | Yes | `403 Forbidden` | `403 Forbidden` | `403 Forbidden` |

---

## Prerequisites & Getting Started

### Prerequisites
- **Node.js**: v20.x or v22.x
- **Docker & Docker Compose** (for local PostgreSQL 16) or hosted PostgreSQL (e.g. Neon)

### Quick Start (Local Development)

1. **Clone the repository and install dependencies**:
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

| Variable | Required | Description | Example |
|---|:---:|---|---|
| `NODE_ENV` | Yes | Environment mode | `development` / `production` / `test` |
| `DATABASE_URL` | Yes | Pooled connection string for runtime | `postgresql://postgres:postgrespassword@localhost:5432/team_collab_dev?schema=public` |
| `DIRECT_URL` | Yes | Direct connection string for migrations | `postgresql://postgres:postgrespassword@localhost:5432/team_collab_dev?schema=public` |
| `TEST_DATABASE_URL` | Dev/Test | Database URL for automated test runs | `postgresql://postgres:postgrespassword@localhost:5432/team_collab_test?schema=public` |
| `JWT_SECRET` | Yes | Secret for signing HS256 tokens (min 32 chars) | `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | No | JWT token expiry duration | `7d` |
| `NEXT_PUBLIC_APP_URL` | Yes | Frontend application root URL | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Yes | API base URL | `http://localhost:3000/api` |
| `UPSTASH_REDIS_REST_URL` | Prod | Upstash Redis REST URL for rate limiting | `https://your-upstash-redis.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Prod | Upstash Redis REST Token | `your_upstash_token` |

---

## Seeded Test Accounts

The seed script creates 3 test users (password: `Password123!` for all) and 2 organizations:

| User | Email | Acme Corp Role | Startup Labs Role |
|---|---|:---:|:---:|
| **Alice Johnson** | `alice@example.com` | **OWNER** | **MEMBER** |
| **Bob Smith** | `bob@example.com` | **ADMIN** | **OWNER** |
| **Carol Williams** | `carol@example.com` | **MEMBER** | *(None)* |

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `next dev` | Starts local Next.js dev server |
| `npm run build` | `prisma generate && next build` | Compiles schema and builds production bundle |
| `npm run start` | `next start` | Runs production server |
| `npm run lint` | `next lint` | Lints project files |
| `npm run typecheck` | `tsc --noEmit` | Strict TypeScript verification |
| `npm test` | `vitest run --fileParallelism=false` | Executes all 25 automated integration tests |
| `npm run db:up` | `docker compose up -d` | Starts local Postgres container |
| `npm run db:migrate` | `prisma migrate dev` | Creates and applies new Prisma migrations |
| `npm run db:deploy` | `prisma migrate deploy` | Applies pending migrations (production/CI) |
| `npm run db:seed` | `tsx prisma/seed.ts` | Seeds test users and organizations |
| `npm run db:reset` | `prisma migrate reset --force && tsx prisma/seed.ts` | Resets database and re-seeds |

---

## API Reference

All responses follow the unified envelope:
```json
// Success Response
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}

// Error Response
{
  "success": false,
  "message": "Error description",
  "errors": [{ "field": "email", "message": "Invalid email" }]
}
```

### Endpoints Overview

#### Authentication
- `POST /api/auth/register` - Create user account, sets httpOnly cookie.
- `POST /api/auth/login` - Verify credentials, sets httpOnly cookie.
- `POST /api/auth/logout` - Clears auth cookie.
- `GET /api/auth/me` - Get profile of authenticated user.

#### Organizations
- `GET /api/organizations` - Lists ONLY organizations the user belongs to (with role and member count).
- `POST /api/organizations` - Create organization; creator is transactionally assigned `OWNER`.
- `GET /api/organizations/:id` - Fetch organization details and counts (`members: N, projects: 0, tasks: 0`).
- `PATCH /api/organizations/:id` - Rename organization (`OWNER` or `ADMIN` only).
- `DELETE /api/organizations/:id` - Delete organization (`OWNER` only).
- `GET /api/organizations/:id/members` - List organization members with their roles.

#### Infrastructure
- `GET /api/health` - Health check executing `SELECT 1` against database.
- `ALL /api/*` - 404 JSON catch-all.

---

## Testing

Run the test suite:
```bash
npm test
```

The test suite covers:
1. **Registration**: Success, duplicate email (409), invalid email (400), weak password (400), no password leakage in response.
2. **Login**: Success cookie injection, invalid password (401), unknown email (401 with identical timing-safe message).
3. **Session & Profile**: `/api/auth/me` protection (401 without cookie, 200 with cookie), logout cookie clearing.
4. **Org Creation**: Creator assigned `OWNER`, duplicate slug rejected (409), client-supplied `role`/`ownerId` ignored.
5. **Multi-Tenant Isolation**: User A forbidden from GET/PATCH/DELETE on User B orgs (403), `GET /api/organizations` returns only own memberships.
6. **Role Permissions**: Member view allowed, Member rename rejected (403), Admin rename allowed, Admin delete rejected (403), Owner delete allowed (200).
7. **Validation & Errors**: Non-existent org (404), invalid UUID format (400).
8. **Multi-Org Role Segregation**: User with different roles in Org 1 and Org 2 receives proper role in each; Org 1 data never appears in Org 2.
9. **Origin CSRF Protection**: Mismatched cross-origin mutating requests rejected with 403.

---

## Vercel & Neon Deployment Guide

### 1. Database Setup (Neon PostgreSQL)
1. Create a Neon PostgreSQL project at [neon.tech](https://neon.tech).
2. Obtain both the **Pooled connection string** (for runtime `DATABASE_URL`) and the **Direct connection string** (for migrations `DIRECT_URL`).

### 2. Configure Vercel Project
1. In `vercel.json`, verify that the deployment region matches your Neon database region (e.g., `iad1` for US East):
   ```json
   {
     "framework": "nextjs",
     "regions": ["iad1"],
     "cleanUrls": true
   }
   ```
2. Set Environment Variables in the Vercel Dashboard:
   - `DATABASE_URL`: Neon pooled connection string
   - `DIRECT_URL`: Neon direct connection string
   - `JWT_SECRET`: Generate using `openssl rand -base64 48`
   - `JWT_EXPIRES_IN`: `7d`
   - `NEXT_PUBLIC_APP_URL`: `https://your-production-domain.vercel.app`
   - `NEXT_PUBLIC_API_URL`: `https://your-production-domain.vercel.app/api`
   - `UPSTASH_REDIS_REST_URL`: Upstash Redis REST URL
   - `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis REST Token

### 3. Deploy & Run Migrations
Run Prisma migrations in CI or from your deployment pipeline:
```bash
npx prisma migrate deploy
```
*(Note: Never run the seed script in production).*

### 4. Post-Deploy Smoke Test Checklist
- [ ] Visit `/register` and create a new account.
- [ ] Verify automatic redirect to `/dashboard`.
- [ ] Create a new organization with a custom slug.
- [ ] Switch between organizations in the top navigation switcher.
- [ ] Visit `/profile` and verify account information.
- [ ] Log out and verify redirection to `/login`.

---

## Security Notes
- **Password Security**: Bcryptjs with cost 12. Passwords are never returned in queries or serialized DTOs.
- **Session Security**: JWT stored in `httpOnly`, `sameSite: lax`, `secure` (in production) cookies.
- **CSRF Defense**: `Origin` header validation against the request host on all mutating requests.
- **Rate Limiting**: Sliding window rate limiter on auth routes (10 requests / 15 minutes / IP).
- **Security Headers**: Restrictive `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and HSTS configured in `next.config.ts`.
