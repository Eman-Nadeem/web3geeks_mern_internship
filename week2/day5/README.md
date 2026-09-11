# SyncDocs — Real-Time Collaborative Document Editor (Day 5 Final Production Release)

SyncDocs is a production-grade, multi-user real-time collaborative document editor built to modern 2026 standards with **Next.js 15+ App Router**, **React 19**, **TypeScript (Strict Mode)**, **Prisma ORM (Neon Serverless PostgreSQL)**, **Tiptap Rich-Text Editor (ProseMirror)**, **Socket.IO Standalone Real-Time Engine**, **Granular Role-Based Access Control (RBAC)**, **Immutable Version History & Non-Destructive Restore**, **DOMPurify Stored XSS Hardening**, and **Swagger OpenAPI 3.0 Documentation**.

---

## 1. Executive Summary

Day 5 represents the **final stabilization, hardening, testing, performance optimization, and deployment readiness phase** of SyncDocs. Rather than introducing new unstable features, Day 5 elevates the existing collaborative platform to enterprise-grade reliability through:
- Zero build errors (`next build` with Turbopack).
- Complete TypeScript strict type-checking (`tsc --noEmit` clean).
- Zero pending database migrations (`prisma migrate status` up-to-date).
- Comprehensive end-to-end multi-user collaboration, reliability, security, and performance test suites.
- Strict isolation of deployment configuration across frontend and WebSocket layers.

---

## 2. Dual-Service Architecture Topology

SyncDocs separates stateless HTTP / SSR workloads (Next.js) from long-lived stateful WebSocket connections (Socket.IO) to maximize uptime, scalability, and independent deployment cycles:

```
┌────────────────────────────────────────┐         ┌────────────────────────────────────────┐
│      Next.js Web App (Vercel)          │         │    Socket.IO Real-Time Engine (Render) │
│                                        │         │                                        │
│  - App Router (React Server Components)│◄───────►│  - Room-scoped WebSocket multiplexing │
│  - JWT Auth via HttpOnly Cookies       │   WSS   │  - Multi-tab presence deduplication    │
│  - REST API Route Handlers             │         │  - 75-100ms throttled cursor broadcast │
│  - Collaborator Management APIs        │         │  - Option A: LWW conflict resolution   │
│  - Version History & Restore APIs      │         │  - In-memory version counter hydration │
│  - OpenAPI / Swagger Documentation     │         │  - Live role updates & instant eviction│
└───────────────────┬────────────────────┘         └───────────────────┬────────────────────┘
                    │                                                  │
                    │           Internal HTTP Bridge (RPC)             │
                    │   (Protected via x-internal-bridge-secret header)│
                    │─────────────────────────────────────────────────►│
                    │                                                  │
                    └─────────────────────────┬────────────────────────┘
                                              ▼
                        ┌────────────────────────────────────────────┐
                        │       Neon Serverless PostgreSQL DB        │
                        │                                            │
                        │  - Users (bcrypt credentials & avatars)    │
                        │  - Documents (Content, Titles, Metadata)   │
                        │  - DocumentCollaborators (Roles & Access)  │
                        │  - DocumentVersions (Append-only snapshots)│
                        │  - Connection pooling via Prisma Client    │
                        └────────────────────────────────────────────┘
```

---

## 3. Technology Stack & Modern 2026 Standards

| Layer | Technology | Purpose & Details |
|---|---|---|
| **Frontend Framework** | Next.js 16.3.4 (App Router) | Server Components, Route Handlers, Middleware / Proxy, Turbopack |
| **UI Library** | React 19.2.8 | Concurrent rendering, Action boundaries, Suspense |
| **Styling** | Vanilla CSS ("Clarity" Design System) | Modern CSS tokens, dark/light modes, micro-animations |
| **Rich-Text Engine** | Tiptap 3.31 + ProseMirror | Native ProseMirror decorations for remote carets & text ranges |
| **Database & ORM** | Prisma 6.4.0 + Neon PostgreSQL | Pooled connection architecture, transactional mutations |
| **Real-Time Layer** | Socket.IO 4.8.3 Standalone Node Server | State multiplexing, heartbeat liveness, multi-tab deduplication |
| **Authentication** | `jose` (JWT) + `bcryptjs` | Stateless signed tokens stored in secure, `HttpOnly`, `SameSite=Lax` cookies |
| **Sanitization** | `isomorphic-dompurify` 3.19.0 | Dual-layer (write & render) HTML sanitization blocking stored XSS |
| **Schema Validation** | Zod 4.5.4 | Strict runtime contract enforcement across all REST & WebSocket events |
| **Testing** | Vitest 5.0.0 | High-performance unit, integration, and E2E collaboration suites |

