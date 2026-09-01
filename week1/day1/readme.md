# Day 1: Project System Requirements & Architecture Design

## Executive Overview

Welcome to **Day 1** of the **Multi-Tenant Project Management System** (SaaS) development project. 

The goal of Day 1 is to understand multi-tenant SaaS architecture, analyze system requirements, define user roles and permissions, design the database ERD, specify application architecture, and document end-to-end system workflows before starting development.

---

## Deliverables Summary

This directory contains the complete foundational design documents required for Day 1:

| Deliverable | Document Link | Description |
|---|---|---|
| **1. Requirements Document** | [requirements.md](./requirements.md) | Functional & non-functional specifications, SaaS multi-tenancy models, and tenant isolation strategy. |
| **2. System Architecture** | [system_architecture.md](./system_architecture.md) | Next.js App Router architecture diagram, middleware security layer, data scoping layer, and folder structure. |
| **3. Database ERD & Schemas** | [database_erd.md](./database_erd.md) | Mermaid Entity-Relationship Diagram, Mongoose collection definitions, data types, and index design. |
| **4. Roles & Permissions Matrix** | [roles_permission_matrix.md](./roles_permission_matrix.md) | Detailed RBAC permissions matrix covering Super Admin, Org Admin, Project Manager, and Team Member roles. |
| **5. System Workflows** | [workflow.md](./workflow.md) | End-to-end user lifecycle flow, Mermaid sequence diagram, and task state machine. |

---

## Technical Stack Selection

Based on project requirements and preferred standards, the stack selected is:

- **Framework:** Next.js 14+ (App Router, Server Components & Route Handlers)
- **Language:** TypeScript
- **Database:** MongoDB with Mongoose ODM (MongoDB Atlas)
- **Authentication:** JWT sessions stored in `httpOnly` secure cookies / NextAuth.js
- **Validation:** Zod schema validation
- **Styling:** Tailwind CSS

---

## Planned Application Directory Structure

```
project-root/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── accept-invite/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Role-aware main dashboard
│   │   ├── organizations/page.tsx      # Super Admin / Org Admin view
│   │   ├── users/page.tsx              # User management & invitations
│   │   ├── projects/
│   │   │   ├── page.tsx                # Project list
│   │   │   └── [projectId]/page.tsx    # Project detail & board
│   │   ├── tasks/page.tsx              # Task list / Kanban board
│   │   ├── teams/page.tsx              # Team management
│   │   ├── notifications/page.tsx      # In-app notifications
│   │   └── audit-logs/page.tsx         # Activity & audit logs
│   ├── api/
│   │   ├── auth/                       # Sign up, login, logout, me
│   │   ├── organizations/              # Org CRUD & settings
│   │   ├── users/                      # Invite, update, list users
│   │   ├── projects/                   # Project CRUD
│   │   ├── tasks/                      # Task CRUD & status transitions
│   │   ├── teams/                      # Team creation & assignment
│   │   ├── notifications/              # Read / mark read notifications
│   │   └── audit-logs/                 # Query audit trail
│   ├── layout.tsx
│   └── globals.css
├── models/                             # Mongoose Schema Definitions
│   ├── Organization.ts
│   ├── User.ts
│   ├── Project.ts
│   ├── Task.ts
│   ├── Team.ts
│   ├── Notification.ts
│   └── AuditLog.ts
├── lib/
│   ├── db.ts                           # Cached MongoDB connection helper
│   ├── auth.ts                         # JWT signing, verification, cookie management
│   ├── tenantScoping.ts                # Automatic orgId injection & query wrapper
│   └── logger.ts                       # Audit logging helper utility
├── middleware.ts                       # Session validation & orgId / RBAC context injection
├── components/                         # UI Components
│   ├── ui/                             # Buttons, inputs, modals, cards
│   ├── layout/                         # Sidebar, header, navigation
│   └── modules/                        # Entity-specific components (TaskCard, UserTable, etc.)
└── types/                              # Shared TypeScript Interfaces & DTOs
```

---

## Detailed Local Setup & Development Execution Plan

Follow these steps to initialize and run the project locally as development starts:

### Step 1: Environment Prerequisites
Ensure Node.js (v18.x or higher) and npm (v9.x or higher) are installed on your machine.
- Verify Node version: `node -v`
- Verify npm version: `npm -v`

### Step 2: Initialize Next.js 14+ Application
Initialize the project skeleton using `create-next-app` with App Router, TypeScript, and Tailwind CSS:
```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir=false
```

### Step 3: Install Core Dependencies
Install Mongoose for MongoDB data modeling, bcryptjs for password hashing, and Zod for schema validation:
```bash
npm install mongoose zod bcryptjs dotenv
npm install -D @types/bcryptjs @types/node tsx
```

### Step 4: Configure Database Connection (`lib/db.ts`)
Set up a singleton connection manager to maintain a cached database connection pool across Next.js API Route invocations:
1. Create `.env.local` file with your MongoDB Atlas URI:
   ```env
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/multi_tenant_pm?retryWrites=true&w=majority
   JWT_SECRET=your_jwt_secret_key_32_characters
   ```
2. Build `lib/db.ts` connection utility.

### Step 5: Implement Models & Tenant Scoping Layer
1. Define all 7 Mongoose collection schemas in `models/` with compound indexes (`{ orgId: 1, ... }`).
2. Build `lib/tenantScoping.ts` providing the `withTenant(query, orgId)` query wrapper.

### Step 6: Database Seeding & Verification
Run the database seed script to populate sample organizations, users, projects, and tasks for local testing:
```bash
npm run seed
```

### Step 7: Run Development Server
Launch the Next.js local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) and verify the health check endpoint at [http://localhost:3000/api/health](http://localhost:3000/api/health).

---

## Day 1 Status & Summary

All Day 1 requirements, multi-tenancy models, database ERD, role-based permissions matrix, system workflows, and Next.js project directory structure have been fully documented, reviewed, and linked.