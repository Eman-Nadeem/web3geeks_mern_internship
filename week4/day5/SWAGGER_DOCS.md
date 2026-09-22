# Multi-Tenant SaaS API Documentation (OpenAPI 3.0 / Swagger)

- **Base URL (Local)**: `http://localhost:3000/api`
- **Interactive UI**: `http://localhost:3000/docs`
- **Raw OpenAPI Specification**: `http://localhost:3000/swagger.json`

---

## 1. Authentication & Security

All authenticated endpoints accept credentials in two formats:
1. **HTTP-Only Cookie** (Default in web browsers):
   ```http
   Cookie: team_collab_token=<JWT_TOKEN>
   ```
2. **Bearer Token Authorization Header**:
   ```http
   Authorization: Bearer <JWT_TOKEN>
   ```

### Standard Response Envelope
All API responses follow a unified response structure:

```json
{
  "success": true,
  "data": { ... },
  "message": "Human readable message"
}
```

### Standard Error Envelope
```json
{
  "success": false,
  "message": "Description of error",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

---

## 2. Complete Endpoints Summary

| Method | Endpoint | Description | Auth Required | Min Role |
| :--- | :--- | :--- | :---: | :---: |
| `GET` | `/api/health` | System health & DB connection check | ❌ No | Public |
| `POST` | `/api/auth/register` | Create account & receive JWT session | ❌ No | Public (5 req/min) |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT session | ❌ No | Public (5 req/min) |
| `POST` | `/api/auth/logout` | Terminate current session & clear cookie | ✅ Yes | Authenticated |
| `GET` | `/api/auth/me` | Get profile of logged-in user | ✅ Yes | Authenticated |
| `GET` | `/api/organizations` | List user's tenant organizations | ✅ Yes | Authenticated |
| `POST` | `/api/organizations` | Create a new tenant organization | ✅ Yes | Authenticated |
| `GET` | `/api/organizations/{orgId}` | Get organization details | ✅ Yes | `MEMBER` |
| `PATCH` | `/api/organizations/{orgId}` | Update org name, description, or slug | ✅ Yes | `ADMIN` (`OWNER` for slug) |
| `DELETE` | `/api/organizations/{orgId}` | Delete organization and cascade data | ✅ Yes | `OWNER` |
| `POST` | `/api/organizations/{orgId}/logo` | Upload organization logo | ✅ Yes | `ADMIN` |
| `GET` | `/api/organizations/{orgId}/members` | List/search all organization members | ✅ Yes | `MEMBER` |
| `DELETE` | `/api/organizations/{orgId}/members/{membershipId}` | Remove member (safe RBAC + Last Owner) | ✅ Yes | `ADMIN` |
| `GET` | `/api/organizations/{orgId}/invitations` | List pending invitations for org | ✅ Yes | `ADMIN` |
| `POST` | `/api/organizations/{orgId}/invitations` | Issue new email invitation | ✅ Yes | `ADMIN` (20/hr/org) |
| `DELETE` | `/api/organizations/{orgId}/invitations/{id}` | Revoke/cancel invitation | ✅ Yes | `ADMIN` |
| `POST` | `/api/organizations/{orgId}/invitations/{id}/resend` | Regenerate token & extend 72h | ✅ Yes | `ADMIN` |
| `GET` | `/api/invitations/{token}` | Public invitation lookup & preview | ❌ No | Public |
| `POST` | `/api/invitations/{token}/accept` | Accept invitation & join org | ✅ Yes | Authenticated |
| `GET` | `/api/organizations/{orgId}/projects` | List projects accessible to user | ✅ Yes | `MEMBER` |
| `POST` | `/api/organizations/{orgId}/projects` | Create new project | ✅ Yes | `ADMIN` |
| `GET` | `/api/organizations/{orgId}/projects/{projectId}` | Get project details & metrics | ✅ Yes | `MEMBER` |
| `PATCH` | `/api/organizations/{orgId}/projects/{projectId}` | Update project details/status | ✅ Yes | Lead / `ADMIN` |
| `DELETE` | `/api/organizations/{orgId}/projects/{projectId}` | Delete project & cascade tasks | ✅ Yes | `ADMIN` |
| `GET` | `/api/organizations/{orgId}/projects/{projectId}/members` | List project collaborators | ✅ Yes | `MEMBER` |
| `POST` | `/api/organizations/{orgId}/projects/{projectId}/members` | Add org member to project | ✅ Yes | Lead / `ADMIN` |
| `DELETE` | `/api/organizations/{orgId}/projects/{projectId}/members/{userId}` | Remove collaborator from project | ✅ Yes | Lead / `ADMIN` |
| `GET` | `/api/organizations/{orgId}/projects/{projectId}/dashboard` | Real-time project KPIs & workload | ✅ Yes | `MEMBER` |
| `GET` | `/api/organizations/{orgId}/projects/{projectId}/tasks` | Search & multi-filter project tasks | ✅ Yes | `MEMBER` |
| `POST` | `/api/organizations/{orgId}/projects/{projectId}/tasks` | Create task with assignment validation | ✅ Yes | `MEMBER` |
| `GET` | `/api/organizations/{orgId}/projects/{projectId}/tasks/{taskId}` | Get task details | ✅ Yes | `MEMBER` |
| `PATCH` | `/api/organizations/{orgId}/projects/{projectId}/tasks/{taskId}` | Update task status, priority, or fields | ✅ Yes | `MEMBER` |
| `DELETE` | `/api/organizations/{orgId}/projects/{projectId}/tasks/{taskId}` | Delete task | ✅ Yes | Creator / Lead / `ADMIN` |
| `GET` | `/api/organizations/{orgId}/tasks` | Cross-project "My Tasks" aggregated view | ✅ Yes | `MEMBER` |
| `GET` | `/api/organizations/{orgId}/projects/{projectId}/tasks/{taskId}/comments` | List comments for task | ✅ Yes | `MEMBER` |
| `POST` | `/api/organizations/{orgId}/projects/{projectId}/tasks/{taskId}/comments` | Add comment to task | ✅ Yes | `MEMBER` |
| `PATCH` | `/api/organizations/{orgId}/projects/{projectId}/tasks/{taskId}/comments/{id}` | Edit comment body | ✅ Yes | Comment Author |
| `DELETE` | `/api/organizations/{orgId}/projects/{projectId}/tasks/{taskId}/comments/{id}` | Delete comment | ✅ Yes | Author / `ADMIN` |
| `GET` | `/api/organizations/{orgId}/activity` | Cursor-paginated audit activity log | ✅ Yes | `MEMBER` |
| `GET` | `/api/notifications` | List user in-app notifications | ✅ Yes | Authenticated |
| `PATCH` | `/api/notifications/{notificationId}` | Mark single notification as read | ✅ Yes | Notification Owner |
| `DELETE` | `/api/notifications/{notificationId}` | Delete notification | ✅ Yes | Notification Owner |
| `POST` | `/api/notifications/read-all` | Mark all user notifications as read | ✅ Yes | Authenticated |
| `POST` | `/api/pusher/auth` | Authenticate Pusher private/presence channels | ✅ Yes | Authenticated |

---

## 3. Detailed Endpoint Reference

### `GET /api/health`
Checks server responsiveness and runs a live query on the database.

- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-09-22T14:25:44.000Z",
    "database": "connected"
  },
  "message": "Service is healthy"
}
```

