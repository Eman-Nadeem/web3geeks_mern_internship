import "dotenv/config";
import http from "http";
import { Server, Socket } from "socket.io";
import { verifyToken, JWTPayload } from "../lib/auth/jwt";
import {
  REALTIME_EVENTS,
  joinDocumentSchema,
  leaveDocumentSchema,
  documentChangeSchema,
  cursorUpdateSchema,
  syncRequestSchema,
  collaboratorAddedSchema,
  collaboratorRemovedSchema,
  roleChangedSchema,
  documentRestoredSchema,
  versionCreatedSchema,
  getDocumentRoom,
  Collaborator,
  PresenceUser,
  CollaboratorAddedPayload,
  DocumentRestoredPayload,
  VersionCreatedPayload,
} from "../lib/realtime/events";
import { getUserColor } from "../lib/realtime/colors";
import {
  getUserDocumentAccess,
  updateDocument,
  getDocumentById,
  AccessRole,
} from "../lib/db/documents";
import { hasPermission } from "../lib/auth/permissions";

const PORT = Number(process.env.SOCKET_PORT) || 3001;
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function verifyInternalBridgeAuth(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  const expectedSecret = process.env.INTERNAL_BRIDGE_SECRET;
  const providedSecret = req.headers["x-internal-bridge-secret"];

  if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
    console.warn(
      `[Security] Rejected unauthenticated internal bridge request on ${req.url} (provided: ${providedSecret ? "invalid" : "missing"})`
    );
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized: Invalid or missing internal bridge secret" }));
    return false;
  }
  return true;
}

export const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-internal-bridge-secret");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Priority 3: Support tab-close leave notification via navigator.sendBeacon
  if (req.method === "POST" && req.url === "/api/presence/leave") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body);
        const { documentId, userId, socketId } = parsed;

        // Verify requester's identity (same as WebSocket connection)
        let token: string | undefined = parsed.token;
        if (!token && req.headers.cookie) {
          const match = req.headers.cookie.match(/auth_token=([^;]+)/);
          if (match) token = match[1];
        }

        if (!token) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Unauthorized: Missing authentication token" }));
          return;
        }

        const payload = await verifyToken(token);
        if (!payload?.id) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Unauthorized: Invalid or expired token" }));
          return;
        }

        // Exploit prevention: Ensure authenticated user ID matches the userId in the payload
        if (payload.id !== userId) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Unauthorized: Cannot evict another user" }));
          return;
        }

        if (documentId && userId) {
          const room = getDocumentRoom(documentId);
          const socketMap = activeRoomUsers.get(room);
          if (socketMap) {
            if (socketId) {
              socketMap.delete(socketId);
            } else {
              for (const [sId, entry] of Array.from(socketMap.entries())) {
                if (entry.userId === userId) socketMap.delete(sId);
              }
            }
            const userStillPresent = Array.from(socketMap.values()).some((c) => c.userId === userId);
            const remaining = getUniqueRoomUsers(room);

            if (!userStillPresent) {
              io.to(room).emit(REALTIME_EVENTS.USER_LEFT, {
                documentId,
                user: { id: userId, name: "", color: getUserColor(userId) },
                activeUsers: remaining.map((p) => ({ id: p.userId, name: p.displayName, color: p.color })),
              });
              io.to(room).emit(REALTIME_EVENTS.PRESENCE_UPDATE, {
                documentId,
                users: remaining,
              });
              io.to(room).emit(REALTIME_EVENTS.CURSOR_UPDATE, {
                documentId,
                userId,
                displayName: "",
                color: getUserColor(userId),
                cursor: null,
              });
            }
            if (socketMap.size === 0) activeRoomUsers.delete(room);
          }
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid payload" }));
      }
    });
    return;
  }

  // Day 4 Bridge: Evict collaborator when removed via REST API
  if (req.method === "POST" && req.url === "/api/socket/evict") {
    if (!verifyInternalBridgeAuth(req, res)) return;
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const { documentId, targetUserId, reason } = JSON.parse(body);
        if (documentId && targetUserId) {
          evictUserFromDocumentRoom(documentId, targetUserId, reason);
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid payload" }));
      }
    });
    return;
  }

  // Day 4 Bridge: Role changed via REST API
  if (req.method === "POST" && req.url === "/api/socket/role-change") {
    if (!verifyInternalBridgeAuth(req, res)) return;
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const { documentId, targetUserId, newRole } = JSON.parse(body);
        if (documentId && targetUserId && newRole) {
          updateCollaboratorRoleInRoom(documentId, targetUserId, newRole);
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid payload" }));
      }
    });
    return;
  }

  // Day 4 Bridge: Document restored via REST API
  if (req.method === "POST" && req.url === "/api/socket/document-restored") {
    if (!verifyInternalBridgeAuth(req, res)) return;
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body);
        broadcastDocumentRestored(payload);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid payload" }));
      }
    });
    return;
  }

  // Day 4 Bridge: Collaborator added via REST API
  if (req.method === "POST" && req.url === "/api/socket/collaborator-added") {
    if (!verifyInternalBridgeAuth(req, res)) return;
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body);
        const parsed = collaboratorAddedSchema.parse(payload);
        broadcastCollaboratorAdded(parsed);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid payload" }));
      }
    });
    return;
  }

  // Day 4 Bridge: Version created via REST API
  if (req.method === "POST" && req.url === "/api/socket/version-created") {
    if (!verifyInternalBridgeAuth(req, res)) return;
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body);
        const parsed = versionCreatedSchema.parse(payload);
        broadcastVersionCreated(parsed);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid payload" }));
      }
    });
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "healthy", service: "SyncDocs Realtime WebSocket Engine (Day 5)", port: PORT }));
});

