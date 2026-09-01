# Week 1: Multi-Tenant Project Management System

Welcome to Week 1 of the **Multi-Tenant Project Management System** (SaaS).

---

## Directory Structure

Following the required project repository structure:

```
week1/
├── Day1/                   # Day 1: Requirements, Architecture, ERD & RBAC Design
│   ├── README.md           
│   ├── requirements.md
│   ├── system_architecture.md
│   ├── database_erd.md    
│   ├── roles_permission_matrix.md 
│   └── workflow.md        
├── day2/                   # Day 2: Next.js Setup, DB Connection, Schemas & Seed Script
│   ├── README.md
│   ├── task.md
│   ├── package.json
│   ├── lib/
│   ├── models/
│   ├── app/
│   └── scripts/
├── Day3/                   # Day 3 Tasks (To be updated as assigned)
├── Day4/                   # Day 4 Tasks (To be updated as assigned)
├── Day5/                   # Day 5 Tasks (To be updated as assigned)
├── archive/                # Historical/archived notes and legacy specs
└── README.md               # Week 1 Overview (This File)
```

---

## Daily Progress & Tasks

- **[Day 1](file:///d:/web3geeks_mern_internship/week1/Day1/README.md): System Requirements, Architecture Design, Database ERD & RBAC Matrix**
  - Multi-tenant architecture analysis & tenant isolation strategy selection (Shared DB with `orgId` scoping).
  - High-level System Architecture & Edge Middleware design.
  - Comprehensive Database ERD with Mongoose schema specifications & indexing.
  - RBAC Permission Matrix (Super Admin, Org Admin, Project Manager, Team Member).
  - End-to-end User & System Workflows with Mermaid sequence diagrams.
  - Initial repository setup plan & Next.js project architecture.

- **[Day 2](file:///d:/web3geeks_mern_internship/week1/day2/README.md): Next.js Backend Skeleton, DB Connection Engine, Mongoose Schemas & Seed Runner**
  - Created Next.js 14+ App Router project skeleton in `week1/day2`.
  - Configured MongoDB Atlas connection engine with Mongoose singleton caching (`lib/db.ts`).
  - Implemented tenant isolation scoping layer (`lib/tenantScoping.ts`) enforcing `{ orgId }` discriminator.
  - Built 7 complete Mongoose collection schemas (`Organization`, `User`, `Project`, `Task`, `Team`, `Notification`, `AuditLog`).
  - Built Edge Middleware stub (`middleware.ts`) for tenant resolution.
  - Built live Health Check endpoint (`GET /api/health`).
  - Created executable database seed runner (`scripts/seed.ts`).

- **Day 3:** *(Tasks will be documented when assigned)*
- **Day 4:** *(Tasks will be documented when assigned)*
- **Day 5:** *(Tasks will be documented when assigned)*