---

### `POST /api/auth/register`
Registers a new user account and automatically sets an HTTP-only JWT cookie.

- **Rate Limit**: 5 requests / min per IP.
- **Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password123!"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "c71e23f9-86db-4e12-88d4-53c84852ab12",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "avatar": null,
      "createdAt": "2026-09-22T14:25:44.000Z"
    }
  },
  "message": "Registration successful"
}
```

---

### `POST /api/auth/login`
Validates credentials and logs in the user.

- **Rate Limit**: 5 requests / min per IP.
- **Request Body**:
```json
{
  "email": "alice@example.com",
  "password": "Password123!"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "3b236142-9993-455b-b9d9-bb4ae01feec0",
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "avatar": null
    }
  },
  "message": "Login successful"
}
```

---

### `GET /api/organizations`
Returns all organizations the authenticated user belongs to.

- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "organizations": [
      {
        "id": "f58380cf-5ff3-4b68-b78f-6f95886fe202",
        "name": "Acme Corp",
        "slug": "acme-corp",
        "role": "OWNER"
      }
    ]
  },
  "message": "Organizations retrieved successfully"
}
```

---

### `POST /api/organizations/{orgId}/projects`
Creates a new project scoped to the organization. Requires `ADMIN` or `OWNER` role.

- **Request Body**:
```json
{
  "name": "Mobile Redesign",
  "description": "Revamping user checkout flow",
  "status": "ACTIVE",
  "ownerId": "3b236142-9993-455b-b9d9-bb4ae01feec0"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "715224e3-0fc4-4f07-89f2-a5c5d981e58d",
      "name": "Mobile Redesign",
      "status": "ACTIVE",
      "organizationId": "f58380cf-5ff3-4b68-b78f-6f95886fe202"
    }
  },
  "message": "Project created successfully"
}
```

