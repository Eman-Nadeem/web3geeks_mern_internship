# Day 3: Multi-Tenant Authentication, JWT Session Management & RBAC

Welcome to **Day 3** of the **Multi-Tenant Project Management SaaS System** (Web3Geeks MERN / Next.js Internship).

Day 3 builds upon the database architecture established in [Day 2](../day2/README.md). It implements complete multi-tenant authentication, JWT session management (access & refresh tokens stored in `httpOnly` cookies and Bearer headers), Edge Middleware tenant-resolution, Role-Based Access Control (RBAC), password reset flows, and an integration test suite.

---

## 📋 Table of Contents

- [Overview & Deliverables](#-overview--deliverables)
- [Tech Stack & Security Architecture](#-tech-stack--security-architecture)
- [Directory Structure](#-directory-structure)
- [Authentication API Endpoints](#-authentication-api-endpoints)
- [Role-Based Access Control (RBAC) Matrix](#-role-based-access-control-rbac-matrix)
- [Multi-Tenant Data Isolation Enforcement](#-multi-tenant-data-isolation-enforcement)
- [🚀 Local Setup & Installation Guide](#-local-setup--installation-guide)
- [🧪 Automated Integration Testing](#-automated-integration-testing)
- [🌱 Database Seeding Engine](#-database-seeding-engine)
- [Roadmap & Next Steps](#roadmap--next-steps)

---

## 🎯 Overview & Deliverables

| Deliverable | Location | Description |
|---|---|---|
| **1. Auth Utilities & JWT System** | [`lib/auth.ts`](file:///d:/web3geeks_mern_internship/week1/day3/lib/auth.ts) | Edge-compatible JWT signing/verification (`jose`), password hashing (`bcryptjs`), cookie handlers. |
| **2. RBAC Guard System** | [`lib/rbac.ts`](file:///d:/web3geeks_mern_internship/week1/day3/lib/rbac.ts) | Roles (`SuperAdmin`, `OrgAdmin`, `ProjectManager`, `TeamMember`), permission matrix, API guard helpers. |
| **3. Real Tenant Middleware** | [`middleware.ts`](file:///d:/web3geeks_mern_internship/week1/day3/middleware.ts) | Edge Middleware verifying JWTs and injecting immutable `x-tenant-id`, `x-user-id`, `x-user-role` headers. |
| **4. Auth Endpoints** | [`app/api/auth/`](file:///d:/web3geeks_mern_internship/week1/day3/app/api/auth/) | Signup, Login, Token Refresh, Logout, User Session Profile (`/api/auth/me`), Forgot/Reset Password. |
| **5. Tenant-Scoped Resource APIs** | [`app/api/`](file:///d:/web3geeks_mern_internship/week1/day3/app/api/) | Tenant-isolated endpoints for `/api/users`, `/api/projects`, and `/api/tasks` protected by RBAC guards. |
| **6. Integration Test Suite** | [`scripts/test-auth.ts`](file:///d:/web3geeks_mern_internship/week1/day3/scripts/test-auth.ts) | Automated test suite validating hashing, JWT issuance, tenant isolation, and RBAC rules (`npm run test:auth`). |

---

## 🛠️ Tech Stack & Security Architecture

- **Framework:** Next.js 16 (App Router & Server Route Handlers)
- **Language:** TypeScript 5
- **Database:** MongoDB Atlas via Mongoose 8 (ODM)
- **JWT & Encryption:** `jose` (Edge-compatible JWT) & `bcryptjs` (Password hashing)
- **Validation:** Zod 3.22 (Input Schema Validation)
- **Test Runner:** `tsx` execution (`npm run test:auth`)

### Security Features:
1. **Preventing Cross-Tenant Spoofing**: `middleware.ts` extracts `orgId` strictly from the signed, cryptographically verified JWT payload (`x-tenant-id`). Any client-supplied `orgId` query parameter or body property is ignored for context resolution.
2. **Dual-Token System**:
   - `access_token` (Short-lived, 15 minutes, `httpOnly`, `sameSite: lax`)
   - `refresh_token` (Long-lived, 7 days, `httpOnly`, `sameSite: lax`)
3. **Password Security**: Passwords hashed with bcrypt (salt rounds = 10). Password reset tokens generated via `crypto.randomBytes(32)` and stored as SHA-256 hashes.

---

## 📁 Directory Structure

```
day3/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── signup/route.ts        # POST /api/auth/signup (Org + Admin bootstrapping)
│   │   │   ├── login/route.ts         # POST /api/auth/login
│   │   │   ├── refresh/route.ts       # POST /api/auth/refresh
│   │   │   ├── logout/route.ts        # POST /api/auth/logout
│   │   │   ├── me/route.ts            # GET /api/auth/me (Protected user profile)
│   │   │   ├── forgot-password/route.ts# POST /api/auth/forgot-password
│   │   │   └── reset-password/route.ts # POST /api/auth/reset-password
│   │   ├── projects/route.ts          # GET/POST /api/projects (Tenant-scoped + RBAC)
│   │   ├── tasks/route.ts             # GET/POST /api/tasks (Tenant-scoped + RBAC)
│   │   ├── users/route.ts             # GET /api/users (Tenant-scoped + RBAC)
│   │   └── health/route.ts            # System health check endpoint
├── lib/
│   ├── auth.ts                        # JWT issuance, verification, cookie management
│   ├── rbac.ts                        # Roles, permissions, API authorization guards
│   ├── db.ts                          # Cached MongoDB connection manager
│   └── tenantScoping.ts               # Multi-tenant scoping helper (withTenant)
├── models/                            # Mongoose Schemas & Models
│   ├── User.ts                        # User schema with refreshTokenHash & resetToken
│   ├── Organization.ts
│   ├── Project.ts
│   ├── Task.ts
│   ├── Team.ts
│   ├── Notification.ts
│   └── AuditLog.ts
├── scripts/
│   ├── seed.ts                        # Database seed script for MongoDB Atlas
│   └── test-auth.ts                   # Integration test suite runner
├── middleware.ts                      # Edge Middleware for JWT auth & tenant context
├── package.json
└── task.md                            # Day 3 task specifications
```

---

## 🔑 Authentication API Endpoints

### 1. Organization Signup (`POST /api/auth/signup`)
Creates a new tenant Organization and its initial `OrgAdmin` user in a single workflow.
```json
// Request Body
{
  "orgName": "Cyberdyne Systems",
  "orgSlug": "cyberdyne",
  "fullName": "Sarah Connor",
  "email": "sarah@cyberdyne.com",
  "password": "Password123!"
}
```

### 2. User Login (`POST /api/auth/login`)
Authenticates user credentials and sets `access_token` and `refresh_token` HTTP cookies.
```json
// Request Body
{
  "email": "admin@acme.com",
  "password": "Password123!"
}
```

### 3. Authenticated Session (`GET /api/auth/me`)
Protected route returning user profile, tenant organization details, and role permissions.

### 4. Password Reset Flow
- `POST /api/auth/forgot-password`: Generates reset token (valid 1 hour) and logs simulated URL to dev console.
- `POST /api/auth/reset-password`: Accepts token + `newPassword` and updates credentials.

---

## 🛡️ Role-Based Access Control (RBAC) Matrix

| Permission | SuperAdmin | OrgAdmin | ProjectManager | TeamMember |
|---|:---:|:---:|:---:|:---:|
| `ORG_MANAGE` | ✅ | ✅ | ❌ | ❌ |
| `USER_INVITE` | ✅ | ✅ | ❌ | ❌ |
| `USER_MANAGE` | ✅ | ✅ | ❌ | ❌ |
| `PROJECT_CREATE` | ✅ | ✅ | ❌ | ❌ |
| `PROJECT_READ` | ✅ | ✅ | ✅ | ✅ |
| `PROJECT_UPDATE` | ✅ | ✅ | ✅ | ❌ |
| `PROJECT_DELETE` | ✅ | ✅ | ❌ | ❌ |
| `TASK_CREATE` | ✅ | ✅ | ✅ | ❌ |
| `TASK_READ` | ✅ | ✅ | ✅ | ✅ |
| `TASK_UPDATE` | ✅ | ✅ | ✅ | ✅ |
| `TEAM_MANAGE` | ✅ | ✅ | ✅ | ❌ |

---

## 🔒 Multi-Tenant Data Isolation Enforcement

Database queries across all endpoints enforce isolation using `withTenant(query, authUser.orgId)`:

```typescript
import { requirePermission } from '@/lib/rbac';
import { withTenant } from '@/lib/tenantScoping';
import { Project } from '@/models/Project';

export async function GET(req: Request) {
  // 1. Enforce RBAC permission
  const authResult = await requirePermission(req, 'PROJECT_READ');
  if (authResult.error) return authResult.error;

  const { user } = authResult;

  // 2. Query strictly scoped to authenticated tenant's orgId
  const projects = await Project.find(withTenant({}, user.orgId));
  return NextResponse.json({ projects });
}
```

---

## 🚀 Local Setup & Installation Guide

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration (`.env.local`):**
   ```env
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/multi_tenant_pm?retryWrites=true&w=majority
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=super-secret-jwt-key-change-in-production-32-chars
   ```

3. **Seed Database:**
   ```bash
   npm run seed
   ```

4. **Run Dev Server:**
   ```bash
   npm run dev
   ```

---

## 🧪 Automated Integration Testing

Run the automated auth and RBAC integration test suite:

```bash
npm run test:auth
```

**Test Output Verification:**
```
==================================================
🧪 DAY 3: MULTI-TENANT AUTH & RBAC INTEGRATION TESTS
==================================================

Successfully connected to MongoDB Atlas
Connected to database successfully.

--- TEST SUITE 1: Password Security & Hashing ---
  ✅ PASS: Password is properly hashed with bcrypt
  ✅ PASS: Correct password verifies successfully
  ✅ PASS: Incorrect password fails verification

--- TEST SUITE 2: JWT Issuance & Payload Claims ---
  ✅ PASS: JWT Access Token generated
  ✅ PASS: JWT Token signature verified successfully
  ✅ PASS: JWT Payload contains correct userId
  ✅ PASS: JWT Payload contains correct orgId
  ✅ PASS: JWT Payload contains correct role

--- TEST SUITE 3: RBAC Role & Permission Enforcer ---
  ✅ PASS: OrgAdmin possesses USER_MANAGE permission
  ✅ PASS: OrgAdmin possesses PROJECT_CREATE permission
  ✅ PASS: TeamMember is DENIED USER_MANAGE permission
  ✅ PASS: TeamMember is DENIED PROJECT_DELETE permission
  ✅ PASS: TeamMember possesses TASK_READ permission

--- TEST SUITE 4: Tenant Data Isolation ---
  ✅ PASS: Query A scoped exclusively to Tenant Org A
  ✅ PASS: Query B scoped exclusively to Tenant Org B
  ✅ PASS: Tenant Org A cannot match Tenant Org B context

--- TEST SUITE 5: Signup & Tenant Bootstrapping ---
  ✅ PASS: New Organization created successfully
  ✅ PASS: New User linked to correct Organization orgId
  ✅ PASS: New Tenant Creator assigned OrgAdmin role

--- TEST SUITE 6: User Authentication & Login ---
  ✅ PASS: User found in database by email
  ✅ PASS: User credential login verification passed

==================================================
RESULTS: 21 PASSED, 0 FAILED
==================================================
```

---

## 📌 Roadmap & Next Steps

- **Day 4:** Organization & User Invitation API endpoints with RBAC enforcement and invitation tokens.
- **Day 5:** Project & Task Management API endpoints with full CRUD, comment threads, and audit logging.