---

## 4. Key Features & Capabilities

1. **Rich Collaborative Document Editing**: Full WYSIWYG rich text (Headings, bold, italics, lists, blockquotes) powered by Tiptap/ProseMirror.
2. **Real-Time Presence Tracking**: Dynamic collaborator roster in the document header showing user avatars, names, assigned colors, and active connection count with multi-tab deduplication.
3. **Collaborative Remote Cursors**: Live visual carets and colored selection highlights rendered via ProseMirror decorations. Remote cursors map cleanly across editor transactions (`tr.mapping.map`).
4. **Granular Role-Based Access Control (RBAC)**: Unified server-enforced permissions governing Owners, Editors, and Viewers.
5. **Immutable Version History & Restore**: Every debounced save records an append-only snapshot. Historical versions can be restored non-destructively as Version N+1.
6. **Live Role Updates & Collaborator Eviction**: Immediate real-time promotion, demotion, or eviction of active users via internal HTTP-to-WebSocket bridge RPCs.
7. **Cold-Restart Resilience**: Document version counters and in-memory caches automatically hydrate from PostgreSQL upon server restarts.

---

## 5. Permissions & RBAC Matrix

All authorization decisions derive from a single source of truth (`lib/auth/permissions.ts` -> `hasPermission(role, action)`):

| Permission Action | Owner | Editor | Viewer | Non-Member (`none`) |
|---|:---:|:---:|:---:|:---:|
| `view_document` | ✅ | ✅ | ✅ | ❌ (403/404) |
| `edit_document` | ✅ | ✅ | ❌ (403) | ❌ (403) |
| `share_document` | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| `manage_collaborators` | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| `change_roles` | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| `remove_collaborator` | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| `delete_document` | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| `view_history` | ✅ | ✅ | ✅ | ❌ (403) |
| `restore_version` | ✅ | ✅ | ❌ (403) | ❌ (403) |

---

## 6. WebSocket Real-Time Events Catalog

### Client-to-Server (`C -> S`)

| Event Name | Payload Schema (`Zod`) | Ack Signature | Description |
|---|---|---|---|
| `join_document` | `{ documentId: string }` | `(res: { success: boolean, activeUsers?: Collaborator[], presence?: PresenceUser[], role?: string, error?: string }) => void` | Joins document room, hydratates DB state, returns active collaborators. |
| `sync_request` | `{ documentId: string }` | `(res: { success: boolean, data?: SyncResponsePayload, error?: string }) => void` | Mid-session join or reconnect state recovery. |
| `cursor_move` | `{ documentId: string, cursor: { from: number, to: number } \| null, userId: string, displayName: string, color: string }` | None | Emits throttled cursor caret and selection range updates. |
| `document_change` | `{ documentId: string, content?: string, title?: string, jsonContent?: any, status?: string, category?: string, baseVersion?: number }` | `(res: { success: boolean, version?: number, updatedAt?: string, noop?: boolean, error?: string }) => void` | Emits live debounced document mutations with LWW conflict detection. |
| `leave_document` | `{ documentId: string }` | None | Gracefully leaves room and cleans up active socket entry. |
| `ping` | Any | `(res: { pong: boolean, timestamp: string }) => void` | Liveness health check. |

### Server-to-Client (`S -> C`)

