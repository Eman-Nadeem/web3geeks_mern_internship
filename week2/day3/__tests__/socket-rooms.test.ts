import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { io as ClientSocket, Socket as ClientSocketType } from "socket.io-client";
import { signToken } from "../lib/auth/jwt";
import { REALTIME_EVENTS, getDocumentRoom, Collaborator } from "../lib/realtime/events";
import { verifyToken } from "../lib/auth/jwt";

describe("Socket.IO Multi-User & Room Isolation Integration Tests", () => {
  let server: http.Server;
  let ioServer: SocketIOServer;
  let port: number;

  let tokenUserA: string;
  let tokenUserB: string;
  let tokenUserC: string;

  const userA = { id: "user_a", name: "User A", email: "a@example.com" };
  const userB = { id: "user_b", name: "User B", email: "b@example.com" };
  const userC = { id: "user_c", name: "User C", email: "c@example.com" };

  beforeAll(async () => {
    tokenUserA = await signToken(userA);
    tokenUserB = await signToken(userB);
    tokenUserC = await signToken(userC);

    server = http.createServer();
    ioServer = new SocketIOServer(server, {
      cors: { origin: "*" },
    });

    // Auth middleware mimicking production server
    ioServer.use(async (socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token || token === "invalid_token") {
        return next(new Error("Authentication error: Unauthorized"));
      }
      const payload = await verifyToken(token);
      if (!payload) {
        return next(new Error("Authentication error: Unauthorized"));
      }
      socket.data.user = payload;
      next();
    });

    // Presence map tracking collaborators keyed by socket.id
    const activeRoomUsers = new Map<string, Map<string, Collaborator>>();

    function getUniqueRoomUsers(room: string): Collaborator[] {
      const socketMap = activeRoomUsers.get(room);
      if (!socketMap) return [];
      const unique = new Map<string, Collaborator>();
      for (const col of socketMap.values()) {
        if (!unique.has(col.id)) {
          unique.set(col.id, col);
        }
      }
      return Array.from(unique.values());
    }

    // Event handlers for room management & presence
    ioServer.on("connection", (socket) => {
      const user = socket.data.user;

      socket.on(REALTIME_EVENTS.PING, (_, cb) => {
        if (typeof cb === "function") cb({ pong: true });
      });

      socket.on(REALTIME_EVENTS.JOIN_DOCUMENT, ({ documentId }, cb) => {
        const room = getDocumentRoom(documentId);
        socket.join(room);

        if (!activeRoomUsers.has(room)) {
          activeRoomUsers.set(room, new Map());
        }

        const collaborator: Collaborator = {
          id: user.id,
          name: user.name,
          email: user.email,
        };

        activeRoomUsers.get(room)!.set(socket.id, collaborator);
        const currentActiveUsers = getUniqueRoomUsers(room);

        socket.to(room).emit(REALTIME_EVENTS.USER_JOINED, {
          documentId,
          user: collaborator,
          activeUsers: currentActiveUsers,
        });

        if (cb) cb({ success: true, room, activeUsers: currentActiveUsers });
      });

      socket.on(REALTIME_EVENTS.DOCUMENT_CHANGE, (data) => {
        const room = getDocumentRoom(data.documentId);
        socket.to(room).emit(REALTIME_EVENTS.DOCUMENT_UPDATE, {
          documentId: data.documentId,
          content: data.content,
          updatedBy: { id: socket.id },
        });
      });

      socket.on(REALTIME_EVENTS.LEAVE_DOCUMENT, ({ documentId }) => {
        const room = getDocumentRoom(documentId);
        socket.leave(room);

        const socketMap = activeRoomUsers.get(room);
        if (socketMap) {
          socketMap.delete(socket.id);
          const userStillPresent = Array.from(socketMap.values()).some((c) => c.id === user.id);
          const remaining = getUniqueRoomUsers(room);

          if (!userStillPresent) {
            socket.to(room).emit(REALTIME_EVENTS.USER_LEFT, {
              documentId,
              user: { id: user.id, name: user.name, email: user.email },
              activeUsers: remaining,
            });
          }

          if (socketMap.size === 0) {
            activeRoomUsers.delete(room);
          }
        }
      });

      socket.on("disconnect", () => {
        for (const [room, socketMap] of activeRoomUsers.entries()) {
          if (socketMap.has(socket.id)) {
            socketMap.delete(socket.id);
            const userStillPresent = Array.from(socketMap.values()).some((c) => c.id === user.id);
            const remaining = getUniqueRoomUsers(room);
            const documentId = room.replace("document:", "");

            if (!userStillPresent) {
              socket.to(room).emit(REALTIME_EVENTS.USER_LEFT, {
                documentId,
                user: { id: user.id, name: user.name, email: user.email },
                activeUsers: remaining,
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
        if (addr && typeof addr === "object") {
          port = addr.port;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    ioServer.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("should reject unauthenticated socket connection attempt", async () => {
    const socket = ClientSocket(`http://localhost:${port}`, {
      auth: { token: "invalid_token" },
      transports: ["websocket"],
      reconnection: false,
    });

    await new Promise<void>((resolve) => {
      socket.on("connect_error", (err) => {
        expect(err.message).toContain("Authentication error");
        socket.disconnect();
        resolve();
      });
    });
  });

  it("should connect successfully with valid JWT and respond to ping", async () => {
    const socket = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenUserA },
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => {
      socket.on("connect", () => {
        socket.emit(REALTIME_EVENTS.PING, {}, (res: { pong: boolean }) => {
          expect(res.pong).toBe(true);
          socket.disconnect();
          resolve();
        });
      });
    });
  });

  it("should isolate broadcasts between different document rooms", async () => {
    const doc1 = "doc_111";
    const doc2 = "doc_222";

    // Client A in Room 1
    const clientA: ClientSocketType = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenUserA },
      transports: ["websocket"],
    });

    // Client B in Room 1
    const clientB: ClientSocketType = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenUserB },
      transports: ["websocket"],
    });

    // Client C in Room 2
    const clientC: ClientSocketType = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenUserC },
      transports: ["websocket"],
    });

    await Promise.all([
      new Promise<void>((res) => clientA.on("connect", () => res())),
      new Promise<void>((res) => clientB.on("connect", () => res())),
      new Promise<void>((res) => clientC.on("connect", () => res())),
    ]);

    // Join rooms
    await Promise.all([
      new Promise<void>((res) =>
        clientA.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId: doc1 }, () => res())
      ),
      new Promise<void>((res) =>
        clientB.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId: doc1 }, () => res())
      ),
      new Promise<void>((res) =>
        clientC.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId: doc2 }, () => res())
      ),
    ]);

    let clientBReceived = false;
    let clientCReceived = false;

    clientB.on(REALTIME_EVENTS.DOCUMENT_UPDATE, (data) => {
      if (data.documentId === doc1) {
        clientBReceived = true;
      }
    });

    clientC.on(REALTIME_EVENTS.DOCUMENT_UPDATE, (data) => {
      if (data.documentId === doc1) {
        clientCReceived = true;
      }
    });

    // Client A edits Document 1
    clientA.emit(REALTIME_EVENTS.DOCUMENT_CHANGE, {
      documentId: doc1,
      content: "<p>Real-time room test</p>",
    });

    // Allow time for broadcast
    await new Promise((r) => setTimeout(r, 100));

    expect(clientBReceived).toBe(true);
    expect(clientCReceived).toBe(false); // Room isolation confirmed!

    clientA.disconnect();
    clientB.disconnect();
    clientC.disconnect();
  });

  it("should deduplicate presence when the same user opens multiple tabs and retain presence when one tab disconnects", async () => {
    const docId = "doc_multitab_999";

    // Same User A opens Tab 1 and Tab 2
    const clientA_tab1: ClientSocketType = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenUserA },
      transports: ["websocket"],
    });

    const clientA_tab2: ClientSocketType = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenUserA },
      transports: ["websocket"],
    });

    // Collaborator User B
    const clientB: ClientSocketType = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenUserB },
      transports: ["websocket"],
    });

    await Promise.all([
      new Promise<void>((res) => clientA_tab1.on("connect", () => res())),
      new Promise<void>((res) => clientA_tab2.on("connect", () => res())),
      new Promise<void>((res) => clientB.on("connect", () => res())),
    ]);

    // 1. Tab 1 joins
    let tab1ActiveUsers: Collaborator[] = [];
    await new Promise<void>((res) =>
      clientA_tab1.emit(
        REALTIME_EVENTS.JOIN_DOCUMENT,
        { documentId: docId },
        (response: { success: boolean; activeUsers: Collaborator[] }) => {
          tab1ActiveUsers = response.activeUsers;
          res();
        }
      )
    );
    expect(tab1ActiveUsers).toHaveLength(1);
    expect(tab1ActiveUsers[0].id).toBe(userA.id);

    // 2. Tab 2 joins with the same account
    let tab2ActiveUsers: Collaborator[] = [];
    await new Promise<void>((res) =>
      clientA_tab2.emit(
        REALTIME_EVENTS.JOIN_DOCUMENT,
        { documentId: docId },
        (response: { success: boolean; activeUsers: Collaborator[] }) => {
          tab2ActiveUsers = response.activeUsers;
          res();
        }
      )
    );
    // Verified: User A must only appear ONCE in active users (deduplicated)
    expect(tab2ActiveUsers).toHaveLength(1);
    expect(tab2ActiveUsers[0].id).toBe(userA.id);

    // 3. User B joins
    let userBActiveUsers: Collaborator[] = [];
    await new Promise<void>((res) =>
      clientB.emit(
        REALTIME_EVENTS.JOIN_DOCUMENT,
        { documentId: docId },
        (response: { success: boolean; activeUsers: Collaborator[] }) => {
          userBActiveUsers = response.activeUsers;
          res();
        }
      )
    );
    expect(userBActiveUsers).toHaveLength(2);

    let userALeftCount = 0;
    clientB.on(REALTIME_EVENTS.USER_LEFT, (data: { user: { id: string } }) => {
      if (data.user.id === userA.id) {
        userALeftCount++;
      }
    });

    // 4. Tab 1 disconnects (User A still has Tab 2 open)
    clientA_tab1.disconnect();
    await new Promise((r) => setTimeout(r, 100));

    // Verified: user_left must NOT be broadcast because User A is still active on Tab 2
    expect(userALeftCount).toBe(0);

    // 5. Tab 2 disconnects (User A now has 0 tabs remaining)
    clientA_tab2.disconnect();
    await new Promise((r) => setTimeout(r, 100));

    // Verified: user_left MUST now be broadcast to remaining collaborators
    expect(userALeftCount).toBe(1);

    clientB.disconnect();
  });

  it("should correctly broadcast user_left when a single-tab user leaves", async () => {
    const docId = "doc_singletab_123";

    const clientA: ClientSocketType = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenUserA },
      transports: ["websocket"],
    });

    const clientB: ClientSocketType = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenUserB },
      transports: ["websocket"],
    });

    await Promise.all([
      new Promise<void>((res) => clientA.on("connect", () => res())),
      new Promise<void>((res) => clientB.on("connect", () => res())),
    ]);

    await Promise.all([
      new Promise<void>((res) =>
        clientA.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId: docId }, () => res())
      ),
      new Promise<void>((res) =>
        clientB.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId: docId }, () => res())
      ),
    ]);

    let userALeftEmitted = false;
    clientB.on(REALTIME_EVENTS.USER_LEFT, (data: { user: { id: string } }) => {
      if (data.user.id === userA.id) {
        userALeftEmitted = true;
      }
    });

    clientA.disconnect();
    await new Promise((r) => setTimeout(r, 100));

    expect(userALeftEmitted).toBe(true);

    clientB.disconnect();
  });
});
