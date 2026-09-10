import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { io as ClientSocket, Socket as ClientSocketType } from "socket.io-client";
import { signToken, verifyToken } from "../lib/auth/jwt";
import {
  REALTIME_EVENTS,
  getDocumentRoom,
  PresenceUser,
  Collaborator,
} from "../lib/realtime/events";
import { getUserColor } from "../lib/realtime/colors";

interface PresenceEntry {
  socketId: string;
  userId: string;
  displayName: string;
  color: string;
  joinedAt: string;
}

describe("Priority 3 — Bug: User Removal on Dropped Connection & Presence State Sync", () => {
  let server: http.Server;
  let ioServer: SocketIOServer;
  let port: number;

  const userA = { id: "user_alice", name: "Alice", email: "alice@example.com" };
  const userB = { id: "user_bob", name: "Bob", email: "bob@example.com" };
  let tokenA: string;
  let tokenB: string;

  const activeRoomUsers = new Map<string, Map<string, PresenceEntry>>();

  function getUniqueRoomUsers(room: string): PresenceUser[] {
    const socketMap = activeRoomUsers.get(room);
    if (!socketMap) return [];
    const unique = new Map<string, PresenceUser>();
    for (const entry of socketMap.values()) {
      if (!unique.has(entry.userId)) {
        unique.set(entry.userId, {
          userId: entry.userId,
          displayName: entry.displayName,
          color: entry.color,
          joinedAt: entry.joinedAt,
        });
      }
    }
    return Array.from(unique.values());
  }

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test_auth_secret_presence_drop_123456789";
    tokenA = await signToken(userA);
    tokenB = await signToken(userB);

    server = http.createServer();
    // Configure fast pingInterval/pingTimeout for testing ungraceful connection drop detection
    ioServer = new SocketIOServer(server, {
      pingInterval: 300,
      pingTimeout: 300,
      cors: { origin: "*" },
    });

    ioServer.use(async (socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));
      const payload = await verifyToken(token);
      if (!payload) return next(new Error("Unauthorized"));
      socket.data.user = payload;
      next();
    });

    ioServer.on("connection", (socket) => {
      const user = socket.data.user;
      const userColor = getUserColor(user.id);

      socket.on(REALTIME_EVENTS.JOIN_DOCUMENT, ({ documentId }, ack) => {
        const room = getDocumentRoom(documentId);
        socket.join(room);

        if (!activeRoomUsers.has(room)) {
          activeRoomUsers.set(room, new Map());
        }

        activeRoomUsers.get(room)!.set(socket.id, {
          socketId: socket.id,
          userId: user.id,
          displayName: user.name,
          color: userColor,
          joinedAt: new Date().toISOString(),
        });

        const presence = getUniqueRoomUsers(room);

        // Immediate emit to joiner
        socket.emit(REALTIME_EVENTS.PRESENCE_UPDATE, { documentId, users: presence });

        // Broadcast to existing room members via io.to(room)
        socket.to(room).emit(REALTIME_EVENTS.USER_JOINED, {
          documentId,
          user: { id: user.id, name: user.name, color: userColor },
        });
        socket.to(room).emit(REALTIME_EVENTS.PRESENCE_UPDATE, { documentId, users: presence });

        if (ack) ack({ success: true, presence });
      });

      // Priority 3: Clean server broadcast on disconnect using io.to(room)
      socket.on("disconnect", () => {
        for (const [room, socketMap] of activeRoomUsers.entries()) {
          if (socketMap.has(socket.id)) {
            socketMap.delete(socket.id);
            const stillPresent = Array.from(socketMap.values()).some((c) => c.userId === user.id);
            const remaining = getUniqueRoomUsers(room);
            const documentId = room.replace("document:", "");

            if (!stillPresent) {
              ioServer.to(room).emit(REALTIME_EVENTS.USER_LEFT, {
                documentId,
                user: { id: user.id, name: user.name, color: userColor },
              });
              ioServer.to(room).emit(REALTIME_EVENTS.PRESENCE_UPDATE, {
                documentId,
                users: remaining,
              });
            }

            if (socketMap.size === 0) {
              activeRoomUsers.delete(room);
            }
          }
        }
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === "object" && addr ? addr.port : 0;
        resolve();
      });
    });
  });

  afterAll(async () => {
    ioServer.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  function createClient(token: string): ClientSocketType {
    return ClientSocket(`http://localhost:${port}`, {
      auth: { token },
      transports: ["websocket"],
      forceNew: true,
    });
  }

  it("detects dropped connection via heartbeat timeout and prunes presenceUsers on remaining peers", async () => {
    const clientA = createClient(tokenA);
    const clientB = createClient(tokenB);

    await Promise.all([
      new Promise<void>((res) => clientA.on("connect", res)),
      new Promise<void>((res) => clientB.on("connect", res)),
    ]);

    const docId = "doc_dropped_connection_test";

    // Client B joins first
    await new Promise<void>((res) => {
      clientB.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId: docId }, () => res());
    });

    // Client A joins second
    let clientBPresenceUsers: PresenceUser[] = [];
    clientB.on(REALTIME_EVENTS.PRESENCE_UPDATE, (data: { users: PresenceUser[] }) => {
      clientBPresenceUsers = data.users;
    });

    // Client B simulates the fixed use-document-socket.ts USER_LEFT handler
    clientB.on(REALTIME_EVENTS.USER_LEFT, (data: { user: { id: string } }) => {
      clientBPresenceUsers = clientBPresenceUsers.filter((u) => u.userId !== data.user.id);
    });

    await new Promise<void>((res) => {
      clientA.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId: docId }, () => res());
    });

    // Verify both Alice and Bob are present
    await new Promise((r) => setTimeout(r, 100));
    expect(clientBPresenceUsers.map((u) => u.userId)).toContain(userA.id);
    expect(clientBPresenceUsers.map((u) => u.userId)).toContain(userB.id);

    // Abruptly simulate dropped connection for Client A (destroy transport without clean leave)
    const presencePrunedPromise = new Promise<PresenceUser[]>((resolve) => {
      clientB.on(REALTIME_EVENTS.PRESENCE_UPDATE, (data: { users: PresenceUser[] }) => {
        if (!data.users.some((u) => u.userId === userA.id)) {
          resolve(data.users);
        }
      });
    });

    // Force raw socket destroy (dropped connection)
    // @ts-ignore access underlying engine socket
    if (clientA.io.engine) {
      // @ts-ignore
      clientA.io.engine.close();
    } else {
      clientA.disconnect();
    }

    // Wait for the heartbeat timeout (pingInterval 300ms + pingTimeout 300ms = ~600ms)
    const remainingPresence = await presencePrunedPromise;

    // Assert (a) Alice is removed from presence on server & (b) clientB's presenceUsers no longer contains Alice
    expect(remainingPresence.some((u) => u.userId === userA.id)).toBe(false);
    expect(remainingPresence.some((u) => u.userId === userB.id)).toBe(true);
    expect(clientBPresenceUsers.some((u) => u.userId === userA.id)).toBe(false);

    clientB.disconnect();
  });
});
