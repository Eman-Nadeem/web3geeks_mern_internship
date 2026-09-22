# Multi-Tenant SaaS API Documentation (OpenAPI 3.0 / Swagger)

- **Base URL (Local)**: `http://localhost:3000/api`
- **Interactive UI**: `http://localhost:3000/docs`
- **Raw OpenAPI Specification**: `http://localhost:3000/swagger.json`

---

## 1. Authentication & Security

All authenticated endpoints accept credentials in two formats:
1. **HTTP-Only Cookie** (Default in web browsers):
   ```http
   Cookie: token=<JWT_TOKEN>
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
  "error": {
    "code": "ERROR_CODE",
    "message": "Description of error",
    "details": null
  }
}
```

---

## 2. Endpoints Summary

| Method | Endpoint | Description | Auth Required | Min Role |
| :--- | :--- | :--- | :---: | :---: |
| `GET` | [`/api/health`](#get-apihealth) | System health & DB connection check | ❌ No | Public |
| `POST` | [`/api/auth/register`](#post-apiauthregister) | Create account & receive JWT session | ❌ No | Public (5 req/min) |
| `POST` | [`/api/auth/login`](#post-apiauthlogin) | Authenticate user & receive JWT session | ❌ No | Public (5 req/min) |
| `POST` | [`/api/auth/logout`](#post-apiauthlogout) | Terminate current session & clear cookie | ✅ Yes | Authenticated |
| `GET` | [`/api/auth/me`](#get-apiauthme) | Get profile of logged-in user | ✅ Yes | Authenticated |
| `GET` | [`/api/organizations`](#get-apiorganizations) | List user's tenant organizations | ✅ Yes | Authenticated |
| `POST` | [`/api/organizations`](#post-apiorganizations) | Create a new tenant organization | ✅ Yes | Authenticated |
| `GET` | [`/api/organizations/{idOrSlug}`](#get-apiorganizationsidororgslug) | Get organization details | ✅ Yes | `MEMBER` |
| `PATCH` | [`/api/organizations/{idOrSlug}`](#patch-apiorganizationsidororgslug) | Update organization name | ✅ Yes | `ADMIN` |
| `DELETE` | [`/api/organizations/{idOrSlug}`](#delete-apiorganizationsidororgslug) | Delete organization and cascade data | ✅ Yes | `OWNER` |
| `GET` | [`/api/organizations/{idOrSlug}`/members](#get-apiorganizationsidororgslugmembers) | List all organization members | ✅ Yes | `MEMBER` |

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
    "timestamp": "2026-09-21T14:25:44.000Z",
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
- **Password Requirements**:
  - Minimum 8 characters, maximum 72
  - At least 1 uppercase letter (`A-Z`)
  - At least 1 lowercase letter (`a-z`)
  - At least 1 numeric digit (`0-9`)

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
      "createdAt": "2026-09-21T14:25:44.000Z"
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
      "avatar": null,
      "createdAt": "2026-09-21T14:25:44.000Z"
    }
  },
  "message": "Login successful"
}
```

---

### `POST /api/auth/logout`
Clears the session cookie.

- **Response `200 OK`**:
```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully"
}
```

---

### `GET /api/auth/me`
Retrieves currently logged-in user profile.

- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "3b236142-9993-455b-b9d9-bb4ae01feec0",
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "avatar": null,
      "createdAt": "2026-09-21T14:25:44.000Z"
    }
  },
  "message": "Current user profile retrieved"
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
        "ownerId": "3b236142-9993-455b-b9d9-bb4ae01feec0",
        "createdAt": "2026-09-21T14:25:44.000Z",
        "updatedAt": "2026-09-21T14:25:44.000Z",
        "userRole": "OWNER",
        "memberCount": 3
      }
    ]
  },
  "message": "Organizations retrieved successfully"
}
```

---

### `POST /api/organizations`
Creates a new tenant organization and assigns creator as `OWNER`.

- **Request Body**:
```json
{
  "name": "Starlight Labs",
  "slug": "starlight-labs"
}
```
- **Slug Validation**:
  - 3–48 lowercase alphanumeric characters with hyphens
  - Cannot use reserved keywords (`admin`, `api`, `dashboard`, `login`, `register`, `settings`, etc.)

- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "e2a14917-8e6d-4ee8-9c17-f27364ca9b45",
      "name": "Starlight Labs",
      "slug": "starlight-labs",
      "ownerId": "3b236142-9993-455b-b9d9-bb4ae01feec0",
      "createdAt": "2026-09-21T14:30:00.000Z",
      "updatedAt": "2026-09-21T14:30:00.000Z"
    }
  },
  "message": "Organization created successfully"
}
```

---

### `GET /api/organizations/{organizationId}`
Retrieves single organization details.
- **Parameters**: `organizationId` path parameter (supports UUID or slug, e.g., `acme-corp`).
- **Required Role**: `OWNER`, `ADMIN`, or `MEMBER`.
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "f58380cf-5ff3-4b68-b78f-6f95886fe202",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "ownerId": "3b236142-9993-455b-b9d9-bb4ae01feec0",
      "createdAt": "2026-09-21T14:25:44.000Z",
      "updatedAt": "2026-09-21T14:25:44.000Z",
      "userRole": "OWNER"
    }
  },
  "message": "Organization details retrieved successfully"
}
```

---

### `PATCH /api/organizations/{organizationId}`
Updates organization name.
- **Required Role**: `OWNER` or `ADMIN`.
- **Request Body**:
```json
{
  "name": "Acme Global Industries"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "f58380cf-5ff3-4b68-b78f-6f95886fe202",
      "name": "Acme Global Industries",
      "slug": "acme-corp",
      "ownerId": "3b236142-9993-455b-b9d9-bb4ae01feec0",
      "createdAt": "2026-09-21T14:25:44.000Z",
      "updatedAt": "2026-09-21T14:35:00.000Z"
    }
  },
  "message": "Organization updated successfully"
}
```

---

### `DELETE /api/organizations/{organizationId}`
Deletes an organization and cascades all memberships.
- **Required Role**: `OWNER` (Admins and Members cannot delete).
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "f58380cf-5ff3-4b68-b78f-6f95886fe202",
      "name": "Acme Global Industries",
      "slug": "acme-corp",
      "ownerId": "3b236142-9993-455b-b9d9-bb4ae01feec0"
    }
  },
  "message": "Organization deleted successfully"
}
```

---

### `GET /api/organizations/{organizationId}/members`
Retrieves members list and assigned roles.
- **Required Role**: `OWNER`, `ADMIN`, or `MEMBER`.
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "m1-uuid",
        "userId": "3b236142-9993-455b-b9d9-bb4ae01feec0",
        "organizationId": "f58380cf-5ff3-4b68-b78f-6f95886fe202",
        "role": "OWNER",
        "joinedAt": "2026-09-21T14:25:44.000Z",
        "user": {
          "id": "3b236142-9993-455b-b9d9-bb4ae01feec0",
          "name": "Alice Johnson",
          "email": "alice@example.com",
          "avatar": null
        }
      },
      {
        "id": "m2-uuid",
        "userId": "bob-uuid",
        "organizationId": "f58380cf-5ff3-4b68-b78f-6f95886fe202",
        "role": "ADMIN",
        "joinedAt": "2026-09-21T14:25:44.000Z",
        "user": {
          "id": "bob-uuid",
          "name": "Bob Smith",
          "email": "bob@example.com",
          "avatar": null
        }
      }
    ]
  },
  "message": "Organization members retrieved successfully"
}
```
