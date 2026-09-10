# SyncDocs — Collaborative Document Editor (Day 4)

A production-grade, multi-user real-time collaborative document editor built with **Next.js 15+ App Router**, **TypeScript (Strict)**, **Prisma ORM (Neon PostgreSQL)**, **Tiptap Rich-Text Editor (ProseMirror)**, **JWT Credentials Authentication with bcryptjs**, **Socket.IO Real-Time Presence & Cursor Engine**, **Granular Role-Based Access Control (RBAC)**, **Immutable Version History & Restore**, and **Swagger OpenAPI 3.0 Documentation**.

---

## Technical Stack & Dual-Service Topology

```
┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
│        Next.js App (Vercel)          │       │    Socket.IO Service (Render)        │
│                                      │       │                                      │
│  - App Router (RSC + Client)         │◄─────►│  - Room-scoped event engine          │
│  - Auth (bcrypt + JWT in httpOnly)   │  WSS  │  - Multi-tab presence tracking       │
│  - Document CRUD REST API Handlers   │       │  - Throttled live cursor broadcast   │
│  - Sharing & Collaborator APIs       │       │  - Option A: LWW conflict handling   │
│  - Version History & Restore APIs    │       │  - Realtime role change & evictions  │
│  - Swagger UI Documentation          │       │  - Authenticated Internal Bridge     │
│  - ProseMirror Cursor Carets/Ranges  │       │  - sync_request/sync_response sync   │
└──────────────────┬───────────────────┘       └──────────────────┬───────────────────┘
                   │                                              │
                   │         Internal HTTP Bridge (RPC)           │
                   │  (Protected via INTERNAL_BRIDGE_SECRET)      │
                   │─────────────────────────────────────────────►│
                   │                                              │
                   └──────────────────────┬───────────────────────┘
                                          ▼
                      ┌───────────────────────────────────────┐
                      │    Neon Serverless PostgreSQL DB      │
                      │  (Users, Documents, Collaborators,    │
                      │   Roles, Immutable DocumentVersions)  │
                      │  - Neon Connection Pooling            │
                      └───────────────────────────────────────┘
```

### Core Architecture & Features

- **Frontend & App Engine**: Next.js 15+ App Router, React 19, Vanilla CSS "Clarity" Design System.
- **Granular Permissions & RBAC (Day 4 Task 1 & 2)**:
  - Single source of truth permission matrix (`lib/auth/permissions.ts` -> `hasPermission(role, action)`).
  - Explicit roles: `owner`, `editor`, `viewer`, `none`.
  - Server-side and database-level enforcement: Viewers cannot mutate content or restore versions (403 Forbidden). Editors cannot manage collaborators or delete documents (403 Forbidden).
  - Live UI adaptation: Buttons (Share, Edit, Restore) dynamically adjust based on access role.
- **Document Sharing & Real-Time Collaborator Management (Day 4 Tasks 2 & 3)**:
  - Invite collaborators by email or username as `editor` or `viewer`.
  - Real-time role promotion/demotion and instant collaborator removal.
  - Changes instantly broadcast to active document rooms via the WebSocket bridge.
- **Immutable Version History & Restore (Day 4 Tasks 4 & 5)**:
  - Automatic version snapshots saved on edits via `prisma.documentVersion.create` (append-only, immutable).
  - Version history modal displaying timestamp, editor name/avatar, version number, and visual preview.
  - Non-destructive point-in-time restore: Restoring an older version creates a new incremented version (Version N+1), keeping complete historical audit trails intact.
- **Hardened Internal Socket Bridge Security**:
  - Internal bridge endpoints (`/api/socket/evict`, `/api/socket/role-change`, `/api/socket/document-restored`, `/api/socket/collaborator-added`) authenticated via `INTERNAL_BRIDGE_SECRET`.
  - Unauthenticated requests rejected immediately with `401 Unauthorized` before body parsing.
  - Restricted CORS origin to `ALLOWED_ORIGIN` and localhost.
- **Presence Tracking & Multi-Tab Deduplication**:
  - Real-time active collaborator roster in the editor header with avatars, display names, and assigned colors.
  - Deduplicated by `userId` to support multiple tabs per user accurately.
- **Live Collaborative Cursors & Selection Highlights**:
  - Collaborative cursors rendered via native ProseMirror decorations inside Tiptap.
  - High-visibility 2px vertical caret line with a floating name flag.
  - Translucent selection highlight (`background-color: ${color}33`) when peers highlight text ranges.
  - Position mapping on transactions (`tr.mapping.map`) prevents cursor drift.
  - Throttled emissions (75ms sliding window) prevent socket flooding.
- **Conflict Handling Strategy (Option A: Last-Write-Wins with Versioning)**:
  - Monotonic server document version counter.
  - Clients include `baseVersion` on writes.
  - Detects concurrent stale writes (409 Conflict) and converges clients to the authoritative state.
  - Debounce timings: 150ms for socket broadcasts (fluid typing), 600ms for backup HTTP autosave.
- **Automated Testing**: 127 automated tests passing across 19 suites covering permissions, document versions, sharing workflows, bridge authentication, concurrency locks, presence, and live cursors.

---

## Role & Permission Matrix (Single Source of Truth)

All permissions are governed by `hasPermission(role, action)` in `lib/auth/permissions.ts`:

