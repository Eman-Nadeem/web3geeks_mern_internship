# SyncDocs — Collaborative Document Editor (Day 3)

A production-grade, multi-user real-time collaborative document editor built with **Next.js 15+ App Router**, **TypeScript (Strict)**, **Prisma ORM (Neon PostgreSQL)**, **Tiptap Rich-Text Editor (ProseMirror)**, **JWT Credentials Authentication with bcryptjs**, **Socket.IO Real-Time Presence & Cursor Engine**, and **Swagger OpenAPI 3.0 Documentation**.

---

## Technical Stack & Dual-Service Topology

```
┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
│        Next.js App (Vercel)          │       │    Socket.IO Service (Render)        │
│                                      │       │                                      │
│  - App Router (RSC + Client)         │◄─────►│  - Room-scoped event engine          │
│  - Auth (bcrypt + JWT in httpOnly)   │  WSS  │  - Multi-tab presence tracking       │
│  - Document CRUD REST API Handlers   │       │  - Throttled live cursor broadcast   │
│  - Swagger UI Documentation          │       │  - Option A: LWW conflict handling   │
│  - ProseMirror Cursor Carets/Ranges  │       │  - sync_request/sync_response sync   │
└──────────────────┬───────────────────┘       └──────────────────┬───────────────────┘
                   │                                              │
                   └──────────────────────┬───────────────────────┘
                                          ▼
                      ┌───────────────────────────────────────┐
                      │    Neon Serverless PostgreSQL DB      │
                      │  (Users, Passwords, Documents, Roles) │
                      │  - Neon Connection Pooling            │
                      └───────────────────────────────────────┘
```

- **Frontend & App Engine**: Next.js 15+ App Router, React 19, Vanilla CSS "Clarity" Design System.
- **Presence Tracking (Day 3 Task 1)**: Real-time list of who is actively in a document, displayed in the editor header with avatars, display names, and assigned collaboration colors. Presence map is tracked on the server keyed by `socket.id` and deduplicated by `userId` to accurately support multi-tab browsing (opening 2 tabs shows 1 user in roster; closing 1 tab keeps user present; closing all tabs removes them).
- **Live Cursors & Selection Sharing (Day 3 Tasks 2 & 3)**:
  - Collaborative cursors rendered via native ProseMirror decorations inside Tiptap.
  - High-visibility 2px vertical caret line with a floating name flag displaying collaborator name and color.
  - Translucent selection highlight (`background-color: ${color}33`) when peers highlight text ranges.
  - Position mapping on local/remote document transactions (`tr.mapping.map`) prevents cursor drift.
  - Throttled emissions (75ms sliding window) prevent socket flooding on rapid keypresses or mouse movement.
  - Unfocused editor or socket disconnect immediately removes caret from peer screens.
- **Real Identity & Deterministic Colors (Day 3 Task 3)**:
  - Real authenticated user identity (`userId`, `name`, `avatarUrl`) attached to all cursor and presence events.
  - 12-color curated accessible palette (`lib/realtime/colors.ts`) mapped deterministically via user ID hashing. No mid-session color drift across tabs or reconnects.
- **Baseline Conflict Handling (Day 3 Task 4 — Option A: Last-Write-Wins with Versioning)**:
  - Monotonic server document version counter (`documentVersions: Map<documentId, number>`).
  - Clients send `baseVersion` with each edit.
  - If `baseVersion < currentVersion`, the server logs a conflict warning (`[Conflict Detected] Document X: incoming baseVersion < current server version. Applying Last-Write-Wins resolution...`).
  - Server accepts the latest write (LWW), increments document version, persists to database, and broadcasts the winner to all clients with the new authoritative version.
  - All clients converge to the single authoritative server state.
- **State Synchronization (Day 3 Task 5)**:
  - Clients emit `sync_request` upon initial join or reconnection.
  - Server validates room membership and responds with `sync_response` containing authoritative version, content, and active presence roster.
- **Automated Testing**: 74 automated tests across 8 suites covering crypto, schemas, documents API, sharing permissions, room isolation, presence deduplication, live cursors, and LWW conflict resolution.

---

## Conflict Handling Strategy: Option A (Last-Write-Wins)

### How It Works
1. When a client opens or syncs a document, it receives the current server `version` (e.g. `v1`).
2. When the user edits, the client debounces the change (250ms) and sends `document_change` containing `baseVersion: 1`.
3. The server checks:
   - If `baseVersion === currentVersion`: Normal sequential update. The server increments version to `v2` and broadcasts `v2`.
   - If `baseVersion < currentVersion`: Concurrent edit conflict. Another collaborator saved an edit in the meantime. The server logs `[Conflict Detected]` with details, accepts the latest incoming write (Last-Write-Wins), increments version to `v3`, and broadcasts `v3` to all room members.
4. Peer clients update their local state to `v3`, guaranteeing convergence.

