# Day 4: Multi-Tenant Business Features (Projects, Tasks & Teams APIs)

## Overview
Day 4 expands our multi-tenant SaaS foundation into full business domain management. It provides complete CRUD APIs, RBAC enforcement, state transition logic, tenant data isolation (`orgId`), database audit logging, notification stubs, and an automated Vitest HTTP testing suite.

---

## Technical Features & Business Logic

### 1. Multi-Tenant Projects API (`/api/projects`)
- **GET `/api/projects`**: Lists projects scoped to user's organization (`PROJECT_READ` permission required).
  - Supports query parameters: `page`, `limit`, `status`, `search`, `sortBy`, `sortOrder`.
- **POST `/api/projects`**: Creates a project (`PROJECT_CREATE` permission required). Validates assigned `teamId` belongs to user's organization.
- **GET `/api/projects/[id]`**: Retrieves single project with populated manager and team info.
- **PATCH `/api/projects/[id]`**: Updates project details (`PROJECT_UPDATE` permission required). Validates `managerId` and `teamId` belong to user's organization.
- **DELETE `/api/projects/[id]`**: Deletes project (`PROJECT_DELETE` permission required).
  - **Cascading Task Cleanup**: Blocks deletion if active tasks exist unless `force=true` query parameter is passed. When `force=true`, all associated tasks are cleaned up (`Task.deleteMany`) to prevent orphaned data.

### 2. Multi-Tenant Teams API (`/api/teams`)
- **GET `/api/teams`**: Lists teams within organization (`TEAM_READ` permission required). Regular `TeamMember` users can view teams.
- **POST `/api/teams`**: Creates team (`TEAM_MANAGE` permission required). Validates team leader belongs to user's organization.
- **GET `/api/teams/[id]`**: Gets team details with populated leader and members (`TEAM_READ` permission required).
- **PATCH `/api/teams/[id]`**: Updates team name, description, or leader (`TEAM_MANAGE` permission required).
- **DELETE `/api/teams/[id]`**: Deletes team (`TEAM_MANAGE` permission required).
  - **Safety Check**: Blocks deletion if any project in the organization currently references the team unless `force=true` parameter is passed.
- **POST `/api/teams/[id]/members`**: Adds member to team (`TEAM_MANAGE` permission required). Validates member belongs to user's organization.
- **DELETE `/api/teams/[id]/members?userId=[userId]`**: Removes member from team.

### 3. Core Tasks API & State Machine (`/api/tasks`)
- **GET `/api/tasks`**: Lists tasks within organization. Supports filtering by `status`, `priority`, `projectId`, `assigneeId`, `search`, and sorting by `dueDate`/`createdAt`.
- **POST `/api/tasks`**: Creates a task (`TASK_CREATE` permission required).
  - **Team-Level Assignee Validation**: If the task's project is assigned to a team, validates that the assignee belongs to that team (as member or leader).
  - Triggers `TASK_ASSIGNED` notification stub and audit log.
- **GET `/api/tasks/[id]`**: Retrieves single task detail.
- **PATCH `/api/tasks/[id]`**: Updates task details, status, or assignee (`TASK_UPDATE` permission required).
  - **State Machine Enforcement**: Enforces allowed status transitions (`TO_DO` → `IN_PROGRESS` → `UNDER_REVIEW` → `COMPLETED`).
  - **RBAC Rules**: TeamMembers can only update tasks assigned directly to themselves and cannot reassign tasks to others.
  - **Team Assignee Enforcement**: Enforces team membership when reassigning tasks to projects linked to a team.
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

## Automated Testing Suite (Vitest)

The project includes a production-grade automated HTTP integration test suite built with **Vitest**. The tests invoke Next.js route handlers directly via mock HTTP requests with JWT tokens, verifying real API layer responses, RBAC permission guards, tenant data isolation boundaries, and business rules.

### Seed Database
Populate database with sample multi-tenant organizations, users, teams, projects, and tasks for manual exploration:
```bash
npm run seed
```

### Run Automated Tests
Run the 25 automated HTTP integration tests across projects, teams, tasks, and tenant isolation:
```bash
npm test
```

To run tests in watch mode:
```bash
npm run test:watch
```

---

## Vercel Deployment Guide

1. Push your repository code to GitHub:
   ```bash
   git add .
   git commit -m "Day 4 complete: Projects, Tasks, Teams APIs with Vitest automated testing suite"
   git push origin main
   ```

2. Log in to [Vercel](https://vercel.com) and click **Add New > Project**.
3. Import your GitHub repository.
4. Set the Root Directory to `week1/day4` if deploying from a monorepo workspace.
5. Configure Environment Variables in Vercel Project Settings:
   - `MONGODB_URI`: Your MongoDB Atlas cluster connection string
   - `JWT_SECRET`: A strong secret key (at least 32 characters)
   - `NODE_ENV`: `production`
6. Click **Deploy**. Vercel will build and deploy your Next.js application automatically.