| Event Name | Payload Schema | Broadcast Scope | Description |
|---|---|---|---|
| `room_users` | `{ documentId: string, users: Collaborator[] }` | Joining socket | Legacy collaborator roster snapshot. |
| `presence_update` | `{ documentId: string, users: PresenceUser[] }` | Entire room | Deduplicated list of all active users in document room. |
| `user_joined` | `{ documentId: string, user: Collaborator, activeUsers: Collaborator[] }` | Peers in room (`socket.to`) | Notification that a new collaborator entered the session. |
| `user_left` | `{ documentId: string, user: Collaborator, activeUsers: Collaborator[] }` | Entire room | Broadcast when a user's final open tab is closed/disconnected. |
| `cursor_update` | `CursorUpdatePayload` | Peers in room (`socket.to`) | Live remote caret position and selection range. |
| `document_update` | `DocumentUpdatePayload` | Peers in room (`socket.to`) | Live document content, title, and incremented version update. |
| `version_created` | `VersionCreatedPayload` | Entire room (`io.to`) | Real-time notification of a newly recorded historical version snapshot. |
| `document_restored` | `DocumentRestoredPayload` | Entire room (`io.to`) | Notifies all collaborators that document content reverted to historical version. |
| `permission_update` | `PermissionUpdatePayload` | Targeted user socket | Direct notification of role promotion, demotion, or instant revocation. |
| `role_changed` | `RoleChangedPayload` | Entire room (`io.to`) | Broadcast when a collaborator's role is updated. |
| `collaborator_added` | `CollaboratorAddedPayload` | Entire room (`io.to`) | Broadcast when a new collaborator is granted access to the document. |
| `collaborator_removed` | `CollaboratorRemovedPayload` | Entire room (`io.to`) | Broadcast when a collaborator is removed from document access. |

---

## 7. REST API & Internal Bridge Specification

### Client & Public REST Endpoints (`Next.js`)
- `POST /api/auth/register` — Create new user account.
- `POST /api/auth/login` — Authenticate and issue secure JWT cookie.
- `POST /api/auth/logout` — Expire and clear auth cookie.
- `GET /api/auth/me` — Return currently authenticated user profile.
- `GET /api/documents` — List documents accessible by caller.
- `POST /api/documents` — Create a new document (caller becomes Owner).
- `GET /api/documents/:id` — Retrieve document details and caller's access role.
- `PUT/PATCH /api/documents/:id` — Update document title, content, status (Owner & Editor only).
- `DELETE /api/documents/:id` — Delete document (Owner only).
- `GET /api/documents/:id/collaborators` — List document collaborators.
- `POST /api/documents/:id/collaborators` — Invite collaborator (Owner only).
- `PATCH /api/documents/:id/collaborators/:userId` — Update collaborator role (Owner only).
- `DELETE /api/documents/:id/collaborators/:userId` — Remove collaborator (Owner only).
- `GET /api/documents/:id/versions` — List immutable version snapshots.
- `GET /api/documents/:id/versions/:versionNumber` — Retrieve specific historical snapshot.
- `POST /api/documents/:id/restore` — Non-destructively restore historical version (Owner & Editor only).
- `GET /api-docs` & `GET /api/openapi.json` — Interactive Swagger UI and OpenAPI 3.0 specification.

### Internal HTTP Bridge Endpoints (`Socket.IO Service`)
*All bridge endpoints require `x-internal-bridge-secret` matching `INTERNAL_BRIDGE_SECRET`.*
- `POST /api/socket/evict` — Forcibly evict target user's sockets from a document room.
- `POST /api/socket/role-change` — Notify room and update cached socket role for collaborator.
- `POST /api/socket/document-restored` — Synchronize in-memory content/version and broadcast restore event.
- `POST /api/socket/collaborator-added` — Broadcast collaborator addition to active room peers.
- `POST /api/socket/version-created` — Broadcast version creation snapshot to active room peers.

---

## 8. Conflict Handling & Concurrency Model

SyncDocs implements **Option A: Last-Write-Wins (LWW) with Monotonic Version Tracking**:
1. Every document maintains a monotonic integer `version` in PostgreSQL.
2. The Socket.IO server tracks active document versions in memory (`documentVersions`).
3. **Cold-Restart Hydration**: If the socket server restarts, the first incoming event (`join_document`, `document_change`, `sync_request`) triggers `ensureDocumentHydrated`, loading the current DB version and content to prevent unique constraint conflicts (`P2002`).
4. **Stale Write Detection**: Incoming edits specify `baseVersion`. If `baseVersion < currentVersion`, the server logs a detected conflict and converges the document to the latest authoritative version.
5. **Dual Debounce Architecture**:
   - WebSocket broadcast debounce: **150ms** for smooth, real-time typing across clients.
   - Database persistence debounce: **600ms** to avoid saturating PostgreSQL write connections.

---

## 9. Security, RBAC & Hardening Architecture

