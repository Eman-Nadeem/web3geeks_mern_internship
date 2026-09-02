Task Description

Now that the requirements and system design are finalized, begin translating the design into a working technical foundation. Today's focus is setting up the actual project (backend + database), implementing the chosen multi-tenancy strategy, and building the initial database schema based on yesterday's ERD.

The objective is to move from design to a running skeleton project with a real database, proper folder structure, and the core tenant isolation mechanism in place — ready for feature development to begin.

Tasks

- Set up the backend project structure based on the architecture designed on Day 1 (folders for models, controllers/services, routes, middleware, config, utils).
- Initialize the database and configure the connection (MongoDB Atlas with Mongoose ODM).
- Implement the chosen tenant-isolation strategy at the schema level:
  Shared database, shared schema with tenant_id/organization_id on every collection (`orgId`).
- Create the initial database schema/models for core entities identified in the ERD:
  - Organizations/Tenants
  - Users
  - Roles & Permissions
  - Projects
  - Tasks
  - Teams
  - Notifications
  - Activity/Audit Logs
- Define relationships and references between entities (organization → users, organization → projects, project → tasks, task → assignee, etc.).
- Add seed data / fixtures for testing (e.g., 2 sample organizations, a few users with different roles, sample projects, tasks, teams).
- Set up environment configuration (.env handling, config for dev/staging/prod).
- Set up a base server (Next.js 14/16 App Router API) with a health-check endpoint (`GET /api/health`) to confirm the server and DB connection work.
- Configure a middleware stub for tenant context resolution (`middleware.ts` extracting `orgId` from the request/headers).
- Push the initial schema, seed scripts, and base server code to the GitHub repository.
- Update the README with setup instructions (how to install dependencies, configure .env, run seed script, and start the server).

Expected Deliverables

By the end of Day 2, submit:

1. Backend project skeleton (folder structure matching the architecture doc)
2. Database models & schema definitions implementing the ERD
3. Working DB connection (MongoDB Atlas support) with seed data loaded
4. Tenant-isolation strategy implemented at the schema level (`orgId` discriminator + `withTenant` scoping helper)
5. Base server running with a working `/api/health` endpoint
6. Updated GitHub repository with all code pushed
7. Updated README with local setup steps
