# Requirements Document — Multi-Tenant Project Management System

## 1. Executive Overview

The **Multi-Tenant Project Management System** is a Software-as-a-Service (SaaS) platform designed to enable multiple independent organizations ("tenants") to collaborate on projects, manage tasks, assign team members, track activity, and receive real-time notifications — all operating seamlessly on a single, shared application instance and database infrastructure.

---

## 2. Multi-Tenant SaaS Architecture & Tenant Isolation Strategy

### 2.1 Understanding Multi-Tenancy
In a multi-tenant SaaS architecture, multiple distinct customer accounts (organizations) share the exact same application code, web servers, and database instance. The critical architectural imperative is ensuring complete **tenant data isolation** — preventing data leaks between organizations while maintaining cost efficiency and ease of deployment.

### 2.2 Data Isolation Models Comparison

| Isolation Model | Description | Pros | Cons | Decision |
|---|---|---|---|---|
| **Database per Tenant** | Every organization gets a distinct, physically separate database. | Maximum isolation, easy backup per tenant. | High operational cost, expensive scaling, difficult multi-tenant migrations. | ❌ Rejected |
| **Schema per Tenant** | Shared database instance, but separate database schemas/namespaces per org. | Strong isolation, medium complexity. | Schema migration complexity grows exponentially with tenant count. | ❌ Rejected |
| **Shared Database, Shared Schema (Discriminator Column)** | Single database and shared schemas. Every record contains an `orgId` column. | Highly scalable, minimal infrastructure cost, simplified deployments & migrations. | Requires strict application-level query scoping to prevent cross-tenant leaks. | ✅ **Selected Model** |

### 2.3 Selected Strategy: Shared Database with `orgId` Scoping
To balance scalability, ease of maintenance, and rapid development in Next.js + MongoDB:
- Every collection (except `organizations` and `super_admins`) explicitly includes an indexed `orgId: ObjectId` reference field.
- A mandatory **tenant-scoping wrapper / Mongoose plugin** automatically injects `{ orgId: currentOrgId }` into all database read, update, and delete queries.
- Next.js **Middleware** resolves the authenticated user's `orgId` from a signed JWT session cookie and injects it into request headers, guaranteeing API routes operate strictly within the caller's tenant boundary.

---

## 3. System User Roles & Responsibilities

The system defines four distinct user roles within a multi-tiered Role-Based Access Control (RBAC) model:

1. **Super Admin (Platform Level):**
   - Manages the overall SaaS platform.
   - Monitors tenant health, system analytics, and platform-wide audit logs.
   - Can create, suspend, or delete tenant organizations.

2. **Organization Admin (Tenant Owner):**
   - Owns and manages a specific Organization workspace.
   - Invites, manages, and deactivates organization users.
   - Configures organization settings, plans, and permissions.
   - Has full visibility and authority over all projects, tasks, teams, and audit logs within their organization.

3. **Project Manager (Tenant Level):**
   - Creates, manages, and archives projects within their organization.
   - Forms and assigns Teams to specific projects.
   - Creates, updates, assigns, and reallocates tasks to Team Members.
   - Views project-level dashboards and progress metrics.

4. **Team Member (Tenant Level):**
   - Works on assigned tasks and projects.
   - Updates status, progress, and comments on tasks assigned to them.
   - Belongs to designated teams and receives task notifications.

---

## 4. Functional Requirements by Module

### Module 1: Authentication
- Self-service registration for new Organization Admins (creates tenant + admin user).
- Secure authentication via email/password or JWT token sessions.
- Tokens stored in `httpOnly`, `SameSite=Lax`, secure cookies.
- Password hashing using `bcryptjs` with salt rounds >= 10.
- Password reset and logout capabilities.

### Module 2: Organizations / Tenants
- Super Admin can list, create, edit, suspend, and view stats for all organizations.
- Organization attributes: `name`, `slug` (unique), `logoUrl`, `plan` (Free/Pro/Enterprise), `status` (Active/Suspended), `ownerId`, `createdAt`.
- Organization Admins can update their organization name, logo, and settings.

