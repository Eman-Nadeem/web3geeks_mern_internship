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
  getDocumentRoom,
  Collaborator,
  PresenceUser,
} from "../lib/realtime/events";
import { getUserColor } from "../lib/realtime/colors";
import {
  getUserDocumentAccess,
  updateDocument,
  getDocumentById,
  AccessRole,
} from "../lib/db/documents";

const PORT = Number(process.env.SOCKET_PORT) || 3001;
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "healthy", service: "SyncDocs Realtime WebSocket Engine (Day 3)", port: PORT }));
});

export const io = new Server(server, {
  pingInterval: 5000,
  pingTimeout: 4000,
  cors: {
    origin: (origin, callback) => {
      if (!origin || origin.includes("localhost") || origin.includes("127.0.0.1") || origin === ALLOWED_ORIGIN) {
        return callback(null, true);
      }
      return callback(null, true);
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
const documentVersions = new Map<string, number>();
const documentContents = new Map<string, string>();

function getDocumentVersion(documentId: string): number {
  return documentVersions.get(documentId) || 1;
}

function incrementDocumentVersion(documentId: string): number {
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
      if (accessRole === "none") {
        console.warn(`[Socket] Access denied for ${user.name} to doc ${documentId}`);
        if (ack) ack({ success: false, error: "Forbidden: You do not have access to this document" });
        return;
      }

      socket.data.role = accessRole;
      const room = getDocumentRoom(documentId);
      await socket.join(room);

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
        email: user.email,
        avatarUrl: p.avatarUrl,
        color: p.color,
      }));

      // Immediate dedicated response to joining client (Task 1.3)
      socket.emit(REALTIME_EVENTS.ROOM_USERS, {
        documentId,
        users: legacyActiveUsers,
        role: accessRole,
      });

      socket.emit(REALTIME_EVENTS.PRESENCE_UPDATE, {
        documentId,
        users: currentPresence,
      });

      // Send existing active remote cursors to the joiner
      const socketMap = activeRoomUsers.get(room);
      if (socketMap) {
        for (const [sId, otherEntry] of socketMap.entries()) {
          if (sId !== socket.id && otherEntry.cursor) {
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
      if (accessRole === "none") {
        if (ack) ack({ success: false, error: "Forbidden: No permission to access document" });
        return;
      }

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

      // Re-verify authorization and role enforcement
      const accessRole = await getUserDocumentAccess(user.id, documentId);
      if (accessRole === "viewer") {
        if (ack) ack({ success: false, error: "Read-only: Viewers cannot make edits to this document" });
        return;
      }

      if (accessRole === "none") {
        if (ack) ack({ success: false, error: "Forbidden: No permission to edit this document" });
        return;
      }

      // Conflict handling Strategy: Option A — Last-Write-Wins with version tracking & logging
      const currentVersion = getDocumentVersion(documentId);
      if (baseVersion !== undefined && baseVersion < currentVersion) {
        console.warn(
          `[Conflict Detected] Document ${documentId}: incoming baseVersion (${baseVersion}) < current server version (${currentVersion}). Applying Last-Write-Wins resolution for edit by ${user.name} (${user.id}).`
        );
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

      // Broadcast to room members with new resolved version (LWW convergence)
      io.to(room).emit(REALTIME_EVENTS.DOCUMENT_UPDATE, {
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
