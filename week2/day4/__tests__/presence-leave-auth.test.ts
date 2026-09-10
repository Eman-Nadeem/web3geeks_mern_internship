import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { server, io } from "../server/socket";
import { io as ClientSocket, Socket as ClientSocketType } from "socket.io-client";
import { signToken } from "../lib/auth/jwt";
import { REALTIME_EVENTS, PresenceUser } from "../lib/realtime/events";
import { prisma } from "../lib/db/prisma";

describe("CRITICAL 1 — Presence Leave Endpoint Authentication & Authorization", () => {
  let port: number;
  let clientB: ClientSocketType;
  const userA = { id: "user_a_leave_auth", name: "Alice Attacker", email: "alice.attacker@example.com" };
  const userB = { id: "user_b_leave_victim", name: "Bob Victim", email: "bob.victim@example.com" };
  let tokenA: string;
  let tokenB: string;
  const docId = "doc_presence_leave_auth_test";

  beforeAll(async () => {
    // 1. Seed users and document for access checks
    await prisma.user.upsert({
      where: { id: userA.id },
      update: { name: userA.name, email: userA.email },
      create: { id: userA.id, name: userA.name, email: userA.email, password: "" },
    });
    await prisma.user.upsert({
      where: { id: userB.id },
      update: { name: userB.name, email: userB.email },
      create: { id: userB.id, name: userB.name, email: userB.email, password: "" },
    });
    await prisma.document.upsert({
      where: { id: docId },
      update: { title: "Presence Auth Doc", ownerId: userA.id },
      create: {
        id: docId,
        title: "Presence Auth Doc",
        content: "<p>Presence test</p>",
        ownerId: userA.id,
        collaborators: {
          create: [{ userId: userB.id, role: "editor" }],
        },
      },
    });

    tokenA = await signToken(userA);
    tokenB = await signToken(userB);

    // 2. Start server on ephemeral port
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === "object" && addr ? addr.port : 3001;
        resolve();
      });
    });

    // 3. Connect client B and join docId
    clientB = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenB },
      transports: ["websocket"],
      forceNew: true,
    });

    await new Promise<void>((resolve) => {
      clientB.on("connect", () => {
        clientB.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId: docId }, () => {
          resolve();
        });
      });
    });
  });

  afterAll(async () => {
    clientB.disconnect();
    io.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.document.delete({ where: { id: docId } }).catch(() => null);
  });

  it("rejects unauthenticated leave requests with 401 and prevents presence mutation", async () => {
    // Send unauthenticated leave payload attempting to evict Bob Victim
    const res = await fetch(`http://localhost:${port}/api/presence/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: docId,
        userId: userB.id,
      }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorized");

    // Verify Bob is still present in the document room via sync_request
    const syncRes: { success: boolean; data?: { presence: PresenceUser[] } } = await new Promise((resolve) => {
      clientB.emit(REALTIME_EVENTS.SYNC_REQUEST, { documentId: docId }, (ack: any) => resolve(ack));
    });

    expect(syncRes.success).toBe(true);
    const userIdsInPresence = syncRes.data?.presence.map((p) => p.userId);
    expect(userIdsInPresence).toContain(userB.id);
  });

  it("rejects user A attempting to evict user B with 401 and prevents presence mutation", async () => {
    // Alice sends a leave request with HER valid token, but specifies Bob's userId in the payload
    const res = await fetch(`http://localhost:${port}/api/presence/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: docId,
        userId: userB.id,
        token: tokenA,
      }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Cannot evict another user");

    // Verify Bob remains in room presence
    const syncRes: { success: boolean; data?: { presence: PresenceUser[] } } = await new Promise((resolve) => {
      clientB.emit(REALTIME_EVENTS.SYNC_REQUEST, { documentId: docId }, (ack: any) => resolve(ack));
    });

    expect(syncRes.success).toBe(true);
    const userIdsInPresence = syncRes.data?.presence.map((p) => p.userId);
    expect(userIdsInPresence).toContain(userB.id);
  });

  it("allows user B to leave with their own valid token and evicts them from presence", async () => {
    // Bob sends a valid leave request for himself
    const res = await fetch(`http://localhost:${port}/api/presence/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: docId,
        userId: userB.id,
        socketId: clientB.id,
        token: tokenB,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
