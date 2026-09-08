# SyncDocs — Collaborative Document Editor (Day 2)

A production-grade, multi-user real-time collaborative document editor built with **Next.js 15+ App Router**, **TypeScript (Strict)**, **Prisma ORM (Neon PostgreSQL)**, **Tiptap Rich-Text Editor**, **JWT Credentials Authentication with bcryptjs**, **Socket.IO Real-Time Synchronization**, and **Swagger OpenAPI 3.0 Documentation**.

---

## Technical Stack & Dual-Service Topology

```
┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
│        Next.js App (Vercel)          │       │    Socket.IO Service (Render)        │
│                                      │       │                                      │
│  - App Router (RSC + Client)         │◄─────►│  - Room-scoped event engine          │
│  - Auth (bcrypt + JWT in httpOnly)   │  WSS  │  - Handshake JWT authorization       │
│  - Document CRUD REST API Handlers   │       │  - Debounced broadcast sync          │
│  - Swagger UI Documentation          │       │  - Real-time active users roster     │
└──────────────────┬───────────────────┘       └──────────────────┬───────────────────┘
                   │                                              │
                   └──────────────────────┬───────────────────────┘
                                          ▼
                      ┌───────────────────────────────────────┐
                      │    Neon Serverless PostgreSQL DB      │
                      │  (Users, Passwords, Documents, Roles) │
                      └───────────────────────────────────────┘
```

- **Frontend & App Engine**: Next.js 15+ App Router, React 19, Vanilla CSS "Clarity" Design System.
- **Authentication (Task 0)**: Email & password credentials with `bcryptjs` (salt rounds 10), signed `jose` JWTs in `httpOnly`, `secure`, `sameSite: "lax"` cookies, user avatar profile editing with Cloudinary support, and strict document ownership enforcement (401 Unauthorized / 403 Forbidden).
- **Real-Time Engine (Tasks 1–4)**: Dedicated Socket.IO server with JWT handshake authentication, document room isolation (`document:{documentId}`), debounced change emissions (250ms), role-based edit permissions (owner/editor can edit, viewer is read-only), and real-time collaborator tracking (`user_joined` / `user_left`).
- **Connection Resilience (Task 6)**: Live visual status badges (`Live Sync`, `Connecting`, `Reconnecting`, `Offline`), non-blocking local editing continuity when offline, and auto-rejoining with state resync on reconnection.
- **Database**: Prisma ORM with connection-pooled PostgreSQL on Neon.
- **Testing**: Vitest unit & integration test suite (57 automated tests across 7 suites covering auth crypto, validation schemas, ownership security, sharing permissions, and room isolation).

---

## Local Development Setup

### 1. Install Dependencies
```bash
cd week2/day2
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
AUTH_SECRET="super-secret-key-week2-day2-collab-editor-32chars!"
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
The test suite validates (57 tests passing):
1. **Password Hashing & JWT Verification**: `__tests__/auth.test.ts`
2. **Document Ownership & Access Enforcement**: `__tests__/documents-api.test.ts`
3. **Zod Event Contracts**: `__tests__/realtime-events.test.ts`
4. **Zod Input Validation**: `__tests__/validation.test.ts`
5. **Socket.IO Room Isolation & Handshake Auth**: `__tests__/socket-rooms.test.ts`
6. **Bug Fixes & Edge Cases**: `__tests__/bug-fixes.test.ts`
7. **Document Sharing & Collaborator Roles**: `__tests__/sharing-access.test.ts`

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
   - **Branch**: `week2-day2`
   - **Root Directory**: `week2/day2`
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
   - Set **Root Directory** to `week2/day2`.
2. **Set Environment Variables in Vercel**:
   - `DATABASE_URL`: *(Your Neon pooled connection string)*
   - `DATABASE_URL_UNPOOLED`: *(Your Neon unpooled connection string)*
   - `AUTH_SECRET`: *(Same secret configured on Render)*
   - `NEXT_PUBLIC_APP_URL`: `https://<your-vercel-app>.vercel.app`
   - `NEXT_PUBLIC_SOCKET_URL`: `https://syncdocs-socket-server.onrender.com` *(From Render)*
3. **Deploy**:
   - Click **Deploy**. Vercel will build and serve your Next.js application.

> [!TIP]
> **Free Tier Spin-Down Note**: Render's free tier spins down after 15 minutes of inactivity. When a user connects after a cold period, Render wakes up in ~45 seconds. The SyncDocs editor UI will display `Reconnecting...` with non-blocking local editing until the socket connects, after which edits synchronize automatically.
