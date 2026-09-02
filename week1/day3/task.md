# Day 3 Task: Authentication, JWT Session Management & RBAC

## Task Description

With the backend skeleton, database, and tenant-isolation strategy in place from Day 2, today's focus shifts to implementing authentication and authorization — the mechanisms that will actually populate and enforce the tenant context stubbed out yesterday. This includes user signup/login, JWT-based session handling, role-based access control (RBAC), and wiring the tenant-resolution middleware to real auth data.

The objective is to move from an open, unauthenticated skeleton to a secured application where every request is tied to an authenticated user, scoped to the correct organization, and checked against role permissions before touching any protected resource.

---

## Tasks

- **Organization & User Signup (`POST /api/auth/signup`)**: Implement organization signup flow (creating a new tenant + its first admin user in one transaction/operation).
- **User Login (`POST /api/auth/login`)**: Implement user login with password hashing (`bcryptjs`) and credential verification.
- **JWT Issuance**: Implement JWT issuance (access token + refresh token) on successful login, including `organization_id` (`orgId`), `user_id` (`userId`), and `role` in the token payload.
- **Token Refresh & Logout**: Implement token refresh (`POST /api/auth/refresh`) and logout/token-invalidation flow (`POST /api/auth/logout`).
- **Auth & Tenant Middleware**: Build authentication middleware to verify JWTs on protected routes and attach the authenticated user + organization context to the request.
- **Secure Tenant Context**: Replace the Day 2 tenant-context stub with real logic: extract `organization_id` from the verified token (not from request params/body) to prevent cross-tenant spoofing.
- **Role-Based Access Control (RBAC)**:
  - Define roles (`SuperAdmin`, `OrgAdmin`, `ProjectManager`, `TeamMember`) and permission sets per role.
  - Build an authorization middleware/guard that checks the authenticated user's role/permissions before allowing access to a route or action.
- **Password Reset Flow**: Add password reset flow (`POST /api/auth/forgot-password` → emailed/token-based reset link → `POST /api/auth/reset-password`) — email sending can be stubbed/logged in dev.
- **Tenant-Scoped Resource Endpoints**: Enforce tenant isolation on at least 2–3 existing entities (e.g., Users, Projects, Tasks) by scoping every query to the authenticated request's `organization_id`.
- **Validation & Error Handling**: Write basic input validation (Zod schemas) and error handling for all new auth endpoints (invalid credentials, expired tokens, duplicate signups, weak passwords, etc.).
- **Seed Data & RBAC Testing**: Add seed data for at least one user per role (`SuperAdmin`, `OrgAdmin`, `ProjectManager`, `TeamMember`) per sample organization for testing RBAC.
- **Automated Tests**: Write basic tests (unit or integration) for: signup, login, protected route access with/without valid token, and role-restricted access.
- **GitHub Repository**: Push all auth code, middleware, and tests to the GitHub repository.
- **Documentation**: Update the README with auth setup/testing instructions (sample credentials, how to obtain a token, how to call protected endpoints).

---

## Expected Deliverables

By the end of Day 3, submit:

1. Working signup and login endpoints with hashed passwords.
2. JWT issuance, verification, and refresh/logout flow.
3. Real tenant-context middleware driven by token data (no client-supplied `organization_id`).
4. RBAC implementation with at least 3–4 defined roles and enforced permission checks.
5. Password reset flow (stubbed email delivery in development).
6. At least 2–3 entities with tenant-scoped queries enforced.
7. Basic auth/RBAC tests passing.
8. Updated GitHub repository with all code pushed.
9. Updated README with auth usage instructions.

---

## Learning Objective

By completing this task, you should understand how authentication and authorization work together in a multi-tenant SaaS system, how to securely derive tenant context from a verified token rather than trusting client input, and how to design and enforce role-based permission systems that scale across multiple organizations sharing the same backend.
