Task Description

With authentication, authorization, and tenant isolation fully working from Day 3, today's focus shifts to building out the core business features of the application: Projects, Tasks, and Teams. This is where the product's actual functionality starts to take shape — full CRUD operations, entity relationships, and business rules, all properly scoped to the authenticated user's organization and enforced through the RBAC system already in place.

The objective is to move from a secured-but-empty backend to a functioning multi-tenant project management API where organizations can create teams, manage projects, assign tasks, and track activity — with every operation respecting tenant boundaries and role permissions.

Tasks

Implement full CRUD APIs for Projects (create, list, get, update, delete/archive), scoped to the authenticated user's organization.
Implement full CRUD APIs for Teams (create, list, get, update, delete), including adding/removing members to a team.
Implement full CRUD APIs for Tasks, including:
Assigning a task to a user (assignee) within the same organization.
Task status/state transitions (e.g., To Do → In Progress → Done).
Linking tasks to a project.
Setting priority, due date, and description.
Enforce role-based permission checks on each endpoint (e.g., only Owner/Admin/Manager can create projects; Members can only update tasks assigned to them; only Managers+ can reassign tasks).
Enforce tenant isolation on all new endpoints — no entity should ever be readable/writable across organizations.
Implement business rule validations (e.g., can't assign a task to a user outside the organization/team, can't delete a project with active tasks without confirmation, status transitions must follow allowed order).
Implement basic Activity/Audit Log entries for key actions (task created, task reassigned, project archived, member added to team, etc.) — write to the Activity/Audit Logs table from Day 2's schema.
Implement a basic Notifications trigger stub (e.g., log or store a notification record when a task is assigned or a status changes) — full delivery (email/push) comes later.
Add pagination, filtering, and sorting to list endpoints (e.g., filter tasks by status/assignee/project, sort by due date).
Add seed data covering multiple projects, teams, and tasks in varying states across both sample organizations for realistic testing.
Write tests for: CRUD operations, permission enforcement (positive and negative cases), tenant-isolation enforcement, and business rule validations.
Push all new code, migrations (if schema tweaks were needed), and tests to the GitHub repository.
Update the README with API usage examples for the new endpoints (sample requests/responses for Projects, Tasks, Teams).

Expected Deliverables

By the end of Day 4, submit:

Working CRUD APIs for Projects, Tasks, and Teams
Role-based and tenant-based access enforcement on all new endpoints
Task assignment and status-transition logic implemented
Activity/Audit log entries recorded for key actions
Basic notification trigger stub in place
Pagination/filtering/sorting on list endpoints
Expanded seed data reflecting realistic multi-org usage
Passing tests covering CRUD, permissions, and tenant isolation
Updated GitHub repository with all code pushed
Updated README with API usage examples

Learning Objective

By completing this task, you should understand how to design and implement core CRUD-based business features on top of an authenticated, multi-tenant foundation, how to layer role-based permissions and business rules onto real endpoints, and how activity logging and notification hooks are typically integrated into a growing SaaS backend.