1. **Authentication**: Stateless HMAC-SHA256 JWT tokens with 7-day expiration. Passwords hashed with `bcryptjs` (salt rounds: 10).
2. **Cookie Security**: Auth tokens stored in `auth_token` cookie with `httpOnly: true`, `secure: process.env.NODE_ENV === "production"`, `sameSite: "lax"`, and `path: "/"`.
3. **Strict CORS Enforcement**: Socket.IO CORS configuration extracts `new URL(origin).hostname` and verifies against the configured `ALLOWED_ORIGIN` hostname and localhost. Requests from unauthorized origins are rejected with `callback(new Error("CORS origin not allowed"), false)`.
4. **Stored & Reflected XSS Prevention**: All user-supplied HTML content passes through `DOMPurify` (`isomorphic-dompurify`) on both write (`lib/db/documents.ts`) and render (`VersionHistoryModal`). Script tags, inline event listeners (`onerror`, `onclick`), and `javascript:` URIs are completely stripped.
5. **Internal Bridge Secret Protection**: Route Handlers communicate with the WebSocket engine using a shared secret header (`x-internal-bridge-secret`). Requests with missing or incorrect secrets are rejected with `401 Unauthorized` before processing.
6. **Secrets Hygiene**: `.env` and `.env.local` are strictly ignored by git (`.gitignore`). `.env.example` contains only empty placeholder strings.

---

## 10. Performance Benchmarks & Optimizations

1. **Redundant No-Op Update Avoidance**:
   - `DOCUMENT_CHANGE` events comparing incoming content against in-memory `documentContents` bypass database writes and version bumps if content has not changed.
2. **Throttled Cursor Transmission**:
   - Cursor updates are throttled to a **100ms sliding window** with `requestAnimationFrame` batching on the frontend (`use-document-socket.ts`), eliminating event loop congestion.
3. **Large Document Benchmarks**:
   - Tested and verified with **65KB payloads (10,000+ words)**. End-to-end round trip latency across database persistence, DOMPurify sanitization, and WebSocket broadcast maintains acceptable interactive performance (<5000ms over cross-region cloud PostgreSQL).

---

## 11. Local Development Setup & Prerequisites

### Prerequisites
- Node.js 20+ LTS
- PostgreSQL database (Local or Neon Serverless)
- npm or pnpm

### Step-by-Step Setup
```bash
# 1. Clone repository and navigate to Day 5
cd week2/day5

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and supply your Neon DATABASE_URL and secrets

# 4. Push Prisma schema & run migrations
npx prisma migrate status
npx prisma db push

# 5. Run development servers (Next.js + Socket.IO concurrently)
npm run dev
```
- Web Application: `http://localhost:3000`
- Real-Time WebSocket Server: `http://localhost:3001`
- Swagger API Docs: `http://localhost:3000/api-docs`

---

## 12. Production Deployment Guide

### A. Frontend Web App (Vercel)
1. Import repository on Vercel with Root Directory set to `week2/day5`.
2. Configure Environment Variables:
   - `DATABASE_URL`: Connection string with pooling enabled.
   - `DATABASE_URL_UNPOOLED`: Direct connection string for migrations.
   - `AUTH_SECRET`: Generated 32+ character random secret (`openssl rand -base64 32`).
   - `INTERNAL_BRIDGE_SECRET`: Generated 32+ character random secret.
   - `NEXT_PUBLIC_APP_URL`: `https://your-syncdocs-app.vercel.app`
   - `NEXT_PUBLIC_SOCKET_URL`: `https://your-syncdocs-socket.onrender.com`
3. Build Command: `npm run build` (`npx prisma generate && next build`).

### B. Real-Time Socket Server (Render / Railway)
1. Deploy as a Web Service on Render using `render.yaml` configuration.
2. Root Directory: `week2/day5`
3. Build Command: `npm install && npx prisma generate`
4. Start Command: `npx tsx server/socket.ts`
5. Configure Environment Variables:
   - `NODE_ENV`: `production`
   - `SOCKET_PORT`: `10000` (Render default port)
   - `CORS_ORIGIN`: `https://your-syncdocs-app.vercel.app`
   - `DATABASE_URL`: Neon PostgreSQL connection string.
   - `AUTH_SECRET`: Same secret as frontend.
   - `INTERNAL_BRIDGE_SECRET`: Same secret as frontend.

---

## 13. Comprehensive Environment Variables Reference

