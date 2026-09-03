# Day 4: Multi-Tenant Business Features (Projects, Tasks & Teams APIs)

## Overview
Day 4 expands our multi-tenant SaaS foundation into full business domain management. It provides complete CRUD APIs, RBAC enforcement, state transition logic, tenant data isolation (`orgId`), database audit logging, and notification stubs.

---

## Technical Features Built

### 1. Multi-Tenant Projects API (`/api/projects`)
- **GET `/api/projects`**: Lists projects scoped to user's organization.
  - Supports query parameters: `page`, `limit`, `status`, `search`, `sortBy`, `sortOrder`.
- **POST `/api/projects`**: Creates a project (`PROJECT_CREATE` permission required).
- **GET `/api/projects/[id]`**: Retrieves single project with populated manager and team info.
- **PATCH `/api/projects/[id]`**: Updates project details (`PROJECT_UPDATE` permission required).
- **DELETE `/api/projects/[id]`**: Deletes project (`PROJECT_DELETE` permission required). Enforces business rule: prevents deletion if active tasks exist unless `force=true` query parameter is passed.

### 2. Multi-Tenant Teams API (`/api/teams`)
- **GET `/api/teams`**: Lists teams within organization. Supports `page`, `limit`, `search`.
- **POST `/api/teams`**: Creates team (`TEAM_MANAGE` permission required).
- **GET `/api/teams/[id]`**: Gets team details with populated leader and members.
- **PATCH `/api/teams/[id]`**: Updates team name, description, or leader.
- **DELETE `/api/teams/[id]`**: Deletes team.
- **POST `/api/teams/[id]/members`**: Adds member to team (`TEAM_MANAGE` permission required). Validates member belongs to same organization.
- **DELETE `/api/teams/[id]/members?userId=[userId]`**: Removes member from team.

### 3. Core Tasks API & State Machine (`/api/tasks`)
- **GET `/api/tasks`**: Lists tasks within organization. Supports filtering by `status`, `priority`, `projectId`, `assigneeId`, `search`, and sorting by `dueDate`/`createdAt`.
- **POST `/api/tasks`**: Creates a task (`TASK_CREATE` permission required). Validates `projectId` and `assigneeId` belong to organization. Triggers `TASK_ASSIGNED` notification stub.
- **GET `/api/tasks/[id]`**: Retrieves single task detail.
- **PATCH `/api/tasks/[id]`**: Updates task details, status, or assignee.
  - **State Machine Enforcement**: Enforces valid status transitions (`TO_DO` → `IN_PROGRESS` → `UNDER_REVIEW` → `COMPLETED`).
  - **RBAC Rules**: TeamMembers can only update tasks assigned to themselves and cannot reassign tasks to others.
  - **Notifications & Audit**: Logs audit records for status/assignee changes and creates notification stubs.
- **DELETE `/api/tasks/[id]`**: Deletes task (`TASK_DELETE` permission required).

---

## API Usage Examples

### 1. Create a Project
```http
POST /api/projects
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "name": "Customer Portal Redesign",
  "description": "Revamping UI/UX for SaaS dashboard",
  "status": "ACTIVE",
  "startDate": "2026-09-05T00:00:00.000Z",
  "dueDate": "2026-10-15T00:00:00.000Z"
}
```

### 2. Filter Tasks by Status & Project
```http
GET /api/tasks?projectId=68b72...&status=IN_PROGRESS&page=1&limit=10
Authorization: Bearer <access_token>
```

### 3. Add Member to Team
```http
POST /api/teams/68b72.../members
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "userId": "68b72..."
}
```

### 4. Transition Task Status
```http
PATCH /api/tasks/68b72...
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "status": "IN_PROGRESS"
}
```

---

## Database Seeding & Integration Testing

### Seed Database
Populate database with multi-tenant organizations, users, teams, projects, and tasks:
```bash
npx tsx scripts/seed.ts
```

### Run Day 4 Integration Test Suite
Verify CRUD APIs, tenant isolation boundaries, RBAC controls, and business logic:
```bash
npx tsx scripts/test-day4.ts
```

---

## Vercel Deployment
Deploy to Vercel:
```bash
npx vercel --prod
```
Or push the `day4` branch to GitHub to trigger continuous integration and deployment.
