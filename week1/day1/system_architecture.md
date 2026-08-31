# System Architecture — Multi-Tenant Project Management System

## 1. High-Level Architecture Overview

The platform uses a modern multi-tenant micro-monolith architecture built with **Next.js 14+ (App Router)** and **MongoDB**. Application logic, route handling, middleware guards, and client-side server components reside in a single deployable unit while providing strict logical tenant separation at the database level.

---

## 2. System Architecture Diagram

### 2.1 Visual Architecture (Mermaid)

```mermaid
flowchart TD
    Client["Client Web Browser (Next.js React UI)"]
    
    subgraph EdgeMiddleware["Edge Middleware Layer (middleware.ts)"]
        JWTCookie["JWT Auth Verification"]
        OrgResolver["Tenant Resolution (Extract orgId)"]
        RBACGuard["RBAC Authorization Guard"]
    end
    
    subgraph NextServer["Next.js 14 App Router Engine"]
        RSC["React Server Components"]
        API["Route Handlers (/app/api/*)"]
        
        subgraph LogicLayer["Business & Security Scoping Layer"]
            ZodVal["Zod Input Validation"]
            TenantScoper["Tenant Query Scoper (lib/tenantScoping.ts)"]
            AuditLogger["Audit Log Decorator"]
        end
    end
    
    subgraph DatabaseLayer["MongoDB Database Instance"]
        MongoDB[("Shared MongoDB Database")]
        OrgColl[("organizations")]
        UserColl[("users (with orgId)")]
        ProjColl[("projects (with orgId)")]
        TaskColl[("tasks (with orgId)")]
        TeamColl[("teams (with orgId)")]
        NotifColl[("notifications (with orgId)")]
        AuditColl[("audit_logs (with orgId)")]
    end
    
    Client -->|HTTPS Request + HTTPOnly Cookie| EdgeMiddleware
    EdgeMiddleware --> JWTCookie
    JWTCookie --> OrgResolver
    OrgResolver --> RBACGuard
    
    RBACGuard -->|Inject X-Org-Id & X-User-Role Headers| RSC
    RBACGuard -->|Inject X-Org-Id & X-User-Role Headers| API
    
    API --> ZodVal
    ZodVal --> TenantScoper
    TenantScoper --> AuditLogger
    
    TenantScoper -->|Auto-Scoped Queries { orgId, ... }| MongoDB
    MongoDB --- OrgColl
    MongoDB --- UserColl
    MongoDB --- ProjColl
    MongoDB --- TaskColl
    MongoDB --- TeamColl
    MongoDB --- NotifColl
    MongoDB --- AuditColl
```

---

### 2.2 Layered System Blueprint (ASCII View)

```
+-----------------------------------------------------------------------+
|                           CLIENT LAYER                                |
|  Next.js 14 React Frontend (Dashboard, Kanban, Modals, Forms)          |
+-----------------------------------------------------------------------+
                                   |
                                   v  (HTTPS / httpOnly Session Cookie)
+-----------------------------------------------------------------------+
|                    EDGE MIDDLEWARE GUARD (middleware.ts)             |
|  1. Intercept Request & Parse Session Token                            |
|  2. Validate JWT signature & check token expiration                   |
|  3. Extract userId, orgId, role                                       |
|  4. Match request path against RBAC Route Matrix                       |
|  5. Forward sanitized request with headers:                           |
|     [x-user-id, x-org-id, x-user-role]                                 |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                   NEXT.JS APP ROUTER BACKEND (app/api/*)              |
|  - Auth Endpoints (/api/auth)                                         |
|  - Tenant / User Endpoints (/api/organizations, /api/users)           |
|  - Domain Endpoints (/api/projects, /api/tasks, /api/teams)           |
|  - System Endpoints (/api/notifications, /api/audit-logs)             |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|               TENANT SCOPING & DATA LAYER (lib/tenantScoping.ts)      |
|  - Mandatory Org Filter Injection: query = { ...query, orgId }        |
|  - Mongoose ODM & Connection Pool (lib/db.ts)                         |
|  - Zod Validation & Audit Event Triggers                             |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                   DATABASE LAYER (MongoDB Atlas)                      |
|  - Shared DB instance                                                 |
|  - All data documents contain `orgId: ObjectId`                       |
|  - Indexed by `{ orgId: 1, ... }` for zero cross-tenant leakage      |
+-----------------------------------------------------------------------+
```

---

## 3. Detailed Architectural Components

### 3.1 Edge Middleware Layer (`middleware.ts`)
The `middleware.ts` runs on incoming HTTP requests before reaching the API route handlers or server components:
- **Authentication Check:** Reads the `session` token from `httpOnly` cookie.
- **Tenant Context Injection:** Decodes `orgId` and `role` from the verified token and attaches them as custom request headers (`x-org-id`, `x-user-role`, `x-user-id`).
- **Route Authorization Guard:** Compares the requested URL pattern against the user's role:
  - `/api/organizations`: Restricted to `SuperAdmin` (global management) and `OrgAdmin` (own org update).
  - `/api/audit-logs`: Restricted to `SuperAdmin` and `OrgAdmin`.
  - Redirects unauthorized users to HTTP 403 / Login page.

### 3.2 Tenant Data Scoping Layer (`lib/tenantScoping.ts`)
To enforce strict multi-tenancy at the data layer, custom query wrappers wrap Mongoose database calls:
```typescript
// Conceptual example of forced tenant query scoping
export function withTenant<T>(query: Record<string, any>, orgId: string): Record<string, any> {
  if (!orgId) {
    throw new Error("SECURITY_FATAL: Attempted database query without tenant context!");
  }
  return { ...query, orgId: new Types.ObjectId(orgId) };
}
```
This guarantees that even if a developer forgets to add `orgId` in a route handler, the scoping wrapper enforces it.

### 3.3 MongoDB Schema Indexing Strategy
To optimize performance and enforce isolation:
- Every collection has a primary compound index on `{ orgId: 1, _id: 1 }`.
- Filtered collections use targeted compound indexes:
  - Tasks: `{ orgId: 1, projectId: 1, status: 1 }`
  - Users: `{ orgId: 1, email: 1 }` (unique within tenant)
  - Audit Logs: `{ orgId: 1, timestamp: -1 }`

---

## 4. End-to-End Request Data Flow

1. **User Action:** A user clicks "Move Task to In Progress" on the dashboard.
2. **HTTP Request:** Client sends `PATCH /api/tasks/task123` with `{ status: "IN_PROGRESS" }` and cookie credentials.
3. **Middleware Interception:** 
   - Validates cookie JWT token.
   - Attaches `x-org-id = "org_99"` and `x-user-role = "TeamMember"`.
4. **API Route Handler:**
   - Reads `x-org-id` and payload.
   - Validates input body with Zod schema.
   - Calls `Task.findOneAndUpdate(withTenant({ _id: taskId }, orgId), { status })`.
5. **Database Execution:** MongoDB executes query matching `_id: taskId AND orgId: org_99`. If task belongs to another org, 0 records are updated (isolated).
6. **Audit & Notification Trigger:**
   - Audit Log service logs `TASK_STATUS_UPDATED` with `orgId: org_99`.
   - Notification service creates notification record for the Project Manager.
7. **Response:** API returns HTTP 200 with updated task DTO to client UI.