| Variable Name | Type | Required | Default / Example | Purpose |
|---|:---:|:---:|---|---|
| `DATABASE_URL` | String | Yes | `postgresql://...@ep-...neon.tech/neondb?sslmode=require` | Pooled connection string for Prisma queries. |
| `DATABASE_URL_UNPOOLED` | String | Yes | `postgresql://...@ep-...neon.tech/neondb?sslmode=require` | Direct database connection for migrations. |
| `AUTH_SECRET` | String | Yes | 32+ character string | Secret key for signing and verifying JWT session tokens. |
| `INTERNAL_BRIDGE_SECRET` | String | Yes | 32+ character string | Shared secret authenticating internal RPC calls from Next.js to Socket.IO. |
| `NEXT_PUBLIC_APP_URL` | String | Yes | `http://localhost:3000` | Canonical public URL of the Next.js web application. |
| `NEXT_PUBLIC_SOCKET_URL`| String | Yes | `http://localhost:3001` | URL where client browsers connect to the Socket.IO server. |
| `SOCKET_PORT` | Number | No | `3001` (Local) / `10000` (Render) | Port on which the standalone Socket.IO HTTP server listens. |
| `CORS_ORIGIN` | String | Yes | `http://localhost:3000` | Whitelisted origin permitted to open WebSocket connections. |
| `CLOUDINARY_CLOUD_NAME` | String | No | `your_cloud_name` | Cloudinary account for user avatar uploads. |
| `CLOUDINARY_API_KEY` | String | No | `your_api_key` | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | String | No | `your_api_secret` | Cloudinary API secret. |

---

## 14. Test Suite & Verification Matrix

SyncDocs includes 29 comprehensive automated test suites (164 passing tests) covering all architectural layers:

| Test Suite File | Domain / Focus | Key Scenarios Verified | Status |
|---|---|---|:---:|
| `day5-performance-benchmarks.test.ts` | Task 4 Performance | Redundant no-op update avoidance, 65KB (10K words) large document throughput | ✅ Pass |
| `day5-e2e-collaboration.test.ts` | Task 1 E2E Collab | 4-user presence roster, assigned colors, cursor sync, LWW edit convergence, viewer 403 enforcement, mid-session sync-request | ✅ Pass |
| `day5-version-recovery.test.ts` | Task 2 History & Restore | Sequential versioning, `changedBy` attribution, cold-restart resilience, non-destructive restore with dual live events | ✅ Pass |
| `day5-websocket-reliability.test.ts` | Task 3 Socket Reliability| Multi-tab presence deduplication, selective disconnect, malformed payload Zod rejection, room membership gating | ✅ Pass |
| `day5-security-audit.test.ts` | Task 5 Security & RBAC | Granular RBAC enforcement, internal bridge secret auth, DOMPurify stored XSS prevention, git secrets hygiene | ✅ Pass |
| `day5-error-edge-cases.test.ts` | Task 6 Edge Cases | Empty documents (`<p></p>`), deleted document 404 handling, real-time collaborator eviction, real-time role downgrade | ✅ Pass |
| `cors-allowlist.test.ts` | Day 3 Issue 1 Remediation | Strict hostname checking, rejection of attacker domains with `callback(new Error(), false)` | ✅ Pass |
| `cold-restart-version-hydration.test.ts` | Day 3/4 Issue 2 Remediation | Database hydration on cold restart, prevention of P2002 version counter collisions | ✅ Pass |
| `version-created-realtime.test.ts` | Day 4 Issue 1 Remediation | Emission of `version_created` event on autosave, restore, and REST mutations | ✅ Pass |
| `html-sanitization.test.ts` | Day 4 Issue 2 Remediation | DOMPurify sanitization of XSS vectors on write and render | ✅ Pass |

---

## 15. Known Limitations & Future Roadmap

To ensure maximum stability for the Day 5 final release, the following items have been explicitly scoped as **future roadmap enhancements** (not included in Day 5 scope):
1. **Threaded Inline Comments**: Ability to highlight arbitrary ProseMirror text nodes and attach collaborative discussion threads.
2. **Detailed Activity & Audit Feed**: User-facing chronological audit stream displaying granular micro-actions (e.g. "Alice updated document title to X", "Bob changed Charlie's role to Viewer").
3. **In-App & Email Notifications**: Real-time notification badge center and email alerts when a user is invited to collaborate or mentioned in a document.
4. **Operational Transformation (OT) / CRDTs (Yjs)**: Upgrading from Option A (Last-Write-Wins) to character-level CRDT conflict resolution for simultaneous conflicting keystroke interleaving.
