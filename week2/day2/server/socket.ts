import http from "http";
import { Server, Socket } from "socket.io";
import dotenv from "dotenv";
import { verifyToken, JWTPayload } from "../lib/auth/jwt";
import {
  REALTIME_EVENTS,
  joinDocumentSchema,
  leaveDocumentSchema,
  documentChangeSchema,
  getDocumentRoom,
  Collaborator,
} from "../lib/realtime/events";
import {
  getUserDocumentAccess,
  updateDocument,
  getDocumentById,
  AccessRole,
} from "../lib/db/documents";

dotenv.config();

const PORT = Number(process.env.SOCKET_PORT) || 3001;
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "healthy", service: "SyncDocs Realtime WebSocket Engine", port: PORT }));
});

export const io = new Server(server, {
  cors: {
    origin: [ALLOWED_ORIGIN, "http://localhost:3000"],
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

// In-memory active users per document room: Map<roomName, Map<userId, Collaborator>>
const activeRoomUsers = new Map<string, Map<string, Collaborator>>();

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

  console.log(`[Socket] User connected: ${user.name} (${user.id}) | Socket ID: ${socket.id}`);

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

      // Track active collaborator in room
      if (!activeRoomUsers.has(room)) {
        activeRoomUsers.set(room, new Map());
      }

      const collaborator: Collaborator = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      };

      activeRoomUsers.get(room)!.set(user.id, collaborator);
      const currentActiveUsers = Array.from(activeRoomUsers.get(room)!.values());

      console.log(`[Socket] ${user.name} (${accessRole}) joined room ${room}. Active users: ${currentActiveUsers.length}`);

      // Send initial active user roster and access role to the joining client
      socket.emit(REALTIME_EVENTS.ROOM_USERS, {
        documentId,
        users: currentActiveUsers,
        role: accessRole,
      });

      // Broadcast user_joined to all other sockets in room
      socket.to(room).emit(REALTIME_EVENTS.USER_JOINED, {
        documentId,
        user: collaborator,
        activeUsers: currentActiveUsers,
      });

      if (ack) ack({ success: true, activeUsers: currentActiveUsers, role: accessRole });
    } catch (error) {
      console.error("[Socket] join_document error:", error);
      if (ack) ack({ success: false, error: "Server error joining room" });
    }
  });

  // 3. Document Change (Live Debounced Sync - Owner and Editor only)
  socket.on(REALTIME_EVENTS.DOCUMENT_CHANGE, async (rawPayload, ack) => {
    try {
      const parseResult = documentChangeSchema.safeParse(rawPayload);
      if (!parseResult.success) {
        if (ack) ack({ success: false, error: "Invalid change payload" });
        return;
      }

      const { documentId, content, title, jsonContent, status, category } = parseResult.data;
      const room = getDocumentRoom(documentId);

      // Verify sender is in this document's room
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

      const updatedAt = new Date().toISOString();
      const updatedBy: Collaborator = {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
      };

      // Broadcast to all OTHER clients in the room (avoiding sender echo)
      socket.to(room).emit(REALTIME_EVENTS.DOCUMENT_UPDATE, {
        documentId,
        title,
        content,
        jsonContent,
        status,
        category,
        updatedBy,
        updatedAt,
      });

      // Persist to database asynchronously
      void updateDocument(documentId, user.id, {
        title,
        content,
        jsonContent,
        status,
        category,
      });

      if (ack) ack({ success: true, updatedAt });
    } catch (error) {
      console.error("[Socket] document_change error:", error);
      if (ack) ack({ success: false, error: "Failed to broadcast update" });
    }
  });

  // 4. Leave Document Room
  socket.on(REALTIME_EVENTS.LEAVE_DOCUMENT, (rawPayload) => {
    try {
      const parseResult = leaveDocumentSchema.safeParse(rawPayload);
      if (!parseResult.success) return;

      const { documentId } = parseResult.data;
      const room = getDocumentRoom(documentId);

      socket.leave(room);

      if (activeRoomUsers.has(room)) {
        activeRoomUsers.get(room)!.delete(user.id);
        const remaining = Array.from(activeRoomUsers.get(room)!.values());

        socket.to(room).emit(REALTIME_EVENTS.USER_LEFT, {
          documentId,
          user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
          activeUsers: remaining,
        });

        if (remaining.length === 0) {
          activeRoomUsers.delete(room);
        }
      }

      console.log(`[Socket] ${user.name} left room ${room}`);
    } catch (error) {
      console.error("[Socket] leave_document error:", error);
    }
  });

  // 5. Ungraceful Disconnect
  socket.on("disconnect", () => {
    console.log(`[Socket] User disconnected: ${user.name} (${user.id})`);

    for (const [room, usersMap] of activeRoomUsers.entries()) {
      if (usersMap.has(user.id)) {
        usersMap.delete(user.id);
        const remaining = Array.from(usersMap.values());
        const documentId = room.replace("document:", "");

        socket.to(room).emit(REALTIME_EVENTS.USER_LEFT, {
          documentId,
          user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
          activeUsers: remaining,
        });

        if (remaining.length === 0) {
          activeRoomUsers.delete(room);
        }
      }
    }
  });
});

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 SyncDocs Real-Time Socket Server running on port ${PORT}`);
    console.log(`📡 WebSocket URL: ws://localhost:${PORT}`);
    console.log(`🌐 CORS Allowed Origin: ${ALLOWED_ORIGIN}`);
    console.log(`======================================================\n`);
  });
}
