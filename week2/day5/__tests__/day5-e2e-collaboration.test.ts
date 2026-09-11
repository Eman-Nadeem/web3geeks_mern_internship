import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { server } from "../server/socket";
import { io as ClientSocket, Socket as ClientSocketType } from "socket.io-client";
import { signToken } from "../lib/auth/jwt";
import { REALTIME_EVENTS, CursorUpdatePayload, DocumentUpdatePayload, PresenceUpdatePayload, SyncResponsePayload } from "../lib/realtime/events";
import { prisma } from "../lib/db/prisma";

describe("Day 5 Task 1 — Comprehensive Multi-User End-to-End Collaboration Suite", () => {
  let port: number;
  let clientOwner: ClientSocketType;
  let clientEditor: ClientSocketType;
  let clientViewer: ClientSocketType;
  let clientJoiner: ClientSocketType;

  const ownerUser = { id: "d5_user_owner", name: "Alice Owner", email: "alice_d5@test.com" };
  const editorUser = { id: "d5_user_editor", name: "Bob Editor", email: "bob_d5@test.com" };
  const viewerUser = { id: "d5_user_viewer", name: "Charlie Viewer", email: "charlie_d5@test.com" };
  const joinerUser = { id: "d5_user_joiner", name: "David Joiner", email: "david_d5@test.com" };

  let documentId: string;
  let tokenOwner: string;
  let tokenEditor: string;
  let tokenViewer: string;
  let tokenJoiner: string;

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test_super_secret_e2e_collab_suite_123456789";

    // 1. Seed database users
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
    await prisma.user.upsert({
      where: { id: viewerUser.id },
      update: {},
      create: { id: viewerUser.id, email: viewerUser.email, name: viewerUser.name, password: "Password123!" },
    });
    await prisma.user.upsert({
      where: { id: joinerUser.id },
      update: {},
      create: { id: joinerUser.id, email: joinerUser.email, name: joinerUser.name, password: "Password123!" },
    });

    // 2. Create document and set up collaborators
    const doc = await prisma.document.create({
      data: {
        title: "Day 5 Multi-User E2E Document",
        content: "<p>Initial shared text</p>",
        version: 1,
        ownerId: ownerUser.id,
        collaborators: {
          createMany: {
            data: [
              { userId: editorUser.id, role: "editor" },
              { userId: viewerUser.id, role: "viewer" },
              { userId: joinerUser.id, role: "editor" },
            ],
          },
        },
      },
    });
    documentId = doc.id;

    tokenOwner = await signToken(ownerUser);
    tokenEditor = await signToken(editorUser);
    tokenViewer = await signToken(viewerUser);
    tokenJoiner = await signToken(joinerUser);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === "object" && addr ? addr.port : 3001;
        resolve();
      });
    });

    clientOwner = ClientSocket(`http://localhost:${port}`, { auth: { token: tokenOwner }, transports: ["websocket"], reconnection: false });
    clientEditor = ClientSocket(`http://localhost:${port}`, { auth: { token: tokenEditor }, transports: ["websocket"], reconnection: false });
    clientViewer = ClientSocket(`http://localhost:${port}`, { auth: { token: tokenViewer }, transports: ["websocket"], reconnection: false });
    clientJoiner = ClientSocket(`http://localhost:${port}`, { auth: { token: tokenJoiner }, transports: ["websocket"], reconnection: false });

    await Promise.all([
      new Promise<void>((resolve) => clientOwner.on("connect", () => resolve())),
      new Promise<void>((resolve) => clientEditor.on("connect", () => resolve())),
      new Promise<void>((resolve) => clientViewer.on("connect", () => resolve())),
      new Promise<void>((resolve) => clientJoiner.on("connect", () => resolve())),
    ]);
  });

  afterAll(async () => {
    if (clientOwner?.connected) clientOwner.disconnect();
    if (clientEditor?.connected) clientEditor.disconnect();
    if (clientViewer?.connected) clientViewer.disconnect();
    if (clientJoiner?.connected) clientJoiner.disconnect();
    if (documentId) {
      await prisma.document.deleteMany({ where: { id: documentId } });
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("handles multi-user room joins and verifies accurate presence and assigned colors", async () => {
    const ownerPresencePromise = new Promise<PresenceUpdatePayload>((resolve) => {
      clientOwner.once(REALTIME_EVENTS.PRESENCE_UPDATE, (payload) => resolve(payload));
    });

    // Owner joins
    const ownerAck = await new Promise<any>((resolve) => {
      clientOwner.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId }, (res: any) => resolve(res));
    });
    expect(ownerAck.success).toBe(true);
    expect(ownerAck.role).toBe("owner");

    // Editor joins
    const editorAck = await new Promise<any>((resolve) => {
      clientEditor.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId }, (res: any) => resolve(res));
    });
    expect(editorAck.success).toBe(true);
    expect(editorAck.role).toBe("editor");

    // Viewer joins
    const viewerAck = await new Promise<any>((resolve) => {
      clientViewer.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId }, (res: any) => resolve(res));
    });
    expect(viewerAck.success).toBe(true);
    expect(viewerAck.role).toBe("viewer");

    const presence = await ownerPresencePromise;
    expect(presence.documentId).toBe(documentId);
    expect(presence.users.length).toBeGreaterThanOrEqual(1);

    // Verify all active users have color assigned
    for (const u of presence.users) {
      expect(u.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("synchronizes remote cursor positions between peers in real time", async () => {
    const cursorPromise = new Promise<CursorUpdatePayload>((resolve) => {
      clientOwner.once(REALTIME_EVENTS.CURSOR_UPDATE, (payload) => resolve(payload));
    });

    // Bob (editor) updates cursor position with valid payload
    clientEditor.emit(REALTIME_EVENTS.CURSOR_UPDATE, {
      documentId,
      userId: editorUser.id,
      displayName: editorUser.name,
      color: "#16A34A",
      cursor: { from: 15, to: 25 },
    });

    const cursorPayload = await cursorPromise;
    expect(cursorPayload.documentId).toBe(documentId);
    expect(cursorPayload.userId).toBe(editorUser.id);
    expect(cursorPayload.cursor).toEqual({ from: 15, to: 25 });
    expect(cursorPayload.color).toBeDefined();
  });

  it("strictly enforces that Viewers cannot edit and rejects edits with Read-only error", async () => {
    const viewerEditAck = await new Promise<any>((resolve) => {
      clientViewer.emit(
        REALTIME_EVENTS.DOCUMENT_CHANGE,
        {
          documentId,
          content: "<p>Malicious viewer edit attempt</p>",
          baseVersion: 1,
        },
        (res: any) => resolve(res)
      );
    });

    expect(viewerEditAck.success).toBe(false);
    expect(viewerEditAck.error).toContain("Read-only");

    // Verify database document was not modified
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    expect(doc?.content).not.toContain("Malicious viewer edit attempt");
  });

  it("applies Editor edits with Last-Write-Wins and broadcasts update to all room members", async () => {
    const updatePromise = new Promise<DocumentUpdatePayload>((resolve) => {
      clientOwner.once(REALTIME_EVENTS.DOCUMENT_UPDATE, (payload) => resolve(payload));
    });

    const editorEditAck = await new Promise<any>((resolve) => {
      clientEditor.emit(
        REALTIME_EVENTS.DOCUMENT_CHANGE,
        {
          documentId,
          content: "<p>Legitimate co-author edit by Bob</p>",
          title: "E2E Collaboration Title",
          baseVersion: 1,
        },
        (res: any) => resolve(res)
      );
    });

    expect(editorEditAck.success).toBe(true);
    expect(editorEditAck.version).toBeGreaterThanOrEqual(2);

    const updatePayload = await updatePromise;
    expect(updatePayload.documentId).toBe(documentId);
    expect(updatePayload.content).toBe("<p>Legitimate co-author edit by Bob</p>");
    expect(updatePayload.updatedBy.id).toBe(editorUser.id);
  });

  it("synchronizes document state to a mid-session joining user upon sync_request", async () => {
    await new Promise<void>((resolve) => {
      clientJoiner.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId }, () => resolve());
    });

    const syncAck = await new Promise<{ success: boolean; data?: SyncResponsePayload }>((resolve) => {
      clientJoiner.emit(REALTIME_EVENTS.SYNC_REQUEST, { documentId }, (res: any) => resolve(res));
    });

    expect(syncAck.success).toBe(true);
    expect(syncAck.data?.documentId).toBe(documentId);
    expect(syncAck.data?.content).toBe("<p>Legitimate co-author edit by Bob</p>");
    expect(syncAck.data?.version).toBeGreaterThanOrEqual(2);
    expect(syncAck.data?.presence).toBeInstanceOf(Array);
  });
});
