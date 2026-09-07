# Collaborative Document Editor — Day 1 Foundation Phase

A production-ready, single-user persistent document editor built with **Next.js 15+ App Router**, **TypeScript (Strict)**, **Prisma ORM**, **Tiptap Rich-Text Editor**, **Zod Validation**, **Swagger OpenAPI Docs**, and **Vitest Testing**.

This foundation is designed to seamlessly support future WebSocket/CRDT real-time sync (e.g., Yjs + ProseMirror schema) in subsequent phases.

---

## Technical Stack & Architecture

- **Framework**: Next.js 15+ (App Router with Server Components & Route Handlers)
- **Database Layer**: Prisma ORM (v6.4.0) with serverless connection pooling patterns
- **Editor Surface**: Tiptap (`@tiptap/react`) built on ProseMirror
- **API Specs**: Interactive Swagger UI exposed at `/api-docs`
- **Validation**: Zod runtime schemas for all create/update endpoints
- **Testing**: Vitest unit & integration testing suite
- **Styling**: Vanilla CSS Design System with dark mode glassmorphism, responsive sidebar, and WCAG 2.2 AA accessibility baseline

---

## Getting Started

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file (or copy `.env.example` to `.env.local`):
```env
# Database Connection String (SQLite local dev or PostgreSQL)
DATABASE_URL="file:./dev.db"

# Public Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Database Migration & Seed
Run Prisma database push and seed initial sample data:
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 4. Running Local Development Server
Start the development server:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## API & Documentation

The interactive **Swagger OpenAPI 3.0** documentation is available at:
`http://localhost:3000/api-docs`

### REST Endpoints Summary

| Method | Endpoint | Description | Payload / Schema |
|---|---|---|---|
| `GET` | `/api/health` | System health status & timestamp | - |
| `GET` | `/api/documents` | List all documents for demo user | - |
| `POST` | `/api/documents` | Create a new document | `{ title?: string, content?: string }` |
| `GET` | `/api/documents/:id` | Get single document by ID | Path param: `id` |
| `PUT` | `/api/documents/:id` | Update document title / content | `{ title?: string, content?: string }` |
| `DELETE` | `/api/documents/:id` | Delete document by ID | Path param: `id` |

---

## Running Automated Tests

Run the Vitest test suite covering Zod schema validation and document CRUD logic:
```bash
npm test
```

Run static type checking and production build validation:
```bash
npm run build
```

---

## Day 2+ Real-Time Sync Architecture Blueprint

This Day 1 implementation stores document content as both **HTML** (for instant preview rendering) and **structured JSON** (Tiptap ProseMirror node structure). 

When attaching WebSockets and Yjs CRDT operational transforms on Day 2+:
1. The Tiptap editor instance seamlessly binds to `y-prosemirror`.
2. WebSocket providers (or Socket.io / Hocuspocus server) connect directly to the editor state.
3. The stored `jsonContent` field serves as the initial CRDT document snapshot without requiring breaking database migrations.
