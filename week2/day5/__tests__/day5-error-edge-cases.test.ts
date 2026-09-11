import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { server, evictUserFromDocumentRoom, updateCollaboratorRoleInRoom } from "../server/socket";
import { io as ClientSocket, Socket as ClientSocketType } from "socket.io-client";
import { signToken } from "../lib/auth/jwt";
import {
  REALTIME_EVENTS,
  PermissionUpdatePayload,
  CollaboratorRemovedPayload,
  UserLeftPayload,
} from "../lib/realtime/events";
import { prisma } from "../lib/db/prisma";
import {
  createDocument,
  getDocumentById,
  deleteDocument,
  restoreDocumentVersion,
  updateCollaboratorRole,
} from "../lib/db/documents";

describe("Day 5 Task 6 — Error, Boundary & Edge-Case Handling Suite", () => {
  let port: number;
  let clientAlice: ClientSocketType;
  let clientBob: ClientSocketType;
  let clientCharlie: ClientSocketType;

  const aliceUser = { id: "d5_err_alice", name: "Alice Boss", email: "alice_err@test.com" };
  const bobUser = { id: "d5_err_bob", name: "Bob Evictee", email: "bob_err@test.com" };
  const charlieUser = { id: "d5_err_charlie", name: "Charlie Downgrade", email: "charlie_err@test.com" };

  let documentId: string;
  let tokenAlice: string;
  let tokenBob: string;
  let tokenCharlie: string;

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test_super_secret_error_edge_cases_123456789";

    // 1. Seed users
    for (const u of [aliceUser, bobUser, charlieUser]) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: {},
        create: { id: u.id, email: u.email, name: u.name, password: "Password123!" },
      });
    }

    // 2. Create document with Bob and Charlie as editors
    const doc = await prisma.document.create({
      data: {
        title: "Edge Cases Master Document",
        content: "<p>Original Content</p>",
        version: 1,
        ownerId: aliceUser.id,
        collaborators: {
          createMany: {
            data: [
              { userId: bobUser.id, role: "editor" },
              { userId: charlieUser.id, role: "editor" },
            ],
          },
        },
      },
    });
    documentId = doc.id;

    tokenAlice = await signToken(aliceUser);
    tokenBob = await signToken(bobUser);
    tokenCharlie = await signToken(charlieUser);

    // 3. Start server
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === "object" && addr ? addr.port : 4003;
        resolve();
      });
    });
  }, 30000);

  afterAll(async () => {
    if (clientAlice?.connected) clientAlice.disconnect();
    if (clientBob?.connected) clientBob.disconnect();
    if (clientCharlie?.connected) clientCharlie.disconnect();

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
        where: { id: { in: [aliceUser.id, bobUser.id, charlieUser.id] } },
      });
    } catch (e) {
      console.warn("Edge-case cleanup warning:", e);
    }
  }, 30000);

  it("handles empty documents and non-existent/deleted document queries gracefully", async () => {
    // 1. Empty document creation and retrieval
    const emptyDoc = await createDocument(aliceUser.id, {
      title: "   ",
      content: "",
    });
    expect(emptyDoc.id).toBeDefined();
    expect(emptyDoc.content).toBe("<p></p>");

    const fetchedEmpty = await getDocumentById(emptyDoc.id);
    expect(fetchedEmpty).not.toBeNull();
    expect(fetchedEmpty?.content).toBe("<p></p>");

    // Clean up empty test document
    await prisma.documentVersion.deleteMany({ where: { documentId: emptyDoc.id } });
    await prisma.document.delete({ where: { id: emptyDoc.id } });

    // 2. Non-existent document retrieval returns null safely
    const nonExistent = await getDocumentById("non_existent_cuid_99999");
    expect(nonExistent).toBeNull();

    // 3. Deleting non-existent document returns 404 cleanly
    const delRes = await deleteDocument("non_existent_cuid_99999", aliceUser.id);
    expect(delRes.success).toBe(false);
    if (!delRes.success) {
      expect(delRes.status).toBe(404);
      expect(delRes.error).toContain("not found");
    }

    // 4. Restoring non-existent version returns 404 cleanly
    const restoreRes = await restoreDocumentVersion(documentId, 9999, aliceUser.id);
    expect(restoreRes.success).toBe(false);
    if (!restoreRes.success) {
      expect(restoreRes.status).toBe(404);
    }
  });

  it("handles real-time collaborator eviction with forced socket room removal", async () => {
    // Connect Alice & Bob
    clientAlice = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenAlice },
      transports: ["websocket"],
      forceNew: true,
    });
    clientBob = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenBob },
      transports: ["websocket"],
      forceNew: true,
    });

    await Promise.all([
      new Promise<void>((r) => clientAlice.on("connect", () => r())),
      new Promise<void>((r) => clientBob.on("connect", () => r())),
    ]);

    await Promise.all([
      new Promise((r) => clientAlice.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId }, () => r(true))),
      new Promise((r) => clientBob.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId }, () => r(true))),
    ]);

    // Setup listeners for eviction signals
    const bobEvictionPromise = new Promise<PermissionUpdatePayload>((resolve) => {
      clientBob.once(REALTIME_EVENTS.PERMISSION_UPDATE, (payload) => resolve(payload));
    });

    const aliceCollabRemovedPromise = new Promise<CollaboratorRemovedPayload>((resolve) => {
      clientAlice.once(REALTIME_EVENTS.COLLABORATOR_REMOVED, (payload) => resolve(payload));
    });

    const aliceUserLeftPromise = new Promise<UserLeftPayload>((resolve) => {
      clientAlice.once(REALTIME_EVENTS.USER_LEFT, (payload) => resolve(payload));
    });

    // Alice evicts Bob
    evictUserFromDocumentRoom(documentId, bobUser.id, "Removed by project owner");

    const [bobEviction, aliceCollabRemoved, aliceUserLeft] = await Promise.all([
      bobEvictionPromise,
      aliceCollabRemovedPromise,
      aliceUserLeftPromise,
    ]);

    // Verify Bob received revocation
    expect(bobEviction.revoked).toBe(true);
    expect(bobEviction.userId).toBe(bobUser.id);
    expect(bobEviction.message).toBe("Removed by project owner");

    // Verify Alice was notified of collaborator removal and user left
    expect(aliceCollabRemoved.userId).toBe(bobUser.id);
    expect(aliceUserLeft.user.id).toBe(bobUser.id);

    // Verify Bob is now prevented from emitting edits (forced room leave)
    const bobEditRes: any = await new Promise((resolve) => {
      clientBob.emit(
        REALTIME_EVENTS.DOCUMENT_CHANGE,
        { documentId, content: "<p>Bob trying to write after eviction</p>", baseVersion: 1 },
        (ack: any) => resolve(ack)
      );
    });
    expect(bobEditRes.success).toBe(false);
    expect(bobEditRes.error).toBe("Not a member of this document room");
  });

  it("handles real-time role downgrade from editor to viewer", async () => {
    clientCharlie = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenCharlie },
      transports: ["websocket"],
      forceNew: true,
    });
    await new Promise<void>((r) => clientCharlie.on("connect", () => r()));
    await new Promise((r) => clientCharlie.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId }, () => r(true)));

    // Setup listener on Charlie's socket for role update
    const charlieRolePromise = new Promise<PermissionUpdatePayload>((resolve) => {
      clientCharlie.once(REALTIME_EVENTS.PERMISSION_UPDATE, (payload) => resolve(payload));
    });

    // Update Charlie's role to viewer in database and room
    await updateCollaboratorRole(documentId, charlieUser.id, "viewer", aliceUser.id);
    updateCollaboratorRoleInRoom(documentId, charlieUser.id, "viewer");

    const permissionPayload = await charlieRolePromise;
    expect(permissionPayload.role).toBe("viewer");
    expect(permissionPayload.revoked).toBe(false);

    // Charlie now attempts to make an edit
    const charlieEditRes: any = await new Promise((resolve) => {
      clientCharlie.emit(
        REALTIME_EVENTS.DOCUMENT_CHANGE,
        { documentId, content: "<p>Charlie attempting edit as viewer</p>", baseVersion: 1 },
        (ack: any) => resolve(ack)
      );
    });

    // Should be rejected because viewers cannot edit
    expect(charlieEditRes.success).toBe(false);
    expect(charlieEditRes.error).toContain("Viewers cannot make edits");
  });
});
