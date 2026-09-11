import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../lib/db/prisma";
import { server, documentVersions, documentContents } from "../server/socket";
import { io as ClientSocket, Socket as ClientSocketType } from "socket.io-client";
import { signToken } from "../lib/auth/jwt";
import {
  REALTIME_EVENTS,
  DocumentRestoredPayload,
  VersionCreatedPayload,
} from "../lib/realtime/events";
import {
  createDocument,
  updateDocument,
  getDocumentVersions,
  restoreDocumentVersion,
} from "../lib/db/documents";

describe("Day 5 Task 2 — Version History & Recovery Suite", () => {
  let port: number;
  let clientOwner: ClientSocketType;
  let clientEditor: ClientSocketType;

  const ownerUser = { id: "d5_vh_owner", name: "Alice Historian", email: "alice_vh@test.com" };
  const editorUser = { id: "d5_vh_editor", name: "Bob Chronicler", email: "bob_vh@test.com" };

  let documentId: string;
  let tokenOwner: string;
  let tokenEditor: string;

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test_super_secret_vh_suite_123456789";

    await prisma.user.upsert({
      where: { id: ownerUser.id },
      update: {},
      create: { id: ownerUser.id, email: ownerUser.email, name: ownerUser.name, password: "Password123!" },
    });
    await prisma.user.upsert({
      where: { id: editorUser.id },
      update: {},
      create: { id: editorUser.id, email: editorUser.email, name: editorUser.name, password: "Password123!" },
    });

    // 1. Initial document creation records Version 1
    const doc = await createDocument(ownerUser.id, {
      title: "Version Recovery Document",
      content: "<p>Version 1 initial content</p>",
    });
    documentId = doc.id;

    // Add Bob as editor
    await prisma.documentCollaborator.create({
      data: {
        documentId,
        userId: editorUser.id,
        role: "editor",
      },
    });

    tokenOwner = await signToken(ownerUser);
    tokenEditor = await signToken(editorUser);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === "object" && addr ? addr.port : 3001;
        resolve();
      });
    });

    clientOwner = ClientSocket(`http://localhost:${port}`, { auth: { token: tokenOwner }, transports: ["websocket"], reconnection: false });
    clientEditor = ClientSocket(`http://localhost:${port}`, { auth: { token: tokenEditor }, transports: ["websocket"], reconnection: false });

    await Promise.all([
      new Promise<void>((resolve) => clientOwner.on("connect", () => resolve())),
      new Promise<void>((resolve) => clientEditor.on("connect", () => resolve())),
    ]);

    await Promise.all([
      new Promise<void>((resolve) => clientOwner.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId }, () => resolve())),
      new Promise<void>((resolve) => clientEditor.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId }, () => resolve())),
    ]);
  });

  afterAll(async () => {
    if (clientOwner?.connected) clientOwner.disconnect();
    if (clientEditor?.connected) clientEditor.disconnect();
    if (documentId) {
      await prisma.document.deleteMany({ where: { id: documentId } });
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("creates sequential versions with accurate changedBy user attribution", async () => {
    // Bob makes Edit 1 -> creates Version 2
    const resV2 = await updateDocument(documentId, editorUser.id, {
      title: "Version 2 by Bob",
      content: "<p>Version 2 content written by Bob</p>",
    });
    expect(resV2.success).toBe(true);
    if (resV2.success) expect(resV2.data.version).toBe(2);

    // Alice makes Edit 2 -> creates Version 3
    const resV3 = await updateDocument(documentId, ownerUser.id, {
      title: "Version 3 by Alice",
      content: "<p>Version 3 content written by Alice</p>",
    });
    expect(resV3.success).toBe(true);
    if (resV3.success) expect(resV3.data.version).toBe(3);

    // Query version history
    const historyRes = await getDocumentVersions(documentId, ownerUser.id);
    expect(historyRes.success).toBe(true);
    if (historyRes.success) {
      const versions = historyRes.data;
      expect(versions.length).toBe(3);

      const v1 = versions.find((v) => v.versionNumber === 1);
      const v2 = versions.find((v) => v.versionNumber === 2);
      const v3 = versions.find((v) => v.versionNumber === 3);

      expect(v1?.changedById).toBe(ownerUser.id);
      expect(v2?.changedById).toBe(editorUser.id);
      expect(v3?.changedById).toBe(ownerUser.id);
    }
  });

  it("proves cold-restart resilience: clearing in-memory maps increments N+1 and creates snapshot without P2002 collision", async () => {
    // 1. Simulate server restart: in-memory maps wiped
    documentVersions.clear();
    documentContents.clear();

    expect(documentVersions.get(documentId)).toBeUndefined();

    // 2. Client sends edit over socket after cold restart
    const changeAck = await new Promise<{ success: boolean; version?: number }>((resolve) => {
      clientEditor.emit(
        REALTIME_EVENTS.DOCUMENT_CHANGE,
        {
          documentId,
          content: "<p>Edit 4 after cold restart</p>",
          title: "Version 4 Title",
          baseVersion: 3,
        },
        (res: any) => resolve(res)
      );
    });

    expect(changeAck.success).toBe(true);
    // Must be version 4 (N + 1), NOT version 2!
    expect(changeAck.version).toBe(4);
    expect(documentVersions.get(documentId)).toBe(4);

    // Verify snapshot 4 was created cleanly in DB
    const snapshot4 = await prisma.documentVersion.findUnique({
      where: {
        documentId_versionNumber: {
          documentId,
          versionNumber: 4,
        },
      },
    });
    expect(snapshot4).not.toBeNull();
    expect(snapshot4?.versionNumber).toBe(4);
  });

  it("restores historical version: creates a new version snapshot, leaves history intact, and emits live events", async () => {
    const restoredPromise = new Promise<DocumentRestoredPayload>((resolve) => {
      clientEditor.once(REALTIME_EVENTS.DOCUMENT_RESTORED, (payload) => resolve(payload));
    });

    const versionCreatedPromise = new Promise<VersionCreatedPayload>((resolve) => {
      clientEditor.once(REALTIME_EVENTS.VERSION_CREATED, (payload) => resolve(payload));
    });

    // Alice restores historical Version 2 (which had content: "<p>Version 2 content written by Bob</p>")
    const restoreRes = await restoreDocumentVersion(documentId, 2, ownerUser.id);
    expect(restoreRes.success).toBe(true);
    if (restoreRes.success) {
      expect(restoreRes.data.newVersion.versionNumber).toBe(5);
      expect(restoreRes.data.document.version).toBe(5);
      expect(restoreRes.data.document.content).toBe("<p>Version 2 content written by Bob</p>");
    }

    // Trigger bridge broadcast to notify room
    if (restoreRes.success) {
      const bridgeRes = await fetch(`http://localhost:${port}/api/socket/document-restored`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-bridge-secret": process.env.INTERNAL_BRIDGE_SECRET || "",
        },
        body: JSON.stringify({
          documentId,
          version: 5,
          restoredFromVersion: 2,
          title: restoreRes.data.document.title,
          content: restoreRes.data.document.content,
          jsonContent: restoreRes.data.document.jsonContent,
          restoredBy: {
            id: ownerUser.id,
            name: ownerUser.name,
            email: ownerUser.email,
          },
          restoredAt: new Date().toISOString(),
        }),
      });
      expect(bridgeRes.status).toBe(200);
    }

    // Verify connected collaborator received live broadcasts
    const [restoredEvent, versionCreatedEvent] = await Promise.all([restoredPromise, versionCreatedPromise]);

    expect(restoredEvent.documentId).toBe(documentId);
    expect(restoredEvent.version).toBe(5);
    expect(restoredEvent.restoredFromVersion).toBe(2);

    expect(versionCreatedEvent.documentId).toBe(documentId);
    expect(versionCreatedEvent.versionNumber).toBe(5);

    // Verify all historical versions (1, 2, 3, 4, 5) exist untouched in database
    const allVersions = await prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { versionNumber: "asc" },
    });
    expect(allVersions.length).toBe(5);
    expect(allVersions.map((v) => v.versionNumber)).toEqual([1, 2, 3, 4, 5]);
  });
});