| Permission Action | Owner | Editor | Viewer | None |
|---|:---:|:---:|:---:|:---:|
| `view_document` | ✅ | ✅ | ✅ | ❌ |
| `edit_document` | ✅ | ✅ | ❌ | ❌ |
| `share_document` | ✅ | ❌ | ❌ | ❌ |
| `manage_collaborators` | ✅ | ❌ | ❌ | ❌ |
| `change_roles` | ✅ | ❌ | ❌ | ❌ |
| `remove_collaborator` | ✅ | ❌ | ❌ | ❌ |
| `delete_document` | ✅ | ❌ | ❌ | ❌ |
| `view_history` | ✅ | ✅ | ✅ | ❌ |
| `restore_version` | ✅ | ❌ | ❌ | ❌ |

---

## Local Development Setup

### 1. Install Dependencies
```bash
cd week2/day4
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `.env` contains:
```env
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://...neon.tech/neondb?sslmode=require"

# Generate via: openssl rand -base64 32
AUTH_SECRET="your_jwt_auth_secret_32_characters_minimum"

# Shared secret protecting Next.js -> Socket.IO internal bridge endpoints
INTERNAL_BRIDGE_SECRET="your_internal_socket_bridge_secret"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
SOCKET_PORT=3001
CORS_ORIGIN="http://localhost:3000"

# Optional Cloudinary image upload configuration:
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="your_unsigned_preset"
```

### 3. Synchronize Database & Seed Initial Users
```bash
npm run db:push
npm run db:seed
```
Default Demo Account:
- **Email**: `demo@example.com`
- **Password**: `Password123!`

### 4. Run Development Server
```bash
npm run dev
```
- **Next.js Web App**: `http://localhost:3000`
- **Socket.IO Real-Time Server**: `http://localhost:3001`
- **Interactive Swagger Docs**: `http://localhost:3000/docs`

---

## Automated Test Suites

Run all Vitest test suites:
```bash
npm test
```
The test suite validates **127 tests passing across 19 test suites**:
1. **Day 4 Sharing, Permissions & Version History**: `__tests__/day4-sharing-permissions-versions.test.ts` (16 tests)
2. **Internal Socket Bridge Security**: `__tests__/bridge-auth.test.ts` (12 tests)
3. **Sharing & Access Control Integration**: `__tests__/sharing-access.test.ts` (10 tests)
4. **Document CRUD & Ownership**: `__tests__/documents-api.test.ts` (9 tests)
5. **Presence Leave Authentication**: `__tests__/presence-leave-auth.test.ts` (3 tests)
6. **Atomic Optimistic Concurrency Race Conditions**: `__tests__/concurrent-optimistic-lock.test.ts` (1 test)
7. **Dual-Persistence Conflict Resolution**: `__tests__/dual-persistence-conflict.test.ts` (1 test)
8. **Offline Conflict Handling & Draft Preservation**: `__tests__/offline-conflict-resolution.test.tsx` (1 test)
9. **Presence & Live Cursor Stability**: `__tests__/cursor-stability.test.ts` (5 tests)
10. **Typing Races & Cursor Tracking**: `__tests__/typing-race-and-cursor-position.test.ts` (5 tests)
11. **Sync Gating Queue**: `__tests__/sync-gating-queue.test.ts` (2 tests)
12. **Zod Event Contracts & Schemas**: `__tests__/realtime-events.test.ts` (16 tests)
13. **Input Validation**: `__tests__/validation.test.ts` (8 tests)
14. **Bug Fixes & Edge Cases**: `__tests__/bug-fixes.test.ts` (9 tests)
15. **Self-Loop Check & Presence Disconnect**: `__tests__/presence-disconnect-drop.test.ts` and `__tests__/self-loop-check.test.tsx` (7 tests)

Type check verification:
```bash
npx tsc --noEmit
```

---

## Deployment Guide (Render & Vercel)

### Architecture
- The **Next.js Web App & REST APIs** deploy to **Vercel**.
- The **Socket.IO Engine** deploys to **Render** as a long-running Web Service.

### Render Deployment (Socket.IO Service)
1. In the [Render Dashboard](https://dashboard.render.com), create a new **Web Service**.
2. Configure settings:
   - **Root Directory**: `week2/day4`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npx tsx server/socket.ts`
3. Set Environment Variables:
   - `NODE_ENV`: `production`
   - `SOCKET_PORT`: `10000`
   - `DATABASE_URL`: *(Your Neon PostgreSQL connection string)*
   - `AUTH_SECRET`: *(32+ character JWT secret)*
   - `INTERNAL_BRIDGE_SECRET`: *(Shared secret for internal bridge requests)*
   - `CORS_ORIGIN`: `https://<your-vercel-app>.vercel.app`

### Vercel Deployment (Next.js App)
1. Import project in [Vercel](https://vercel.com).
2. Set **Root Directory** to `week2/day4`.
3. Set Environment Variables:
   - `DATABASE_URL`: *(Neon pooled string)*
   - `DATABASE_URL_UNPOOLED`: *(Neon unpooled string)*
   - `AUTH_SECRET`: *(Same secret configured on Render)*
   - `INTERNAL_BRIDGE_SECRET`: *(Same secret configured on Render)*
   - `NEXT_PUBLIC_APP_URL`: `https://<your-vercel-app>.vercel.app`
   - `NEXT_PUBLIC_SOCKET_URL`: `https://<your-render-service>.onrender.com`
4. Deploy!