### Module 3: User Management
- Org Admins can invite new users via email with specified role (`ProjectManager` or `TeamMember`).
- Invited users receive a unique, time-sensitive token link to complete registration.
- Org Admins can update user roles or deactivate users (soft delete/status toggle).
- Users can view and update their own profile details (name, avatar, notification preferences).

### Module 4: Roles & Permissions (RBAC)
- Role definitions enforced on every Next.js Server Action / Route Handler.
- Middleware guards prevent unauthorized route access (e.g., non-Admins accessing `/api/organizations`).
- Dynamic check matching user role against resource ownership and `orgId`.

### Module 5: Projects
- Create, read, update, delete (CRUD) and archive projects within an organization.
- Project attributes: `name`, `description`, `status` (Planning, Active, On Hold, Completed, Archived), `startDate`, `dueDate`, `managerId`, `orgId`.
- Projects are strictly isolated per tenant (`orgId`).

### Module 6: Tasks
- CRUD operations for tasks belonging to a specific project.
- Task attributes: `title`, `description`, `projectId`, `orgId`, `assigneeId`, `reporterId`, `status` (To Do, In Progress, Under Review, Completed), `priority` (Low, Medium, High, Urgent), `dueDate`.
- Team Members can update task status for tasks assigned to them.
- Project Managers & Org Admins can update any task within their organization.

### Module 7: Teams
- Grouping mechanism for users within an organization.
- Team attributes: `name`, `description`, `orgId`, `leaderId`, `memberIds` (array of User references).
- Ability to assign an entire Team to a Project.

### Module 8: Notifications
- Triggered automatically on key events: Task assignment, task status change, team addition, user invitation.
- Notification attributes: `userId`, `orgId`, `title`, `message`, `type`, `readStatus` (boolean), `linkUrl`, `createdAt`.
- Users can view their inbox and mark notifications as read/unread.

### Module 9: Activity / Audit Logs
- Automatic logging of write actions (Create, Update, Delete) across all modules.
- Audit Log attributes: `orgId`, `actorId`, `action` (e.g. `TASK_ASSIGNED`, `USER_INVITED`), `entityType` (`Project`, `Task`, `User`), `entityId`, `details` (JSON payload of changed fields), `ipAddress`, `timestamp`.
- Immutable log records accessible only by Super Admin (platform-wide) and Org Admin (tenant-scoped).

### Module 10: Dashboard
- **Super Admin Dashboard:** Overall tenant metrics, active organizations, total users, system audit feed.
- **Org Admin Dashboard:** Organization workspace stats (total projects, active tasks, team distribution, recent audit log).
- **Project Manager Dashboard:** Assigned projects summary, task progress board, project deadlines.
- **Team Member Dashboard:** Personal task list ("My Tasks"), upcoming due dates, recent notifications.

---

## 5. Non-Functional Requirements

1. **Tenant Data Isolation (Zero Data Leak Guarantee):**
   - Under no circumstances shall an API query return data belonging to a different `orgId`.
   - Automated unit & integration tests must verify cross-tenant boundary isolation.

2. **Security & Data Integrity:**
   - All passwords hashed using bcrypt algorithm.
   - JWT tokens signed with strong secret key (`HS256` or `RS256`).
   - CSRF and XSS protection enabled on all input endpoints via Zod sanitization.
   - Sensitive audit logs must be write-once (immutable).

3. **Performance & Scalability:**
   - Single-digit database query latencies through compulsory compound indexes (`orgId` + `_id`, `orgId` + `status`, `orgId` + `assigneeId`).
   - Pagination (limit/cursor) enforced on all list endpoints (default 20 items per page).

4. **Usability & UX:**
   - Modern, responsive dashboard design built with Tailwind CSS.
   - Role-aware UI hiding controls/navigation items that the current user's role cannot execute.

5. **Maintainability & Code Quality:**
   - TypeScript for static type checking across models, APIs, and UI props.
   - Modular Next.js App Router layout separating route handlers, models, and shared utilities.