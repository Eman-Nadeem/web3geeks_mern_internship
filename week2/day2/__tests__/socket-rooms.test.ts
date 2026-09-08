import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { io as ClientSocket, Socket as ClientSocketType } from "socket.io-client";
import { signToken } from "../lib/auth/jwt";
import { REALTIME_EVENTS, getDocumentRoom } from "../lib/realtime/events";

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
      next();
    });

    // Event handlers for room management
    ioServer.on("connection", (socket) => {
      socket.on(REALTIME_EVENTS.PING, (_, cb) => {
        if (typeof cb === "function") cb({ pong: true });
      });

      socket.on(REALTIME_EVENTS.JOIN_DOCUMENT, ({ documentId }, cb) => {
        const room = getDocumentRoom(documentId);
        socket.join(room);
        socket.to(room).emit(REALTIME_EVENTS.USER_JOINED, {
          documentId,
          user: { id: socket.id },
        });
        if (cb) cb({ success: true, room });
      });

      socket.on(REALTIME_EVENTS.DOCUMENT_CHANGE, (data) => {
        const room = getDocumentRoom(data.documentId);
        socket.to(room).emit(REALTIME_EVENTS.DOCUMENT_UPDATE, {
          documentId: data.documentId,
          content: data.content,
          updatedBy: { id: socket.id },
        });
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
});
