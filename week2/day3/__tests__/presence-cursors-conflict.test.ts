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
  CursorUpdatePayload,
  SyncResponsePayload,
  DocumentUpdatePayload,
} from "../lib/realtime/events";
import { getUserColor } from "../lib/realtime/colors";

interface PresenceEntry {
  socketId: string;
  userId: string;
  displayName: string;
  color: string;
  avatarUrl?: string | null;
  joinedAt: string;
  cursor?: { from: number; to: number } | null;
}

describe("Day 3: Presence, Live Cursors, Identity & Conflict Handling", () => {
  let server: http.Server;
  let ioServer: SocketIOServer;
  let port: number;

  let tokenUserA: string;
  let tokenUserB: string;
  let tokenUserC: string;

  const userA = { id: "user_alpha_1", name: "Alice Wonderland", email: "alice@example.com" };
  const userB = { id: "user_beta_2", name: "Bob Builder", email: "bob@example.com" };
  const userC = { id: "user_gamma_3", name: "Charlie Chaplin", email: "charlie@example.com" };

  const activeRoomUsers = new Map<string, Map<string, PresenceEntry>>();
  const documentVersions = new Map<string, number>();
  const documentContents = new Map<string, string>();
  const conflictWarnings: string[] = [];

  function getDocumentVersion(documentId: string): number {
    return documentVersions.get(documentId) || 1;
  }

  function incrementDocumentVersion(documentId: string): number {
    const current = getDocumentVersion(documentId);
    const next = current + 1;
    documentVersions.set(documentId, next);
    return next;
  }

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
          avatarUrl: entry.avatarUrl,
          joinedAt: entry.joinedAt,
        });
      }
    }
    return Array.from(unique.values());
  }

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test_super_secret_for_day_3_test_suite_123456789";
    tokenUserA = await signToken(userA);
    tokenUserB = await signToken(userB);
    tokenUserC = await signToken(userC);

    server = http.createServer();
    ioServer = new SocketIOServer(server, { cors: { origin: "*" } });

    // Auth middleware
    ioServer.use(async (socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication error: Token missing"));
      const payload = await verifyToken(token);
      if (!payload) return next(new Error("Authentication error: Unauthorized"));
      socket.data.user = payload;
      next();
    });

    // Socket server setup mimicking server/socket.ts
    ioServer.on("connection", (socket) => {
      const user = socket.data.user;
      const userColor = getUserColor(user.id);

      socket.on(REALTIME_EVENTS.JOIN_DOCUMENT, ({ documentId }, ack) => {
        const room = getDocumentRoom(documentId);
        socket.join(room);

        if (!activeRoomUsers.has(room)) {
          activeRoomUsers.set(room, new Map());
        }

        const entry: PresenceEntry = {
          socketId: socket.id,
          userId: user.id,
          displayName: user.name,
          color: userColor,
          avatarUrl: user.avatarUrl,
          joinedAt: new Date().toISOString(),
        };

        activeRoomUsers.get(room)!.set(socket.id, entry);
        const uniquePresence = getUniqueRoomUsers(room);

        const legacyActive: Collaborator[] = uniquePresence.map((p) => ({
          id: p.userId,
          name: p.displayName,
          email: user.email,
          color: p.color,
        }));

        // Immediate responses to joiner
        socket.emit(REALTIME_EVENTS.ROOM_USERS, { documentId, users: legacyActive });
        socket.emit(REALTIME_EVENTS.PRESENCE_UPDATE, { documentId, users: uniquePresence });

        // Send existing active cursors to joiner
        const socketMap = activeRoomUsers.get(room);
        if (socketMap) {
          for (const [sId, other] of socketMap.entries()) {
            if (sId !== socket.id && other.cursor) {
              socket.emit(REALTIME_EVENTS.CURSOR_UPDATE, {
                documentId,
                userId: other.userId,
                displayName: other.displayName,
                color: other.color,
                cursor: other.cursor,
              });
            }
          }
        }

        // Broadcast to peers
        socket.to(room).emit(REALTIME_EVENTS.USER_JOINED, {
          documentId,
          user: { id: user.id, name: user.name, color: userColor },
          activeUsers: legacyActive,
        });

        socket.to(room).emit(REALTIME_EVENTS.PRESENCE_UPDATE, {
          documentId,
          users: uniquePresence,
        });

        if (ack) {
          ack({ success: true, presence: uniquePresence, activeUsers: legacyActive });
        }
      });

      socket.on(REALTIME_EVENTS.CURSOR_UPDATE, ({ documentId, cursor }) => {
        const room = getDocumentRoom(documentId);
        if (!socket.rooms.has(room)) return;

        const entry = activeRoomUsers.get(room)?.get(socket.id);
        if (entry) {
          entry.cursor = cursor ?? null;
        }

        socket.to(room).emit(REALTIME_EVENTS.CURSOR_UPDATE, {
          documentId,
          userId: user.id,
          displayName: user.name,
          color: userColor,
          cursor: cursor ?? null,
        });
      });

      socket.on(REALTIME_EVENTS.SYNC_REQUEST, ({ documentId }, ack) => {
        const room = getDocumentRoom(documentId);
        if (!socket.rooms.has(room)) {
          if (ack) ack({ success: false, error: "Not a member of this document room" });
          return;
        }

        const version = getDocumentVersion(documentId);
        const presence = getUniqueRoomUsers(room);
        const content = documentContents.get(documentId) || "";

        const payload: SyncResponsePayload = {
          documentId,
          content,
          jsonContent: null,
          version,
          presence,
        };

        socket.emit(REALTIME_EVENTS.SYNC_RESPONSE, payload);
        if (ack) ack({ success: true, data: payload });
      });

      socket.on(REALTIME_EVENTS.DOCUMENT_CHANGE, (data, ack) => {
        const { documentId, content, baseVersion } = data;
        const room = getDocumentRoom(documentId);
        if (!socket.rooms.has(room)) {
          if (ack) ack({ success: false, error: "Not a member" });
          return;
        }

        const currentVersion = getDocumentVersion(documentId);
        if (baseVersion !== undefined && baseVersion < currentVersion) {
          const warning = `[Conflict Detected] Document ${documentId}: incoming baseVersion (${baseVersion}) < current server version (${currentVersion}). Applying Last-Write-Wins resolution for edit by ${user.name}.`;
          conflictWarnings.push(warning);
        }

        const nextVersion = incrementDocumentVersion(documentId);
        if (content !== undefined) {
          documentContents.set(documentId, content);
        }

        const updatedAt = new Date().toISOString();
        socket.to(room).emit(REALTIME_EVENTS.DOCUMENT_UPDATE, {
          documentId,
          content,
          version: nextVersion,
          updatedBy: { id: user.id, name: user.name, color: userColor },
          updatedAt,
        });

        if (ack) ack({ success: true, version: nextVersion, updatedAt });
      });

      socket.on(REALTIME_EVENTS.LEAVE_DOCUMENT, ({ documentId }) => {
        const room = getDocumentRoom(documentId);
        socket.leave(room);

        const socketMap = activeRoomUsers.get(room);
        if (socketMap) {
          socketMap.delete(socket.id);
          const stillPresent = Array.from(socketMap.values()).some((c) => c.userId === user.id);
          const remaining = getUniqueRoomUsers(room);

          if (!stillPresent) {
            socket.to(room).emit(REALTIME_EVENTS.USER_LEFT, {
              documentId,
              user: { id: user.id, name: user.name, color: userColor },
              activeUsers: remaining.map((p) => ({ id: p.userId, name: p.displayName, color: p.color })),
            });
            socket.to(room).emit(REALTIME_EVENTS.PRESENCE_UPDATE, {
              documentId,
              users: remaining,
            });
            socket.to(room).emit(REALTIME_EVENTS.CURSOR_UPDATE, {
              documentId,
              userId: user.id,
              displayName: user.name,
              color: userColor,
              cursor: null,
            });
          }
          if (socketMap.size === 0) activeRoomUsers.delete(room);
        }
      });

      socket.on("disconnect", () => {
        for (const [room, socketMap] of activeRoomUsers.entries()) {
          if (socketMap.has(socket.id)) {
            socketMap.delete(socket.id);
            const stillPresent = Array.from(socketMap.values()).some((c) => c.userId === user.id);
            const remaining = getUniqueRoomUsers(room);
            const documentId = room.replace("document:", "");

            if (!stillPresent) {
              socket.to(room).emit(REALTIME_EVENTS.USER_LEFT, {
                documentId,
                user: { id: user.id, name: user.name, color: userColor },
                activeUsers: remaining.map((p) => ({ id: p.userId, name: p.displayName, color: p.color })),
              });
              socket.to(room).emit(REALTIME_EVENTS.PRESENCE_UPDATE, {
                documentId,
                users: remaining,
              });
              socket.to(room).emit(REALTIME_EVENTS.CURSOR_UPDATE, {
                documentId,
                userId: user.id,
                displayName: user.name,
                color: userColor,
                cursor: null,
              });
            }
            if (socketMap.size === 0) activeRoomUsers.delete(room);
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

  // --- Task 1: Presence Tracking Tests ---
  describe("Task 1: Presence Tracking & Multi-Tab Deduplication", () => {
    it("delivers immediate presence list upon join", async () => {
      const client = createClient(tokenUserA);
      await new Promise<void>((res) => client.on("connect", res));

      const presencePromise = new Promise<PresenceUser[]>((res) => {
        client.on(REALTIME_EVENTS.PRESENCE_UPDATE, (data: { users: PresenceUser[] }) => {
          res(data.users);
        });
      });

      client.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId: "doc_presence_1" });
      const presence = await presencePromise;

      expect(presence.length).toBe(1);
      expect(presence[0].userId).toBe(userA.id);
      expect(presence[0].displayName).toBe(userA.name);
      expect(presence[0].color).toBe(getUserColor(userA.id));

      client.disconnect();
    });

    it("deduplicates multi-tab connections: 2 tabs open -> 1 presence entry; closing 1 tab keeps presence; closing 2nd tab removes user", async () => {
      const tab1 = createClient(tokenUserA);
      const tab2 = createClient(tokenUserA);
      const observer = createClient(tokenUserB);

      await Promise.all([
        new Promise<void>((res) => tab1.on("connect", res)),
        new Promise<void>((res) => tab2.on("connect", res)),
        new Promise<void>((res) => observer.on("connect", res)),
      ]);

      await new Promise<void>((res) => {
        observer.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId: "doc_multitab" }, () => res());
      });

      // Tab 1 joins
      await new Promise<void>((res) => {
        tab1.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId: "doc_multitab" }, () => res());
      });

      // Tab 2 joins (same user A)
      const presenceTab2 = await new Promise<PresenceUser[]>((res) => {
        tab2.emit(
          REALTIME_EVENTS.JOIN_DOCUMENT,
          { documentId: "doc_multitab" },
          (ack: { presence: PresenceUser[] }) => res(ack.presence)
        );
      });

      // Deduplication check: userA only counted once, total unique users = 2 (userB + userA)
      const userACount = presenceTab2.filter((u) => u.userId === userA.id).length;
      expect(userACount).toBe(1);
      expect(presenceTab2.length).toBe(2);

      // Close Tab 1: User A should still remain in room
      let observerGotUserLeft = false;
      observer.on(REALTIME_EVENTS.USER_LEFT, (data) => {
        if (data.user.id === userA.id) observerGotUserLeft = true;
      });

      tab1.emit(REALTIME_EVENTS.LEAVE_DOCUMENT, { documentId: "doc_multitab" });
      tab1.disconnect();

      await new Promise((r) => setTimeout(r, 100));
      expect(observerGotUserLeft).toBe(false); // Tab 1 left, but tab 2 is still active!

      // Close Tab 2: User A has 0 sockets left -> user_left must now fire
      const userLeftPromise = new Promise<{ user: { id: string } }>((res) => {
        observer.on(REALTIME_EVENTS.USER_LEFT, res);
      });

      tab2.emit(REALTIME_EVENTS.LEAVE_DOCUMENT, { documentId: "doc_multitab" });
      tab2.disconnect();

      const leftData = await userLeftPromise;
      expect(leftData.user.id).toBe(userA.id);

      observer.disconnect();
    });
  });

  // --- Task 2 & 3: Live Cursors & Real Identity Tests ---
  describe("Task 2 & 3: Live Cursors, Selection Sharing & Real Identity", () => {
    it("broadcasts live cursor update to room peers with real identity, assigned color, and selection range", async () => {
      const clientA = createClient(tokenUserA);
      const clientB = createClient(tokenUserB);
      const clientC_OtherRoom = createClient(tokenUserC);

      await Promise.all([
        new Promise<void>((res) => clientA.on("connect", res)),
        new Promise<void>((res) => clientB.on("connect", res)),
        new Promise<void>((res) => clientC_OtherRoom.on("connect", res)),
      ]);

      await Promise.all([
        new Promise<void>((res) =>
          clientA.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId: "doc_cursor_test" }, () => res())
        ),
        new Promise<void>((res) =>
          clientB.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId: "doc_cursor_test" }, () => res())
        ),
        new Promise<void>((res) =>
          clientC_OtherRoom.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId: "doc_different_room" }, () => res())
        ),
      ]);

      let otherRoomReceivedCursor = false;
      clientC_OtherRoom.on(REALTIME_EVENTS.CURSOR_UPDATE, () => {
        otherRoomReceivedCursor = true;
      });

      const cursorPromiseB = new Promise<CursorUpdatePayload>((res) => {
        clientB.on(REALTIME_EVENTS.CURSOR_UPDATE, res);
      });

      // User A selects a range from index 10 to 25
      clientA.emit(REALTIME_EVENTS.CURSOR_UPDATE, {
        documentId: "doc_cursor_test",
        cursor: { from: 10, to: 25 },
      });

      const cursorUpdate = await cursorPromiseB;
      expect(cursorUpdate.documentId).toBe("doc_cursor_test");
      expect(cursorUpdate.userId).toBe(userA.id);
      expect(cursorUpdate.displayName).toBe(userA.name);
      expect(cursorUpdate.color).toBe(getUserColor(userA.id));
      expect(cursorUpdate.cursor).toEqual({ from: 10, to: 25 });

      await new Promise((r) => setTimeout(r, 100));
      expect(otherRoomReceivedCursor).toBe(false);

      clientA.disconnect();
      clientB.disconnect();
      clientC_OtherRoom.disconnect();
    });

    it("immediately removes cursor caret (null cursor) when user leaves document or disconnects", async () => {
      const clientA = createClient(tokenUserA);
      const clientB = createClient(tokenUserB);

      await Promise.all([
        new Promise<void>((res) => clientA.on("connect", res)),
        new Promise<void>((res) => clientB.on("connect", res)),
      ]);

      await Promise.all([
        new Promise<void>((res) =>
          clientA.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId: "doc_cursor_cleanup" }, () => res())
        ),
        new Promise<void>((res) =>
          clientB.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId: "doc_cursor_cleanup" }, () => res())
        ),
      ]);

      const cursorNullPromise = new Promise<CursorUpdatePayload>((res) => {
        clientB.on(REALTIME_EVENTS.CURSOR_UPDATE, (data: CursorUpdatePayload) => {
          if (data.userId === userA.id && data.cursor === null) {
            res(data);
          }
        });
      });

      // Client A ungracefully disconnects
      clientA.disconnect();

      const nullUpdate = await cursorNullPromise;
      expect(nullUpdate.userId).toBe(userA.id);
      expect(nullUpdate.cursor).toBeNull();

      clientB.disconnect();
    });
  });

  // --- Task 4: Conflict Handling (Option A: Last-Write-Wins with Version Tracking) ---
  describe("Task 4: Baseline Conflict Strategy (Option A: Last-Write-Wins with Versioning)", () => {
    it("detects stale baseVersion, logs conflict warning, increments version, and converges state via LWW", async () => {
      const clientA = createClient(tokenUserA);
      const clientB = createClient(tokenUserB);

      await Promise.all([
        new Promise<void>((res) => clientA.on("connect", res)),
        new Promise<void>((res) => clientB.on("connect", res)),
      ]);

      await Promise.all([
        new Promise<void>((res) =>
          clientA.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId: "doc_conflict_test" }, () => res())
        ),
        new Promise<void>((res) =>
          clientB.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId: "doc_conflict_test" }, () => res())
        ),
      ]);

      documentVersions.set("doc_conflict_test", 1);
      documentContents.set("doc_conflict_test", "Initial content");

      // Edit 1: User A sends change based on version 1 -> server accepts and increments to version 2
      const ackA = await new Promise<{ success: boolean; version: number }>((res) => {
        clientA.emit(
          REALTIME_EVENTS.DOCUMENT_CHANGE,
          {
            documentId: "doc_conflict_test",
            content: "Edit from User A",
            baseVersion: 1,
          },
          res
        );
      });

      expect(ackA.success).toBe(true);
      expect(ackA.version).toBe(2);

      // Edit 2 (Concurrent conflict): User B sends change still based on stale baseVersion 1
      const updatePromiseForA = new Promise<DocumentUpdatePayload>((res) => {
        clientA.on(REALTIME_EVENTS.DOCUMENT_UPDATE, res);
      });

      const ackB = await new Promise<{ success: boolean; version: number }>((res) => {
        clientB.emit(
          REALTIME_EVENTS.DOCUMENT_CHANGE,
          {
            documentId: "doc_conflict_test",
            content: "Edit from User B (Concurrent LWW)",
            baseVersion: 1, // Stale! Server version is now 2
          },
          res
        );
      });

      expect(ackB.success).toBe(true);
      expect(ackB.version).toBe(3);

      // Verify server logged conflict detection warning
      const hasConflictWarning = conflictWarnings.some(
        (w) => w.includes("[Conflict Detected]") && w.includes("doc_conflict_test") && w.includes("baseVersion (1)")
      );
      expect(hasConflictWarning).toBe(true);

      // User A receives broadcast of winner (LWW Edit 2 with version 3)
      const broadcast = await updatePromiseForA;
      expect(broadcast.version).toBe(3);
      expect(broadcast.content).toBe("Edit from User B (Concurrent LWW)");
      expect(documentContents.get("doc_conflict_test")).toBe("Edit from User B (Concurrent LWW)");

      clientA.disconnect();
      clientB.disconnect();
    });
  });

  // --- Task 5: State Synchronization Protocol ---
  describe("Task 5: State Synchronization (sync_request / sync_response)", () => {
    it("returns current authoritative version, content, and presence roster on sync_request", async () => {
      const client = createClient(tokenUserA);
      await new Promise<void>((res) => client.on("connect", res));

      await new Promise<void>((res) => {
        client.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId: "doc_sync_test" }, () => res());
      });

      documentVersions.set("doc_sync_test", 5);
      documentContents.set("doc_sync_test", "<p>Authoritative synced paragraph</p>");

      const syncResponsePromise = new Promise<SyncResponsePayload>((res) => {
        client.on(REALTIME_EVENTS.SYNC_RESPONSE, res);
      });

      client.emit(REALTIME_EVENTS.SYNC_REQUEST, { documentId: "doc_sync_test" });
      const syncData = await syncResponsePromise;

      expect(syncData.documentId).toBe("doc_sync_test");
      expect(syncData.version).toBe(5);
      expect(syncData.content).toBe("<p>Authoritative synced paragraph</p>");
      expect(syncData.presence.length).toBe(1);
      expect(syncData.presence[0].userId).toBe(userA.id);

      client.disconnect();
    });

    it("rejects sync_request if socket has not joined the document room", async () => {
      const client = createClient(tokenUserA);
      await new Promise<void>((res) => client.on("connect", res));

      const ack = await new Promise<{ success: boolean; error: string }>((res) => {
        client.emit(REALTIME_EVENTS.SYNC_REQUEST, { documentId: "doc_unjoined_room" }, res);
      });

      expect(ack.success).toBe(false);
      expect(ack.error).toContain("Not a member of this document room");

      client.disconnect();
    });
  });
});
