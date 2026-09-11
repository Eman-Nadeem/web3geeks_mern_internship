import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { server } from "../server/socket";
import { io as ClientSocket, Socket as ClientSocketType } from "socket.io-client";
import { signToken } from "../lib/auth/jwt";
import {
  REALTIME_EVENTS,
  versionCreatedSchema,
  VersionCreatedPayload,
  DocumentRestoredPayload,
} from "../lib/realtime/events";
import { prisma } from "../lib/db/prisma";

describe("Realtime version_created Event Suite (Option A)", () => {
  let port: number;
  let clientA: ClientSocketType;
  let clientB: ClientSocketType;
  let tokenUserA: string;
  let tokenUserB: string;

  const testUserA = { id: "user_vcreated_a", name: "Alice Snapshot", email: "alice_v@test.com" };
  const testUserB = { id: "user_vcreated_b", name: "Bob Snapshot", email: "bob_v@test.com" };
  let documentId: string;

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test_super_secret_for_version_created_suite_12345";
    process.env.INTERNAL_BRIDGE_SECRET = "test_bridge_secret_vcreated_123";

    tokenUserA = await signToken(testUserA);
    tokenUserB = await signToken(testUserB);

    // Seed database users
    await prisma.user.upsert({
      where: { id: testUserA.id },
      update: {},
      create: { id: testUserA.id, email: testUserA.email, name: testUserA.name, password: "Password123!" },
    });
    await prisma.user.upsert({
      where: { id: testUserB.id },
      update: {},
      create: { id: testUserB.id, email: testUserB.email, name: testUserB.name, password: "Password123!" },
    });

    // Create document with user A as owner and user B as editor
    const doc = await prisma.document.create({
      data: {
        title: "Version Created Test Doc",
        content: "<p>Original Text</p>",
        version: 1,
        ownerId: testUserA.id,
        collaborators: {
          create: {
            userId: testUserB.id,
            role: "editor",
          },
        },
      },
    });
    documentId = doc.id;

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === "object" && addr ? addr.port : 3001;
        resolve();
      });
    });

    clientA = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenUserA },
      transports: ["websocket"],
      reconnection: false,
    });

    clientB = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenUserB },
      transports: ["websocket"],
      reconnection: false,
    });

    await Promise.all([
      new Promise<void>((resolve) => clientA.on("connect", () => resolve())),
      new Promise<void>((resolve) => clientB.on("connect", () => resolve())),
    ]);

    // Both join document room
    await new Promise<void>((resolve) => {
      clientA.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId }, () => resolve());
    });
    await new Promise<void>((resolve) => {
      clientB.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId }, () => resolve());
    });
  });

  afterAll(async () => {
    if (clientA?.connected) clientA.disconnect();
    if (clientB?.connected) clientB.disconnect();
    if (documentId) {
      await prisma.document.deleteMany({ where: { id: documentId } });
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("emits version_created on debounced autosave (document_change) with valid Zod payload", async () => {
    const versionPromise = new Promise<VersionCreatedPayload>((resolve) => {
      clientB.on(REALTIME_EVENTS.VERSION_CREATED, (payload) => {
        resolve(payload);
      });
    });

    clientA.emit(REALTIME_EVENTS.DOCUMENT_CHANGE, {
      documentId,
      content: "<p>Updated live content via autosave</p>",
      title: "Updated Title",
      baseVersion: 1,
    });

    const receivedPayload = await versionPromise;

    // Validate payload against Zod schema
    const parseResult = versionCreatedSchema.safeParse(receivedPayload);
    expect(parseResult.success).toBe(true);

    expect(receivedPayload.documentId).toBe(documentId);
    expect(receivedPayload.versionNumber).toBe(2);
    expect(receivedPayload.title).toBe("Updated Title");
    expect(receivedPayload.changedBy.id).toBe(testUserA.id);
    expect(receivedPayload.changedBy.name).toBe(testUserA.name);
    expect(receivedPayload.createdAt).toBeDefined();
  });

  it("emits both document_restored and version_created when historical version is restored", async () => {
    const versionCreatedPromise = new Promise<VersionCreatedPayload>((resolve) => {
      clientB.once(REALTIME_EVENTS.VERSION_CREATED, (payload) => {
        resolve(payload);
      });
    });

    const docRestoredPromise = new Promise<DocumentRestoredPayload>((resolve) => {
      clientB.once(REALTIME_EVENTS.DOCUMENT_RESTORED, (payload) => {
        resolve(payload);
      });
    });

    // Simulate internal bridge call from /api/documents/[id]/restore
    const res = await fetch(`http://localhost:${port}/api/socket/document-restored`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-bridge-secret": "test_bridge_secret_vcreated_123",
      },
      body: JSON.stringify({
        documentId,
        version: 3,
        restoredFromVersion: 1,
        title: "Restored V1 Title",
        content: "<p>Original Text</p>",
        restoredBy: {
          id: testUserA.id,
          name: testUserA.name,
          email: testUserA.email,
        },
        restoredAt: new Date().toISOString(),
      }),
    });

    expect(res.status).toBe(200);

    const [vPayload, rPayload] = await Promise.all([versionCreatedPromise, docRestoredPromise]);

    // Validate document_restored payload
    expect(rPayload.documentId).toBe(documentId);
    expect(rPayload.version).toBe(3);
    expect(rPayload.restoredFromVersion).toBe(1);

    // Validate version_created payload
    const parseResult = versionCreatedSchema.safeParse(vPayload);
    expect(parseResult.success).toBe(true);
    expect(vPayload.documentId).toBe(documentId);
    expect(vPayload.versionNumber).toBe(3);
    expect(vPayload.title).toBe("Restored V1 Title");
    expect(vPayload.changedBy.id).toBe(testUserA.id);
  });

  it("emits version_created when notified via REST bridge endpoint (/api/socket/version-created)", async () => {
    const bridgePromise = new Promise<VersionCreatedPayload>((resolve) => {
      clientA.once(REALTIME_EVENTS.VERSION_CREATED, (payload) => {
        resolve(payload);
      });
    });

    const res = await fetch(`http://localhost:${port}/api/socket/version-created`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-bridge-secret": "test_bridge_secret_vcreated_123",
      },
      body: JSON.stringify({
        documentId,
        versionNumber: 4,
        title: "REST Persisted Snapshot",
        changedBy: {
          id: testUserB.id,
          name: testUserB.name,
          email: testUserB.email,
        },
        createdAt: new Date().toISOString(),
      }),
    });

    expect(res.status).toBe(200);

    const payload = await bridgePromise;
    expect(versionCreatedSchema.safeParse(payload).success).toBe(true);
    expect(payload.versionNumber).toBe(4);
    expect(payload.title).toBe("REST Persisted Snapshot");
    expect(payload.changedBy.id).toBe(testUserB.id);
  });
});