export const io = new Server(server, {
  pingInterval: 5000,
  pingTimeout: 4000,
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      try {
        const url = new URL(origin);
        const hostname = url.hostname;
        const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
        const isAllowed = origin === ALLOWED_ORIGIN;

        if (isLocal || isAllowed) {
          return callback(null, true);
        }
      } catch {
        // Invalid origin URL -> fall through to reject
      }

      return callback(new Error("CORS origin not allowed"), false);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

interface AuthenticatedSocket extends Socket {
  data: {
    user: JWTPayload;
    role?: AccessRole;
  };
}

interface PresenceEntry {
  socketId: string;
  userId: string;
  displayName: string;
  color: string;
  avatarUrl?: string | null;
  joinedAt: string;
  cursor?: { from: number; to: number } | null;
}

// In-memory active presence per document room: Map<roomName, Map<socketId, PresenceEntry>>
const activeRoomUsers = new Map<string, Map<string, PresenceEntry>>();

// In-memory document version tracking for conflict detection (Option A: Last-Write-Wins with version tracking)
export const documentVersions = new Map<string, number>();
export const documentContents = new Map<string, string>();

const hydrationPromises = new Map<string, Promise<{ version: number; content: string } | null>>();

/**
 * Hydrates in-memory version counter and content from the database on first touch
 * in this server process (e.g. after a cold restart when Render spins down on idle).
 * Uses an in-flight promise map per documentId to prevent race conditions during
 * concurrent first-touches.
 */
export async function ensureDocumentHydrated(documentId: string): Promise<{ version: number; content: string }> {
  // Fast path: already hydrated in memory
  if (documentVersions.has(documentId) && documentContents.has(documentId)) {
    return {
      version: documentVersions.get(documentId)!,
      content: documentContents.get(documentId)!,
    };
  }

  // Deduplicate in-flight hydration requests to avoid concurrent race conditions
  let promise = hydrationPromises.get(documentId);
  if (!promise) {
    promise = (async () => {
      try {
        const doc = await getDocumentById(documentId);
        const dbVersion = doc?.version ?? 1;
        const dbContent = doc?.content ?? "";

        if (!documentVersions.has(documentId)) {
          documentVersions.set(documentId, dbVersion);
        }
        if (!documentContents.has(documentId)) {
          documentContents.set(documentId, dbContent);
        }

        return {
          version: documentVersions.get(documentId)!,
          content: documentContents.get(documentId)!,
        };
      } catch (err) {
        console.error(`[Hydration] Failed to hydrate document ${documentId}:`, err);
        return {
          version: documentVersions.get(documentId) ?? 1,
          content: documentContents.get(documentId) ?? "",
        };
      } finally {
        hydrationPromises.delete(documentId);
      }
    })();
    hydrationPromises.set(documentId, promise);
  }

  const res = await promise;
  return (
    res ?? {
      version: documentVersions.get(documentId) ?? 1,
      content: documentContents.get(documentId) ?? "",
    }
  );
}

export function getDocumentVersion(documentId: string): number {
  return documentVersions.get(documentId) || 1;
}

export function incrementDocumentVersion(documentId: string): number {
  const current = getDocumentVersion(documentId);
  const next = current + 1;
  documentVersions.set(documentId, next);
  return next;
}

/**
 * Returns a deduplicated list of active collaborators in a room (by user ID).
 * This ensures that a user with multiple tabs open only appears once in the presence roster.
 */
function getUniqueRoomUsers(room: string): PresenceUser[] {
  const socketMap = activeRoomUsers.get(room);
  if (!socketMap) return [];
  const uniqueUsers = new Map<string, PresenceUser>();
  for (const entry of socketMap.values()) {
    if (!uniqueUsers.has(entry.userId)) {
      uniqueUsers.set(entry.userId, {
        userId: entry.userId,
        displayName: entry.displayName,
        color: entry.color,
        avatarUrl: entry.avatarUrl,
        joinedAt: entry.joinedAt,
      });
    }
  }
  return Array.from(uniqueUsers.values());
}

/**
 * Day 4: Evicts a user from a document room immediately (used on collaborator removal).
 * Forces all open sockets for this user on this document to leave the room, emits
 * permission_update (revoked), and broadcasts presence/collaborator removal updates to peers.
 */
export function evictUserFromDocumentRoom(documentId: string, targetUserId: string, reason = "Access revoked") {
  const room = getDocumentRoom(documentId);
  const socketMap = activeRoomUsers.get(room);

  // Evict all active sockets for target user
  for (const [_, s] of io.sockets.sockets.entries()) {
    const authSocket = s as AuthenticatedSocket;
    if (authSocket.data?.user?.id === targetUserId && authSocket.rooms.has(room)) {
      authSocket.emit(REALTIME_EVENTS.PERMISSION_UPDATE, {
        documentId,
        userId: targetUserId,
        role: "none",
        revoked: true,
        message: reason,
      });
      authSocket.leave(room);
    }
  }

  if (socketMap) {
    for (const [sId, entry] of Array.from(socketMap.entries())) {
      if (entry.userId === targetUserId) {
        socketMap.delete(sId);
      }
    }
    const remaining = getUniqueRoomUsers(room);
    io.to(room).emit(REALTIME_EVENTS.COLLABORATOR_REMOVED, {
      documentId,
      userId: targetUserId,
    });
    io.to(room).emit(REALTIME_EVENTS.USER_LEFT, {
      documentId,
      user: { id: targetUserId, name: "", color: getUserColor(targetUserId) },
      activeUsers: remaining.map((p) => ({ id: p.userId, name: p.displayName, color: p.color })),
    });
    io.to(room).emit(REALTIME_EVENTS.PRESENCE_UPDATE, {
      documentId,
      users: remaining,
    });
    io.to(room).emit(REALTIME_EVENTS.CURSOR_UPDATE, {
      documentId,
      userId: targetUserId,
      displayName: "",
      color: getUserColor(targetUserId),
      cursor: null,
    });
    if (socketMap.size === 0) activeRoomUsers.delete(room);
  }
}

/**
 * Day 4: Updates a collaborator's role across active socket connections in room.
 */
export function updateCollaboratorRoleInRoom(documentId: string, targetUserId: string, newRole: "editor" | "viewer") {
  const room = getDocumentRoom(documentId);
  for (const [_, s] of io.sockets.sockets.entries()) {
    const authSocket = s as AuthenticatedSocket;
    if (authSocket.data?.user?.id === targetUserId && authSocket.rooms.has(room)) {
      authSocket.data.role = newRole;
      authSocket.emit(REALTIME_EVENTS.PERMISSION_UPDATE, {
        documentId,
        userId: targetUserId,
        role: newRole,
        revoked: false,
      });
    }
  }
  io.to(room).emit(REALTIME_EVENTS.ROLE_CHANGED, {
    documentId,
    userId: targetUserId,
    newRole,
  });
}

/**
 * Day 4: Broadcasts document_restored event to room and syncs in-memory state.
 */
export function broadcastDocumentRestored(payload: DocumentRestoredPayload) {
  const room = getDocumentRoom(payload.documentId);
  documentContents.set(payload.documentId, payload.content);
  documentVersions.set(payload.documentId, payload.version);

  io.to(room).emit(REALTIME_EVENTS.DOCUMENT_RESTORED, payload);
  io.to(room).emit(REALTIME_EVENTS.DOCUMENT_UPDATE, {
    documentId: payload.documentId,
    title: payload.title,
    content: payload.content,
    jsonContent: payload.jsonContent,
    version: payload.version,
    updatedBy: payload.restoredBy,
    updatedAt: payload.restoredAt,
  });

  // Day 4: Restore creates a new immutable version snapshot row; also emit version_created
  // so any open Version History modals or audit logs immediately receive the new version.
  const versionPayload: VersionCreatedPayload = {
    documentId: payload.documentId,
    versionNumber: payload.version,
    title: payload.title,
    changedBy: payload.restoredBy,
    createdAt: payload.restoredAt,
  };
  broadcastVersionCreated(versionPayload);
}

/**
 * Day 4: Broadcasts version_created event to room.
 */
export function broadcastVersionCreated(payload: VersionCreatedPayload) {
  const room = getDocumentRoom(payload.documentId);
  io.to(room).emit(REALTIME_EVENTS.VERSION_CREATED, payload);
}

/**
 * Day 4: Broadcasts collaborator_added event to room.
 */
export function broadcastCollaboratorAdded(payload: CollaboratorAddedPayload) {
  const room = getDocumentRoom(payload.documentId);
  io.to(room).emit(REALTIME_EVENTS.COLLABORATOR_ADDED, payload);
}

// --- Authentication Middleware ---
io.use(async (socket, next) => {
  try {
    let token: string | undefined = socket.handshake.auth?.token;

    // Fallback: parse cookie header if token not sent in handshake auth object
    if (!token && socket.handshake.headers.cookie) {
      const match = socket.handshake.headers.cookie.match(/auth_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }

    const payload = await verifyToken(token);
    if (!payload?.id) {
      return next(new Error("Authentication error: Invalid or expired token"));
    }

    socket.data.user = payload;
    next();
  } catch (err) {
    console.error("Socket authentication error:", err);
    next(new Error("Authentication error: Unauthorized"));
  }
});

// --- Connection Lifecycle & Event Handlers ---
io.on("connection", (rawSocket) => {
  const socket = rawSocket as AuthenticatedSocket;
  const user = socket.data.user;
  const userColor = getUserColor(user.id);

  console.log(`[Socket] User connected: ${user.name} (${user.id}) | Socket ID: ${socket.id} | Color: ${userColor}`);

  // 1. Smoke test: Ping / Pong
  socket.on(REALTIME_EVENTS.PING, (data, callback) => {
    if (typeof callback === "function") {
      callback({ pong: true, timestamp: new Date().toISOString() });
    } else {
      socket.emit(REALTIME_EVENTS.PONG, { timestamp: new Date().toISOString() });
    }
  });

  // 2. Join Document Room (Authorized for owner, editor, and viewer)
  socket.on(REALTIME_EVENTS.JOIN_DOCUMENT, async (rawPayload, ack) => {
    try {
      const parseResult = joinDocumentSchema.safeParse(rawPayload);
      if (!parseResult.success) {
        if (ack) ack({ success: false, error: "Invalid documentId payload" });
        return;
      }

      const { documentId } = parseResult.data;

      // Authorize document access via single source of truth helper
      const accessRole = await getUserDocumentAccess(user.id, documentId);
      if (!hasPermission(accessRole, "view_document")) {
        console.warn(`[Socket] Access denied for ${user.name} to doc ${documentId}`);
        if (ack) ack({ success: false, error: "Forbidden: You do not have access to this document" });
        return;
      }

      socket.data.role = accessRole;
      const room = getDocumentRoom(documentId);
      await socket.join(room);

      // Hydrate version counter and content from DB on first touch if server cold-restarted
      await ensureDocumentHydrated(documentId);

      // Track active collaborator in room keyed by socket.id
      if (!activeRoomUsers.has(room)) {
        activeRoomUsers.set(room, new Map());
      }

      const presenceEntry: PresenceEntry = {
        socketId: socket.id,
        userId: user.id,
        displayName: user.name,
        color: userColor,
        avatarUrl: user.avatarUrl,
        joinedAt: new Date().toISOString(),
      };

      activeRoomUsers.get(room)!.set(socket.id, presenceEntry);
      const currentPresence = getUniqueRoomUsers(room);

      console.log(`[Socket] ${user.name} (${accessRole}) joined room ${room} on socket ${socket.id}. Active collaborators: ${currentPresence.length}`);

      // Map presence list to Collaborator shape for legacy consumers
      const legacyActiveUsers: Collaborator[] = currentPresence.map((p) => ({
        id: p.userId,
        name: p.displayName,
        color: p.color,
        avatarUrl: p.avatarUrl,
      }));

      // Send active collaborators list back to joining socket immediately (Task 1.3)
      socket.emit(REALTIME_EVENTS.ROOM_USERS, {
        documentId,
        users: legacyActiveUsers,
      });

      // Send initial presence list to joining user (Task 1.3)
      socket.emit(REALTIME_EVENTS.PRESENCE_UPDATE, {
        documentId,
        users: currentPresence,
      });

      // Send all existing remote cursors to the newly joined client
      const roomUsersMap = activeRoomUsers.get(room);
      if (roomUsersMap) {
        for (const [otherSocketId, otherEntry] of roomUsersMap.entries()) {
          if (otherSocketId !== socket.id && otherEntry.cursor) {
            socket.emit(REALTIME_EVENTS.CURSOR_UPDATE, {
              documentId,
              userId: otherEntry.userId,
              displayName: otherEntry.displayName,
              color: otherEntry.color,
              cursor: otherEntry.cursor,
            });
          }
        }
      }

      // Broadcast user_joined and presence_update to other sockets in room (Task 1.4)
      socket.to(room).emit(REALTIME_EVENTS.USER_JOINED, {
        documentId,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          color: userColor,
        },
        activeUsers: legacyActiveUsers,
      });

      socket.to(room).emit(REALTIME_EVENTS.PRESENCE_UPDATE, {
        documentId,
        users: currentPresence,
      });

      if (ack) {
        ack({
          success: true,
          activeUsers: legacyActiveUsers,
          presence: currentPresence,
          role: accessRole,
        });
      }
    } catch (error) {
      console.error("[Socket] join_document error:", error);
      if (ack) ack({ success: false, error: "Server error joining room" });
    }
  });

  // 3. Document Synchronization Request (Task 5.1: Mid-session join / reconnect sync)
  socket.on(REALTIME_EVENTS.SYNC_REQUEST, async (rawPayload, ack) => {
    try {
      const parseResult = syncRequestSchema.safeParse(rawPayload);
      if (!parseResult.success) {
        if (ack) ack({ success: false, error: "Invalid sync_request payload" });
        return;
      }

      const { documentId } = parseResult.data;
      const room = getDocumentRoom(documentId);

      // Verify room membership
      if (!socket.rooms.has(room)) {
        if (ack) ack({ success: false, error: "Not a member of this document room" });
        return;
      }

      const accessRole = await getUserDocumentAccess(user.id, documentId);
      if (!hasPermission(accessRole, "view_document")) {
        if (ack) ack({ success: false, error: "Forbidden: No permission to access document" });
        return;
      }

      await ensureDocumentHydrated(documentId);
      const doc = await getDocumentById(documentId);
      const version = getDocumentVersion(documentId);
      const presence = getUniqueRoomUsers(room);

      const responsePayload = {
        documentId,
        content: documentContents.get(documentId) ?? doc?.content ?? "",
        jsonContent: doc?.jsonContent ?? null,
        version,
        presence,
      };

      socket.emit(REALTIME_EVENTS.SYNC_RESPONSE, responsePayload);
      if (ack) ack({ success: true, data: responsePayload });
    } catch (err) {
      console.error("[Socket] sync_request error:", err);
      if (ack) ack({ success: false, error: "Server error handling sync_request" });
    }
  });

  // 4. Live Cursor & Selection Sharing (Task 2 & Task 3)
  socket.on(REALTIME_EVENTS.CURSOR_UPDATE, (rawPayload) => {
    try {
      const parseResult = cursorUpdateSchema.safeParse(rawPayload);
      if (!parseResult.success) return;

      const { documentId, cursor } = parseResult.data;
      const room = getDocumentRoom(documentId);

      // Verify room membership (Task 3.4)
      if (!socket.rooms.has(room)) return;

      // Update cursor position in room's presence map
      const entry = activeRoomUsers.get(room)?.get(socket.id);
      if (entry) {
        entry.cursor = cursor ?? null;
      }

      // Re-broadcast cursor update to all other collaborators in room
      socket.to(room).emit(REALTIME_EVENTS.CURSOR_UPDATE, {
        documentId,
        userId: user.id,
        displayName: user.name,
        color: userColor,
        cursor: cursor ?? null,
      });
    } catch (err) {
      console.error("[Socket] cursor_update error:", err);
    }
  });

  // 5. Document Change (Live Debounced Sync with LWW Conflict Detection — Task 4)
  socket.on(REALTIME_EVENTS.DOCUMENT_CHANGE, async (rawPayload, ack) => {
    try {
      const parseResult = documentChangeSchema.safeParse(rawPayload);
      if (!parseResult.success) {
        if (ack) ack({ success: false, error: "Invalid change payload" });
        return;
      }

      const { documentId, content, title, jsonContent, status, category, baseVersion } = parseResult.data;
      const room = getDocumentRoom(documentId);

      // Verify sender is in this document's room (Task 3.4)
      if (!socket.rooms.has(room)) {
        if (ack) ack({ success: false, error: "Not a member of this document room" });
        return;
      }

      // Re-verify authorization and role enforcement via unified permissions matrix
      const accessRole = await getUserDocumentAccess(user.id, documentId);
      if (!hasPermission(accessRole, "view_document")) {
        console.warn(
          `[Security/Abuse Signal] Unauthorized user ${user.name} (${user.id}) attempted to send document_change on document ${documentId}. Event dropped and rejected.`
        );
        if (ack) ack({ success: false, error: "Forbidden: No permission to edit this document" });
        return;
      }

      if (!hasPermission(accessRole, "edit_document")) {
        console.warn(
          `[Security/Abuse Signal] Viewer ${user.name} (${user.id}) attempted to send document_change on document ${documentId}. Event dropped and rejected.`
        );
        if (ack) ack({ success: false, error: "Read-only: Viewers cannot make edits to this document" });
        return;
      }

      // Ensure document counter and content are hydrated from database if server restarted
      await ensureDocumentHydrated(documentId);

      // Conflict handling Strategy: Option A — Last-Write-Wins with version tracking & logging
      const currentVersion = getDocumentVersion(documentId);
      if (baseVersion !== undefined && baseVersion < currentVersion) {
        console.warn(
          `[Conflict Detected] Document ${documentId}: incoming baseVersion (${baseVersion}) < current server version (${currentVersion}). Applying Last-Write-Wins resolution for edit by ${user.name} (${user.id}).`
        );
      }

      // Performance Optimization: Check for redundant no-op updates
      const currentContent = documentContents.get(documentId);
      if (
        content !== undefined &&
        currentContent !== undefined &&
        content === currentContent &&
        title === undefined &&
        status === undefined &&
        category === undefined
      ) {
        if (ack) ack({ success: true, version: currentVersion, updatedAt: new Date().toISOString(), noop: true });
        return;
      }

      const nextVersion = incrementDocumentVersion(documentId);
      if (content !== undefined) {
        documentContents.set(documentId, content);
      }
      const updatedAt = new Date().toISOString();
      const updatedBy: Collaborator = {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        color: userColor,
      };

      // Broadcast to other room members with new resolved version (LWW convergence)
      socket.to(room).emit(REALTIME_EVENTS.DOCUMENT_UPDATE, {
        documentId,
        title,
        content,
        jsonContent,
        status,
        category,
        version: nextVersion,
        updatedBy,
        updatedAt,
      });

      // Day 4: Emit version_created to all room collaborators for the new snapshot
      const versionPayload: VersionCreatedPayload = {
        documentId,
        versionNumber: nextVersion,
        title: title || "Untitled Document",
        changedBy: updatedBy,
        createdAt: updatedAt,
      };
      try {
        versionCreatedSchema.parse(versionPayload);
        io.to(room).emit(REALTIME_EVENTS.VERSION_CREATED, versionPayload);
      } catch (vErr) {
        console.warn("[Socket] Invalid version_created payload:", vErr);
      }

      // Persist resolved state to database asynchronously
      try {
        await updateDocument(documentId, user.id, {
          title,
          content,
          jsonContent,
          status,
          category,
          version: nextVersion,
        });
      } catch (dbErr) {
        console.error("[Socket] Failed to persist document update to database:", dbErr);
      }

      if (ack) ack({ success: true, version: nextVersion, updatedAt });
    } catch (error) {
      console.error("[Socket] document_change error:", error);
      if (ack) ack({ success: false, error: "Failed to broadcast update" });
    }
  });

  // Day 4: Socket-level Role Changed Event
  socket.on(REALTIME_EVENTS.ROLE_CHANGED, async (rawPayload, ack) => {
    try {
      const parseResult = roleChangedSchema.safeParse(rawPayload);
      if (!parseResult.success) {
        if (ack) ack({ success: false, error: "Invalid payload" });
        return;
      }
      const { documentId, userId: targetUserId, newRole } = parseResult.data;

      // Permission check: Owner only (change_roles capability)
      const requesterRole = await getUserDocumentAccess(user.id, documentId);
      if (!hasPermission(requesterRole, "change_roles")) {
        console.warn(
          `[Security/Abuse Signal] Non-owner ${user.name} (${user.id}) attempted role_changed on doc ${documentId}.`
        );
        if (ack) ack({ success: false, error: "Forbidden: Only the document owner can change collaborator roles" });
        return;
      }

      updateCollaboratorRoleInRoom(documentId, targetUserId, newRole);
      if (ack) ack({ success: true });
    } catch (err) {
      console.error("[Socket] role_changed error:", err);
      if (ack) ack({ success: false, error: "Server error handling role_changed" });
    }
  });

  // Day 4: Socket-level Collaborator Removed Event
  socket.on(REALTIME_EVENTS.COLLABORATOR_REMOVED, async (rawPayload, ack) => {
    try {
      const parseResult = collaboratorRemovedSchema.safeParse(rawPayload);
      if (!parseResult.success) {
        if (ack) ack({ success: false, error: "Invalid payload" });
        return;
      }
      const { documentId, userId: targetUserId } = parseResult.data;

      // Permission check: Owner only (remove_collaborator capability)
      const requesterRole = await getUserDocumentAccess(user.id, documentId);
      if (!hasPermission(requesterRole, "remove_collaborator")) {
        console.warn(
          `[Security/Abuse Signal] Non-owner ${user.name} (${user.id}) attempted collaborator_removed on doc ${documentId}.`
        );
        if (ack) ack({ success: false, error: "Forbidden: Only the document owner can remove collaborators" });
        return;
      }

      evictUserFromDocumentRoom(documentId, targetUserId, "Removed by document owner");
      if (ack) ack({ success: true });
    } catch (err) {
      console.error("[Socket] collaborator_removed error:", err);
      if (ack) ack({ success: false, error: "Server error handling collaborator_removed" });
    }
  });

  // Day 4: Socket-level Document Restored Event
  socket.on(REALTIME_EVENTS.DOCUMENT_RESTORED, async (rawPayload, ack) => {
    try {
      const parseResult = documentRestoredSchema.safeParse(rawPayload);
      if (!parseResult.success) {
        if (ack) ack({ success: false, error: "Invalid payload" });
        return;
      }
      const { documentId } = parseResult.data;

      // Permission check: Owner or Editor (restore_version capability)
      const requesterRole = await getUserDocumentAccess(user.id, documentId);
      if (!hasPermission(requesterRole, "restore_version")) {
        console.warn(
          `[Security/Abuse Signal] Viewer ${user.name} (${user.id}) attempted document_restored on doc ${documentId}.`
        );
        if (ack) ack({ success: false, error: "Forbidden: Viewers cannot restore versions" });
        return;
      }

      broadcastDocumentRestored(parseResult.data);
      if (ack) ack({ success: true });
    } catch (err) {
      console.error("[Socket] document_restored error:", err);
      if (ack) ack({ success: false, error: "Server error handling document_restored" });
    }
  });

  // 6. Leave Document Room (Task 1.5)
  socket.on(REALTIME_EVENTS.LEAVE_DOCUMENT, (rawPayload) => {
    try {
      const parseResult = leaveDocumentSchema.safeParse(rawPayload);
      if (!parseResult.success) return;

      const { documentId } = parseResult.data;
      const room = getDocumentRoom(documentId);

      socket.leave(room);

      const socketMap = activeRoomUsers.get(room);
      if (socketMap) {
        socketMap.delete(socket.id);
        const userStillPresent = Array.from(socketMap.values()).some((c) => c.userId === user.id);
        const remaining = getUniqueRoomUsers(room);

        // Multi-tab check: only broadcast if user has 0 open tabs remaining in room
        if (!userStillPresent) {
          io.to(room).emit(REALTIME_EVENTS.USER_LEFT, {
            documentId,
            user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, color: userColor },
            activeUsers: remaining.map((p) => ({ id: p.userId, name: p.displayName, avatarUrl: p.avatarUrl, color: p.color })),
          });

          io.to(room).emit(REALTIME_EVENTS.PRESENCE_UPDATE, {
            documentId,
            users: remaining,
          });

          // Immediately remove remote cursor caret from peer clients
          io.to(room).emit(REALTIME_EVENTS.CURSOR_UPDATE, {
            documentId,
            userId: user.id,
            displayName: user.name,
            color: userColor,
            cursor: null,
          });
        }

        if (socketMap.size === 0) {
          activeRoomUsers.delete(room);
        }
      }

      console.log(`[Socket] ${user.name} left room ${room} (Socket ID: ${socket.id})`);
    } catch (error) {
      console.error("[Socket] leave_document error:", error);
    }
  });

  // 7. Ungraceful Disconnect (Task 1.5 & Task 2.6)
  socket.on("disconnect", () => {
    console.log(`[Socket] User disconnected: ${user.name} (${user.id}) | Socket ID: ${socket.id}`);

    for (const [room, socketMap] of activeRoomUsers.entries()) {
      if (socketMap.has(socket.id)) {
        socketMap.delete(socket.id);
        const userStillPresent = Array.from(socketMap.values()).some((c) => c.userId === user.id);
        const remaining = getUniqueRoomUsers(room);
        const documentId = room.replace("document:", "");

        // Multi-tab check: only broadcast if user has 0 open tabs remaining in room
        if (!userStillPresent) {
          io.to(room).emit(REALTIME_EVENTS.USER_LEFT, {
            documentId,
            user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, color: userColor },
            activeUsers: remaining.map((p) => ({ id: p.userId, name: p.displayName, avatarUrl: p.avatarUrl, color: p.color })),
          });

          io.to(room).emit(REALTIME_EVENTS.PRESENCE_UPDATE, {
            documentId,
            users: remaining,
          });

          // Immediately remove remote cursor caret from peer clients
          io.to(room).emit(REALTIME_EVENTS.CURSOR_UPDATE, {
            documentId,
            userId: user.id,
            displayName: user.name,
            color: userColor,
            cursor: null,
          });
        }

        if (socketMap.size === 0) {
          activeRoomUsers.delete(room);
        }
      }
    }
  });
});

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 SyncDocs Real-Time Socket Server (Day 3) running on port ${PORT}`);
    console.log(`📡 WebSocket URL: ws://localhost:${PORT}`);
    console.log(`🌐 CORS Allowed Origin: ${ALLOWED_ORIGIN}`);
    console.log(`======================================================\n`);
  });
}
