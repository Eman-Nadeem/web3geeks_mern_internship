# Day 2: Technical Foundation, Database Schemas & Multi-Tenant Isolation

Welcome to **Day 2** of the **Multi-Tenant Project Management SaaS System** (Web3Geeks MERN / Next.js Internship).

Day 2 builds directly upon the architectural specifications and database designs established in [Day 1](../day1/readme.md). It delivers a fully functional Next.js App Router (TypeScript) backend foundation with MongoDB Atlas integration, schema-level multi-tenant data isolation (`orgId` discriminator), comprehensive Mongoose schemas, a database seeding suite, and a live health check monitoring endpoint.

> [!NOTE]
> **Branching & Project Architecture:** This `day2` folder serves as the core baseline codebase. For upcoming daily tasks (Day 3, Day 4, etc.), `day2` will be branched / copied as the starting point for feature implementations.

---

## 📋 Table of Contents

- [Overview & Deliverables](#-overview--deliverables)
- [Tech Stack Selection](#-tech-stack-selection)
- [Directory Structure](#-directory-structure)
- [Core Architectural Features](#-core-architectural-features)
  - [1. Multi-Tenant Isolation Scoping](#1-multi-tenant-isolation-scoping)
  - [2. Singleton Connection Caching](#2-singleton-connection-caching)
  - [3. Edge Middleware Tenant Resolution](#3-edge-middleware-tenant-resolution)
  - [4. Mongoose Database Models](#4-mongoose-database-models)
- [🚀 Local Setup & Installation Guide](#-local-setup--installation-guide)
- [🌱 Database Seeding Engine](#-database-seeding-engine)
- [🔍 Health Check & Endpoint Verification](#-health-check--endpoint-verification)
- [🛡️ Security & Environment Best Practices](#️-security--environment-best-practices)
- [Roadmap & Next Steps](#roadmap--next-steps)

---

## 🎯 Overview & Deliverables

| Deliverable | Location | Description |
|---|---|---|
| **1. Backend Skeleton** | [`week1/day2`](file:///d:/web3geeks_mern_internship/week1/day2/) | Next.js App Router project codebase initialized with TypeScript & Tailwind CSS. |
| **2. Database Connection** | [`lib/db.ts`](file:///d:/web3geeks_mern_internship/week1/day2/lib/db.ts) | Cached singleton Mongoose connection manager optimized for serverless API routes. |
| **3. Tenant Isolation Strategy** | [`lib/tenantScoping.ts`](file:///d:/web3geeks_mern_internship/week1/day2/lib/tenantScoping.ts) | Security helper `withTenant(query, orgId)` enforcing `{ orgId }` discriminator filtering. |
| **4. Mongoose Schemas** | [`models/`](file:///d:/web3geeks_mern_internship/week1/day2/models/) | 7 core entity models (`Organization`, `User`, `Project`, `Task`, `Team`, `Notification`, `AuditLog`). |
| **5. Middleware Stub** | [`middleware.ts`](file:///d:/web3geeks_mern_internship/week1/day2/middleware.ts) | Edge middleware extracting `x-org-id` request headers and setting tenant context. |
| **6. Health Check Endpoint** | [`app/api/health/route.ts`](file:///d:/web3geeks_mern_internship/week1/day2/app/api/health/route.ts) | `GET /api/health` monitoring system uptime, environment, and MongoDB readyState. |
| **7. Database Seed Script** | [`scripts/seed.ts`](file:///d:/web3geeks_mern_internship/week1/day2/scripts/seed.ts) | Automated seed script generating tenants (Acme Corp & Stark Industries), users, projects, and tasks. |

---

## 🛠️ Tech Stack Selection

- **Framework:** Next.js 16 (App Router & Server Handlers)
- **Language:** TypeScript 5
- **Database:** MongoDB Atlas via Mongoose 8 (ODM)
- **Validation & Hashing:** Zod 3.22 & Bcryptjs 2.4
- **Script Runner:** `tsx` (TypeScript Execution)
- **Styling:** Tailwind CSS v4

---

## 📁 Directory Structure

```
day2/
├── app/
│   ├── api/
│   │   └── health/
│   │       └── route.ts          # Health check endpoint (GET /api/health)
│   ├── globals.css               # Base Tailwind CSS rules
│   ├── layout.tsx                # Root layout component
│   └── page.tsx                  # Base landing view
├── lib/
│   ├── db.ts                     # Cached MongoDB Mongoose connection manager
│   └── tenantScoping.ts          # Scoping utility enforcing tenant isolation (orgId)
├── models/                       # Mongoose Schemas & TypeScript Interfaces
│   ├── AuditLog.ts
│   ├── Notification.ts
│   ├── Organization.ts
│   ├── Project.ts
│   ├── Task.ts
│   ├── Team.ts
│   └── User.ts
├── scripts/
│   └── seed.ts                   # Database seed script for MongoDB Atlas
├── .env.example                  # Environment template (NO SECRETS COMMITTED)
├── .gitignore                    # Environment & build ignore configuration
├── middleware.ts                 # Next.js Edge Middleware for org header extraction
├── package.json                  # Scripts & project dependencies
├── task.md                       # Day 2 task requirements
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## 🔐 Core Architectural Features

### 1. Multi-Tenant Isolation Scoping
All tenant-owned models store an `orgId` reference to the `Organization` collection. Database queries leverage `withTenant(query, orgId)` from `lib/tenantScoping.ts`:

```typescript
import { withTenant } from '@/lib/tenantScoping';
import { Task } from '@/models/Task';

// Ensures queries strictly match the authenticated tenant's organization ID
const tenantTasks = await Task.find(
  withTenant({ status: 'IN_PROGRESS' }, currentOrgId)
);
```

### 2. Singleton Connection Caching
In serverless runtime environments (such as Next.js API route handlers), creating new Mongoose connections per request can exhaust connection pools. `lib/db.ts` uses global caching to re-use connection promises across invocations.

### 3. Edge Middleware Tenant Resolution
`middleware.ts` intercepts requests matching `/api/*` and extracts tenant identifiers (`x-org-id`), setting request context for downstream route processing.

### 4. Mongoose Database Models
The project implements 7 models with explicit compound indexing (`{ orgId: 1, ... }`) for query speed and data boundary enforcement:
- **`Organization`**: Tenant identity, subscription plan, and owner link.
- **`User`**: User profile, global/tenant role (`SuperAdmin`, `OrgAdmin`, `ProjectManager`, `TeamMember`).
- **`Project`**: Organization projects with budget, timeline, and status.
- **`Task`**: Sprint/project task items with priority, assignment, and status transitions.
- **`Team`**: Sub-groupings within organizations.
- **`Notification`**: In-app user notifications.
- **`AuditLog`**: Compliance trail tracking security & system actions.

---

## 🚀 Local Setup & Installation Guide

Follow these steps to configure and launch the application locally:

### 1. Prerequisites
Ensure Node.js (v18+) and npm are installed.

### 2. Install Project Dependencies
Navigate into the `week1/day2` folder and run:
```bash
npm install
```

### 3. Environment Configuration
Copy the template `.env.example` file to `.env.local`:
```bash
cp .env.example .env.local
```

Open `.env.local` and populate your local MongoDB Atlas connection string:
```env
# MongoDB Atlas Connection URI
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/multi_tenant_pm?retryWrites=true&w=majority

# App Configuration
PORT=3000
NODE_ENV=development
JWT_SECRET=super-secret-jwt-key-change-in-production-32-chars
```

> [!IMPORTANT]
> **Security Notice:** Never commit `.env` or `.env.local` to Git. Ensure `.env.local` remains listed inside `.gitignore`.

---

## 🌱 Database Seeding Engine

To populate your database with initial tenant data, roles, users, projects, and tasks:

```bash
npm run seed
```

**Seeded Test Accounts (Default Password for all: `Password123!`):**
- **Super Admin:** `superadmin@system.com`
- **Acme Corp Admin:** `admin@acme.com`
- **Acme Corp Project Manager:** `pm@acme.com`
- **Acme Corp Member:** `member@acme.com`
- **Stark Industries Admin:** `admin@stark.com`

---

## 🔍 Health Check & Endpoint Verification

Start the local Next.js development server:
```bash
npm run dev
```

Test the health check endpoint to confirm active MongoDB Atlas connection:

- **Browser URL:** `http://localhost:3000/api/health`
- **cURL Request:**
  ```bash
  curl http://localhost:3000/api/health
  ```

**Sample Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-09-02T00:50:00.000Z",
  "environment": "development",
  "latencyMs": 42,
  "database": {
    "status": "connected",
    "readyState": 1,
    "host": "cluster0.mongodb.net",
    "name": "multi_tenant_pm"
  },
  "services": {
    "multiTenancyScoping": "active",
    "rbacGuard": "initialized"
  }
}
```

---

## 🛡️ Security & Environment Best Practices

1. **Keep Secrets Out of Source Control:** Store secrets only in `.env.local`.
2. **Revoke Exposed Credentials Immediately:** If a URI or password is accidentally committed or pushed, revoke the database user in MongoDB Atlas right away.
3. **Validate Schemas:** Use `withTenant` on every query to enforce isolation.

---

## 📌 Roadmap & Next Steps

- **Day 3:** Authentication (JWT / NextAuth) & User Session Management.
- **Day 4:** Organization & User Invitation API endpoints with RBAC checks.
- **Day 5:** Project & Task Management API endpoints with full CRUD and audit logging.
