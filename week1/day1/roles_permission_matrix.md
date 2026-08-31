# User Roles & Permissions Matrix (RBAC)

## 1. Overview & Security Scoping Rule

The system implements a strict Role-Based Access Control (RBAC) model paired with tenant isolation. 

> **Crucial Rule:** All permissions marked with ✅ below are additionally restricted by the caller's tenant (`orgId`). An Organization Admin, Project Manager, or Team Member can **only** perform allowed operations on resources belonging to their own organization. **Super Admin** is the sole platform role with cross-organization visibility.

---

## 2. Granular Permissions Matrix

| Module / Capability | Super Admin | Organization Admin | Project Manager | Team Member |
|---|:---:|:---:|:---:|:---:|
| **Platform & Organizations** | | | | |
| View platform-wide statistics & all tenants | ✅ | ❌ | ❌ | ❌ |
| Create, edit, suspend, or delete any Organization | ✅ | ❌ | ❌ | ❌ |
| Edit own Organization details (Name, Logo, Plan) | ❌ | ✅ | ❌ | ❌ |
| View own Organization profile | ✅ | ✅ | ✅ | ✅ |
| **User Management & Invites** | | | | |
| Invite new users to Organization | ❌ | ✅ | ❌ | ❌ |
| Assign or change user roles (`ProjectManager`, `TeamMember`) | ❌ | ✅ | ❌ | ❌ |
| Deactivate / activate users in Organization | ❌ | ✅ | ❌ | ❌ |
| Update own profile details (Name, Avatar, Password) | ✅ | ✅ | ✅ | ✅ |
| **Project Management** | | | | |
| Create new Projects | ❌ | ✅ | ✅ | ❌ |
| Edit any Project in Organization | ❌ | ✅ | ✅ | ❌ |
| Archive or delete Projects | ❌ | ✅ | ✅ (Own) | ❌ |
| View list of all Projects in Organization | ✅ | ✅ | ✅ | ✅ (Assigned) |
| **Task Management** | | | | |
| Create new Tasks in a Project | ❌ | ✅ | ✅ | ❌ |
| Edit Task details (Title, Description, Due Date) | ❌ | ✅ | ✅ | ❌ |
| Assign or reassign Tasks to Team Members | ❌ | ✅ | ✅ | ❌ |
| Delete Tasks | ❌ | ✅ | ✅ | ❌ |
| Update status of **own assigned** Tasks | ❌ | ✅ | ✅ | ✅ |
| View all Tasks in assigned Projects | ✅ | ✅ | ✅ | ✅ |
| **Team Management** | | | | |
| Create & manage Teams | ❌ | ✅ | ✅ | ❌ |
| Assign Teams to Projects | ❌ | ✅ | ✅ | ❌ |
| Add / remove users from Teams | ❌ | ✅ | ✅ | ❌ |
| View Team rosters | ✅ | ✅ | ✅ | ✅ |
| **Audit Logs & System Notifications** | | | | |
| View platform-wide audit logs (All Tenants) | ✅ | ❌ | ❌ | ❌ |
| View tenant audit logs (Own Tenant) | ❌ | ✅ | ❌ | ❌ |
| Receive & manage personal in-app notifications | ✅ | ✅ | ✅ | ✅ |
| **Dashboard Access** | | | | |
| View Super Admin Platform Analytics Dashboard | ✅ | ❌ | ❌ | ❌ |
| View Organization Admin Dashboard | ❌ | ✅ | ❌ | ❌ |
| View Project Manager Dashboard | ❌ | ❌ | ✅ | ❌ |
| View Team Member Task Dashboard | ❌ | ❌ | ❌ | ✅ |

---

## 3. Role Definitions & Scope Enforcement

### 3.1 Super Admin (Platform Owner)
- **Scope:** Global / Platform-wide.
- **Primary Function:** Platform administration, tenant lifecycle management, system health monitoring.
- **Enforcement:** Bypasses `orgId` filtering for administrative endpoints `/api/super-admin/*`. Restrictive guard in `middleware.ts`.

### 3.2 Organization Admin (Tenant Owner)
- **Scope:** Tenant-level (`orgId`).
- **Primary Function:** Managing organization settings, billing plan, user access, permissions, and oversight of all tenant activities.
- **Enforcement:** Enforces `{ orgId: user.orgId }` on all queries. Full CRUD authority over projects, tasks, and teams inside their org.

### 3.3 Project Manager (Team Lead)
- **Scope:** Project & Team level within `orgId`.
- **Primary Function:** Planning projects, breaking down work into tasks, allocating resources, assigning tasks, monitoring deadlines.
- **Enforcement:** Can create projects and tasks, but cannot alter organization settings or invite/deactivate organization users.

### 3.4 Team Member (Individual Contributor)
- **Scope:** Assigned tasks & assigned projects within `orgId`.
- **Primary Function:** Executing assigned work, updating task progress status (To Do -> In Progress -> Completed), communicating via comments.
- **Enforcement:** Write operations restricted exclusively to updating task status on tasks where `task.assigneeId === user._id`.