### Trade-offs & When OT/CRDT is Needed
- **Advantages**: Simple, reliable, zero merge divergence, deterministic single converged state, highly performant with minimal network overhead.
- **Limitations**: In simultaneous co-authoring of the same paragraph, the later write overwrites the earlier write's changes rather than interleaving characters.
- **When to upgrade**: For character-by-character concurrent typing in identical sentences without overwriting (such as Google Docs), a full Operational Transformation (OT) or Conflict-free Replicated Data Type (CRDT, e.g. Yjs / Automerge) engine is required.

---

## Local Development Setup

### 1. Install Dependencies
```bash
cd week2/day3
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
# Generate via: openssl rand -base64 32 (do NOT commit or use default fallback in production)
AUTH_SECRET="RUN_OPENSSL_RAND_BASE64_32_TO_GENERATE_YOUR_SECRET"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
SOCKET_PORT=3001
CORS_ORIGIN="http://localhost:3000"

# Optional Cloudinary image upload configuration:
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
# Or unsigned preset:
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

### 4. Run Both Next.js and Socket.IO Server
```bash
npm run dev
```
- **Next.js App**: `http://localhost:3000`
- **Socket.IO Server**: `http://localhost:3001`
- **Interactive Swagger Docs**: `http://localhost:3000/docs`

---

## Automated Test Suite

Run all Vitest test suites:
```bash
npm test
```
The test suite validates (**74 tests passing across 8 test suites**):
1. **Presence, Live Cursors, & LWW Conflict Handling**: `__tests__/presence-cursors-conflict.test.ts` (7 tests)
2. **Password Hashing & JWT Cryptography**: `__tests__/auth.test.ts` (10 tests)
3. **Document Ownership & Access Enforcement**: `__tests__/documents-api.test.ts` (9 tests)
4. **Zod Event Contracts & Day 3 Schemas**: `__tests__/realtime-events.test.ts` (16 tests)
5. **Zod Input Validation**: `__tests__/validation.test.ts` (8 tests)
6. **Socket.IO Room Isolation & Handshake Auth**: `__tests__/socket-rooms.test.ts` (5 tests)
7. **Document Sharing & Collaborator Roles**: `__tests__/sharing-access.test.ts` (10 tests)
8. **Bug Fixes & Edge Cases**: `__tests__/bug-fixes.test.ts` (9 tests)

---

## Render & Vercel Deployment Guide

### Why Dual Topology?
Vercel serverless functions are ephemeral and terminate after executing a request; they cannot keep persistent WebSocket connections open. Therefore:
1. The **Next.js web app and REST API** deploy to **Vercel**.
2. The **Socket.IO real-time engine** deploys to **Render** as a persistent Web Service.

---

### Step-by-Step Render Deployment (Socket.IO Service)

You can deploy directly via the [Render Dashboard](https://dashboard.render.com):

1. **Sign in to Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com).
2. **Create New Web Service**:
   - Click **New +** in the top right, then select **Web Service**.
   - Choose **Build and deploy from a Git repository**.
   - Select your repository: `Eman-Nadeem/web3geeks_mern_internship`.
3. **Configure Service Settings**:
   - **Name**: `syncdocs-socket-server`
   - **Region**: Oregon (or closest to your users)
   - **Branch**: `week2-day3`
   - **Root Directory**: `week2/day3`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npx tsx server/socket.ts`
   - **Instance Type**: Free (or Starter for always-on)
4. **Set Environment Variables**:
   Under the **Environment Variables** section, add:
   - `NODE_ENV`: `production`
   - `SOCKET_PORT`: `10000` *(Render provides port 10000 by default)*
   - `DATABASE_URL`: *(Your Neon PostgreSQL connection string)*
   - `AUTH_SECRET`: *(Your 32+ character JWT secret)*
   - `CORS_ORIGIN`: `https://<your-vercel-app>.vercel.app` *(or `*` during initial testing)*
5. **Click "Deploy Web Service"**:
   - Render will build and launch your real-time WebSocket server.
   - Once healthy, copy your Render service URL (e.g. `https://syncdocs-socket-server.onrender.com`).

---

### Step-by-Step Vercel Deployment (Next.js App)

1. **Import Project to Vercel**:
   - In [vercel.com](https://vercel.com), click **Add New...** -> **Project**.
   - Select `Eman-Nadeem/web3geeks_mern_internship`.
   - Set **Root Directory** to `week2/day3`.
2. **Set Environment Variables in Vercel**:
   - `DATABASE_URL`: *(Your Neon pooled connection string)*
   - `DATABASE_URL_UNPOOLED`: *(Your Neon unpooled connection string)*
   - `AUTH_SECRET`: *(Same secret configured on Render)*
   - `NEXT_PUBLIC_APP_URL`: `https://<your-vercel-app>.vercel.app`
   - `NEXT_PUBLIC_SOCKET_URL`: `https://syncdocs-socket-server.onrender.com` *(From Render)*
3. **Deploy**:
   - Click **Deploy**. Vercel will build and serve your Next.js application.

> [!TIP]
> **Free Tier Spin-Down Note**: Render's free tier spins down after 15 minutes of inactivity. When a user connects after a cold period, Render wakes up in ~45 seconds. The SyncDocs editor UI displays `Reconnecting...` with non-blocking local editing until the socket connects, after which state synchronizes automatically via `sync_request`.