---

### `POST /api/organizations/{orgId}/projects/{projectId}/tasks`
Creates a task inside a project. Assignee must be a project member.

- **Request Body**:
```json
{
  "title": "Design Figma Mockups",
  "description": "High fidelity wireframes for checkout",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "assigneeId": "cc0337e5-47ad-45b3-b908-bb76ef2688c3",
  "dueDate": "2026-10-01T00:00:00.000Z"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": "3c1838a0-06eb-4e09-b31f-9117316aee9e",
      "title": "Design Figma Mockups",
      "status": "IN_PROGRESS",
      "priority": "HIGH"
    }
  },
  "message": "Task created successfully"
}
```

---

### `POST /api/organizations/{orgId}/projects/{projectId}/tasks/{taskId}/comments`
Appends a comment to a task discussion thread and broadcasts via Pusher.

- **Request Body**:
```json
{
  "body": "Mockups uploaded to Figma for team review."
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "comment": {
      "id": "ad382918-b346-4035-a65b-1f01687cf76d",
      "body": "Mockups uploaded to Figma for team review.",
      "createdAt": "2026-09-22T15:00:00.000Z"
    }
  },
  "message": "Comment added successfully"
}
```

---

### `GET /api/organizations/{orgId}/activity`
Fetches cursor-paginated organization audit log items.

- **Query Parameters**:
  - `limit`: Number of items to fetch (default: 20)
  - `cursor`: Activity ID cursor for next page
  - `projectId`: Optional project ID filter
  - `type`: Optional ActivityType filter
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "act-123",
        "type": "TASK_STATUS_CHANGED",
        "actor": { "name": "Alice Johnson" },
        "meta": { "oldStatus": "IN_PROGRESS", "newStatus": "COMPLETED" },
        "createdAt": "2026-09-22T15:30:00.000Z"
      }
    ],
    "nextCursor": null,
    "hasMore": false
  },
  "message": "Activity retrieved successfully"
}
```

---

### `POST /api/pusher/auth`
Authenticates Pusher private channels (`private-task-*`, `private-user-*`) and presence channels (`presence-org-*`).

- **Request Body** (URL-encoded or JSON):
```json
{
  "socket_id": "1234.5678",
  "channel_name": "presence-org-f58380cf-5ff3-4b68-b78f-6f95886fe202"
}
```
- **Response `200 OK`**:
```json
{
  "auth": "pusher_key:hash_signature",
  "channel_data": "{\"user_id\":\"...\",\"user_info\":{...}}"
}
```
