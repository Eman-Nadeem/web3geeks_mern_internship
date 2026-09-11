import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { server } from "../server/socket";
import { io as ClientSocket, Socket as ClientSocketType } from "socket.io-client";
import { signToken } from "../lib/auth/jwt";
import { REALTIME_EVENTS, PresenceUpdatePayload, UserLeftPayload } from "../lib/realtime/events";
import { prisma } from "../lib/db/prisma";

describe("Day 5 Task 3 — WebSocket Reliability & Edge-Case Resilience Suite", () => {
  let port: number;
  let clientObserver: ClientSocketType;
  let clientAliceTab1: ClientSocketType;
  let clientAliceTab2: ClientSocketType;
  let clientUnjoined: ClientSocketType;

  const observerUser = { id: "d5_rel_observer", name: "Observer User", email: "observer_rel@test.com" };
  const aliceUser = { id: "d5_rel_alice", name: "Alice MultiTab", email: "alice_rel@test.com" };
  const unjoinedUser = { id: "d5_rel_unjoined", name: "Unjoined User", email: "unjoined_rel@test.com" };

  let documentId: string;
  let tokenObserver: string;
  let tokenAlice: string;
  let tokenUnjoined: string;

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test_super_secret_ws_reliability_suite_123456789";

    // 1. Seed users
    await prisma.user.upsert({
      where: { id: observerUser.id },
      update: {},
      create: { id: observerUser.id, email: observerUser.email, name: observerUser.name, password: "Password123!" },
    });
    await prisma.user.upsert({
      where: { id: aliceUser.id },
      update: {},
      create: { id: aliceUser.id, email: aliceUser.email, name: aliceUser.name, password: "Password123!" },
    });
    await prisma.user.upsert({
      where: { id: unjoinedUser.id },
      update: {},
      create: { id: unjoinedUser.id, email: unjoinedUser.email, name: unjoinedUser.name, password: "Password123!" },
    });

    // 2. Create document with Alice as editor and Observer as viewer
    const doc = await prisma.document.create({
      data: {
        title: "Day 5 Reliability Test Doc",
        content: "<p>Reliability baseline</p>",
        version: 1,
        ownerId: observerUser.id,
        collaborators: {
          createMany: {
            data: [
              { userId: aliceUser.id, role: "editor" },
              { userId: unjoinedUser.id, role: "editor" },
            ],
          },
        },
      },
    });
    documentId = doc.id;

    // 3. Generate tokens
    tokenObserver = await signToken(observerUser);
    tokenAlice = await signToken(aliceUser);
    tokenUnjoined = await signToken(unjoinedUser);

    // 4. Start HTTP / Socket server
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === "object" && addr ? addr.port : 4001;
        resolve();
      });
    });
  }, 30000);

  afterAll(async () => {
    if (clientObserver?.connected) clientObserver.disconnect();
    if (clientAliceTab1?.connected) clientAliceTab1.disconnect();
    if (clientAliceTab2?.connected) clientAliceTab2.disconnect();
    if (clientUnjoined?.connected) clientUnjoined.disconnect();

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    try {
      if (documentId) {
        await prisma.documentVersion.deleteMany({ where: { documentId } });
        await prisma.documentCollaborator.deleteMany({ where: { documentId } });
        await prisma.document.delete({ where: { id: documentId } });
      }
      await prisma.user.deleteMany({
        where: { id: { in: [observerUser.id, aliceUser.id, unjoinedUser.id] } },
      });
    } catch (e) {
      console.warn("Cleanup warning:", e);
    }
  }, 30000);

  it("handles multi-tab presence deduplication and selective disconnect without dropping user", async () => {
    // 1. Observer connects and joins document
    clientObserver = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenObserver },
      transports: ["websocket"],
      forceNew: true,
    });
    await new Promise<void>((resolve) => clientObserver.on("connect", () => resolve()));
    await new Promise<void>((resolve) => {
      clientObserver.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId }, () => resolve());
    });

    // 2. Alice opens Tab 1 and joins
    clientAliceTab1 = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenAlice },
      transports: ["websocket"],
      forceNew: true,
    });
    await new Promise<void>((resolve) => clientAliceTab1.on("connect", () => resolve()));

    const joinAck1: any = await new Promise((resolve) => {
      clientAliceTab1.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId }, (res: any) => resolve(res));
    });
    expect(joinAck1.success).toBe(true);

    // 3. Alice opens Tab 2 (same user, different socket) and joins
    clientAliceTab2 = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenAlice },
      transports: ["websocket"],
      forceNew: true,
    });
    await new Promise<void>((resolve) => clientAliceTab2.on("connect", () => resolve()));

    const joinAck2: any = await new Promise((resolve) => {
      clientAliceTab2.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId }, (res: any) => resolve(res));
    });
    expect(joinAck2.success).toBe(true);

    // Verify deduplication: Alice must only appear ONCE in presence roster
    const presenceUsers = joinAck2.presence;
    const aliceOccurrences = presenceUsers.filter((u: any) => u.userId === aliceUser.id);
    expect(aliceOccurrences.length).toBe(1);

    // 4. Set up observer listener for unexpected user_left
    let unexpectedUserLeft = false;
    const userLeftHandler = (payload: UserLeftPayload) => {
      if (payload.user.id === aliceUser.id) {
        unexpectedUserLeft = true;
      }
    };
    clientObserver.on(REALTIME_EVENTS.USER_LEFT, userLeftHandler);

    // 5. Alice closes Tab 1 (socket disconnects)
    clientAliceTab1.disconnect();
    // Wait 500ms to verify no USER_LEFT was broadcast for Alice because Tab 2 is still active
    await new Promise((r) => setTimeout(r, 500));
    expect(unexpectedUserLeft).toBe(false);

    // Query sync to verify Alice is still recognized in presence roster
    const syncRes: any = await new Promise((resolve) => {
      clientAliceTab2.emit(REALTIME_EVENTS.SYNC_REQUEST, { documentId }, (res: any) => resolve(res));
    });
    expect(syncRes.success).toBe(true);
    const aliceStillInPresence = syncRes.data.presence.some((u: any) => u.userId === aliceUser.id);
    expect(aliceStillInPresence).toBe(true);

    // Remove listener before closing Tab 2
    clientObserver.off(REALTIME_EVENTS.USER_LEFT, userLeftHandler);

    // 6. Now close Tab 2 — Alice should now be cleanly removed as 0 tabs remain
    const userLeftPromise = new Promise<UserLeftPayload>((resolve) => {
      clientObserver.once(REALTIME_EVENTS.USER_LEFT, (payload) => resolve(payload));
    });
    clientAliceTab2.disconnect();

    const leftPayload = await userLeftPromise;
    expect(leftPayload.user.id).toBe(aliceUser.id);
  });

  it("safely rejects malformed payloads across all socket events without server crashes", async () => {
    // 1. Malformed join_document (missing/invalid documentId)
    const badJoinRes: any = await new Promise((resolve) => {
      clientObserver.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { invalidKey: 12345 }, (res: any) => resolve(res));
    });
    expect(badJoinRes.success).toBe(false);
    expect(badJoinRes.error).toContain("Invalid documentId payload");

    // 2. Malformed document_change (non-string content, missing documentId)
    const badChangeRes: any = await new Promise((resolve) => {
      clientObserver.emit(REALTIME_EVENTS.DOCUMENT_CHANGE, { documentId: 99999, content: 12345 }, (res: any) => resolve(res));
    });
    expect(badChangeRes.success).toBe(false);
    expect(badChangeRes.error).toBe("Invalid change payload");

    // 3. Malformed sync_request (missing documentId)
    const badSyncRes: any = await new Promise((resolve) => {
      clientObserver.emit(REALTIME_EVENTS.SYNC_REQUEST, { notAValidField: true }, (res: any) => resolve(res));
    });
    expect(badSyncRes.success).toBe(false);
    expect(badSyncRes.error).toBe("Invalid sync_request payload");

    // 4. Malformed cursor_update (should not throw or crash server process)
    let badCursorDidNotCrash = true;
    try {
      clientObserver.emit(REALTIME_EVENTS.CURSOR_UPDATE, { documentId: null, cursor: "not-an-object" });
      // Ping server to confirm event loop and socket server are responsive
      const pingAck: any = await new Promise((resolve) => {
        clientObserver.emit(REALTIME_EVENTS.PING, {}, (res: any) => resolve(res));
      });
      expect(pingAck.pong).toBe(true);
    } catch {
      badCursorDidNotCrash = false;
    }
    expect(badCursorDidNotCrash).toBe(true);
  });

  it("enforces room membership gating: rejects edits and sync requests before join_document", async () => {
    clientUnjoined = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenUnjoined },
      transports: ["websocket"],
      forceNew: true,
    });
    await new Promise<void>((resolve) => clientUnjoined.on("connect", () => resolve()));

    // Attempt document_change WITHOUT joining the room first
    const editWithoutJoinRes: any = await new Promise((resolve) => {
      clientUnjoined.emit(
        REALTIME_EVENTS.DOCUMENT_CHANGE,
        {
          documentId,
          content: "<p>Hacker attempt before join</p>",
          baseVersion: 1,
        },
        (res: any) => resolve(res)
      );
    });
    expect(editWithoutJoinRes.success).toBe(false);
    expect(editWithoutJoinRes.error).toBe("Not a member of this document room");

    // Attempt sync_request WITHOUT joining the room first
    const syncWithoutJoinRes: any = await new Promise((resolve) => {
      clientUnjoined.emit(REALTIME_EVENTS.SYNC_REQUEST, { documentId }, (res: any) => resolve(res));
    });
    expect(syncWithoutJoinRes.success).toBe(false);
    expect(syncWithoutJoinRes.error).toBe("Not a member of this document room");
  });
});
