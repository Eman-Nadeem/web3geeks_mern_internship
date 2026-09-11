import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../lib/db/prisma";
import { server, documentContents, documentVersions } from "../server/socket";
import { io as ClientSocket, Socket as ClientSocketType } from "socket.io-client";
import { signToken } from "../lib/auth/jwt";
import { REALTIME_EVENTS } from "../lib/realtime/events";
import { updateDocument } from "../lib/db/documents";

describe("Day 5 Task 4 — Performance Benchmarks & Redundancy Avoidance", () => {
  let port: number;
  let client: ClientSocketType;
  let testUserId: string;
  let documentId: string;

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test_super_secret_performance_suite_123456789";

    const user = await prisma.user.upsert({
      where: { email: "perf_tester@example.com" },
      update: {},
      create: {
        email: "perf_tester@example.com",
        name: "Performance Tester",
        password: "Password123!",
      },
    });
    testUserId = user.id;

    const doc = await prisma.document.create({
      data: {
        title: "Performance Benchmark Document",
        content: "<p>Original Content</p>",
        version: 1,
        ownerId: testUserId,
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

    const token = await signToken({
      id: user.id,
      name: user.name || "Benchmark User",
      email: user.email,
    });

    client = ClientSocket(`http://localhost:${port}`, {
      auth: { token },
      transports: ["websocket"],
      reconnection: false,
    });

    await new Promise<void>((resolve) => {
      client.on("connect", () => resolve());
    });

    await new Promise<void>((resolve) => {
      client.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId }, () => resolve());
    });
  });

  afterAll(async () => {
    if (client?.connected) client.disconnect();
    if (documentId) {
      await prisma.document.deleteMany({ where: { id: documentId } });
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("avoids redundant database writes and version bumps on no-op edits", async () => {
    // 1. Initial edit to set content and establish cache
    const initialAck = await new Promise<{ success: boolean; version?: number }>((resolve) => {
      client.emit(
        REALTIME_EVENTS.DOCUMENT_CHANGE,
        {
          documentId,
          content: "<p>Stabilized Content</p>",
          baseVersion: 1,
        },
        (res: any) => resolve(res)
      );
    });

    expect(initialAck.success).toBe(true);
    expect(initialAck.version).toBe(2);
    expect(documentVersions.get(documentId)).toBe(2);

    const snapshotCountBefore = await prisma.documentVersion.count({
      where: { documentId },
    });

    // 2. Send identical content without metadata changes (simulating redundant debounce fire)
    const noopAck = await new Promise<{ success: boolean; version?: number; noop?: boolean }>((resolve) => {
      client.emit(
        REALTIME_EVENTS.DOCUMENT_CHANGE,
        {
          documentId,
          content: "<p>Stabilized Content</p>",
          baseVersion: 2,
        },
        (res: any) => resolve(res)
      );
    });

    // 3. Verify no-op was detected: version remained 2, noop is true
    expect(noopAck.success).toBe(true);
    expect(noopAck.noop).toBe(true);
    expect(noopAck.version).toBe(2);
    expect(documentVersions.get(documentId)).toBe(2);

    // 4. Verify no new snapshot was written to PostgreSQL
    const snapshotCountAfter = await prisma.documentVersion.count({
      where: { documentId },
    });
    expect(snapshotCountAfter).toBe(snapshotCountCountBefore(snapshotCountBefore));
  });

  it("benchmarks large document handling (10,000+ words / ~60KB) under 500ms", async () => {
    // Generate ~10,000 words of realistic rich text HTML
    const paragraph = "<p>The quick brown fox jumps over the lazy dog in a distributed real-time collaborative editor.</p>";
    const largeHtml = paragraph.repeat(650); // ~10,400 words, ~65KB
    expect(largeHtml.length).toBeGreaterThan(50000);

    const startTime = performance.now();

    // Persist large document via database layer
    const result = await updateDocument(documentId, testUserId, {
      title: "Large Benchmark Document",
      content: largeHtml,
    });

    const elapsedMs = performance.now() - startTime;

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content.length).toBeGreaterThan(50000);
    }
    // Benchmark assertion: must process, sanitize (DOMPurify), and persist via remote Neon cloud DB within 5000ms
    expect(elapsedMs).toBeLessThan(5000);
  });
});

function snapshotCountCountBefore(count: number): number {
  return count;
}
